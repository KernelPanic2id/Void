use std::sync::Arc;
use std::sync::Mutex;
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::time::Duration;

use sha2::{Sha256, Digest};
use base64::{engine::general_purpose, Engine as _};
use serde::{Serialize, Deserialize};

use rustls::client::danger::{ServerCertVerified, ServerCertVerifier, HandshakeSignatureValid};
use rustls::{DigitallySignedStruct, Error, SignatureScheme};
use rustls_pki_types::{CertificateDer, UnixTime, ServerName};

// AJOUT : Listener et Event sont nécessaires pour tauri::Event et listen_any
use tauri::{Manager, State, Emitter, Listener, Event};

// --- CONFIGURATION PINNING ---
const PRIMARY_PIN: &str = "JZnp4wOHrwvdpPtDzwptWkD//NH4oiGY2rP/3GmAZWI=";
const BACKUP_PIN: &str = "DEV_PIN";

#[derive(Debug)]
struct MyVerifier;

impl ServerCertVerifier for MyVerifier {
    fn verify_server_cert(
        &self,
        end_entity: &CertificateDer<'_>,
        _intermediates: &[CertificateDer<'_>],
        _server_name: &ServerName<'_>,
        _ocsp_response: &[u8],
        _now: UnixTime,
    ) -> Result<ServerCertVerified, Error> {
        let cert_der = end_entity.as_ref();
        let mut hasher = Sha256::new();
        hasher.update(cert_der);
        let hash = hasher.finalize();
        let hash_base64 = general_purpose::STANDARD.encode(hash);

        if hash_base64 == PRIMARY_PIN || hash_base64 == BACKUP_PIN {
            Ok(ServerCertVerified::assertion())
        } else {
            Err(Error::InvalidCertificate(rustls::CertificateError::UnknownIssuer))
        }
    }
    fn verify_tls12_signature(&self, _m: &[u8], _c: &CertificateDer<'_>, _d: &DigitallySignedStruct) -> Result<HandshakeSignatureValid, Error> { Ok(HandshakeSignatureValid::assertion()) }
    fn verify_tls13_signature(&self, _m: &[u8], _c: &CertificateDer<'_>, _d: &DigitallySignedStruct) -> Result<HandshakeSignatureValid, Error> { Ok(HandshakeSignatureValid::assertion()) }
    fn supported_verify_schemes(&self) -> Vec<SignatureScheme> { vec![SignatureScheme::RSA_PSS_SHA256, SignatureScheme::ECDSA_NISTP256_SHA256, SignatureScheme::ED25519] }
}

// --- BENTO LAYOUT ENGINE ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LayoutWindow {
    pub id: String,
    pub x: i32,
    pub y: i32,
    pub w: i32,
    pub h: i32,
    pub z: Option<i32>,
}

#[derive(Default)]
pub struct LayoutState {
    pub windows: Mutex<HashMap<String, LayoutWindow>>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct MovePayload {
    pub id: String,
    pub dx: i32,
    pub dy: i32,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ResizePayload {
    pub id: String,
    pub dw: i32,
    pub dh: i32,
}

// CORRECTION : Ajout de Clone ici pour permettre l'émission vers le frontend
#[derive(Serialize, Clone)]
struct LayoutBatch {
    windows: Vec<LayoutWindow>,
}

// --- PERSISTENCE ---

fn get_layout_path(app: &tauri::AppHandle) -> PathBuf {
    let mut path = app.path().app_config_dir().expect("Failed to get app config dir");
    path.push("layout.json");
    path
}

fn save_layout_to_disk(app: &tauri::AppHandle) {
    
    // clone le handle pour qu'il appartienne au thread
    let app_handle = app.clone();

    tauri::async_runtime::spawn(async move {
        // Le debounce
        tokio::time::sleep(std::time::Duration::from_millis(500)).await;

        let state = app_handle.state::<LayoutState>();

        // crée un scope pour le MutexGuard
        let data_to_save = {
            match state.windows.lock() {
                Ok(windows) => serde_json::to_string_pretty(&*windows).ok(),
                Err(_) => None,
            }
        };

        // écrit sur le disque en dehors du lock pour ne pas bloquer les autres threads
        if let Some(data) = data_to_save {
            let path = get_layout_path(&app_handle);
            if let Some(parent) = path.parent() {
                let _ = std::fs::create_dir_all(parent);
            }
            let _ = std::fs::write(path, data);
            println!("💾 Layout sauvegardé sur disque.");
        }
    });
}

fn load_layout_from_disk(app: &tauri::AppHandle) -> Option<HashMap<String, LayoutWindow>> {
    let path = get_layout_path(app);
    let data = fs::read_to_string(path).ok()?;
    serde_json::from_str(&data).ok()
}

// --- HANDLERS ---

pub fn handle_move(state: &State<LayoutState>, payload: MovePayload, app: &tauri::AppHandle) -> Result<(), String> {
    let mut windows = state.windows.lock().map_err(|_| "Mutex Poisoned")?;
    let win = windows.entry(payload.id.clone()).or_insert(LayoutWindow {
        id: payload.id.clone(), x: 100, y: 100, w: 240, h: 500, z: Some(0),
    });
    win.x += payload.dx;
    win.y += payload.dy;

    save_layout_to_disk(app);
    let batch = LayoutBatch { windows: windows.values().cloned().collect() };
    app.emit("bento:layout:update", &batch).map_err(|e| e.to_string())
}

pub fn handle_resize(state: &State<LayoutState>, payload: ResizePayload, app: &tauri::AppHandle) -> Result<(), String> {
    let mut windows = state.windows.lock().map_err(|_| "Mutex Poisoned")?;
    let win = windows.entry(payload.id.clone()).or_insert(LayoutWindow {
        id: payload.id.clone(), x: 100, y: 100, w: 240, h: 500, z: Some(0),
    });
    win.w = (win.w + payload.dw).max(80);
    win.h = (win.h + payload.dh).max(40);

    save_layout_to_disk(app);
    let batch = LayoutBatch { windows: windows.values().cloned().collect() };
    app.emit("bento:layout:update", &batch).map_err(|e| e.to_string())
}

#[tauri::command]
async fn call_signaling(client: tauri::State<'_, reqwest::Client>, url: String) -> Result<String, String> {
    let res = if url.starts_with("http://") { reqwest::Client::new().get(&url).send().await }
              else { client.get(&url).send().await };
    res.map_err(|e| e.to_string())?.text().await.map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let _ = rustls::crypto::ring::default_provider().install_default();
    let crypto = Arc::new(rustls::ClientConfig::builder().dangerous().with_custom_certificate_verifier(Arc::new(MyVerifier)).with_no_client_auth());
    let client = reqwest::Client::builder().use_preconfigured_tls((*crypto).clone()).build().expect("F");
    let ws_connector = tokio_tungstenite::Connector::Rustls(crypto.clone());

    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_websocket::Builder::new().tls_connector(ws_connector).build())
        .manage(client)
        .manage(LayoutState::default())
        .invoke_handler(tauri::generate_handler![call_signaling])
        .setup(|app| {
            let handle = app.handle().clone();

            // Synchro initiale - CORRECTION ICI
            if let Some(saved) = load_layout_from_disk(&handle) {
                let state_handle = handle.state::<LayoutState>(); // On le nomme clairement
                let mut windows = state_handle.windows.lock().unwrap(); // On lock explicitement
                *windows = saved;

                let batch = LayoutBatch {
                    windows: windows.values().cloned().collect()
                };
                let _ = handle.emit("bento:layout:update", batch);
            }

            // Listener pour MOVE
            let h_move = handle.clone();
            app.listen_any("bento:layout:move", move |event: Event| {
                let state = h_move.state::<LayoutState>();
                if let Ok(p) = serde_json::from_str::<MovePayload>(event.payload()) {
                    let _ = handle_move(&state, p, &h_move);
                }
            });

            // Listener pour RESIZE
            let h_resize = handle.clone();
            app.listen_any("bento:layout:resize", move |event: Event| {
                let state = h_resize.state::<LayoutState>();
                if let Ok(p) = serde_json::from_str::<ResizePayload>(event.payload()) {
                    let _ = handle_resize(&state, p, &h_resize);
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
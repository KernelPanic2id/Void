use std::sync::Arc;
use sha2::{Sha256, Digest};
use base64::{engine::general_purpose, Engine as _};

// Utilisation des types officiels de rustls 0.23
use rustls::client::danger::{ServerCertVerified, ServerCertVerifier, HandshakeSignatureValid};
use rustls::{DigitallySignedStruct, Error, SignatureScheme};

// Importation depuis la crate pki-types directement (plus stable)
use rustls_pki_types::{CertificateDer, UnixTime, ServerName};
// --- CONFIGURATION PINNING ---
const PRIMARY_PIN: &str = match option_env!("PRIMARY_PIN_HASH") {
    Some(v) => v,
    None => "DEV_PIN",
};

const BACKUP_PIN: &str = match option_env!("BACKUP_PIN_HASH") {
    Some(v) => v,
    None => "DEV_PIN",
};

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
            println!("✅ Pinning validé : {} matches !", hash_base64);
            Ok(ServerCertVerified::assertion())
        } else {
            println!("❌ ALERTE MITM : Reçu {}", hash_base64);
            Err(Error::InvalidCertificate(rustls::CertificateError::UnknownIssuer))
        }
    }

    fn verify_tls12_signature(
        &self,
        _message: &[u8],
        _cert: &CertificateDer<'_>,
        _dss: &DigitallySignedStruct,
    ) -> Result<HandshakeSignatureValid, Error> {
        Ok(HandshakeSignatureValid::assertion())
    }

    fn verify_tls13_signature(
        &self,
        _message: &[u8],
        _cert: &CertificateDer<'_>,
        _dss: &DigitallySignedStruct,
    ) -> Result<HandshakeSignatureValid, Error> {
        Ok(HandshakeSignatureValid::assertion())
    }

    fn supported_verify_schemes(&self) -> Vec<SignatureScheme> {
        vec![
            SignatureScheme::RSA_PSS_SHA256,
            SignatureScheme::ECDSA_NISTP256_SHA256,
            SignatureScheme::ED25519,
        ]
    }
}

#[tauri::command]
async fn call_signaling(client: tauri::State<'_, reqwest::Client>) -> Result<String, String> {
    let res = client.get("https://89.168.59.45:3001/").send().await;
    match res {
        Ok(resp) => Ok(resp.text().await.map_err(|e| e.to_string())?),
        Err(e) => Err(format!("Erreur TLS : {}", e)),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Installer le provider Ring
    let _ = rustls::crypto::ring::default_provider().install_default();

    // Configuration TLS "Dangerous" (Custom Pinning)
    let crypto = rustls::ClientConfig::builder()
        .dangerous()
        .with_custom_certificate_verifier(Arc::new(MyVerifier))
        .with_no_client_auth();

    let arc_crypto = Arc::new(crypto);

    // Client HTTP partagé
    let client = reqwest::Client::builder()
        .use_preconfigured_tls((*arc_crypto).clone())
        .build()
        .expect("Failed to create client");

    // Client WebSocket partagé pour le plugin tauri-plugin-websocket (bypassing secure check via rustls)
    let ws_connector = tokio_tungstenite::Connector::Rustls(arc_crypto.clone());

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_websocket::Builder::new()
                .tls_connector(ws_connector)
                .build()
        )
        .manage(client)
        .invoke_handler(tauri::generate_handler![call_signaling])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
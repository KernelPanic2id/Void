use axum::{
    extract::ws::{Message, WebSocket, WebSocketUpgrade},
    response::IntoResponse,
    routing::get,
    Router,
};

use futures_util::{SinkExt, StreamExt};
use std::sync::{Arc, Mutex};
use tokio::sync::broadcast;

struct AppState {
    tx: broadcast::Sender<String>,
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    // Channel de broadcast (16 messages en attente max)
    let (tx, _rx) = broadcast::channel(16);
    let app_state = Arc::new(AppState { tx });

    let app = Router::new()
        .route("/ws", get(ws_handler))
        .with_state(app_state);

    let listner = tokio::net::TcpListener::bind("0.0.0.0:3001").await.unwrap();
    println!("Signaling server on port 3001");
    axum::serve(listner, app).await.unwrap();
}

async fn ws_handler(ws: WebSocketUpgrade, axum::extract::State(state): axum::extract::State<Arc<AppState>>) -> impl IntoResponse {
    ws.on_upgrade(|socket| handle_socket(socket, state))
}

async fn handle_socket(socket: WebSocket, state: Arc<AppState>) {
    let (mut sender, mut receiver) = socket.split();
    let mut rx = state.tx.subscribe();

    let mut send_task = tokio::spawn(async move {
        while let Ok(msg) = rx.recv().await {
            if sender.send(Message::Text(msg)).await.is_err() { break; }
        }
    });

    let tx = state.tx.clone();
    let mut recv_task = tokio::spawn(async move {
       while let Some(Ok(Message::Text(text))) = receiver.next().await {
           let _ = tx.send(text);
       }
    });

    // Si un task s'arrete (degage tout)

    tokio::select! {
        _ =(&mut send_task) => recv_task.abort(),
        _ = (&mut recv_task) => send_task.abort(),
    };
}
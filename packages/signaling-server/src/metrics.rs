use std::sync::Arc;
use std::time::Duration;

use once_cell::sync::Lazy;
use prometheus::{
    Encoder, Histogram, IntGauge, TextEncoder,
    register_histogram, register_int_gauge,
};

use crate::sfu::broadcast::serialize_message;
use crate::sfu::models::ServerMessage;
use crate::sfu::state::AppState;

// ---------------------------------------------------------------------------
// Metric definitions
// ---------------------------------------------------------------------------

pub static ACTIVE_PEERS: Lazy<IntGauge> = Lazy::new(|| {
    register_int_gauge!("sfu_active_peers", "Number of connected peers").unwrap()
});

pub static ACTIVE_CHANNELS: Lazy<IntGauge> = Lazy::new(|| {
    register_int_gauge!("sfu_active_channels", "Number of active channels").unwrap()
});

pub static BANDWIDTH_EGRESS: Lazy<IntGauge> = Lazy::new(|| {
    register_int_gauge!("sfu_bandwidth_egress_bps", "Outgoing bandwidth (bits/s)").unwrap()
});

pub static BANDWIDTH_INGRESS: Lazy<IntGauge> = Lazy::new(|| {
    register_int_gauge!("sfu_bandwidth_ingress_bps", "Incoming bandwidth (bits/s)").unwrap()
});

pub static PACKETS_PER_SEC: Lazy<Histogram> = Lazy::new(|| {
    register_histogram!(
        "sfu_packets_per_second",
        "RTP packets per second",
        vec![100.0, 500.0, 1000.0, 5000.0, 10000.0]
    )
    .unwrap()
});

// ---------------------------------------------------------------------------
// GET /metrics
// ---------------------------------------------------------------------------

/// Exposes Prometheus-compatible metrics.
pub async fn handler(state: axum::extract::State<Arc<AppState>>) -> String {
    let peers = state.peers.lock().await;
    let channels = state.channels.lock().await;

    ACTIVE_PEERS.set(peers.len() as i64);
    ACTIVE_CHANNELS.set(channels.len() as i64);

    let mut total_bandwidth: u64 = 0;
    for channel in channels.values() {
        for stats in channel.stats.values() {
            total_bandwidth += stats.bandwidth_bps();
        }
    }
    BANDWIDTH_EGRESS.set(total_bandwidth as i64);
    BANDWIDTH_INGRESS.set(total_bandwidth as i64);

    let encoder = TextEncoder::new();
    let mut buffer = Vec::new();
    encoder.encode(&prometheus::gather(), &mut buffer).unwrap();
    String::from_utf8(buffer).unwrap()
}

// ---------------------------------------------------------------------------
// Background stats broadcaster (runs every 2 s)
// ---------------------------------------------------------------------------

/// Spawns a periodic task that pushes bandwidth stats to each connected peer.
pub fn spawn_stats_broadcaster(state: Arc<AppState>) {
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_secs(2));
        loop {
            interval.tick().await;
            let all_stats = {
                let channels = state.channels.lock().await;
                let mut total_packets = 0u64;
                let mut stats_list = Vec::new();
                for (channel_id, channel) in channels.iter() {
                    for (user_id, stats) in channel.stats.iter() {
                        let peers = state.peers.lock().await;
                        if peers.contains_key(user_id) {
                            total_packets += stats.packets_sent;
                            stats_list.push((
                                channel_id.clone(),
                                user_id.clone(),
                                ServerMessage::Stats {
                                    user_id: user_id.clone(),
                                    bandwidth_bps: stats.bandwidth_bps(),
                                },
                            ));
                        }
                    }
                }
                PACKETS_PER_SEC.observe(total_packets as f64);
                stats_list
            };
            for (_channel_id, user_id, msg) in all_stats {
                let peers = state.peers.lock().await;
                if let Some(peer) = peers.get(&user_id) {
                    if let Some(payload) = serialize_message(&msg) {
                        let _ = peer.tx.send(payload);
                    }
                }
            }
        }
    });
}


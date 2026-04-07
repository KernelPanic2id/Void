use std::collections::{HashMap, HashSet, VecDeque};
use std::sync::Arc;
use std::time::Instant;

use tokio::sync::{Mutex, mpsc};
use webrtc::api::API;
use webrtc::peer_connection::RTCPeerConnection;
use webrtc::rtp::packet::Packet;
use webrtc::rtp_transceiver::rtp_codec::RTCRtpCodecCapability;
use webrtc::track::track_local::track_local_static_rtp::TrackLocalStaticRTP;

use super::models::ServerRegistry;
use crate::store::Store;

// ---------------------------------------------------------------------------
// SFU forwarding
// ---------------------------------------------------------------------------

/// Per-source track forwarder holding destination write handles.
#[derive(Clone)]
pub struct ForwarderState {
    pub source_user_id: String,
    pub track_id: String,
    pub stream_id: String,
    pub kind: String,
    pub codec: RTCRtpCodecCapability,
    pub destination_tracks: HashMap<String, Arc<TrackLocalStaticRTP>>,
    pub tx: mpsc::UnboundedSender<Packet>,
}

// ---------------------------------------------------------------------------
// Jitter Buffer
// ---------------------------------------------------------------------------

/// Simple jitter buffer that smooths RTP packet delivery.
pub struct JitterBuffer {
    packets: VecDeque<Packet>,
    playout_delay_ms: u32,
    clock_rate: u32,
    last_timestamp: u32,
}

impl JitterBuffer {
    pub fn new(playout_delay_ms: u32, clock_rate: u32) -> Self {
        Self {
            packets: VecDeque::with_capacity(100),
            playout_delay_ms,
            clock_rate,
            last_timestamp: 0,
        }
    }

    pub fn push(&mut self, packet: Packet) {
        let timestamp = packet.header.timestamp;
        self.packets.push_back(packet);
        self.last_timestamp = timestamp;

        let playout = self.playout_delay_ms;
        let clock = self.clock_rate;
        let last_t = self.last_timestamp;

        self.packets.retain(|p| {
            let diff = last_t.wrapping_sub(p.header.timestamp);
            let age_ms = diff * 1000 / clock;
            age_ms <= playout
        });
    }

    pub fn pop(&mut self) -> Option<Packet> {
        if let Some(front) = self.packets.front() {
            let age_ms = self.calculate_age_ms(front.header.timestamp);
            if age_ms >= self.playout_delay_ms {
                return self.packets.pop_front();
            }
        }
        None
    }

    fn calculate_age_ms(&self, timestamp: u32) -> u32 {
        if self.last_timestamp == 0 {
            return 0;
        }
        let diff = self.last_timestamp.wrapping_sub(timestamp);
        diff * 1000 / self.clock_rate
    }
}

// ---------------------------------------------------------------------------
// RTCP Statistics
// ---------------------------------------------------------------------------

/// Tracks packets sent and bytes for bandwidth estimation.
#[derive(Debug, Clone)]
pub struct RTCPStats {
    pub packets_sent: u64,
    pub bytes_sent: u64,
    pub last_update: Instant,
}

impl RTCPStats {
    pub fn new() -> Self {
        Self {
            packets_sent: 0,
            bytes_sent: 0,
            last_update: Instant::now(),
        }
    }

    pub fn update(&mut self, packets: u64, bytes: u64) {
        self.packets_sent += packets;
        self.bytes_sent += bytes;
        self.last_update = Instant::now();
    }

    pub fn bandwidth_bps(&self) -> u64 {
        let elapsed = self.last_update.elapsed().as_secs_f64();
        if elapsed > 0.0 {
            ((self.bytes_sent as f64 / elapsed) * 8.0) as u64
        } else {
            0
        }
    }
}

// ---------------------------------------------------------------------------
// Channel & Application state
// ---------------------------------------------------------------------------

/// Voice/video channel runtime state.
pub struct ChannelState {
    pub members: HashSet<String>,
    pub started_at: u64,
    pub forwarders: HashMap<String, ForwarderState>,
    pub stats: HashMap<String, RTCPStats>,
}

/// Shared application state available to all handlers.
pub struct AppState {
    pub peers: Mutex<HashMap<String, PeerSession>>,
    pub channels: Mutex<HashMap<String, ChannelState>>,
    pub server_registry: ServerRegistry,
    pub api: API,
    pub auth_store: Store,
}

/// A single user's connection and media state.
#[derive(Clone)]
pub struct PeerSession {
    pub user_id: String,
    pub username: String,
    pub channel_id: String,
    pub tx: mpsc::UnboundedSender<String>,
    pub is_muted: bool,
    pub is_deafened: bool,
    pub peer_connection: Option<Arc<RTCPeerConnection>>,
}


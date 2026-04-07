use std::collections::HashMap;
use std::sync::Arc;

use tokio::sync::mpsc;
use webrtc::ice_transport::ice_candidate::RTCIceCandidateInit;
use webrtc::ice_transport::ice_server::RTCIceServer;
use webrtc::peer_connection::configuration::RTCConfiguration;
use webrtc::peer_connection::sdp::session_description::RTCSessionDescription;
use webrtc::rtp::packet::Packet;
use webrtc::rtp_transceiver::rtp_codec::RTCRtpCodecCapability;
use webrtc::track::track_local::TrackLocalWriter;
use webrtc::track::track_local::track_local_static_rtp::TrackLocalStaticRTP;

use super::broadcast::{broadcast_to_channel, serialize_message};
use super::models::ServerMessage;
use super::state::{AppState, ForwarderState, JitterBuffer};

/// Handles an incoming SDP offer: creates a PeerConnection, sets up
/// track forwarding and produces the SDP answer.
pub async fn handle_offer(
    state: &Arc<AppState>,
    tx: &mpsc::UnboundedSender<String>,
    current_user_id: &Option<String>,
    sdp: serde_json::Value,
) {
    let uid = current_user_id.clone().unwrap_or_default();
    let sdp_str = sdp["sdp"].as_str().unwrap_or_default().to_string();
    let channel_id = {
        let peers = state.peers.lock().await;
        peers
            .get(&uid)
            .map(|p| p.channel_id.clone())
            .unwrap_or_default()
    };

    let config = RTCConfiguration {
        ice_servers: vec![RTCIceServer {
            urls: vec!["stun:stun.l.google.com:19302".to_string()],
            ..Default::default()
        }],
        ..Default::default()
    };

    let pc = Arc::new(
        state
            .api
            .new_peer_connection(config)
            .await
            .expect("Failed to create PC"),
    );

    // ICE candidate relay
    let tx_ice = tx.clone();
    pc.on_ice_candidate(Box::new(move |c| {
        let tx_c = tx_ice.clone();
        Box::pin(async move {
            if let Some(candidate) = c {
                let json = candidate.to_json().unwrap();
                let _ = tx_c.send(
                    serialize_message(&ServerMessage::Ice {
                        candidate: serde_json::to_value(json).unwrap(),
                    })
                    .unwrap(),
                );
            }
        })
    }));

    // ---- on_track: forward incoming media to all other channel members ----
    let uid_t = uid.clone();
    let channel_id_t = channel_id.clone();
    let state_t = Arc::clone(state);

    pc.on_track(Box::new(move |track, _, _| {
        let u_id = uid_t.clone();
        let c_id = channel_id_t.clone();
        let st = Arc::clone(&state_t);

        Box::pin(async move {
            let track_id = track.id().to_string();
            let stream_id = track.stream_id().to_string();
            let kind = track.kind().to_string();
            let codec = track.codec().capability.clone();

            let (tx_track, rx_track) = mpsc::unbounded_channel::<Packet>();

            // Register forwarder
            {
                let mut channels = st.channels.lock().await;
                if let Some(channel) = channels.get_mut(&c_id) {
                    channel.forwarders.insert(
                        u_id.clone(),
                        ForwarderState {
                            source_user_id: u_id.clone(),
                            track_id: track_id.clone(),
                            stream_id: stream_id.clone(),
                            kind: kind.clone(),
                            codec: codec.clone(),
                            destination_tracks: HashMap::new(),
                            tx: tx_track.clone(),
                        },
                    );
                }
            }

            broadcast_to_channel(
                &st,
                &c_id,
                &ServerMessage::TrackMap {
                    user_id: u_id.clone(),
                    track_id: track_id.clone(),
                    stream_id: stream_id.clone(),
                    kind: kind.clone(),
                },
                None,
            )
            .await;

            let members = {
                let channels = st.channels.lock().await;
                channels
                    .get(&c_id)
                    .map(|c| c.members.clone())
                    .unwrap_or_default()
            };

            for member in members {
                if member == u_id {
                    continue;
                }

                let dest_track = Arc::new(TrackLocalStaticRTP::new(
                    codec.clone(),
                    track_id.clone(),
                    stream_id.clone(),
                ));

                {
                    let mut channels = st.channels.lock().await;
                    if let Some(channel) = channels.get_mut(&c_id) {
                        if let Some(fwd) = channel.forwarders.get_mut(&u_id) {
                            fwd.destination_tracks
                                .insert(member.clone(), Arc::clone(&dest_track));
                        }
                    }
                }

                let mut peers = st.peers.lock().await;
                if let Some(peer) = peers.get_mut(&member) {
                    if let Some(other_pc) = &peer.peer_connection {
                        if other_pc
                            .add_track(
                                dest_track
                                    as Arc<
                                        dyn webrtc::track::track_local::TrackLocal + Send + Sync,
                                    >,
                            )
                            .await
                            .is_ok()
                        {
                            let other_tx = peer.tx.clone();
                            let other_pc_clone = Arc::clone(other_pc);
                            tokio::spawn(async move {
                                if let Ok(offer) = other_pc_clone.create_offer(None).await {
                                    if other_pc_clone
                                        .set_local_description(offer.clone())
                                        .await
                                        .is_ok()
                                    {
                                        let _ = other_tx.send(
                                            serialize_message(&ServerMessage::Offer {
                                                sdp: serde_json::json!({"type": "offer", "sdp": offer.sdp}),
                                            })
                                            .unwrap(),
                                        );
                                    }
                                }
                            });
                        }
                    }
                }
            }

            // Source reader → jitter buffer → channel
            tokio::spawn(async move {
                let mut jitter_buffer = JitterBuffer::new(30, 48000);
                while let Ok((packet, _)) = track.read_rtp().await {
                    jitter_buffer.push(packet);
                    while let Some(p) = jitter_buffer.pop() {
                        let _ = tx_track.send(p);
                    }
                }
            });

            // Forwarding worker → distribute to destination tracks
            tokio::spawn(async move {
                let mut rx = rx_track;
                while let Some(packet) = rx.recv().await {
                    let dest_tracks = {
                        let channels = st.channels.lock().await;
                        if let Some(channel) = channels.get(&c_id) {
                            if let Some(fwd) = channel.forwarders.get(&u_id) {
                                fwd.destination_tracks.clone()
                            } else {
                                break;
                            }
                        } else {
                            break;
                        }
                    };
                    for (dest_user, dest_track) in dest_tracks {
                        let _ = dest_track.write_rtp(&packet).await;
                        {
                            let mut channels = st.channels.lock().await;
                            if let Some(channel) = channels.get_mut(&c_id) {
                                if let Some(stats) = channel.stats.get_mut(&dest_user) {
                                    stats.update(1, packet.payload.len() as u64);
                                }
                            }
                        }
                    }
                }
            });
        })
    }));

    // ---- Catch-up: snapshot existing forwarders, then create dest tracks ----
    catchup_existing_tracks(state, &uid, &channel_id).await;

    // ---- SDP exchange ----
    pc.set_remote_description(RTCSessionDescription::offer(sdp_str).unwrap())
        .await
        .unwrap();
    let answer = pc.create_answer(None).await.unwrap();
    pc.set_local_description(answer.clone()).await.unwrap();

    if let Some(peer) = state.peers.lock().await.get_mut(&uid) {
        peer.peer_connection = Some(Arc::clone(&pc));
    }

    let _ = tx.send(
        serialize_message(&ServerMessage::Answer {
            sdp: serde_json::json!({"type": "answer", "sdp": answer.sdp}),
        })
        .unwrap(),
    );
}

/// Catches up a newly-joined peer with every existing track source in
/// the channel. Snapshots forwarder data first to avoid nested locks.
async fn catchup_existing_tracks(state: &Arc<AppState>, uid: &str, channel_id: &str) {
    // Phase 1 — read-only snapshot (lock released immediately)
    let forwarder_snapshot: Vec<(String, RTCRtpCodecCapability, String, String, String)> = {
        let channels = state.channels.lock().await;
        channels
            .get(channel_id)
            .map(|ch| {
                ch.forwarders
                    .iter()
                    .filter(|(src_id, _)| *src_id != uid)
                    .map(|(src_id, f)| {
                        (
                            src_id.clone(),
                            f.codec.clone(),
                            f.track_id.clone(),
                            f.stream_id.clone(),
                            f.kind.clone(),
                        )
                    })
                    .collect()
            })
            .unwrap_or_default()
    };

    let mut tracks_to_add: Vec<Arc<TrackLocalStaticRTP>> = Vec::new();
    let mut track_maps: Vec<ServerMessage> = Vec::new();

    // Phase 2 — create destination tracks (separate lock per iteration)
    for (source_user_id, codec, track_id, stream_id, kind) in forwarder_snapshot {
        track_maps.push(ServerMessage::TrackMap {
            user_id: source_user_id.clone(),
            track_id: track_id.clone(),
            stream_id: stream_id.clone(),
            kind,
        });

        let dest_track = Arc::new(TrackLocalStaticRTP::new(codec, track_id, stream_id));
        tracks_to_add.push(Arc::clone(&dest_track));

        let mut channels = state.channels.lock().await;
        if let Some(channel) = channels.get_mut(channel_id) {
            if let Some(fwd) = channel.forwarders.get_mut(&source_user_id) {
                fwd.destination_tracks
                    .insert(uid.to_string(), Arc::clone(&dest_track));
            }
        }
    }

    // Phase 3 — broadcast track-maps to other peers
    for track_map in track_maps {
        broadcast_to_channel(state, channel_id, &track_map, Some(uid)).await;
    }

    // Phase 4 — add all tracks to the new peer's PC, send ONE renegotiation offer
    if let Some(peer) = state.peers.lock().await.get_mut(uid) {
        if let Some(pc_ref) = &peer.peer_connection {
            for track in tracks_to_add {
                let _ = pc_ref
                    .add_track(
                        track as Arc<dyn webrtc::track::track_local::TrackLocal + Send + Sync>,
                    )
                    .await;
            }

            let tx_clone = peer.tx.clone();
            let pc_clone = Arc::clone(pc_ref);
            tokio::spawn(async move {
                if let Ok(offer) = pc_clone.create_offer(None).await {
                    if pc_clone.set_local_description(offer.clone()).await.is_ok() {
                        let _ = tx_clone.send(
                            serialize_message(&ServerMessage::Offer {
                                sdp: serde_json::json!({"type": "offer", "sdp": offer.sdp}),
                            })
                            .unwrap(),
                        );
                    }
                }
            });
        }
    }
}

/// Handles an incoming SDP answer.
pub async fn handle_answer(
    state: &Arc<AppState>,
    current_user_id: &Option<String>,
    sdp: serde_json::Value,
) {
    let uid = current_user_id.clone().unwrap_or_default();
    let sdp_str = sdp["sdp"].as_str().unwrap_or_default().to_string();
    if let Some(peer) = state.peers.lock().await.get(&uid) {
        if let Some(pc) = &peer.peer_connection {
            let _ = pc
                .set_remote_description(RTCSessionDescription::answer(sdp_str).unwrap())
                .await;
        }
    }
}

/// Handles an incoming ICE candidate.
pub async fn handle_ice(
    state: &Arc<AppState>,
    current_user_id: &Option<String>,
    candidate: serde_json::Value,
) {
    let uid = current_user_id.clone().unwrap_or_default();
    if let Some(peer) = state.peers.lock().await.get(&uid) {
        if let Some(pc) = &peer.peer_connection {
            if let Ok(c_init) = serde_json::from_value::<RTCIceCandidateInit>(candidate) {
                let _ = pc.add_ice_candidate(c_init).await;
            }
        }
    }
}


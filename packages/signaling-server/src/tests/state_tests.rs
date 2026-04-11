use webrtc::rtp::header::Header as RtpHeader;
use webrtc::rtp::packet::Packet;

use crate::sfu::state::{JitterBuffer, RTCPStats};

// ===========================================================================
// JitterBuffer
// ===========================================================================

fn make_packet(seq: u16, timestamp: u32) -> Packet {
    Packet {
        header: RtpHeader {
            sequence_number: seq,
            timestamp,
            ..Default::default()
        },
        payload: vec![0u8; 160].into(),
    }
}

// ---------------------------------------------------------------------------
// 1. Empty buffer pops nothing
// ---------------------------------------------------------------------------

#[test]
fn empty_buffer_pops_none() {
    let mut buf = JitterBuffer::new(30, 48000);
    assert!(buf.pop().is_none());
}

// ---------------------------------------------------------------------------
// 2. Single packet with enough age pops
// ---------------------------------------------------------------------------

#[test]
fn single_packet_pops_when_aged() {
    let mut buf = JitterBuffer::new(0, 48000);
    buf.push(make_packet(1, 0));
    // With playout_delay_ms=0 the packet should be immediately ready
    let pkt = buf.pop();
    assert!(pkt.is_some());
    assert_eq!(pkt.unwrap().header.sequence_number, 1);
}

// ---------------------------------------------------------------------------
// 3. Packets arrive: old packets are retained within playout window
// ---------------------------------------------------------------------------

#[test]
fn multiple_packets_within_window() {
    let mut buf = JitterBuffer::new(50, 48000);
    // 48000 Hz → 1 ms = 48 samples
    buf.push(make_packet(1, 0));
    buf.push(make_packet(2, 48 * 10)); // 10ms later
    buf.push(make_packet(3, 48 * 20)); // 20ms later

    // All packets are within 50ms of the latest, so none should be evicted.
    // But pop only returns if age >= playout_delay.
    // Packet 1 age = (48*20 - 0) * 1000 / 48000 = 20ms < 50ms → not ready
    assert!(buf.pop().is_none());
}

// ---------------------------------------------------------------------------
// 4. Old packets beyond window are evicted
// ---------------------------------------------------------------------------

#[test]
fn old_packets_evicted() {
    let mut buf = JitterBuffer::new(30, 48000);
    buf.push(make_packet(1, 0));
    // Push a much later packet: age of pkt 1 = (480000-0)*1000/48000 = 10_000ms
    buf.push(make_packet(2, 480_000));

    // Packet 1 should have been evicted during push (age > 30ms).
    // Only packet 2 remains.  Its age is 0ms so pop returns None.
    assert!(buf.pop().is_none());
}

// ---------------------------------------------------------------------------
// 5. Pop returns packet when age reaches playout delay
// ---------------------------------------------------------------------------

#[test]
fn pop_after_playout_delay() {
    let mut buf = JitterBuffer::new(20, 48000);
    // 48 samples/ms → 20ms = 960 samples
    buf.push(make_packet(1, 0));
    buf.push(make_packet(2, 960)); // exactly 20ms later

    // pkt 1 age = 960*1000/48000 = 20ms == playout_delay → ready
    let pkt = buf.pop().expect("should pop");
    assert_eq!(pkt.header.sequence_number, 1);
}

// ---------------------------------------------------------------------------
// 6. calculate_age_ms returns 0 when last_timestamp is 0
// ---------------------------------------------------------------------------

#[test]
fn age_zero_when_no_packets() {
    let mut buf = JitterBuffer::new(30, 48000);
    // No packets pushed → last_timestamp = 0 → pop returns None
    assert!(buf.pop().is_none());
}

// ===========================================================================
// RTCPStats
// ===========================================================================

// ---------------------------------------------------------------------------
// 7. New stats are zeroed
// ---------------------------------------------------------------------------

#[test]
fn new_stats_zeroed() {
    let s = RTCPStats::new();
    assert_eq!(s.packets_sent, 0);
    assert_eq!(s.bytes_sent, 0);
}

// ---------------------------------------------------------------------------
// 8. Update accumulates packets and bytes
// ---------------------------------------------------------------------------

#[test]
fn update_accumulates() {
    let mut s = RTCPStats::new();
    s.update(10, 1000);
    s.update(5, 500);
    assert_eq!(s.packets_sent, 15);
    assert_eq!(s.bytes_sent, 1500);
}

// ---------------------------------------------------------------------------
// 9. bandwidth_bps returns a non-zero value after update
// ---------------------------------------------------------------------------

#[test]
fn bandwidth_after_update() {
    let mut s = RTCPStats::new();
    s.update(100, 100_000);
    // Some time has elapsed since construction, so bps > 0
    let bps = s.bandwidth_bps();
    assert!(bps > 0, "bandwidth should be positive after sending data");
}

// ---------------------------------------------------------------------------
// 10. bandwidth_bps returns 0 when no data sent
// ---------------------------------------------------------------------------

#[test]
fn bandwidth_zero_no_data() {
    let s = RTCPStats::new();
    // bytes_sent = 0 → bps = 0
    assert_eq!(s.bandwidth_bps(), 0);
}

// ---------------------------------------------------------------------------
// 11. Constants are sensible
// ---------------------------------------------------------------------------

#[test]
fn channel_capacity_constants() {
    use crate::sfu::state::{WS_CHANNEL_CAPACITY, CHAT_HISTORY_CAP, RTP_CHANNEL_CAPACITY};
    assert!(WS_CHANNEL_CAPACITY > 0);
    assert!(CHAT_HISTORY_CAP > 0);
    assert!(RTP_CHANNEL_CAPACITY > 0);
}



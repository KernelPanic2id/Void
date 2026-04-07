use std::path::Path;
use std::sync::Arc;

use dashmap::DashMap;
use prost::Message;
use tokio::sync::Notify;

use super::PERMANENT_BANS_TOTAL;

// ---------------------------------------------------------------------------
// Protobuf record for persisted bans
// ---------------------------------------------------------------------------

#[derive(Clone, PartialEq, prost::Message)]
pub struct BanRecord {
    #[prost(string, tag = "1")]
    pub ip: String,
    #[prost(string, tag = "2")]
    pub reason: String,
    #[prost(int64, tag = "3")]
    pub banned_at_ms: i64,
    /// 0 = permanent ban.
    #[prost(int64, tag = "4")]
    pub expires_at_ms: i64,
}

/// Tracks how many times an IP has been banned recently (recidivism).
#[derive(Clone, PartialEq, prost::Message)]
pub struct RecidivismRecord {
    #[prost(string, tag = "1")]
    pub ip: String,
    /// Timestamps (epoch ms) of each ban within the sliding window.
    #[prost(int64, repeated, tag = "2")]
    pub ban_timestamps_ms: Vec<i64>,
}

#[derive(Clone, PartialEq, prost::Message)]
pub struct BanSnapshot {
    #[prost(message, repeated, tag = "1")]
    pub bans: Vec<BanRecord>,
    #[prost(message, repeated, tag = "2")]
    pub recidivism: Vec<RecidivismRecord>,
}

// ---------------------------------------------------------------------------
// In-memory ban store
// ---------------------------------------------------------------------------

/// Number of bans within the recidivism window that triggers a permanent ban.
const RECIDIVISM_THRESHOLD: usize = 3;

/// Recidivism sliding window: 7 days in milliseconds.
const RECIDIVISM_WINDOW_MS: i64 = 7 * 24 * 60 * 60 * 1000;

#[derive(Clone)]
pub struct BanStore {
    pub entries: Arc<DashMap<String, BanRecord>>,
    recidivism: Arc<DashMap<String, RecidivismRecord>>,
    dirty: Arc<Notify>,
    path: Arc<String>,
}

impl BanStore {
    /// Loads or creates the ban store from a `.bin` file.
    pub fn load(path: &str) -> Self {
        let entries = Arc::new(DashMap::new());
        let recidivism = Arc::new(DashMap::new());

        if let Ok(bytes) = std::fs::read(path) {
            if let Ok(snap) = BanSnapshot::decode(bytes.as_slice()) {
                for b in snap.bans {
                    entries.insert(b.ip.clone(), b);
                }
                for r in snap.recidivism {
                    recidivism.insert(r.ip.clone(), r);
                }
                tracing::info!(
                    "Loaded ban store ({} bans, {} recidivism records)",
                    entries.len(),
                    recidivism.len()
                );
            }
        }

        Self {
            entries,
            recidivism,
            dirty: Arc::new(Notify::new()),
            path: Arc::new(path.to_string()),
        }
    }

    /// Returns `true` if the IP is currently banned.
    pub fn is_banned(&self, ip: &str) -> bool {
        if let Some(record) = self.entries.get(ip) {
            if record.expires_at_ms == 0 {
                return true; // permanent
            }
            let now = epoch_ms();
            if now < record.expires_at_ms {
                return true;
            }
            // expired — remove lazily
            drop(record);
            self.entries.remove(ip);
            self.dirty.notify_one();
        }
        false
    }

    /// Bans an IP with a reason and optional duration (0 = permanent).
    /// Automatically escalates to permanent ban after repeated offenses.
    pub fn ban(&self, ip: String, reason: String, duration_ms: i64) {
        let now = epoch_ms();
        let effective_duration = self.apply_recidivism(&ip, now, duration_ms);
        let expires = if effective_duration == 0 {
            0
        } else {
            now + effective_duration
        };
        self.entries.insert(
            ip.clone(),
            BanRecord {
                ip,
                reason,
                banned_at_ms: now,
                expires_at_ms: expires,
            },
        );
        self.dirty.notify_one();
    }

    /// Updates the recidivism record for an IP and returns the effective
    /// ban duration (0 = permanent if threshold exceeded).
    fn apply_recidivism(&self, ip: &str, now: i64, requested_duration: i64) -> i64 {
        if requested_duration == 0 {
            return 0; // already permanent
        }

        let cutoff = now - RECIDIVISM_WINDOW_MS;
        let mut entry = self
            .recidivism
            .entry(ip.to_string())
            .or_insert_with(|| RecidivismRecord {
                ip: ip.to_string(),
                ban_timestamps_ms: Vec::new(),
            });

        let record = entry.value_mut();
        record.ban_timestamps_ms.retain(|&ts| ts > cutoff);
        record.ban_timestamps_ms.push(now);

        if record.ban_timestamps_ms.len() >= RECIDIVISM_THRESHOLD {
            PERMANENT_BANS_TOTAL.inc();
            tracing::warn!(
                "IP {ip} reached recidivism threshold ({RECIDIVISM_THRESHOLD} bans in 7d) — permanent ban"
            );
            0
        } else {
            requested_duration
        }
    }

    /// Flushes all bans and recidivism records to disk.
    pub fn flush(&self) -> Result<(), String> {
        let bans: Vec<BanRecord> = self.entries.iter().map(|r| r.value().clone()).collect();
        let recidivism: Vec<RecidivismRecord> =
            self.recidivism.iter().map(|r| r.value().clone()).collect();
        let snap = BanSnapshot { bans, recidivism };
        let buf = snap.encode_to_vec();

        let path = Path::new(self.path.as_str());
        let tmp = path.with_extension("bin.tmp");
        std::fs::write(&tmp, &buf).map_err(|e| format!("write tmp: {e}"))?;
        if path.exists() {
            std::fs::remove_file(path).map_err(|e| format!("remove old: {e}"))?;
        }
        std::fs::rename(&tmp, path).map_err(|e| format!("rename: {e}"))?;
        tracing::info!("Ban store flushed ({} entries)", self.entries.len());
        Ok(())
    }
}

/// Spawns a background flusher for the ban store.
pub fn spawn_flusher(store: BanStore) {
    tokio::spawn(async move {
        loop {
            store.dirty.notified().await;
            tokio::time::sleep(std::time::Duration::from_secs(2)).await;
            if let Err(e) = store.flush() {
                tracing::error!("Ban store flush failed: {e}");
            }
        }
    });
}

fn epoch_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}


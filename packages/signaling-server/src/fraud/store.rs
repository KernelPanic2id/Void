use std::path::Path;
use std::sync::Arc;

use dashmap::DashMap;
use prost::Message;
use tokio::sync::Notify;

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

#[derive(Clone, PartialEq, prost::Message)]
pub struct BanSnapshot {
    #[prost(message, repeated, tag = "1")]
    pub bans: Vec<BanRecord>,
}

// ---------------------------------------------------------------------------
// In-memory ban store
// ---------------------------------------------------------------------------

#[derive(Clone)]
pub struct BanStore {
    pub entries: Arc<DashMap<String, BanRecord>>,
    dirty: Arc<Notify>,
    path: Arc<String>,
}

impl BanStore {
    /// Loads or creates the ban store from a `.bin` file.
    pub fn load(path: &str) -> Self {
        let entries = Arc::new(DashMap::new());

        if let Ok(bytes) = std::fs::read(path) {
            if let Ok(snap) = BanSnapshot::decode(bytes.as_slice()) {
                for b in snap.bans {
                    entries.insert(b.ip.clone(), b);
                }
                tracing::info!("Loaded ban store ({} entries)", entries.len());
            }
        }

        Self {
            entries,
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
    pub fn ban(&self, ip: String, reason: String, duration_ms: i64) {
        let now = epoch_ms();
        let expires = if duration_ms == 0 {
            0
        } else {
            now + duration_ms
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

    /// Flushes all bans to disk.
    pub fn flush(&self) -> Result<(), String> {
        let bans: Vec<BanRecord> = self.entries.iter().map(|r| r.value().clone()).collect();
        let snap = BanSnapshot { bans };
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


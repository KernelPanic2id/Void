use serde::{Deserialize, Serialize};

use crate::store::UserRecord;

// ---------------------------------------------------------------------------
// API response types (Serialize + prost::Message for content negotiation)
// ---------------------------------------------------------------------------

/// Public user profile returned to clients (no password hash).
#[derive(Clone, PartialEq, Serialize, prost::Message)]
#[serde(rename_all = "camelCase")]
pub struct UserProfile {
    #[prost(string, tag = "1")]
    pub id: String,
    #[prost(string, tag = "2")]
    pub username: String,
    #[prost(string, tag = "3")]
    pub display_name: String,
    #[prost(string, optional, tag = "4")]
    pub avatar: Option<String>,
    #[prost(string, optional, tag = "5")]
    pub public_key: Option<String>,
    #[prost(int64, tag = "6")]
    pub created_at_ms: i64,
}

impl From<&UserRecord> for UserProfile {
    fn from(u: &UserRecord) -> Self {
        Self {
            id: u.id.clone(),
            username: u.username.clone(),
            display_name: u.display_name.clone(),
            avatar: u.avatar.clone(),
            public_key: u.public_key.clone(),
            created_at_ms: u.created_at_ms,
        }
    }
}

/// Minimal user info for friend lists and search results.
#[derive(Clone, PartialEq, Serialize, prost::Message)]
#[serde(rename_all = "camelCase")]
pub struct UserSummary {
    #[prost(string, tag = "1")]
    pub id: String,
    #[prost(string, tag = "2")]
    pub username: String,
    #[prost(string, tag = "3")]
    pub display_name: String,
    #[prost(string, optional, tag = "4")]
    pub avatar: Option<String>,
}

impl From<&UserRecord> for UserSummary {
    fn from(u: &UserRecord) -> Self {
        Self {
            id: u.id.clone(),
            username: u.username.clone(),
            display_name: u.display_name.clone(),
            avatar: u.avatar.clone(),
        }
    }
}

/// Friend request with embedded sender profile.
#[derive(Clone, PartialEq, Serialize, prost::Message)]
#[serde(rename_all = "camelCase")]
pub struct PendingRequest {
    #[prost(string, tag = "1")]
    pub id: String,
    #[prost(message, optional, tag = "2")]
    pub from: Option<UserSummary>,
    #[prost(int64, tag = "3")]
    pub created_at_ms: i64,
}

/// Auth response returned after login/register.
#[derive(Clone, PartialEq, Serialize, prost::Message)]
#[serde(rename_all = "camelCase")]
pub struct AuthResponse {
    #[prost(string, tag = "1")]
    pub token: String,
    #[prost(message, optional, tag = "2")]
    pub user: Option<UserProfile>,
}

/// JWT claims payload.
#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub exp: usize,
}

// ---------------------------------------------------------------------------
// Request bodies (Deserialize + prost::Message for content negotiation)
// ---------------------------------------------------------------------------

#[derive(Clone, PartialEq, Deserialize, prost::Message)]
#[serde(rename_all = "camelCase")]
pub struct RegisterBody {
    #[prost(string, tag = "1")]
    pub username: String,
    #[prost(string, tag = "2")]
    pub password: String,
    #[prost(string, tag = "3")]
    pub display_name: String,
    #[prost(string, optional, tag = "4")]
    pub public_key: Option<String>,
}

#[derive(Clone, PartialEq, Deserialize, prost::Message)]
#[serde(rename_all = "camelCase")]
pub struct LoginBody {
    #[prost(string, tag = "1")]
    pub username: String,
    #[prost(string, tag = "2")]
    pub password: String,
}

#[derive(Clone, PartialEq, Deserialize, prost::Message)]
#[serde(rename_all = "camelCase")]
pub struct UpdateProfileBody {
    #[prost(string, optional, tag = "1")]
    pub display_name: Option<String>,
    #[prost(string, optional, tag = "2")]
    pub avatar: Option<String>,
}

#[derive(Clone, PartialEq, Deserialize, prost::Message)]
#[serde(rename_all = "camelCase")]
pub struct FriendRequestBody {
    #[prost(string, tag = "1")]
    pub to_user_id: String,
}

#[derive(Debug, Deserialize)]
pub struct SearchQuery {
    pub q: String,
}

// ---------------------------------------------------------------------------
// Typed responses (replace ad-hoc serde_json::json!)
// ---------------------------------------------------------------------------

/// Generic status response.
#[derive(Clone, PartialEq, Serialize, prost::Message)]
pub struct StatusResponse {
    #[prost(string, tag = "1")]
    pub status: String,
}

/// Friend request creation result.
#[derive(Clone, PartialEq, Serialize, prost::Message)]
pub struct FriendRequestResult {
    #[prost(string, tag = "1")]
    pub id: String,
    #[prost(string, tag = "2")]
    pub status: String,
}

/// Removal confirmation.
#[derive(Clone, PartialEq, Serialize, prost::Message)]
pub struct RemovedResponse {
    #[prost(bool, tag = "1")]
    pub removed: bool,
}

// ---------------------------------------------------------------------------
// List wrappers (protobuf needs a root message for repeated fields)
// ---------------------------------------------------------------------------

/// Wrapped list of UserSummary for protobuf encoding.
#[derive(Clone, PartialEq, Serialize, prost::Message)]
pub struct UserSummaryList {
    #[prost(message, repeated, tag = "1")]
    pub items: Vec<UserSummary>,
}

/// Wrapped list of PendingRequest for protobuf encoding.
#[derive(Clone, PartialEq, Serialize, prost::Message)]
pub struct PendingRequestList {
    #[prost(message, repeated, tag = "1")]
    pub items: Vec<PendingRequest>,
}

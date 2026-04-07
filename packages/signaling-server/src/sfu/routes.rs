use std::sync::Arc;

use axum::extract::{Path, State};
use axum::http::HeaderMap;
use axum::routing::{delete, get, post};
use axum::{Json, Router};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::crypto;
use super::models::{Server, ServerChannel};
use super::state::AppState;
use crate::auth::middleware::AuthUser;
use crate::errors::ApiError;

// ---------------------------------------------------------------------------
// Request / Response DTOs
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateServerBody {
    pub name: String,
    pub owner_public_key: String,
    pub timestamp: i64,
    pub signature: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JoinServerBody {
    pub invite_key: String,
    pub user_public_key: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SignedAdminBody {
    pub owner_public_key: String,
    pub timestamp: i64,
    pub signature: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateChannelBody {
    pub name: String,
    pub r#type: String,
    pub owner_public_key: String,
    pub timestamp: i64,
    pub signature: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerResponse {
    pub id: String,
    pub name: String,
    pub owner_public_key: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub invite_key: Option<String>,
    pub icon: Option<String>,
    pub channels: Vec<ServerChannel>,
    pub members: Vec<String>,
}

impl ServerResponse {
    /// Builds a response, optionally revealing the invite key (owner only).
    fn from_server(s: &Server, reveal_invite_key: bool) -> Self {
        Self {
            id: s.id.clone(),
            name: s.name.clone(),
            owner_public_key: s.owner_public_key.clone(),
            invite_key: if reveal_invite_key {
                Some(s.invite_key.clone())
            } else {
                None
            },
            icon: s.icon.clone(),
            channels: s.channels.clone(),
            members: s.members.clone(),
        }
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Resolves the caller's Ed25519 public key from the JWT in Authorization header.
fn resolve_caller_public_key(state: &AppState, headers: &HeaderMap) -> Option<String> {
    let auth_user = AuthUser::from_headers(headers).ok()?;
    let record = state.auth_store.users.get(&auth_user.user_id)?;
    record.public_key.clone()
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", post(create_server).get(list_servers))
        .route("/join-by-invite", post(join_by_invite))
        .route("/{id}", get(get_server).delete(delete_server))
        .route("/{id}/join", post(join_server))
        .route("/{id}/channels", post(create_channel))
        .route("/{id}/channels/{channel_id}", delete(delete_channel))
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

/// POST /api/servers — creates a server with ownership proof.
async fn create_server(
    State(state): State<Arc<AppState>>,
    Json(body): Json<CreateServerBody>,
) -> Result<Json<ServerResponse>, ApiError> {
    let name = body.name.trim().to_string();
    if name.len() < 2 {
        return Err(ApiError::BadRequest("Name must be at least 2 characters".into()));
    }

    crypto::check_timestamp(body.timestamp)
        .map_err(|e| ApiError::BadRequest(e))?;

    let message = format!("create:{}:{}", name, body.timestamp);
    let valid = crypto::verify_signature(&body.owner_public_key, message.as_bytes(), &body.signature)
        .map_err(|e| ApiError::BadRequest(e))?;

    if !valid {
        return Err(ApiError::Forbidden("Invalid ownership signature".into()));
    }

    let id = Uuid::new_v4().to_string();
    let invite_key = Uuid::new_v4().to_string();

    let server = Server {
        id: id.clone(),
        name,
        owner_public_key: body.owner_public_key.clone(),
        invite_key,
        icon: None,
        channels: vec![
            ServerChannel {
                id: Uuid::new_v4().to_string(),
                name: "general".into(),
                r#type: "text".into(),
            },
            ServerChannel {
                id: Uuid::new_v4().to_string(),
                name: "General".into(),
                r#type: "voice".into(),
            },
        ],
        members: vec![body.owner_public_key],
    };

    // Owner just created the server — reveal invite key
    let response = ServerResponse::from_server(&server, true);
    state.server_registry.servers.insert(id, server);
    state.server_registry.save();

    Ok(Json(response))
}

/// GET /api/servers — lists servers where the authenticated user is a member.
/// Invite key is only revealed when the caller is the server owner.
async fn list_servers(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
) -> Json<Vec<ServerResponse>> {
    let caller_pk = resolve_caller_public_key(&state, &headers);

    let servers: Vec<ServerResponse> = state
        .server_registry
        .servers
        .iter()
        .filter(|kv| {
            caller_pk
                .as_ref()
                .map_or(false, |pk| kv.value().members.contains(pk))
        })
        .map(|kv| {
            let s = kv.value();
            let is_owner = caller_pk
                .as_ref()
                .map_or(false, |pk| *pk == s.owner_public_key);
            ServerResponse::from_server(s, is_owner)
        })
        .collect();

    Json(servers)
}

/// GET /api/servers/:id — returns a single server.
/// Invite key is only revealed when the caller is the owner.
async fn get_server(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    headers: HeaderMap,
) -> Result<Json<ServerResponse>, ApiError> {
    let caller_pk = resolve_caller_public_key(&state, &headers);

    let server = state
        .server_registry
        .servers
        .get(&id)
        .ok_or_else(|| ApiError::NotFound("Server not found".into()))?;

    let is_owner = caller_pk
        .as_ref()
        .map_or(false, |pk| *pk == server.owner_public_key);

    Ok(Json(ServerResponse::from_server(server.value(), is_owner)))
}

/// DELETE /api/servers/:id — requires ownership signature.
async fn delete_server(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    Json(body): Json<SignedAdminBody>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let server = state
        .server_registry
        .servers
        .get(&id)
        .ok_or_else(|| ApiError::NotFound("Server not found".into()))?;

    if server.owner_public_key != body.owner_public_key {
        return Err(ApiError::Forbidden("Not the server owner".into()));
    }
    drop(server);

    crypto::check_timestamp(body.timestamp)
        .map_err(|e| ApiError::BadRequest(e))?;

    let message = format!("delete:{}:{}", id, body.timestamp);
    let valid = crypto::verify_signature(&body.owner_public_key, message.as_bytes(), &body.signature)
        .map_err(|e| ApiError::BadRequest(e))?;

    if !valid {
        return Err(ApiError::Forbidden("Invalid ownership signature".into()));
    }

    state.server_registry.servers.remove(&id);
    state.server_registry.save();

    Ok(Json(serde_json::json!({ "deleted": true })))
}

/// POST /api/servers/join-by-invite — join a server using only the invite key.
async fn join_by_invite(
    State(state): State<Arc<AppState>>,
    Json(body): Json<JoinServerBody>,
) -> Result<Json<ServerResponse>, ApiError> {
    let server_id = state
        .server_registry
        .servers
        .iter()
        .find(|kv| kv.value().invite_key == body.invite_key)
        .map(|kv| kv.key().clone())
        .ok_or_else(|| ApiError::NotFound("Invalid invite key".into()))?;

    let mut server = state
        .server_registry
        .servers
        .get_mut(&server_id)
        .ok_or_else(|| ApiError::NotFound("Server not found".into()))?;

    if !server.members.contains(&body.user_public_key) {
        server.members.push(body.user_public_key.clone());
    }

    let is_owner = server.owner_public_key == body.user_public_key;
    let response = ServerResponse::from_server(&server, is_owner);
    drop(server);
    state.server_registry.save();

    Ok(Json(response))
}

/// POST /api/servers/:id/join — join via invite key (legacy, requires server ID).
async fn join_server(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    Json(body): Json<JoinServerBody>,
) -> Result<Json<ServerResponse>, ApiError> {
    let mut server = state
        .server_registry
        .servers
        .get_mut(&id)
        .ok_or_else(|| ApiError::NotFound("Server not found".into()))?;

    if server.invite_key != body.invite_key {
        return Err(ApiError::Forbidden("Invalid invite key".into()));
    }

    if !server.members.contains(&body.user_public_key) {
        server.members.push(body.user_public_key.clone());
    }

    let is_owner = server.owner_public_key == body.user_public_key;
    let response = ServerResponse::from_server(&server, is_owner);
    drop(server);
    state.server_registry.save();

    Ok(Json(response))
}

/// POST /api/servers/:id/channels — create channel (owner only).
async fn create_channel(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    Json(body): Json<CreateChannelBody>,
) -> Result<Json<ServerResponse>, ApiError> {
    let mut server = state
        .server_registry
        .servers
        .get_mut(&id)
        .ok_or_else(|| ApiError::NotFound("Server not found".into()))?;

    if server.owner_public_key != body.owner_public_key {
        return Err(ApiError::Forbidden("Not the server owner".into()));
    }

    crypto::check_timestamp(body.timestamp)
        .map_err(|e| ApiError::BadRequest(e))?;

    let message = format!("create_channel:{}:{}:{}", id, body.name, body.timestamp);
    let valid = crypto::verify_signature(&body.owner_public_key, message.as_bytes(), &body.signature)
        .map_err(|e| ApiError::BadRequest(e))?;

    if !valid {
        return Err(ApiError::Forbidden("Invalid ownership signature".into()));
    }

    server.channels.push(ServerChannel {
        id: Uuid::new_v4().to_string(),
        name: body.name.trim().to_string(),
        r#type: body.r#type,
    });

    // Owner action — reveal invite key
    let response = ServerResponse::from_server(&*server, true);
    drop(server);
    state.server_registry.save();

    Ok(Json(response))
}

/// DELETE /api/servers/:id/channels/:channel_id — owner only.
async fn delete_channel(
    State(state): State<Arc<AppState>>,
    Path((id, channel_id)): Path<(String, String)>,
    Json(body): Json<SignedAdminBody>,
) -> Result<Json<ServerResponse>, ApiError> {
    let mut server = state
        .server_registry
        .servers
        .get_mut(&id)
        .ok_or_else(|| ApiError::NotFound("Server not found".into()))?;

    if server.owner_public_key != body.owner_public_key {
        return Err(ApiError::Forbidden("Not the server owner".into()));
    }

    crypto::check_timestamp(body.timestamp)
        .map_err(|e| ApiError::BadRequest(e))?;

    let message = format!("delete_channel:{}:{}:{}", id, channel_id, body.timestamp);
    let valid = crypto::verify_signature(&body.owner_public_key, message.as_bytes(), &body.signature)
        .map_err(|e| ApiError::BadRequest(e))?;

    if !valid {
        return Err(ApiError::Forbidden("Invalid ownership signature".into()));
    }

    server.channels.retain(|c| c.id != channel_id);

    // Owner action — reveal invite key
    let response = ServerResponse::from_server(&*server, true);
    drop(server);
    state.server_registry.save();

    Ok(Json(response))
}

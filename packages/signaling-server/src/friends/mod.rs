use axum::body::Bytes;
use axum::extract::{Path, State};
use axum::http::HeaderMap;
use axum::routing::{delete, get, post};
use axum::Router;
use uuid::Uuid;

use crate::auth::middleware::AuthUser;
use crate::errors::ApiError;
use crate::models::*;
use crate::negotiate::{accepts_proto, decode_body, negotiate, negotiate_list, Negotiated};
use crate::store::{FriendRecord, Store};

/// Builds the `/api/friends` sub-router.
pub fn router() -> Router<Store> {
    Router::new()
        .route("/", get(list_friends))
        .route("/request", post(send_request))
        .route("/pending", get(list_pending))
        .route("/:id/accept", post(accept_request))
        .route("/:id/reject", post(reject_request))
        .route("/:id", delete(remove_friend))
        .route("/by-user/:user_id", delete(remove_friend_by_user))
}

/// GET /api/friends — accepted friends list
async fn list_friends(
    State(store): State<Store>,
    headers: HeaderMap,
) -> Result<Negotiated, ApiError> {
    let proto = accepts_proto(&headers);
    let auth = AuthUser::from_headers(&headers)?;
    let friends: Vec<UserSummary> = store
        .friends
        .iter()
        .filter(|r| {
            r.value().status == "accepted"
                && (r.value().from_user_id == auth.user_id
                    || r.value().to_user_id == auth.user_id)
        })
        .filter_map(|r| {
            let other_id = if r.value().from_user_id == auth.user_id {
                &r.value().to_user_id
            } else {
                &r.value().from_user_id
            };
            store.users.get(other_id).map(|u| UserSummary::from(u.value()))
        })
        .collect();

    Ok(negotiate_list(friends, |items| UserSummaryList { items }, proto))
}

/// POST /api/friends/request — send a friend request
async fn send_request(
    State(store): State<Store>,
    headers: HeaderMap,
    body: Bytes,
) -> Result<Negotiated, ApiError> {
    let proto = accepts_proto(&headers);
    let auth = AuthUser::from_headers(&headers)?;
    let body: FriendRequestBody = decode_body(&headers, &body)?;

    if auth.user_id == body.to_user_id {
        return Err(ApiError::BadRequest("Cannot add yourself".into()));
    }
    if !store.users.contains_key(&body.to_user_id) {
        return Err(ApiError::NotFound("User not found".into()));
    }

    // Check for existing relationship in either direction
    let _existing = store.friends.iter().find(|r| {
        let f = r.value();
        (f.from_user_id == auth.user_id && f.to_user_id == body.to_user_id)
            || (f.from_user_id == body.to_user_id && f.to_user_id == auth.user_id)
    });
    if _existing.is_some() {
        return Err(ApiError::Conflict("Friend request already exists".into()));
    }

    let id = Uuid::new_v4().to_string();
    let now_ms = epoch_ms();

    store.friends.insert(
        id.clone(),
        FriendRecord {
            id: id.clone(),
            from_user_id: auth.user_id,
            to_user_id: body.to_user_id,
            status: "pending".into(),
            created_at_ms: now_ms,
        },
    );
    store.mark_dirty();

    Ok(negotiate(
        FriendRequestResult { id, status: "pending".into() },
        proto,
    ))
}

/// GET /api/friends/pending — incoming pending requests
async fn list_pending(
    State(store): State<Store>,
    headers: HeaderMap,
) -> Result<Negotiated, ApiError> {
    let proto = accepts_proto(&headers);
    let auth = AuthUser::from_headers(&headers)?;
    let pending: Vec<PendingRequest> = store
        .friends
        .iter()
        .filter(|r| r.value().to_user_id == auth.user_id && r.value().status == "pending")
        .filter_map(|r| {
            let f = r.value();
            store.users.get(&f.from_user_id).map(|u| PendingRequest {
                id: f.id.clone(),
                from: Some(UserSummary::from(u.value())),
                created_at_ms: f.created_at_ms,
            })
        })
        .collect();

    Ok(negotiate_list(pending, |items| PendingRequestList { items }, proto))
}

/// POST /api/friends/:id/accept
async fn accept_request(
    State(store): State<Store>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<Negotiated, ApiError> {
    let proto = accepts_proto(&headers);
    let auth = AuthUser::from_headers(&headers)?;
    let mut record = store
        .friends
        .get_mut(&id)
        .ok_or_else(|| ApiError::NotFound("Request not found".into()))?;

    if record.to_user_id != auth.user_id || record.status != "pending" {
        return Err(ApiError::BadRequest("Cannot accept this request".into()));
    }

    record.status = "accepted".into();
    store.mark_dirty();
    Ok(negotiate(StatusResponse { status: "accepted".into() }, proto))
}

/// POST /api/friends/:id/reject
async fn reject_request(
    State(store): State<Store>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<Negotiated, ApiError> {
    let proto = accepts_proto(&headers);
    let auth = AuthUser::from_headers(&headers)?;
    let mut record = store
        .friends
        .get_mut(&id)
        .ok_or_else(|| ApiError::NotFound("Request not found".into()))?;

    if record.to_user_id != auth.user_id || record.status != "pending" {
        return Err(ApiError::BadRequest("Cannot reject this request".into()));
    }

    record.status = "rejected".into();
    store.mark_dirty();
    Ok(negotiate(StatusResponse { status: "rejected".into() }, proto))
}

/// DELETE /api/friends/:id — remove a friend / cancel request
async fn remove_friend(
    State(store): State<Store>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<Negotiated, ApiError> {
    let proto = accepts_proto(&headers);
    let auth = AuthUser::from_headers(&headers)?;
    let record = store
        .friends
        .get(&id)
        .ok_or_else(|| ApiError::NotFound("Friendship not found".into()))?;

    if record.from_user_id != auth.user_id && record.to_user_id != auth.user_id {
        return Err(ApiError::BadRequest("Not your friendship".into()));
    }
    drop(record);

    store.friends.remove(&id);
    store.mark_dirty();
    Ok(negotiate(RemovedResponse { removed: true }, proto))
}

/// DELETE /api/friends/by-user/:user_id — removes friendship with a given user.
async fn remove_friend_by_user(
    State(store): State<Store>,
    headers: HeaderMap,
    Path(target_user_id): Path<String>,
) -> Result<Negotiated, ApiError> {
    let proto = accepts_proto(&headers);
    let auth = AuthUser::from_headers(&headers)?;

    let _entry = store.friends.iter().find(|r| {
        let f = r.value();
        (f.from_user_id == auth.user_id && f.to_user_id == target_user_id)
            || (f.from_user_id == target_user_id && f.to_user_id == auth.user_id)
    });

    let id = _entry
        .map(|e| e.value().id.clone())
        .ok_or_else(|| ApiError::NotFound("Friendship not found".into()))?;

    store.friends.remove(&id);
    store.mark_dirty();
    Ok(negotiate(RemovedResponse { removed: true }, proto))
}

fn epoch_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

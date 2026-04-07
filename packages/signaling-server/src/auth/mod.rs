pub mod jwt;
pub mod middleware;
pub mod password;

use axum::body::Bytes;
use axum::extract::{Query, State};
use axum::http::HeaderMap;
use axum::routing::{get, post};
use axum::Router;
use uuid::Uuid;

use crate::errors::ApiError;
use crate::models::*;
use crate::negotiate::{accepts_proto, decode_body, negotiate, negotiate_list, Negotiated};
use crate::store::{Store, UserRecord};
use middleware::AuthUser;

/// Builds the `/api/auth` sub-router.
pub fn router() -> Router<Store> {
    Router::new()
        .route("/register", post(register))
        .route("/login", post(login))
        .route("/me", get(me).patch(update_profile))
        .route("/users/search", get(search_users))
}

/// POST /api/auth/register
async fn register(
    State(store): State<Store>,
    headers: HeaderMap,
    body: Bytes,
) -> Result<Negotiated, ApiError> {
    let proto = accepts_proto(&headers);
    let body: RegisterBody = decode_body(&headers, &body)?;

    let username = body.username.trim().to_lowercase();
    if username.len() < 2 {
        return Err(ApiError::BadRequest("Username must be at least 2 characters".into()));
    }
    if body.password.len() < 4 {
        return Err(ApiError::BadRequest("Password must be at least 4 characters".into()));
    }
    if store.username_index.contains_key(&username) {
        return Err(ApiError::Conflict("Username already taken".into()));
    }

    let id = Uuid::new_v4().to_string();
    let pw_hash = password::hash_password(&body.password)
        .map_err(|e| ApiError::Internal(e))?;
    let now_ms = epoch_ms();

    let record = UserRecord {
        id: id.clone(),
        username: username.clone(),
        display_name: body.display_name.trim().to_string(),
        password_hash: pw_hash,
        avatar: None,
        public_key: body.public_key,
        created_at_ms: now_ms,
    };

    let profile = UserProfile::from(&record);
    store.username_index.insert(username, id.clone());
    store.users.insert(id.clone(), record);
    store.mark_dirty();

    let token = jwt::create_token(&id).map_err(|e| ApiError::Internal(e.to_string()))?;
    Ok(negotiate(AuthResponse { token, user: Some(profile) }, proto))
}

/// POST /api/auth/login
async fn login(
    State(store): State<Store>,
    headers: HeaderMap,
    body: Bytes,
) -> Result<Negotiated, ApiError> {
    let proto = accepts_proto(&headers);
    let body: LoginBody = decode_body(&headers, &body)?;

    let username = body.username.trim().to_lowercase();

    let user_id = store
        .username_index
        .get(&username)
        .map(|r| r.value().clone())
        .ok_or_else(|| ApiError::Unauthorized("Invalid credentials".into()))?;

    let record = store
        .users
        .get(&user_id)
        .ok_or_else(|| ApiError::Unauthorized("Invalid credentials".into()))?;

    if !password::verify_password(&body.password, &record.password_hash) {
        return Err(ApiError::Unauthorized("Invalid credentials".into()));
    }

    let profile = UserProfile::from(record.value());
    let token = jwt::create_token(&user_id).map_err(|e| ApiError::Internal(e.to_string()))?;
    Ok(negotiate(AuthResponse { token, user: Some(profile) }, proto))
}

/// GET /api/auth/me
async fn me(
    State(store): State<Store>,
    headers: HeaderMap,
) -> Result<Negotiated, ApiError> {
    let proto = accepts_proto(&headers);
    let auth = AuthUser::from_headers(&headers)?;
    let record = store
        .users
        .get(&auth.user_id)
        .ok_or_else(|| ApiError::NotFound("User not found".into()))?;
    Ok(negotiate(UserProfile::from(record.value()), proto))
}

/// PATCH /api/auth/me
async fn update_profile(
    State(store): State<Store>,
    headers: HeaderMap,
    body: Bytes,
) -> Result<Negotiated, ApiError> {
    let proto = accepts_proto(&headers);
    let auth = AuthUser::from_headers(&headers)?;
    let body: UpdateProfileBody = decode_body(&headers, &body)?;

    let mut record = store
        .users
        .get_mut(&auth.user_id)
        .ok_or_else(|| ApiError::NotFound("User not found".into()))?;

    if let Some(name) = body.display_name {
        record.display_name = name.trim().to_string();
    }
    if let Some(avatar) = body.avatar {
        record.avatar = Some(avatar);
    }

    let profile = UserProfile::from(&*record);
    store.mark_dirty();
    Ok(negotiate(profile, proto))
}

/// GET /api/auth/users/search?q=<query>
async fn search_users(
    State(store): State<Store>,
    headers: HeaderMap,
    Query(params): Query<SearchQuery>,
) -> Result<Negotiated, ApiError> {
    let proto = accepts_proto(&headers);
    let auth = AuthUser::from_headers(&headers)?;
    let q = params.q.trim().to_lowercase();
    if q.is_empty() {
        return Ok(negotiate_list(vec![], |items| UserSummaryList { items }, proto));
    }

    let results: Vec<UserSummary> = store
        .users
        .iter()
        .filter(|r| {
            r.value().id != auth.user_id
                && (r.value().username.to_lowercase().contains(&q)
                    || r.value().display_name.to_lowercase().contains(&q))
        })
        .take(20)
        .map(|r| UserSummary::from(r.value()))
        .collect();

    Ok(negotiate_list(results, |items| UserSummaryList { items }, proto))
}

fn epoch_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

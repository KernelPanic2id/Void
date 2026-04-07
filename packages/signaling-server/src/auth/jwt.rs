use jsonwebtoken::{DecodingKey, EncodingKey, Header, Validation, decode, encode};
use crate::models::Claims;

/// JWT secret from env, with dev fallback.
fn secret() -> Vec<u8> {
    std::env::var("JWT_SECRET")
        .unwrap_or_else(|_| "dev-secret-change-in-prod".into())
        .into_bytes()
}

/// Creates a signed JWT valid for 7 days.
pub fn create_token(user_id: &str) -> Result<String, jsonwebtoken::errors::Error> {
    let exp = (std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs()
        + 7 * 24 * 3600) as usize;

    let claims = Claims {
        sub: user_id.to_string(),
        exp,
    };
    encode(&Header::default(), &claims, &EncodingKey::from_secret(&secret()))
}

/// Decodes and validates a JWT, returning the embedded claims.
pub fn decode_token(token: &str) -> Result<Claims, jsonwebtoken::errors::Error> {
    let data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(&secret()),
        &Validation::default(),
    )?;
    Ok(data.claims)
}


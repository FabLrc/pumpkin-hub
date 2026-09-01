mod common;

use axum::{
    body::{to_bytes, Body},
    http::{Request, StatusCode},
};
use serde_json::Value;
use tower::ServiceExt;
use uuid::Uuid;

#[tokio::test]
async fn api_keys_cannot_manage_keys_or_inherit_admin_access() {
    let (app, pool) = common::build_test_app().await;
    let suffix = Uuid::new_v4().simple().to_string();
    let admin_name = format!("key-admin-{}", &suffix[..8]);
    let victim_name = format!("key-victim-{}", &suffix[..8]);
    let (admin_id, admin_token) = common::create_test_user(&pool, &admin_name).await;
    let (victim_id, _) = common::create_test_user(&pool, &victim_name).await;

    sqlx::query("UPDATE users SET role = 'admin' WHERE id = $1")
        .bind(admin_id)
        .execute(&pool)
        .await
        .unwrap();

    let victim_slug = format!("key-victim-{suffix}");
    sqlx::query("INSERT INTO plugins (author_id, name, slug) VALUES ($1, $2, $3)")
        .bind(victim_id)
        .bind("Victim plugin")
        .bind(&victim_slug)
        .execute(&pool)
        .await
        .unwrap();

    let create_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/api-keys")
                .header("Content-Type", "application/json")
                .header("Authorization", format!("Bearer {admin_token}"))
                .body(Body::from(
                    r#"{"name":"automation","permissions":["publish"]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(create_response.status(), StatusCode::OK);
    let body = to_bytes(create_response.into_body(), usize::MAX)
        .await
        .unwrap();
    let created: Value = serde_json::from_slice(&body).unwrap();
    let api_key = created["key"].as_str().unwrap();

    let escalation_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/api-keys")
                .header("Content-Type", "application/json")
                .header("X-API-Key", api_key)
                .body(Body::from(
                    r#"{"name":"escalated","permissions":["upload"]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(escalation_response.status(), StatusCode::FORBIDDEN);

    let admin_inheritance_response = app
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri(format!("/api/v1/plugins/{victim_slug}"))
                .header("Content-Type", "application/json")
                .header("X-API-Key", api_key)
                .body(Body::from(r#"{"name":"Hijacked"}"#))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(admin_inheritance_response.status(), StatusCode::FORBIDDEN);

    common::cleanup_test_data(&pool, &[admin_id, victim_id]).await;
}

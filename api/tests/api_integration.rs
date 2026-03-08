mod common;

use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use serde_json::Value;
use tower::ServiceExt;

// ═════════════════════════════════════════════════════════════════════════════
// Health Check
// ═════════════════════════════════════════════════════════════════════════════

#[tokio::test]
async fn health_check_returns_ok() {
    let (app, _pool) = common::build_test_app().await;

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/v1/health")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
}

// ═════════════════════════════════════════════════════════════════════════════
// Plugin CRUD Flow
// ═════════════════════════════════════════════════════════════════════════════

#[tokio::test]
async fn plugin_crud_full_lifecycle() {
    let (app, pool) = common::build_test_app().await;
    let (user_id, token) = common::create_test_user(&pool, "crud_test_user").await;

    // 1. CREATE a plugin
    let create_body = serde_json::json!({
        "name": "Integration Test Plugin",
        "short_description": "A plugin created by integration tests",
        "license": "MIT"
    });

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/plugins")
                .header("Content-Type", "application/json")
                .header("Authorization", format!("Bearer {token}"))
                .body(Body::from(serde_json::to_string(&create_body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::CREATED);

    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let plugin: Value = serde_json::from_slice(&body).unwrap();
    let slug = plugin["slug"].as_str().unwrap();

    assert_eq!(plugin["name"], "Integration Test Plugin");
    assert_eq!(plugin["license"], "MIT");
    assert!(slug.starts_with("integration-test-plugin"));

    // 2. READ the plugin by slug
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/v1/plugins/{slug}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let fetched: Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(fetched["name"], "Integration Test Plugin");

    // 3. UPDATE the plugin
    let update_body = serde_json::json!({
        "short_description": "Updated description"
    });

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri(format!("/api/v1/plugins/{slug}"))
                .header("Content-Type", "application/json")
                .header("Authorization", format!("Bearer {token}"))
                .body(Body::from(serde_json::to_string(&update_body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let updated: Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(updated["short_description"], "Updated description");

    // 4. DELETE the plugin (soft-delete)
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri(format!("/api/v1/plugins/{slug}"))
                .header("Authorization", format!("Bearer {token}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    // 5. Verify the plugin is no longer accessible (soft-deleted)
    let response = app
        .oneshot(
            Request::builder()
                .uri(format!("/api/v1/plugins/{slug}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::NOT_FOUND);

    // Cleanup
    common::cleanup_test_data(&pool, &[user_id]).await;
}

// ═════════════════════════════════════════════════════════════════════════════
// Authentication & Authorization
// ═════════════════════════════════════════════════════════════════════════════

#[tokio::test]
async fn create_plugin_requires_authentication() {
    let (app, _pool) = common::build_test_app().await;

    let body = serde_json::json!({ "name": "No Auth Plugin" });

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/plugins")
                .header("Content-Type", "application/json")
                .body(Body::from(serde_json::to_string(&body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn update_plugin_requires_ownership() {
    let (app, pool) = common::build_test_app().await;
    let (owner_id, owner_token) = common::create_test_user(&pool, "owner_user_test").await;
    let (other_id, other_token) = common::create_test_user(&pool, "other_user_test").await;

    // Owner creates a plugin
    let create_body = serde_json::json!({
        "name": "Ownership Test Plugin"
    });

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/plugins")
                .header("Content-Type", "application/json")
                .header("Authorization", format!("Bearer {owner_token}"))
                .body(Body::from(serde_json::to_string(&create_body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::CREATED);
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let plugin: Value = serde_json::from_slice(&body).unwrap();
    let slug = plugin["slug"].as_str().unwrap();

    // Other user tries to update → Forbidden
    let update_body = serde_json::json!({ "name": "Hijacked Plugin" });

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri(format!("/api/v1/plugins/{slug}"))
                .header("Content-Type", "application/json")
                .header("Authorization", format!("Bearer {other_token}"))
                .body(Body::from(serde_json::to_string(&update_body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::FORBIDDEN);

    // Cleanup
    common::cleanup_test_data(&pool, &[owner_id, other_id]).await;
}

#[tokio::test]
async fn delete_plugin_requires_ownership() {
    let (app, pool) = common::build_test_app().await;
    let (owner_id, owner_token) = common::create_test_user(&pool, "del_owner_test").await;
    let (other_id, other_token) = common::create_test_user(&pool, "del_other_test").await;

    // Owner creates a plugin
    let create_body = serde_json::json!({ "name": "Delete Test Plugin" });

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/plugins")
                .header("Content-Type", "application/json")
                .header("Authorization", format!("Bearer {owner_token}"))
                .body(Body::from(serde_json::to_string(&create_body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let plugin: Value = serde_json::from_slice(&body).unwrap();
    let slug = plugin["slug"].as_str().unwrap();

    // Other user tries to delete → Forbidden
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri(format!("/api/v1/plugins/{slug}"))
                .header("Authorization", format!("Bearer {other_token}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::FORBIDDEN);

    // Cleanup
    common::cleanup_test_data(&pool, &[owner_id, other_id]).await;
}

// ═════════════════════════════════════════════════════════════════════════════
// Validation
// ═════════════════════════════════════════════════════════════════════════════

#[tokio::test]
async fn create_plugin_with_invalid_name_returns_422() {
    let (app, pool) = common::build_test_app().await;
    let (user_id, token) = common::create_test_user(&pool, "validation_test_user").await;

    let body = serde_json::json!({ "name": "ab" }); // too short

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/plugins")
                .header("Content-Type", "application/json")
                .header("Authorization", format!("Bearer {token}"))
                .body(Body::from(serde_json::to_string(&body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::UNPROCESSABLE_ENTITY);

    common::cleanup_test_data(&pool, &[user_id]).await;
}

// ═════════════════════════════════════════════════════════════════════════════
// Pagination
// ═════════════════════════════════════════════════════════════════════════════

#[tokio::test]
async fn list_plugins_pagination_and_sorting() {
    let (app, pool) = common::build_test_app().await;
    let (user_id, token) = common::create_test_user(&pool, "pagination_test_user").await;

    // Create 3 plugins
    for i in 1..=3 {
        let body = serde_json::json!({
            "name": format!("Pagination Plugin {i}")
        });

        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/v1/plugins")
                    .header("Content-Type", "application/json")
                    .header("Authorization", format!("Bearer {token}"))
                    .body(Body::from(serde_json::to_string(&body).unwrap()))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::CREATED);
    }

    // Fetch page 1 with per_page=2
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/v1/plugins?per_page=2&page=1&sort_by=name&order=asc")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let result: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(result["pagination"]["per_page"], 2);
    assert_eq!(result["pagination"]["page"], 1);
    assert!(result["pagination"]["total"].as_i64().unwrap() >= 3);
    assert_eq!(result["data"].as_array().unwrap().len(), 2);

    // Fetch page 2
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/v1/plugins?per_page=2&page=2&sort_by=name&order=asc")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let result: Value = serde_json::from_slice(&body).unwrap();
    assert!(result["data"].as_array().unwrap().len() >= 1);

    // Cleanup
    common::cleanup_test_data(&pool, &[user_id]).await;
}

// ═════════════════════════════════════════════════════════════════════════════
// Versions Endpoint
// ═════════════════════════════════════════════════════════════════════════════

#[tokio::test]
async fn list_versions_for_existing_plugin() {
    let (app, pool) = common::build_test_app().await;
    let (user_id, token) = common::create_test_user(&pool, "versions_list_test_user").await;

    // Create a plugin
    let body = serde_json::json!({ "name": "Versions Test Plugin" });

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/plugins")
                .header("Content-Type", "application/json")
                .header("Authorization", format!("Bearer {token}"))
                .body(Body::from(serde_json::to_string(&body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let plugin: Value = serde_json::from_slice(&body).unwrap();
    let slug = plugin["slug"].as_str().unwrap();
    let plugin_id = plugin["id"].as_str().unwrap();

    // Insert a test version directly into the database
    let version_id: uuid::Uuid = sqlx::query_scalar(
        "INSERT INTO versions (plugin_id, version, changelog, is_yanked)
         VALUES ($1::uuid, '1.0.0', 'Initial release', false)
         RETURNING id",
    )
    .bind(uuid::Uuid::parse_str(plugin_id).unwrap())
    .fetch_one(&pool)
    .await
    .unwrap();

    // Fetch versions via API
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/v1/plugins/{slug}/versions"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let result: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(result["plugin_slug"], slug);
    assert_eq!(result["total"], 1);
    assert_eq!(result["versions"][0]["version"], "1.0.0");
    assert_eq!(result["versions"][0]["changelog"], "Initial release");
    assert_eq!(result["versions"][0]["is_yanked"], false);

    // Clean up version
    sqlx::query("DELETE FROM versions WHERE id = $1")
        .bind(version_id)
        .execute(&pool)
        .await
        .ok();

    common::cleanup_test_data(&pool, &[user_id]).await;
}

#[tokio::test]
async fn list_versions_for_nonexistent_plugin_returns_404() {
    let (app, _pool) = common::build_test_app().await;

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/v1/plugins/nonexistent-slug/versions")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

// ═════════════════════════════════════════════════════════════════════════════
// Version CRUD
// ═════════════════════════════════════════════════════════════════════════════

#[tokio::test]
async fn version_crud_full_lifecycle() {
    let (app, pool) = common::build_test_app().await;
    let (user_id, token) = common::create_test_user(&pool, "ver_crud_user").await;

    // Create a plugin
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/plugins")
                .header("Content-Type", "application/json")
                .header("Authorization", format!("Bearer {token}"))
                .body(Body::from(
                    serde_json::to_string(&serde_json::json!({ "name": "Version CRUD Plugin" }))
                        .unwrap(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::CREATED);

    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let plugin: Value = serde_json::from_slice(&body).unwrap();
    let slug = plugin["slug"].as_str().unwrap();

    // 1. CREATE a version
    let create_body = serde_json::json!({
        "version": "1.0.0",
        "changelog": "## Initial Release\n- First version",
        "pumpkin_version_min": "0.1.0",
        "pumpkin_version_max": "1.0.0"
    });

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/v1/plugins/{slug}/versions"))
                .header("Content-Type", "application/json")
                .header("Authorization", format!("Bearer {token}"))
                .body(Body::from(serde_json::to_string(&create_body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::CREATED);

    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let version: Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(version["version"], "1.0.0");
    assert_eq!(version["changelog"], "## Initial Release\n- First version");
    assert_eq!(version["pumpkin_version_min"], "0.1.0");
    assert_eq!(version["pumpkin_version_max"], "1.0.0");
    assert_eq!(version["downloads"], 0);
    assert_eq!(version["is_yanked"], false);

    // 2. GET version (should increment downloads)
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/v1/plugins/{slug}/versions/1.0.0"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let fetched: Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(fetched["version"], "1.0.0");
    assert_eq!(fetched["downloads"], 1);

    // 3. LIST versions
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/v1/plugins/{slug}/versions"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let list: Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(list["total"], 1);

    // 4. YANK version
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PATCH")
                .uri(format!("/api/v1/plugins/{slug}/versions/1.0.0/yank"))
                .header("Content-Type", "application/json")
                .header("Authorization", format!("Bearer {token}"))
                .body(Body::from(
                    serde_json::to_string(&serde_json::json!({ "yanked": true })).unwrap(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let yanked: Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(yanked["is_yanked"], true);

    // 5. UNYANK version
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PATCH")
                .uri(format!("/api/v1/plugins/{slug}/versions/1.0.0/yank"))
                .header("Content-Type", "application/json")
                .header("Authorization", format!("Bearer {token}"))
                .body(Body::from(
                    serde_json::to_string(&serde_json::json!({ "yanked": false })).unwrap(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let unyanked: Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(unyanked["is_yanked"], false);

    common::cleanup_test_data(&pool, &[user_id]).await;
}

#[tokio::test]
async fn create_version_requires_authentication() {
    let (app, pool) = common::build_test_app().await;
    let (user_id, token) = common::create_test_user(&pool, "ver_auth_user").await;

    // Create a plugin first
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/plugins")
                .header("Content-Type", "application/json")
                .header("Authorization", format!("Bearer {token}"))
                .body(Body::from(
                    serde_json::to_string(&serde_json::json!({ "name": "Auth Version Plugin" }))
                        .unwrap(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let plugin: Value = serde_json::from_slice(&body).unwrap();
    let slug = plugin["slug"].as_str().unwrap();

    // Try to create a version without auth
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/v1/plugins/{slug}/versions"))
                .header("Content-Type", "application/json")
                .body(Body::from(
                    serde_json::to_string(&serde_json::json!({ "version": "1.0.0" })).unwrap(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);

    common::cleanup_test_data(&pool, &[user_id]).await;
}

#[tokio::test]
async fn create_version_requires_ownership() {
    let (app, pool) = common::build_test_app().await;
    let (owner_id, owner_token) = common::create_test_user(&pool, "ver_owner_user").await;
    let (other_id, other_token) = common::create_test_user(&pool, "ver_other_user").await;

    // Owner creates a plugin
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/plugins")
                .header("Content-Type", "application/json")
                .header("Authorization", format!("Bearer {owner_token}"))
                .body(Body::from(
                    serde_json::to_string(&serde_json::json!({ "name": "Owned Version Plugin" }))
                        .unwrap(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let plugin: Value = serde_json::from_slice(&body).unwrap();
    let slug = plugin["slug"].as_str().unwrap();

    // Other user tries to create a version → Forbidden
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/v1/plugins/{slug}/versions"))
                .header("Content-Type", "application/json")
                .header("Authorization", format!("Bearer {other_token}"))
                .body(Body::from(
                    serde_json::to_string(&serde_json::json!({ "version": "1.0.0" })).unwrap(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::FORBIDDEN);

    common::cleanup_test_data(&pool, &[owner_id, other_id]).await;
}

#[tokio::test]
async fn create_duplicate_version_returns_conflict() {
    let (app, pool) = common::build_test_app().await;
    let (user_id, token) = common::create_test_user(&pool, "ver_dup_user").await;

    // Create a plugin
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/plugins")
                .header("Content-Type", "application/json")
                .header("Authorization", format!("Bearer {token}"))
                .body(Body::from(
                    serde_json::to_string(&serde_json::json!({ "name": "Dup Version Plugin" }))
                        .unwrap(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let plugin: Value = serde_json::from_slice(&body).unwrap();
    let slug = plugin["slug"].as_str().unwrap();

    let version_body = serde_json::json!({ "version": "1.0.0" });

    // Create first version
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/v1/plugins/{slug}/versions"))
                .header("Content-Type", "application/json")
                .header("Authorization", format!("Bearer {token}"))
                .body(Body::from(serde_json::to_string(&version_body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::CREATED);

    // Create duplicate version → Conflict
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/v1/plugins/{slug}/versions"))
                .header("Content-Type", "application/json")
                .header("Authorization", format!("Bearer {token}"))
                .body(Body::from(serde_json::to_string(&version_body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::CONFLICT);

    common::cleanup_test_data(&pool, &[user_id]).await;
}

#[tokio::test]
async fn create_version_with_invalid_semver_returns_422() {
    let (app, pool) = common::build_test_app().await;
    let (user_id, token) = common::create_test_user(&pool, "ver_invalid_user").await;

    // Create a plugin
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/plugins")
                .header("Content-Type", "application/json")
                .header("Authorization", format!("Bearer {token}"))
                .body(Body::from(
                    serde_json::to_string(&serde_json::json!({ "name": "Invalid Ver Plugin" }))
                        .unwrap(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let plugin: Value = serde_json::from_slice(&body).unwrap();
    let slug = plugin["slug"].as_str().unwrap();

    // Try invalid semver
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/v1/plugins/{slug}/versions"))
                .header("Content-Type", "application/json")
                .header("Authorization", format!("Bearer {token}"))
                .body(Body::from(
                    serde_json::to_string(&serde_json::json!({ "version": "not-semver" })).unwrap(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::UNPROCESSABLE_ENTITY);

    common::cleanup_test_data(&pool, &[user_id]).await;
}

#[tokio::test]
async fn get_nonexistent_version_returns_404() {
    let (app, pool) = common::build_test_app().await;
    let (user_id, token) = common::create_test_user(&pool, "ver_404_user").await;

    // Create a plugin
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/plugins")
                .header("Content-Type", "application/json")
                .header("Authorization", format!("Bearer {token}"))
                .body(Body::from(
                    serde_json::to_string(&serde_json::json!({ "name": "No Version Plugin" }))
                        .unwrap(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let plugin: Value = serde_json::from_slice(&body).unwrap();
    let slug = plugin["slug"].as_str().unwrap();

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/v1/plugins/{slug}/versions/9.9.9"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::NOT_FOUND);

    common::cleanup_test_data(&pool, &[user_id]).await;
}

#[tokio::test]
async fn download_counter_increments_on_version_fetch() {
    let (app, pool) = common::build_test_app().await;
    let (user_id, token) = common::create_test_user(&pool, "ver_dl_user").await;

    // Create plugin + version
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/plugins")
                .header("Content-Type", "application/json")
                .header("Authorization", format!("Bearer {token}"))
                .body(Body::from(
                    serde_json::to_string(
                        &serde_json::json!({ "name": "Download Counter Plugin" }),
                    )
                    .unwrap(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let plugin: Value = serde_json::from_slice(&body).unwrap();
    let slug = plugin["slug"].as_str().unwrap();

    app.clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/v1/plugins/{slug}/versions"))
                .header("Content-Type", "application/json")
                .header("Authorization", format!("Bearer {token}"))
                .body(Body::from(
                    serde_json::to_string(&serde_json::json!({ "version": "1.0.0" })).unwrap(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    // Fetch version 3 times
    for _ in 0..3 {
        app.clone()
            .oneshot(
                Request::builder()
                    .uri(format!("/api/v1/plugins/{slug}/versions/1.0.0"))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
    }

    // Check download count is 3
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/v1/plugins/{slug}/versions/1.0.0"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let ver: Value = serde_json::from_slice(&body).unwrap();
    // 3 previous + 1 current fetch = 4
    assert_eq!(ver["downloads"], 4);

    // Also check plugin-level download total
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/v1/plugins/{slug}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let p: Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(p["downloads_total"], 4);

    common::cleanup_test_data(&pool, &[user_id]).await;
}

// ═════════════════════════════════════════════════════════════════════════════
// Category Filtering
// ═════════════════════════════════════════════════════════════════════════════

#[tokio::test]
async fn list_categories_returns_ok() {
    let (app, _pool) = common::build_test_app().await;

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/v1/categories")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let categories: Vec<Value> = serde_json::from_slice(&body).unwrap();

    // The seed data should contain categories
    assert!(!categories.is_empty());
    // Each category has required fields
    for cat in &categories {
        assert!(cat["id"].is_string());
        assert!(cat["name"].is_string());
        assert!(cat["slug"].is_string());
    }
}

// ═════════════════════════════════════════════════════════════════════════════
// Auth — email/password registration
// ═════════════════════════════════════════════════════════════════════════════

#[tokio::test]
async fn register_and_login_email_flow() {
    let (app, pool) = common::build_test_app().await;

    let unique_username = format!("regtest_{}", uuid::Uuid::new_v4().simple());
    let unique_email = format!("{}@test.local", unique_username);

    // 1. Register
    let register_body = serde_json::json!({
        "username": &unique_username[..30], // Keep it short enough
        "email": unique_email,
        "password": "test-password-123"
    });

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/auth/register")
                .header("Content-Type", "application/json")
                .body(Body::from(serde_json::to_string(&register_body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    // Response should set an auth cookie
    let set_cookie = response
        .headers()
        .get("set-cookie")
        .expect("Should set auth cookie");
    assert!(set_cookie.to_str().unwrap().contains("pumpkin_hub_token"));

    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let profile: Value = serde_json::from_slice(&body).unwrap();
    let user_id = uuid::Uuid::parse_str(profile["id"].as_str().unwrap()).unwrap();

    // 2. Login with same credentials
    let login_body = serde_json::json!({
        "email": unique_email,
        "password": "test-password-123"
    });

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/auth/login")
                .header("Content-Type", "application/json")
                .body(Body::from(serde_json::to_string(&login_body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    // 3. Login with wrong password → Unauthorized
    let bad_login = serde_json::json!({
        "email": unique_email,
        "password": "wrong-password"
    });

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/auth/login")
                .header("Content-Type", "application/json")
                .body(Body::from(serde_json::to_string(&bad_login).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);

    // Cleanup
    common::cleanup_test_data(&pool, &[user_id]).await;
}

#[tokio::test]
async fn register_duplicate_username_returns_conflict() {
    let (app, pool) = common::build_test_app().await;
    let unique_base = format!("dup_{}", &uuid::Uuid::new_v4().simple().to_string()[..8]);

    let body = serde_json::json!({
        "username": &unique_base,
        "email": format!("{unique_base}@a.com"),
        "password": "test-password-123"
    });

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/auth/register")
                .header("Content-Type", "application/json")
                .body(Body::from(serde_json::to_string(&body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let resp_body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let profile: Value = serde_json::from_slice(&resp_body).unwrap();
    let user_id = uuid::Uuid::parse_str(profile["id"].as_str().unwrap()).unwrap();

    // Second registration with same username → conflict
    let body2 = serde_json::json!({
        "username": &unique_base,
        "email": format!("{unique_base}_2@b.com"),
        "password": "test-password-456"
    });

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/auth/register")
                .header("Content-Type", "application/json")
                .body(Body::from(serde_json::to_string(&body2).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::CONFLICT);

    common::cleanup_test_data(&pool, &[user_id]).await;
}

// ═════════════════════════════════════════════════════════════════════════════
// Auth — Protected Endpoints
// ═════════════════════════════════════════════════════════════════════════════

#[tokio::test]
async fn me_without_token_returns_unauthorized() {
    let (app, _pool) = common::build_test_app().await;

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/v1/auth/me")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn me_with_valid_bearer_returns_profile() {
    let (app, pool) = common::build_test_app().await;
    let (user_id, token) = common::create_test_user(&pool, "me_test_user").await;

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/v1/auth/me")
                .header("Authorization", format!("Bearer {token}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let profile: Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(profile["username"], "me_test_user");

    common::cleanup_test_data(&pool, &[user_id]).await;
}

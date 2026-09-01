mod common;

use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use tower::ServiceExt;
use uuid::Uuid;

#[tokio::test]
async fn media_mutations_require_media_to_belong_to_plugin() {
    let (app, pool) = common::build_test_app().await;
    let suffix = Uuid::new_v4().simple().to_string();
    let attacker_name = format!("media-attacker-{}", &suffix[..8]);
    let victim_name = format!("media-victim-{}", &suffix[..8]);
    let (attacker_id, attacker_token) = common::create_test_user(&pool, &attacker_name).await;
    let (victim_id, _) = common::create_test_user(&pool, &victim_name).await;

    let attacker_slug = format!("attacker-{suffix}");
    let victim_slug = format!("victim-{suffix}");
    let _: Uuid = sqlx::query_scalar(
        "INSERT INTO plugins (author_id, name, slug) VALUES ($1, $2, $3) RETURNING id",
    )
    .bind(attacker_id)
    .bind("Attacker plugin")
    .bind(&attacker_slug)
    .fetch_one(&pool)
    .await
    .unwrap();
    let victim_plugin_id: Uuid = sqlx::query_scalar(
        "INSERT INTO plugins (author_id, name, slug) VALUES ($1, $2, $3) RETURNING id",
    )
    .bind(victim_id)
    .bind("Victim plugin")
    .bind(&victim_slug)
    .fetch_one(&pool)
    .await
    .unwrap();

    let victim_media_id: Uuid = sqlx::query_scalar(
        "INSERT INTO plugin_media
            (plugin_id, uploaded_by, media_type, file_name, file_size, content_type, storage_key)
         VALUES ($1, $2, 'image', 'victim.png', 1, 'image/png', $3)
         RETURNING id",
    )
    .bind(victim_plugin_id)
    .bind(victim_id)
    .bind(format!("plugins/{victim_slug}/media/victim.png"))
    .fetch_one(&pool)
    .await
    .unwrap();

    let patch_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PATCH")
                .uri(format!(
                    "/api/v1/plugins/{attacker_slug}/media/{victim_media_id}"
                ))
                .header("Content-Type", "application/json")
                .header("Authorization", format!("Bearer {attacker_token}"))
                .body(Body::from(r#"{"caption":"hijacked"}"#))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(patch_response.status(), StatusCode::NOT_FOUND);

    let delete_response = app
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri(format!(
                    "/api/v1/plugins/{attacker_slug}/media/{victim_media_id}"
                ))
                .header("Authorization", format!("Bearer {attacker_token}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(delete_response.status(), StatusCode::NOT_FOUND);

    let media: (Uuid, Option<String>) =
        sqlx::query_as("SELECT plugin_id, caption FROM plugin_media WHERE id = $1")
            .bind(victim_media_id)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(media, (victim_plugin_id, None));

    common::cleanup_test_data(&pool, &[attacker_id, victim_id]).await;
}

// Static file serving module
use axum::{
    body::Body,
    extract::Path,
    http::{header, StatusCode, HeaderValue},
    response::{IntoResponse, Response},
};
use std::path::PathBuf;
use tokio::fs;

/// Serve static files with proper MIME types
pub async fn serve_static_file(
    Path(path): Path<String>,
    static_dir: PathBuf,
) -> impl IntoResponse {
    let file_path = static_dir.join(&path);

    // Security: Prevent directory traversal
    if !file_path.starts_with(&static_dir) {
        return (StatusCode::FORBIDDEN, "Access denied").into_response();
    }

    // Check if file exists
    if !file_path.exists() || !file_path.is_file() {
        // Try index.html for client-side routing
        let index_path = static_dir.join("index.html");
        if index_path.exists() {
            return serve_file(index_path).await;
        }
        return (StatusCode::NOT_FOUND, "File not found").into_response();
    }

    serve_file(file_path).await
}

/// Serve a specific file with proper headers
async fn serve_file(path: PathBuf) -> Response {
    match fs::read(&path).await {
        Ok(contents) => {
            let mime_type = get_mime_type(&path);

            Response::builder()
                .status(StatusCode::OK)
                .header(header::CONTENT_TYPE, mime_type)
                .header(
                    header::CACHE_CONTROL,
                    HeaderValue::from_static("public, max-age=3600"),
                )
                .body(Body::from(contents))
                .unwrap()
        }
        Err(_) => (StatusCode::INTERNAL_SERVER_ERROR, "Failed to read file").into_response(),
    }
}

/// Get MIME type based on file extension
fn get_mime_type(path: &PathBuf) -> HeaderValue {
    let extension = path
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("");

    let mime = match extension {
        "html" => "text/html; charset=utf-8",
        "css" => "text/css; charset=utf-8",
        "js" => "application/javascript; charset=utf-8",
        "json" => "application/json; charset=utf-8",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "svg" => "image/svg+xml",
        "ico" => "image/x-icon",
        "woff" => "font/woff",
        "woff2" => "font/woff2",
        "ttf" => "font/ttf",
        "eot" => "application/vnd.ms-fontobject",
        "otf" => "font/otf",
        "txt" => "text/plain; charset=utf-8",
        "pdf" => "application/pdf",
        "zip" => "application/zip",
        _ => "application/octet-stream",
    };

    HeaderValue::from_static(mime)
}

/// Serve gzipped content if available
pub async fn serve_compressed(path: PathBuf) -> Response {
    let gz_path = PathBuf::from(format!("{}.gz", path.display()));

    if gz_path.exists() {
        match fs::read(&gz_path).await {
            Ok(contents) => {
                let mime_type = get_mime_type(&path);

                return Response::builder()
                    .status(StatusCode::OK)
                    .header(header::CONTENT_TYPE, mime_type)
                    .header(header::CONTENT_ENCODING, HeaderValue::from_static("gzip"))
                    .header(
                        header::CACHE_CONTROL,
                        HeaderValue::from_static("public, max-age=31536000"),
                    )
                    .body(Body::from(contents))
                    .unwrap();
            }
            Err(_) => {}
        }
    }

    serve_file(path).await
}
// Path utilities - Resolve static file paths
use std::path::{Path, PathBuf};
use std::env;

/// Resolve the path to static files based on the environment
pub fn resolve_static_path() -> PathBuf {
    // In development, use the Next.js build output
    if cfg!(debug_assertions) {
        let mut path = env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
        path.push("../out");
        return path;
    }

    // In production, use the bundled static files
    let exe_path = env::current_exe().unwrap_or_else(|_| PathBuf::from("."));
    let mut resource_path = exe_path
        .parent()
        .unwrap_or_else(|| Path::new("."))
        .to_path_buf();

    // Platform-specific resource location
    #[cfg(target_os = "macos")]
    {
        resource_path.push("../Resources/static");
    }

    #[cfg(target_os = "windows")]
    {
        resource_path.push("static");
    }

    #[cfg(target_os = "linux")]
    {
        resource_path.push("static");
    }

    resource_path
}

/// Ensure a path exists and is accessible
pub fn ensure_path_exists(path: &Path) -> Result<(), std::io::Error> {
    if !path.exists() {
        return Err(std::io::Error::new(
            std::io::ErrorKind::NotFound,
            format!("Path does not exist: {}", path.display()),
        ));
    }

    if !path.is_dir() {
        return Err(std::io::Error::new(
            std::io::ErrorKind::InvalidInput,
            format!("Path is not a directory: {}", path.display()),
        ));
    }

    Ok(())
}

/// Normalize a path for consistent handling
pub fn normalize_path(path: &Path) -> PathBuf {
    let mut normalized = PathBuf::new();
    for component in path.components() {
        normalized.push(component);
    }
    normalized
}
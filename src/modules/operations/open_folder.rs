use crate::AppState;
use rusqlite::OptionalExtension;
use rfd::FileDialog;
use std::path::PathBuf;

#[tauri::command]
pub async fn open_folder_dialog() -> Result<Option<String>, String> {
    let folder = FileDialog::new().pick_folder();

    Ok(folder.map(|p| p.to_string_lossy().to_string()))
}

#[tauri::command]
pub async fn update_repo_path(
    state: tauri::State<'_, AppState>,
    path: String,
) -> Result<(), String> {
    let trimmed_path = path.trim();
    if trimmed_path.is_empty() {
        return Err("Repository path cannot be empty.".to_string());
    }
    let candidate_path = PathBuf::from(trimmed_path);
    if !candidate_path.exists() {
        return Err(format!("Repository path does not exist: {}", trimmed_path));
    }
    if !candidate_path.is_dir() {
        return Err(format!("Repository path is not a folder: {}", trimmed_path));
    }

    // 1. Update the path
    {
        let mut current_path = state.current_repo_path.lock().await;
        *current_path = Some(candidate_path);
    }

    // 2. Clear memory cache/stats
    {
        let mut total_lines = state.total_lines.lock().await;
        total_lines.0 = 0;
        total_lines.1 = 0;
    }

    // 3. Persist last opened repository path
    let conn = state
        .db_conn
        .get()
        .map_err(|e| format!("Failed to acquire DB connection: {}", e))?;
    conn.execute(
        "INSERT INTO app_cache (key, value, updated_at) VALUES ('last_repo_path', ?1, CURRENT_TIMESTAMP)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP",
        [trimmed_path],
    )
    .map_err(|e| format!("Failed to cache repository path: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn get_cached_repo_path(state: tauri::State<'_, AppState>) -> Result<Option<String>, String> {
    let conn = state
        .db_conn
        .get()
        .map_err(|e| format!("Failed to acquire DB connection: {}", e))?;

    conn.query_row(
        "SELECT value FROM app_cache WHERE key = 'last_repo_path' LIMIT 1",
        [],
        |row| row.get::<_, String>(0),
    )
    .optional()
    .map_err(|e| format!("Failed to load cached repository path: {}", e))
}

#[tauri::command]
pub async fn clear_cached_repo_path(state: tauri::State<'_, AppState>) -> Result<(), String> {
    let conn = state
        .db_conn
        .get()
        .map_err(|e| format!("Failed to acquire DB connection: {}", e))?;

    conn.execute(
        "DELETE FROM app_cache WHERE key = 'last_repo_path'",
        [],
    )
    .map_err(|e| format!("Failed to clear cached repository path: {}", e))?;

    Ok(())
}

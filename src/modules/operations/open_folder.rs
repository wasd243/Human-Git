use std::path::PathBuf;
use crate::AppState;
use rfd::FileDialog;

#[tauri::command]
pub async fn open_folder_dialog() -> Result<Option<String>, String> {
    let folder = FileDialog::new()
        .pick_folder();
    
    Ok(folder.map(|p| p.to_string_lossy().to_string()))
}

#[tauri::command]
pub async fn update_repo_path(state: tauri::State<'_, AppState>, path: String) -> Result<(), String> {
    // 1. Update the path
    {
        let mut current_path = state.current_repo_path.lock().await;
        *current_path = Some(PathBuf::from(&path));
    }

    // 2. Clear memory cache/stats
    {
        let mut total_lines = state.total_lines.lock().await;
        total_lines.0 = 0;
        total_lines.1 = 0;
        let mut last_sync = state.last_sync_count.lock().await;
        *last_sync = 0;
    }

    // 3. Clear DB cache (shadow_history table)
    if let Ok(conn) = state.db_conn.get() {
        let _ = conn.execute("DELETE FROM shadow_history", []);
        println!("[SYSTEM] DB Cache (shadow_history) cleared for new repository.");
    }

    Ok(())
}

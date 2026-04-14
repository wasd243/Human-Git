use serde::{Deserialize, Serialize};
use crate::modules::git::executor;
use crate::AppState;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct MutationPayload {
    pub insertions: i32,
    pub deletions: i32,
}

#[tauri::command]
pub async fn run_shadow_sync(repo_path: String) -> Result<(), String> {
    // 调用现有的同步逻辑
    executor::run_shadow_sync(&repo_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_initial_stats(state: tauri::State<'_, AppState>) -> Result<MutationPayload, String> {
    let total_lines = state.total_lines.lock().await;
    Ok(MutationPayload {
        insertions: total_lines.0,
        deletions: total_lines.1,
    })
}

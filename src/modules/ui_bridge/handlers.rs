use serde::{Deserialize, Serialize};
use crate::modules::git::executor;
use crate::modules::operations::{init, add, commit, push};
use crate::modules::repo::history;
use crate::AppState;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct MutationPayload {
    pub insertions: i32,
    pub deletions: i32,
}

#[tauri::command]
pub async fn run_shadow_sync(state: tauri::State<'_, AppState>, repo_path: Option<String>) -> Result<(), String> {
    let path = if let Some(p) = repo_path {
        if p.is_empty() || p == "." {
            let current = state.current_repo_path.lock().await;
            current.as_ref().map(|p| p.to_string_lossy().to_string()).unwrap_or(".".to_string())
        } else {
            p
        }
    } else {
        let current = state.current_repo_path.lock().await;
        current.as_ref().map(|p| p.to_string_lossy().to_string()).unwrap_or(".".to_string())
    };

    executor::run_shadow_sync(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn git_init(repo_path: String) -> Result<String, String> {
    init::init_repo(&repo_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_initial_stats(state: tauri::State<'_, AppState>) -> Result<MutationPayload, String> {
    let total_lines = state.total_lines.lock().await;
    Ok(MutationPayload {
        insertions: total_lines.0,
        deletions: total_lines.1,
    })
}

#[tauri::command]
pub async fn stage_files(state: tauri::State<'_, AppState>, paths: Vec<String>) -> Result<String, String> {
    let repo_path = {
        let current = state.current_repo_path.lock().await;
        current.as_ref().map(|p| p.to_string_lossy().to_string()).unwrap_or(".".to_string())
    };

    add::stage_files(&repo_path, paths).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn commit_changes(state: tauri::State<'_, AppState>, message: String) -> Result<String, String> {
    let repo_path = {
        let current = state.current_repo_path.lock().await;
        current.as_ref().map(|p| p.to_string_lossy().to_string()).unwrap_or(".".to_string())
    };

    tokio::task::spawn_blocking(move || {
        commit::commit_changes(&repo_path, &message)
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn push_changes(state: tauri::State<'_, AppState>) -> Result<String, String> {
    let repo_path = {
        let current = state.current_repo_path.lock().await;
        current.as_ref().map(|p| p.to_string_lossy().to_string()).unwrap_or(".".to_string())
    };

    tokio::task::spawn_blocking(move || {
        push::push_to_origin(&repo_path)
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_working_status(state: tauri::State<'_, AppState>) -> Result<Vec<history::FileStatus>, String> {
    let repo_path = {
        let current = state.current_repo_path.lock().await;
        current.as_ref().map(|p| p.to_string_lossy().to_string()).unwrap_or(".".to_string())
    };

    history::get_working_status(&repo_path).map_err(|e| e.to_string())
}

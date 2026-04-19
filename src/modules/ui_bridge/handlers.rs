use crate::modules::operations::{add, commit, commit_and_push as quick_deploy, fetch, init, pull, push, remote};
use crate::modules::repo::{diff, history};
use crate::AppState;
use serde::{Deserialize, Serialize};
use tauri::Emitter;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct MutationPayload {
    pub insertions: i32,
    pub deletions: i32,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct RemoteAddEventPayload {
    pub ok: bool,
    pub message: String,
}

async fn get_repo_path(
    repo_path: Option<String>,
    state: &AppState,
) -> Result<String, String> {
    match repo_path {
        Some(p) if !p.trim().is_empty() && p != "." => Ok(p),
        _ => {
            let current = state.current_repo_path.lock().await;
            current
                .as_ref()
                .map(|p| p.to_string_lossy().to_string())
                .ok_or_else(|| "Repository path is not selected. Choose a folder first.".to_string())
        }
    }
}

#[tauri::command]
pub async fn git_init(repo_path: String) -> Result<String, String> {
    init::init_repo(&repo_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_initial_stats(
    state: tauri::State<'_, AppState>,
    repo_path: Option<String>,
) -> Result<MutationPayload, String> {
    let path = get_repo_path(repo_path, &state).await?;

    let stats = tokio::task::spawn_blocking({
        let path = path.clone();
        move || diff::get_stats(&path)
    })
        .await
        .map_err(|e| e.to_string())?
        .map_err(|e| e.to_string())?;

    {
        let mut total_lines = state.total_lines.lock().await;
        total_lines.0 = stats.insertions;
        total_lines.1 = stats.deletions;
    }

    Ok(MutationPayload {
        insertions: stats.insertions,
        deletions: stats.deletions,
    })
}

#[tauri::command]
pub async fn stage_files(
    state: tauri::State<'_, AppState>,
    paths: Vec<String>,
) -> Result<String, String> {
    let path = get_repo_path(None, &state).await?;
    add::stage_files(&path, paths).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn commit_changes(
    state: tauri::State<'_, AppState>,
    message: String,
) -> Result<String, String> {
    let path = get_repo_path(None, &state).await?;

    tokio::task::spawn_blocking(move || commit::commit_changes(&path, &message))
        .await
        .map_err(|e| e.to_string())?
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn push_changes(
    state: tauri::State<'_, AppState>,
    force: Option<bool>,
) -> Result<String, String> {
    let path = get_repo_path(None, &state).await?;
    let force_flag = force.unwrap_or(false);

    tokio::task::spawn_blocking(move || push::push_to_origin_with_force(&path, force_flag))
        .await
        .map_err(|e| e.to_string())?
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn pull_changes(state: tauri::State<'_, AppState>) -> Result<String, String> {
    let path = get_repo_path(None, &state).await?;

    tokio::task::spawn_blocking(move || pull::pull_from_origin(&path))
        .await
        .map_err(|e| e.to_string())?
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn fetch_changes(
    state: tauri::State<'_, AppState>,
    remote: Option<String>,
    prune: Option<bool>,
) -> Result<String, String> {
    let path = get_repo_path(None, &state).await?;
    let prune_enabled = prune.unwrap_or(false);

    tokio::task::spawn_blocking(move || fetch::fetch_from_remote(&path, remote.as_deref(), prune_enabled))
        .await
        .map_err(|e| e.to_string())?
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn commit_and_push(
    state: tauri::State<'_, AppState>,
    message: Option<String>,
) -> Result<String, String> {
    let path = get_repo_path(None, &state).await?;

    tokio::task::spawn_blocking(move || {
        quick_deploy::commit_and_push(&path, message.as_deref())
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn add_remote_origin(
    state: tauri::State<'_, AppState>,
    app_handle: tauri::AppHandle,
    url: String,
) -> Result<String, String> {
    let path = get_repo_path(None, &state).await?;

    let result = tokio::task::spawn_blocking(move || remote::add_remote_origin(&path, &url))
        .await
        .map_err(|e| e.to_string())?
        .map_err(|e| e.to_string());

    let payload = match &result {
        Ok(msg) => RemoteAddEventPayload {
            ok: true,
            message: msg.clone(),
        },
        Err(err) => RemoteAddEventPayload {
            ok: false,
            message: err.clone(),
        },
    };

    let _ = app_handle.emit("remote-add-result", payload);

    result
}

#[tauri::command]
pub async fn list_remotes(
    state: tauri::State<'_, AppState>,
) -> Result<Vec<String>, String> {
    let path = get_repo_path(None, &state).await?;

    tokio::task::spawn_blocking(move || remote::list_remotes(&path))
        .await
        .map_err(|e| e.to_string())?
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_working_status(
    state: tauri::State<'_, AppState>,
) -> Result<Vec<history::FileStatus>, String> {
    let repo_path = get_repo_path(None, &state).await?;

    history::get_working_status(&repo_path).map_err(|e| e.to_string())
}

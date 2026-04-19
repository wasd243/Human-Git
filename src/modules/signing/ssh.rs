use git2::{ErrorCode, Repository};
use rfd::FileDialog;
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};

use crate::AppState;

#[derive(Debug, Clone, Serialize)]
pub struct SshKeyInfo {
    pub file_name: String,
    pub full_path: String,
    pub comment: String,
}

fn ssh_dir() -> Result<PathBuf, String> {
    #[cfg(target_os = "windows")]
    {
        let home = std::env::var("USERPROFILE")
            .map_err(|_| "USERPROFILE is not set".to_string())?;
        Ok(Path::new(&home).join(".ssh"))
    }

    #[cfg(not(target_os = "windows"))]
    {
        let home = std::env::var("HOME").map_err(|_| "HOME is not set".to_string())?;
        Ok(Path::new(&home).join(".ssh"))
    }
}

fn parse_pub_comment(pub_contents: &str) -> String {
    let line = pub_contents.lines().next().unwrap_or("").trim();
    let parts: Vec<&str> = line.split_whitespace().collect();
    if parts.len() >= 3 {
        parts[2..].join(" ")
    } else {
        String::new()
    }
}

async fn current_repo_path_from_state(state: &tauri::State<'_, AppState>) -> Result<String, String> {
    let guard = state.current_repo_path.lock().await;
    guard
        .as_ref()
        .map(|p| p.to_string_lossy().to_string())
        .ok_or_else(|| "Repository path is not selected. Choose a folder first.".to_string())
}

#[tauri::command]
pub async fn detect_ssh_keys() -> Result<Vec<SshKeyInfo>, String> {
    let dir = ssh_dir()?;
    if !dir.exists() {
        return Ok(Vec::new());
    }

    let mut keys = Vec::new();

    let entries = fs::read_dir(&dir).map_err(|e| format!("Failed to read {}: {}", dir.display(), e))?;
    for entry in entries {
        let entry = match entry {
            Ok(v) => v,
            Err(_) => continue,
        };
        let path = entry.path();
        if !path.is_file() {
            continue;
        }

        // use *.pub as source of truth so we can extract comment
        if path.extension().and_then(|e| e.to_str()) != Some("pub") {
            continue;
        }

        let private_path = path.with_extension("");
        if !private_path.is_file() {
            continue;
        }

        let pub_text = fs::read_to_string(&path).unwrap_or_default();
        let comment = parse_pub_comment(&pub_text);

        let file_name = private_path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or_default()
            .to_string();

        keys.push(SshKeyInfo {
            file_name,
            full_path: private_path.to_string_lossy().to_string(),
            comment,
        });
    }

    keys.sort_by(|a, b| a.file_name.to_lowercase().cmp(&b.file_name.to_lowercase()));
    Ok(keys)
}

#[tauri::command]
pub async fn pick_ssh_key_file() -> Result<Option<String>, String> {
    let picked = FileDialog::new()
        .set_title("Select SSH Private Key")
        .pick_file();

    Ok(picked.map(|p| p.to_string_lossy().to_string()))
}

#[tauri::command]
pub async fn enable_ssh_signing(
    state: tauri::State<'_, AppState>,
    key_path: String,
) -> Result<String, String> {
    let key_path = key_path.trim();
    if key_path.is_empty() {
        return Err("SSH key path cannot be empty.".to_string());
    }
    if !Path::new(key_path).is_file() {
        return Err(format!("SSH key file not found: {}", key_path));
    }

    let repo_path = current_repo_path_from_state(&state).await?;
    let repo = Repository::discover(&repo_path).map_err(|e| format!("Failed to open repository: {}", e))?;
    let mut cfg = repo.config().map_err(|e| format!("Failed to open Git config: {}", e))?;

    cfg.set_str("gpg.format", "ssh")
        .map_err(|e| format!("Failed to set gpg.format: {}", e))?;
    cfg.set_str("user.signingkey", key_path)
        .map_err(|e| format!("Failed to set user.signingkey: {}", e))?;
    cfg.set_bool("commit.gpgsign", true)
        .map_err(|e| format!("Failed to set commit.gpgsign: {}", e))?;

    Ok(format!("SSH commit signing enabled with key: {}", key_path))
}

#[tauri::command]
pub async fn disable_ssh_signing(
    state: tauri::State<'_, AppState>,
) -> Result<String, String> {
    let repo_path = current_repo_path_from_state(&state).await?;
    let repo = Repository::discover(&repo_path).map_err(|e| format!("Failed to open repository: {}", e))?;
    let mut cfg = repo.config().map_err(|e| format!("Failed to open Git config: {}", e))?;

    for key in ["gpg.format", "user.signingkey", "commit.gpgsign"] {
        if let Err(err) = cfg.remove(key) {
            if err.code() != ErrorCode::NotFound {
                return Err(format!("Failed to unset {}: {}", key, err));
            }
        }
    }

    Ok("SSH commit signing disabled for this repository.".to_string())
}

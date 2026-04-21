use git2::{ErrorCode, Repository};
use rfd::FileDialog;
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};

use crate::AppState;

#[derive(Debug, Clone, Serialize)]
pub struct GpgBinaryInfo {
    pub file_name: String,
    pub full_path: String,
}

fn gpg_default_dirs() -> Vec<PathBuf> {
    let mut dirs = Vec::new();

    #[cfg(target_os = "windows")]
    {
        if let Ok(pf) = std::env::var("ProgramFiles") {
            dirs.push(Path::new(&pf).join("GnuPG").join("bin"));
        }
        if let Ok(pf86) = std::env::var("ProgramFiles(x86)") {
            dirs.push(Path::new(&pf86).join("GnuPG").join("bin"));
        }
        if let Ok(local) = std::env::var("LOCALAPPDATA") {
            dirs.push(Path::new(&local).join("Programs").join("GnuPG").join("bin"));
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        dirs.push(PathBuf::from("/usr/bin"));
        dirs.push(PathBuf::from("/usr/local/bin"));
        dirs.push(PathBuf::from("/opt/homebrew/bin"));
        dirs.push(PathBuf::from("/opt/local/bin"));
    }

    dirs
}

fn normalize_gpg_program_path(input_path: &str) -> Result<PathBuf, String> {
    let trimmed = input_path.trim();
    if trimmed.is_empty() {
        return Err("GPG program path cannot be empty.".to_string());
    }

    let provided = PathBuf::from(trimmed);
    if !provided.is_file() {
        return Err(format!("GPG executable not found: {}", trimmed));
    }

    #[cfg(target_os = "windows")]
    {
        let is_exe = provided
            .extension()
            .and_then(|e| e.to_str())
            .is_some_and(|e| e.eq_ignore_ascii_case("exe"));
        if !is_exe {
            return Err("On Windows, please select a .exe file for GPG program.".to_string());
        }
    }

    Ok(provided)
}

async fn current_repo_path_from_state(state: &tauri::State<'_, AppState>) -> Result<String, String> {
    let guard = state.current_repo_path.lock().await;
    guard
        .as_ref()
        .map(|p| p.to_string_lossy().to_string())
        .ok_or_else(|| "Repository path is not selected. Choose a folder first.".to_string())
}

#[tauri::command]
pub async fn detect_gpg_binaries() -> Result<Vec<GpgBinaryInfo>, String> {
    let mut bins = Vec::new();

    for dir in gpg_default_dirs() {
        if !dir.exists() {
            continue;
        }

        let entries = match fs::read_dir(&dir) {
            Ok(v) => v,
            Err(_) => continue,
        };

        for entry in entries {
            let entry = match entry {
                Ok(v) => v,
                Err(_) => continue,
            };
            let path = entry.path();
            if !path.is_file() {
                continue;
            }

            #[cfg(target_os = "windows")]
            let valid = path
                .extension()
                .and_then(|e| e.to_str())
                .is_some_and(|e| e.eq_ignore_ascii_case("exe"));

            #[cfg(not(target_os = "windows"))]
            let valid = path
                .file_name()
                .and_then(|n| n.to_str())
                .is_some_and(|n| n.starts_with("gpg"));

            if !valid {
                continue;
            }

            let file_name = path
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or_default()
                .to_string();

            bins.push(GpgBinaryInfo {
                file_name,
                full_path: path.to_string_lossy().to_string(),
            });
        }
    }

    bins.sort_by(|a, b| a.file_name.to_lowercase().cmp(&b.file_name.to_lowercase()));
    bins.dedup_by(|a, b| a.full_path == b.full_path);

    Ok(bins)
}

#[tauri::command]
pub async fn pick_gpg_program_file() -> Result<Option<String>, String> {
    let mut dialog = FileDialog::new().set_title("Select GPG Program");

    #[cfg(target_os = "windows")]
    {
        dialog = dialog.add_filter("Executable", &["exe"]);
    }

    let picked = dialog.pick_file();
    Ok(picked.map(|p| p.to_string_lossy().to_string()))
}

#[tauri::command]
pub async fn enable_gpg_signing(
    state: tauri::State<'_, AppState>,
    gpg_program_path: String,
    signing_key: Option<String>,
) -> Result<String, String> {
    let gpg_program_path = normalize_gpg_program_path(&gpg_program_path)?;
    let gpg_program_path = gpg_program_path.to_string_lossy().to_string();

    let repo_path = current_repo_path_from_state(&state).await?;
    let repo = Repository::discover(&repo_path).map_err(|e| format!("Failed to open repository: {}", e))?;
    let mut cfg = repo.config().map_err(|e| format!("Failed to open Git config: {}", e))?;

    cfg.set_str("gpg.format", "openpgp")
        .map_err(|e| format!("Failed to set gpg.format: {}", e))?;
    cfg.set_str("gpg.program", &gpg_program_path)
        .map_err(|e| format!("Failed to set gpg.program: {}", e))?;
    cfg.set_bool("commit.gpgsign", true)
        .map_err(|e| format!("Failed to set commit.gpgsign: {}", e))?;

    match signing_key.map(|v| v.trim().to_string()).filter(|v| !v.is_empty()) {
        Some(key) => cfg
            .set_str("user.signingkey", &key)
            .map_err(|e| format!("Failed to set user.signingkey: {}", e))?,
        None => {
            if let Err(err) = cfg.remove("user.signingkey") {
                if err.code() != ErrorCode::NotFound {
                    return Err(format!("Failed to unset user.signingkey: {}", err));
                }
            }
        }
    }

    Ok(format!(
        "GPG commit signing enabled using program: {}",
        gpg_program_path
    ))
}

#[tauri::command]
pub async fn disable_gpg_signing(
    state: tauri::State<'_, AppState>,
) -> Result<String, String> {
    let repo_path = current_repo_path_from_state(&state).await?;
    let repo = Repository::discover(&repo_path).map_err(|e| format!("Failed to open repository: {}", e))?;
    let mut cfg = repo.config().map_err(|e| format!("Failed to open Git config: {}", e))?;

    for key in ["gpg.format", "gpg.program", "user.signingkey", "commit.gpgsign"] {
        if let Err(err) = cfg.remove(key) {
            if err.code() != ErrorCode::NotFound {
                return Err(format!("Failed to unset {}: {}", key, err));
            }
        }
    }

    Ok("GPG commit signing disabled for this repository.".to_string())
}

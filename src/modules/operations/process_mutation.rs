use crate::modules::repo::{diff, history};
use crate::modules::ui_bridge::handlers::MutationPayload;
use crate::AppState;
use std::path::PathBuf;
use tauri::{AppHandle, Emitter, Manager};

pub async fn process_mutation(
    paths: Vec<PathBuf>,
    repo_path: &str,
    app_handle: &AppHandle,
) -> anyhow::Result<()> {
    let log_raw = |msg: &str| {
        println!("{}", msg);
        let _ = app_handle.emit("log-event", msg.to_string());
    };

    let log_color_fn = |label: &str, msg: &str, color: &str| {
        crate::modules::shared::utils::color::log_color(label, msg, color);
        let _ = app_handle.emit("log-event", format!("{} {}", label, msg));
    };

    log_raw("--------------------------------------------------");
    log_color_fn(
        "[EVENT]",
        &format!("Real-time mutation: {:?}", paths),
        "yellow",
    );

    let statuses = match history::get_working_status(repo_path) {
        Ok(statuses) => statuses,
        Err(e) => {
            log_color_fn(
                "[ERR]",
                &format!("Failed to get working status: {}", e),
                "red",
            );
            return Ok(());
        }
    };

    let mut status_msg = String::new();
    for status in &statuses {
        status_msg.push_str(&format!("{}{} {}\n", status.x, status.y, status.path));
    }

    if !status_msg.trim().is_empty() {
        log_color_fn("[GIT]", &format!("Status:\n{}", status_msg.trim()), "cyan");
    }

    let has_changes = history::has_changes(&statuses);
    log_color_fn("[REPO]", &format!("Has changes: {}", has_changes), "magenta");
    for status in statuses {
        log_raw(&format!("  [{} {}] {}", status.x, status.y, status.path));
    }

    if has_changes {
        if let Ok(files) = history::get_uncommitted_files(repo_path) {
            if !files.is_empty() {
                log_color_fn("[FILES]", "Uncommitted changed files:", "yellow");
                for file in files.lines() {
                    log_raw(&format!("    {}", file));
                }
            }
        }
    }

    match diff::get_stats(repo_path) {
        Ok(stats) => {
            let total_changed = stats.insertions + stats.deletions;

            let state = app_handle.state::<AppState>();
            let mut total_lines = state.total_lines.lock().await;

            total_lines.0 = stats.insertions;
            total_lines.1 = stats.deletions;

            let _ = app_handle.emit(
                "git-mutation",
                MutationPayload {
                    insertions: total_lines.0,
                    deletions: total_lines.1,
                },
            );

            log_color_fn(
                "[SYSTEM]",
                &format!(
                    "You just coded {} lines, deleted {} lines today!",
                    total_lines.0, total_lines.1
                ),
                "green",
            );
            log_color_fn(
                "[SYSTEM]",
                &format!(
                    "You changed {} files, total {} lines mutated!",
                    stats.files_changed, total_changed
                ),
                "green",
            );
        }
        Err(e) => {
            eprintln!("[ERR] Failed to compute diff stats: {}", e);
            let _ = app_handle.emit(
                "log-event",
                format!("[ERR] Failed to compute diff stats: {}", e),
            );
        }
    }

    Ok(())
}

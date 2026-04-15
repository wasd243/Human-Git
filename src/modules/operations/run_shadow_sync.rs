use crate::modules::repo::{diff, history};
use crate::modules::git::executor;
use crate::modules::ui_bridge::handlers::MutationPayload;
use crate::AppState;
use std::path::PathBuf;
use tauri::{AppHandle, Emitter, Manager};

pub async fn process_mutation(paths: Vec<PathBuf>, repo_path: &str, app_handle: &AppHandle) -> anyhow::Result<()> {
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

    let status_msg = match history::get_working_status(repo_path) {
        Ok(statuses) => {
            let mut msg = String::new();
            for status in &statuses {
                msg.push_str(&format!("{}{} {}\n", status.x, status.y, status.path));
            }
            msg.trim().to_string()
        }
        Err(_) => String::new(),
    };
    
    if !status_msg.is_empty() {
        log_color_fn("[GIT]", &format!("Status:\n{}", status_msg), "cyan");
    }

    match history::get_working_status(repo_path) {
        Ok(statuses) => {
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
        }
        Err(e) => log_color_fn("[ERR]", &format!("Failed to get working status: {}", e), "red"),
    }

    match diff::get_stats(repo_path) {
        Ok(stats) => {
            let total_changed = stats.insertions + stats.deletions;

            let state = app_handle.state::<AppState>();
            let mut total_lines = state.total_lines.lock().await;
            
            total_lines.0 = stats.insertions;
            total_lines.1 = stats.deletions;

            let _ = app_handle.emit("git-mutation", MutationPayload {
                insertions: total_lines.0,
                deletions: total_lines.1,
            });

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

            let accumulated = total_lines.0 + total_lines.1;
            let mut last_sync = state.last_sync_count.lock().await;
            let delta = (accumulated - *last_sync).abs();
            if delta >= 500 {
                log_color_fn(
                    "[SYSTEM]",
                    &format!("Milestone reached: +{} new lines. Syncing...", delta),
                    "yellow",
                );

                match executor::run_shadow_sync(repo_path) {
                    Ok(_) => {
                        *last_sync = accumulated;
                        let mut ignore_until = state.ignore_events_until.lock().await;
                        *ignore_until = std::time::Instant::now() + std::time::Duration::from_millis(1500);
                        log_color_fn("[SYSTEM]", "Shadow sync finished successfully.", "green");
                    }
                    Err(e) => {
                        eprintln!("[ERR] Shadow sync failed: {}", e);
                        let _ = app_handle.emit("log-event", format!("[ERR] Shadow sync failed: {}", e));
                    }
                }
            }
            
            if let Ok(db_conn) = state.db_conn.get() {
                let _ = db_conn.execute(
                    "INSERT INTO shadow_history (file_path, diff_stats) VALUES (?1, ?2)",
                    (
                        format!("{:?}", paths),
                        status_msg,
                    ),
                );
            } else {
                eprintln!("[ERR] Failed to acquire DB connection from pool");
            }
        }
        Err(e) => {
            eprintln!("[ERR] Failed to compute diff stats: {}", e);
            let _ = app_handle.emit("log-event", format!("[ERR] Failed to compute diff stats: {}", e));
        }
    }
    
    Ok(())
}
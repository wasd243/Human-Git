use crate::modules::operations::process_mutation::process_mutation;
use crate::modules::repo::{diff, history};
use crate::modules::shared::utils::color::log_color;
use crate::modules::ui_bridge::handlers::MutationPayload;
use crate::AppState;
use ignore::gitignore::GitignoreBuilder;
use notify_debouncer_mini::{new_debouncer, notify::RecursiveMode, DebounceEventResult};
use std::collections::HashMap;
use std::time::{Duration, SystemTime};
use tauri::{AppHandle, Emitter, Manager};
use tokio::sync::mpsc;

pub async fn run_daemon(app_handle: AppHandle) -> anyhow::Result<()> {
    let log_raw = |msg: &str| {
        println!("{}", msg);
        let _ = app_handle.emit("log-event", msg.to_string());
    };

    let log_color_fn = |label: &str, msg: &str, color: &str| {
        log_color(label, msg, color);
        let _ = app_handle.emit("log-event", format!("{} {}", label, msg));
    };

    log_raw("--------------------------------------------------");
    log_raw("[SYSTEM] HumanGit Protocol Initialized.");
    log_raw("[STATUS] Monitoring baseline reality...");
    log_raw("--------------------------------------------------");

    loop {
        let current_dir = {
            let state = app_handle.state::<AppState>();
            let path_opt = state.current_repo_path.lock().await.clone();
            match path_opt {
                Some(d) => d,
                None => {
                    tokio::time::sleep(Duration::from_millis(500)).await;
                    continue;
                }
            }
        };

        log_raw(&format!("[SYSTEM] Starting watcher for: {:?}", current_dir));

        let mut builder = GitignoreBuilder::new(&current_dir);
        builder.add(current_dir.join(".gitignore"));

        let default_ignores = [
            ".git",
            ".git/*",
            "target",
            "target/*",
            ".idea",
            ".idea/*",
            "humangit_cache.db*",
            "*~",
            "*.swp",
            "*.tmp",
            ".DS_Store",
            "Thumbs.db",
            "__pycache__",
            "*.pyc",
        ];

        for glob in default_ignores {
            let _ = builder.add_line(None, glob);
        }

        let gitignore = match builder.build() {
            Ok(g) => g,
            Err(e) => {
                log_color_fn("[ERR]", &format!("Failed to build gitignore: {}", e), "red");
                tokio::time::sleep(Duration::from_secs(2)).await;
                continue;
            }
        };

        match history::get_commit_history(current_dir.to_str().unwrap_or(".")) {
            Ok(commits) => {
                log_raw("--------------------------------------------------");
                log_color_fn("[GIT]", "Recent Commit History:", "cyan");
                for commit in commits.iter().take(5) {
                    log_raw(&format!(
                        "  [{}] {} (Parents: {})",
                        commit.hash,
                        commit.message,
                        commit.parents.join(", ")
                    ));
                }
            }
            Err(e) => log_color_fn("[ERR]", &format!("Failed to get history: {}", e), "red"),
        }

        match history::get_working_status(current_dir.to_str().unwrap_or(".")) {
            Ok(statuses) => {
                let has_changes = history::has_changes(&statuses);
                if has_changes {
                    log_raw("--------------------------------------------------");
                    log_color_fn(
                        "[REPO]",
                        &format!("Current Working Status (Has changes: {})", has_changes),
                        "magenta",
                    );
                    for status in statuses {
                        log_raw(&format!("  [{} {}] {}", status.x, status.y, status.path));
                    }

                    if let Ok(files) =
                        history::get_uncommitted_files(current_dir.to_str().unwrap_or("."))
                    {
                        if !files.is_empty() {
                            log_color_fn(
                                "[FILES]",
                                "Uncommitted changed files at startup:",
                                "yellow",
                            );
                            for file in files.lines() {
                                log_raw(&format!("    {}", file));
                            }
                        }
                    }
                } else {
                    log_color_fn(
                        "[REPO]",
                        "Clean workspace: No uncommitted changes.",
                        "green",
                    );
                }
            }
            Err(e) => log_color_fn(
                "[ERR]",
                &format!("Failed to get working status: {}", e),
                "red",
            ),
        }

        match diff::get_stats(current_dir.to_str().unwrap_or(".")) {
            Ok(stats) => {
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
                        "Initial lines changed: +{} / -{}",
                        stats.insertions, stats.deletions
                    ),
                    "green",
                );
            }
            Err(e) => log_color_fn(
                "[ERR]",
                &format!("Failed to get initial diff stats: {}", e),
                "red",
            ),
        }

        let (tx, mut rx) = mpsc::channel::<DebounceEventResult>(100);

        let mut debouncer = match new_debouncer(
            Duration::from_millis(500),
            move |res: DebounceEventResult| {
                let _ = tx.blocking_send(res);
            },
        ) {
            Ok(d) => d,
            Err(e) => {
                log_color_fn("[ERR]", &format!("Watcher failed: {}", e), "red");
                tokio::time::sleep(Duration::from_secs(2)).await;
                continue;
            }
        };

        if let Err(e) = debouncer
            .watcher()
            .watch(&current_dir, RecursiveMode::Recursive)
        {
            log_color_fn("[ERR]", &format!("Watch failed: {}", e), "red");
            tokio::time::sleep(Duration::from_secs(2)).await;
            continue;
        }

        log_color_fn("[SUCCESS]", "HumanGit is now visually active.", "green");

        let watcher_dir = current_dir.clone();
        let mut last_modified_map: HashMap<std::path::PathBuf, SystemTime> = HashMap::new();

        loop {
            tokio::select! {
                res_opt = rx.recv() => {
                    match res_opt {
                        Some(res) => {
                            match res {
                                Ok(events) => {
                                    let mut mutated_paths = Vec::new();
                                    for event in events {
                                        let path = event.path;

                                        let rel_path = match path.strip_prefix(&watcher_dir) {
                                            Ok(relative) => relative,
                                            Err(_) => path.as_path(),
                                        };

                                        if let ignore::Match::Ignore(_) = gitignore.matched_path_or_any_parents(rel_path, false) {
                                            continue;
                                        }

                                        // Ignore non-essential metadata changes
                                        if let Ok(metadata) = std::fs::metadata(&path) {
                                            if let Ok(modified) = metadata.modified() {
                                                if let Some(last) = last_modified_map.get(&path) {
                                                    if *last == modified {
                                                        continue;
                                                    }
                                                }
                                                last_modified_map.insert(path.clone(), modified);
                                            }
                                        }

                                        mutated_paths.push(path);
                                    }

                                    if !mutated_paths.is_empty() {
                                        // 先通知 GUI 刷新，不依赖 process_mutation 是否成功
                                        let _ = app_handle.emit("files-changed", true);
                                        log_color_fn("[SYSTEM]", "Files changed, notifying UI...", "cyan");

                                        if let Err(e) = process_mutation(mutated_paths, watcher_dir.to_str().unwrap_or("."), &app_handle).await {
                                            log_color_fn("[ERR]", &format!("Failed to process mutation: {}", e), "red");
                                        }
                                    }
                                }
                                Err(e) => log_color_fn("[ERR]", &format!("Watch error: {:?}", e), "red"),
                            }
                        }
                        None => break,
                    }
                }
                _ = tokio::time::sleep(Duration::from_millis(1000)) => {
                    let state = app_handle.state::<AppState>();
                    let current = state.current_repo_path.lock().await.clone();
                    if current != Some(watcher_dir.clone()) {
                        log_raw("[SYSTEM] Repository path changed, restarting watcher...");
                        break;
                    }
                }
            }
        }
    }
}

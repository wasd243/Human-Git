use crate::modules::operations::run_shadow_sync::process_mutation;
use crate::modules::shared::utils::color::log_color;
use crate::modules::repo::history;
use ignore::gitignore::GitignoreBuilder;
use notify_debouncer_mini::{new_debouncer, notify::RecursiveMode, DebounceEventResult};
use std::env;
use std::time::{Duration, SystemTime};
use std::collections::HashMap;
use tauri::{AppHandle, Emitter, Manager};
use tokio::sync::mpsc;
use crate::AppState;

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

    let current_dir = match env::current_dir() {
        Ok(d) => d,
        Err(_) => return Ok(()),
    };

    let mut builder = GitignoreBuilder::new(&current_dir);
    builder.add(current_dir.join(".gitignore"));
    let gitignore = builder.build().expect("Failed to build gitignore parser");

    match history::get_commit_history() {
        Ok(commits) => {
            log_raw("--------------------------------------------------");
            log_color_fn("[GIT]", "Recent Commit History:", "cyan");
            for commit in commits.iter().take(5) {
                log_raw(&format!("  [{}] {} (Parents: {})", commit.hash, commit.message, commit.parents.join(", ")));
            }
        }
        Err(e) => log_color_fn("[ERR]", &format!("Failed to get history: {}", e), "red"),
    }

    match history::get_working_status() {
        Ok(statuses) => {
            let has_changes = history::has_changes(&statuses);
            if has_changes {
                log_raw("--------------------------------------------------");
                log_color_fn("[REPO]", &format!("Current Working Status (Has changes: {})", has_changes), "magenta");
                for status in statuses {
                    log_raw(&format!("  [{} {}] {}", status.x, status.y, status.path));
                }

                if let Ok(files) = history::get_uncommitted_files() {
                    if !files.is_empty() {
                        log_color_fn("[FILES]", "Uncommitted changed files at startup:", "yellow");
                        for file in files.lines() {
                            log_raw(&format!("    {}", file));
                        }
                    }
                }
            } else {
                log_color_fn("[REPO]", "Clean workspace: No uncommitted changes.", "green");
            }
        }
        Err(e) => log_color_fn("[ERR]", &format!("Failed to get working status: {}", e), "red"),
    }

    let (tx, mut rx) = mpsc::channel::<DebounceEventResult>(100);

    let mut debouncer = new_debouncer(
        Duration::from_millis(500),
        move |res: DebounceEventResult| {
            let _ = tx.blocking_send(res);
        },
    ).expect("Watcher failed");

    debouncer.watcher()
        .watch(&current_dir, RecursiveMode::Recursive)
        .expect("Watch failed");

    log_color_fn("[SUCCESS]", "HumanGit is now visually active.", "green");

    let watcher_dir = current_dir.clone();
    let mut last_modified_map: HashMap<std::path::PathBuf, SystemTime> = HashMap::new();

    while let Some(res) = rx.recv().await {
        // Check if we should ignore events globally right now
        {
            let state = app_handle.state::<AppState>();
            let ignore_until = *state.ignore_events_until.lock().await;
            if std::time::Instant::now() < ignore_until {
                continue;
            }
        }

        match res {
            Ok(events) => {
                let mut mutated_paths = Vec::new();
                for event in events {
                    let path = event.path;
                    let path_str = path.to_string_lossy();
                    
                    if path_str.contains(".git")
                        || path_str.contains("target")
                        || path_str.contains(".idea")
                        || path_str.contains("humangit_cache.db")
                        || path_str.ends_with('~')
                        || path_str.contains("__")
                    {
                        continue;
                    }

                    let rel_path = match path.strip_prefix(&watcher_dir) {
                        Ok(relative) => relative,
                        Err(_) => path.as_path(),
                    };

                    match gitignore.matched_path_or_any_parents(rel_path, false) {
                        ignore::Match::Ignore(_) => continue,
                        _ => {},
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
                    if let Err(e) = process_mutation(mutated_paths, &app_handle).await {
                        log_color_fn("[ERR]", &format!("Failed to process mutation: {}", e), "red");
                    }
                }
            }
            Err(e) => log_color_fn("[ERR]", &format!("Watch error: {:?}", e), "red"),
        }
    }

    Ok(())
}
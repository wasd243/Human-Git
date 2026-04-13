// 1. 声明顶级模块
mod modules {
    // 仓库核心
    pub mod repo {
        pub mod diff;
        pub mod history;
        pub mod state;
    }
    // 动作指令
    pub mod operations {
        pub mod add;
        pub mod checkout;
        pub mod commit;
        pub mod push;
    }
    // Git 底层
    pub mod git {
        pub mod executor;
        pub mod porcelain;
    }
    // 通讯桥梁
    pub mod ui_bridge {
        pub mod handlers;
    }
    // 共享工具
    pub mod shared {
        pub mod errors;

        pub mod utils {
            pub mod color;
            pub mod utils;
        }
    }
}

// 2. 引入我们需要的东西
use crate::modules::shared::utils::color;
use crate::modules::ui_bridge::handlers::{self, MutationPayload};
use ignore::gitignore::GitignoreBuilder;
use notify::{Event, RecursiveMode, Watcher};
use std::env;
use std::sync::Mutex;
use tauri::Emitter;
use tokio::sync::mpsc;

// 模块级的全局行数统计器（插入, 删除）
static TOTAL_LINES: Mutex<(i32, i32)> = Mutex::new((0, 0));
static LAST_SYNC_COUNT: Mutex<i32> = Mutex::new(0);

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![handlers::run_shadow_sync])
        .setup(|app| {
            let app_handle = app.handle().clone();

            // 保持原本的逻辑，但运行在 setup 中
            tokio::spawn(async move {
                let log_raw = |msg: &str| {
                    println!("{}", msg);
                    let _ = app_handle.emit("log-event", msg.to_string());
                };

                let log_color = |label: &str, msg: &str, color: &str| {
                    color::log_color(label, msg, color);
                    let _ = app_handle.emit("log-event", format!("{} {}", label, msg));
                };

                // 更改这些字符串，为其标上对应颜色
                log_raw("--------------------------------------------------");
                log_raw("[SYSTEM] HumanGit Protocol Initialized.");
                log_raw("[STATUS] Monitoring baseline reality...");
                log_raw("--------------------------------------------------");

                let _conn = match modules::shared::utils::utils::Database::init() {
                    Ok(c) => c,
                    Err(e) => {
                        eprintln!("[ERR] DB Init failed: {}", e);
                        return;
                    }
                };

                let current_dir = match env::current_dir() {
                    Ok(d) => d,
                    Err(_) => return,
                };

                let mut builder = GitignoreBuilder::new(&current_dir);
                // 加载项目根目录下的 .gitignore
                builder.add(current_dir.join(".gitignore"));
                let gitignore = builder.build().expect("Failed to build gitignore parser");

                let (tx, mut rx) = mpsc::channel::<Event>(100);

                // 克隆一份路径，供闭包内部计算相对路径使用
                let watcher_dir = current_dir.clone();

                let mut watcher = notify::recommended_watcher(move |res: notify::Result<Event>| {
                    if let Ok(event) = res {
                        let is_ignored = event.paths.iter().any(|p| {
                            // 1. 绝对性能优化的硬编码过滤：
                            let path_str = p.to_string_lossy();
                            if path_str.contains(".git")
                                || path_str.contains("target")
                                || path_str.contains(".idea")
                                || path_str.contains("humangit_cache.db")
                                || path_str.ends_with('~')
                                || path_str.contains("__")
                            {
                                return true;
                            }

                            // 2. 转换相对路径
                            let rel_path = match p.strip_prefix(&watcher_dir) {
                                Ok(relative) => relative,
                                Err(_) => p,
                            };

                            // 3. 忽略规则判断
                            match gitignore.matched_path_or_any_parents(rel_path, false) {
                                ignore::Match::Ignore(_) => true,
                                _ => false,
                            }
                        });

                        if !is_ignored {
                            let _ = tx.blocking_send(event);
                        }
                    }
                }).expect("Watcher failed");

                watcher.watch(&current_dir, RecursiveMode::Recursive).expect("Watch failed");

                log_color("[SUCCESS]", "HumanGit is now visually active.", "green");

                // --- 新增：初始化时打印提交历史 ---
                match modules::repo::history::get_commit_history() {
                    Ok(commits) => {
                        log_raw("--------------------------------------------------");
                        log_color("[GIT]", "Recent Commit History:", "cyan");
                        for commit in commits.iter().take(5) { // 仅展示前 5 条以保持清晰
                            log_raw(&format!("  [{}] {} (Parents: {})", commit.hash, commit.message, commit.parents.join(", ")));
                        }
                    }
                    Err(e) => log_color("[ERR]", &format!("Failed to get history: {}", e), "red"),
                }

                // --- 新增：初始化时检查未提交更改 ---
                match modules::repo::history::get_working_status() {
                    Ok(statuses) => {
                        let has_changes = modules::repo::history::has_changes(&statuses);
                        if has_changes {
                            log_raw("--------------------------------------------------");
                            log_color("[REPO]", &format!("Current Working Status (Has changes: {})", has_changes), "magenta");
                            for status in statuses {
                                log_raw(&format!("  [{} {}] {}", status.x, status.y, status.path));
                            }

                            if let Ok(files) = modules::repo::history::get_uncommitted_files() {
                                if !files.is_empty() {
                                    log_color("[FILES]", "Uncommitted changed files at startup:", "yellow");
                                    for file in files.lines() {
                                        log_raw(&format!("    {}", file));
                                    }
                                }
                            }
                        } else {
                            log_color("[REPO]", "Clean workspace: No uncommitted changes.", "green");
                        }
                    }
                    Err(e) => log_color("[ERR]", &format!("Failed to get working status: {}", e), "red"),
                }
                // ------------------------------------

                let db_conn = rusqlite::Connection::open("humangit_cache.db").expect("Could Not Open!");
                let debounce_duration = std::time::Duration::from_millis(500);

                loop {
                    // 阻塞等待第一个事件
                    let Some(mut last_event) = rx.recv().await else { break };

                    // 在 500ms 窗口内持续消费后续事件，合并为一次处理
                    let deadline = tokio::time::Instant::now() + debounce_duration;
                    loop {
                        match tokio::time::timeout_at(deadline, rx.recv()).await {
                            Ok(Some(newer_event)) => last_event = newer_event,
                            _ => break, // 超时或 channel 关闭
                        }
                    }

                    let event = last_event;

                    log_raw("--------------------------------------------------");
                    log_color(
                        "[EVENT]",
                        &format!("Real-time mutation: {:?}", event.paths),
                        "yellow",
                    );

                    let status_msg = match modules::repo::history::get_working_status() {
                        Ok(statuses) => {
                            let mut msg = String::new();
                            for status in statuses {
                                msg.push_str(&format!("{}{} {}\n", status.x, status.y, status.path));
                            }
                            msg.trim().to_string()
                        }
                        Err(_) => String::new(),
                    };
                    if !status_msg.is_empty() {
                        log_color("[GIT]", &format!("Status:\n{}", status_msg), "cyan");
                    }

                    // --- 新增：使用 history.rs 的函数获取状态并打印返回值 ---
                    match modules::repo::history::get_working_status() {
                        Ok(statuses) => {
                            let has_changes = modules::repo::history::has_changes(&statuses);
                            log_color("[REPO]", &format!("Has changes: {}", has_changes), "magenta");
                            for status in statuses {
                                log_raw(&format!("  [{} {}] {}", status.x, status.y, status.path));
                            }
                            
                            // --- 新增：打印变动的文件名 ---
                            if has_changes {
                                if let Ok(files) = modules::repo::history::get_uncommitted_files() {
                                    if !files.is_empty() {
                                        log_color("[FILES]", "Uncommitted changed files:", "yellow");
                                        for file in files.lines() {
                                            log_raw(&format!("    {}", file));
                                        }
                                    }
                                }
                            }
                            // -------------------------
                        }
                        Err(e) => log_color("[ERR]", &format!("Failed to get working status: {}", e), "red"),
                    }
                    // -----------------------------------------------------

                    match modules::repo::diff::get_stats(".") {
                        Ok(stats) => {
                            let total_changed = stats.insertions + stats.deletions;

                            let mut total = TOTAL_LINES.lock().unwrap();
                            total.0 = stats.insertions;
                            total.1 = stats.deletions;

                            // 向前端发送变动事件
                            let _ = app_handle.emit("git-mutation", MutationPayload {
                                insertions: total.0,
                                deletions: total.1,
                            });

                            log_color(
                                "[SYSTEM]",
                                &format!(
                                    "You just coded {} lines, deleted {} lines today!",
                                    total.0, total.1
                                ),
                                "green",
                            );
                            log_color(
                                "[SYSTEM]",
                                &format!(
                                    "You changed {} files, total {} lines mutated!",
                                    stats.files_changed, total_changed
                                ),
                                "green",
                            );

                            let accumulated = total.0 + total.1;
                            let mut last_sync = LAST_SYNC_COUNT.lock().unwrap();
                            let delta = (accumulated - *last_sync).abs();
                            if delta >= 500 {
                                log_color(
                                    "[SYSTEM]",
                                    &format!("Milestone reached: +{} new lines. Syncing...", delta),
                                    "yellow",
                                );

                                match modules::git::executor::run_shadow_sync(".") {
                                    Ok(_) => {
                                        *last_sync = accumulated;
                                        log_color("[SYSTEM]", "Shadow sync finished successfully.", "green");
                                    }
                                    Err(e) => {
                                        eprintln!("[ERR] Shadow sync failed: {}", e);
                                        let _ = app_handle.emit("log-event", format!("[ERR] Shadow sync failed: {}", e));
                                    }
                                }
                            }
                        }
                        Err(e) => {
                            eprintln!("[ERR] Failed to compute diff stats: {}", e);
                            let _ = app_handle.emit("log-event", format!("[ERR] Failed to compute diff stats: {}", e));
                        }
                    }

                    let _ = db_conn.execute(
                        "INSERT INTO shadow_history (file_path, diff_stats) VALUES (?1, ?2)",
                        (
                            format!("{:?}", event.paths),
                            status_msg,
                        ),
                    );
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");

    Ok(())
}

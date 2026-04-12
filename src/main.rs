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
use ignore::gitignore::GitignoreBuilder;
use notify::{Event, RecursiveMode, Watcher};
use std::env;
use std::sync::Mutex;
use tokio::sync::mpsc;

// 模块级的全局行数统计器（插入, 删除）
static TOTAL_LINES: Mutex<(i32, i32)> = Mutex::new((0, 0));
static LAST_SYNC_COUNT: Mutex<i32> = Mutex::new(0);

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // 更改这些字符串，为其标上对应颜色
    println!("--------------------------------------------------");
    println!("[SYSTEM] HumanGit Protocol Initialized.");
    println!("[STATUS] Monitoring baseline reality...");
    println!("--------------------------------------------------");

    let _conn = modules::shared::utils::utils::Database::init()?;

    let current_dir = env::current_dir()?;

    // ================= 新增：解析 .gitignore =================
    let mut builder = GitignoreBuilder::new(&current_dir);
    // 加载项目根目录下的 .gitignore
    builder.add(current_dir.join(".gitignore"));
    let gitignore = builder.build().expect("Failed to build gitignore parser");
    // =======================================================

    let (tx, mut rx) = mpsc::channel::<Event>(100);

    // 克隆一份路径，供闭包内部计算相对路径使用
    let watcher_dir = current_dir.clone();

    let mut watcher = notify::recommended_watcher(move |res: notify::Result<Event>| {
        if let Ok(event) = res {
            let is_ignored = event.paths.iter().any(|p| {
                // 1. 绝对性能优化的硬编码过滤：
                // 如果是 .git 内部变动或编译产物，直接拦截，根本不去走正则匹配
                let path_str = p.to_string_lossy();
                if path_str.contains(".git")
                     || path_str.contains("target")
                     || path_str.contains(".idea")
                     || path_str.contains("humangit_cache.db")
                     || path_str.ends_with('~')  // 重点：匹配以 ~ 结尾的文件
                     || path_str.contains("__")
                // 顺便屏蔽一些可能的临时目录
                {
                    return true;
                }

                // 2. 将系统发来的绝对路径，转换为相对于项目根目录的路径
                // 因为 .gitignore 的规则是基于相对路径的
                let rel_path = match p.strip_prefix(&watcher_dir) {
                    Ok(relative) => relative,
                    Err(_) => p, // 如果转换失败，默认退回绝对路径
                };

                // 3. 让 ignore 库判断这个文件是否该被忽略
                // 第二个参数代表是否是目录，保守起见传 false 即可
                match gitignore.matched_path_or_any_parents(rel_path, false) {
                    ignore::Match::Ignore(_) => true,
                    _ => false,
                }
            });

            if !is_ignored {
                let _ = tx.blocking_send(event);
            }
        }
    })?;

    watcher.watch(&current_dir, RecursiveMode::Recursive)?;

    color::log_color("[SUCCESS]", "HumanGit is now visually active.", "green");

    // 替换整个 tokio::spawn(async move { ... }) 内部
    tokio::spawn(async move {
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

            // ── 以下逻辑与原来完全一致，只是每次防抖后执行一次 ──
            let event = last_event;

            println!("--------------------------------------------------");
            color::log_color(
                "[EVENT]",
                &format!("Real-time mutation: {:?}", event.paths),
                "yellow",
            );

            let raw_status = match std::process::Command::new("git")
                .arg("status")
                .arg("--short")
                .output()
            {
                Ok(out) => String::from_utf8_lossy(&out.stdout).to_string(),
                Err(_) => String::new(),
            };

            let status_msg = raw_status.trim();
            if !status_msg.is_empty() {
                color::log_color("[GIT]", &format!("Status:\n{}", status_msg), "cyan");
            }

            match modules::repo::diff::get_stats(".") {
                Ok(stats) => {
                    let total_changed = stats.insertions + stats.deletions;

                    let mut total = TOTAL_LINES.lock().unwrap();
                    total.0 = stats.insertions;
                    total.1 = stats.deletions;
                    color::log_color(
                        "[SYSTEM]",
                        &format!(
                            "You just coded {} lines, deleted {} lines today!",
                            total.0, total.1
                        ),
                        "green",
                    );
                    color::log_color(
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
                        color::log_color(
                            "[SYSTEM]",
                            &format!("Milestone reached: +{} new lines. Syncing...", delta),
                            "yellow",
                        );

                        match modules::git::executor::run_shadow_sync(".") {
                            Ok(_) => {
                                *last_sync = accumulated;
                                color::log_color("[SYSTEM]", "Shadow sync finished successfully.", "green");
                            }
                            Err(e) => {
                                eprintln!("[ERR] Shadow sync failed: {}", e);
                            }
                        }
                    }
                }
                Err(e) => {
                    eprintln!("[ERR] Failed to compute diff stats: {}", e);
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

    tokio::signal::ctrl_c().await?;
    color::log_color("[SYSTEM]", "Shutting down...", "green");

    Ok(())
}

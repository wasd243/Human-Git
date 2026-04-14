// 1. 声明顶级模块
pub mod modules {
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
        pub mod run_shadow_sync;
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
    pub mod watcher;
}

// 2. 引入我们需要的东西
use crate::modules::ui_bridge::handlers;
use std::sync::Arc;
use tokio::sync::Mutex;
use rusqlite::Connection;
use std::time::Instant;

pub struct AppState {
    pub total_lines: Arc<Mutex<(i32, i32)>>,
    pub last_sync_count: Arc<Mutex<i32>>,
    pub db_conn: Arc<Mutex<Connection>>,
    pub ignore_events_until: Arc<Mutex<Instant>>,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let db_conn = match modules::shared::utils::utils::Database::init() {
        Ok(c) => c,
        Err(e) => {
            eprintln!("[FATAL] DB Init failed: {}", e);
            std::process::exit(1);
        }
    };

    let app_state = AppState {
        total_lines: Arc::new(Mutex::new((0, 0))),
        last_sync_count: Arc::new(Mutex::new(0)),
        db_conn: Arc::new(Mutex::new(db_conn)),
        ignore_events_until: Arc::new(Mutex::new(Instant::now())),
    };

    tauri::Builder::default()
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![handlers::run_shadow_sync])
        .setup(|app| {
            let app_handle = app.handle().clone();

            tokio::spawn(async move {
                if let Err(e) = crate::modules::watcher::run_daemon(app_handle).await {
                    eprintln!("[FATAL] Background daemon crashed: {}", e);
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");

    Ok(())
}

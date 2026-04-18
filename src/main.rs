// 1. Declare top-level modules
pub mod modules {
    // Repository core
    pub mod repo {
        pub mod diff;
        pub mod history;
        pub mod state;
    }
    // Action commands
    pub mod operations {
        pub mod add;
        pub mod checkout;
        pub mod commit;
        pub mod commit_and_push;
        pub mod init;
        pub mod open_folder;
        pub mod pull;
        pub mod push;
        pub mod run_shadow_commit;
    }
    // Git core
    pub mod git {
        pub mod executor;
        pub mod porcelain;
    }
    // Communication bridge
    pub mod ui_bridge {
        pub mod handlers;
    }
    // Shared utilities
    pub mod shared {
        pub mod errors;

        pub mod utils {
            pub mod color;
            pub mod db;
        }
    }
    pub mod watcher;
}

// 2. Import required dependencies
use crate::modules::operations::open_folder;
use crate::modules::ui_bridge::handlers;
use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;
use std::sync::Arc;
use std::time::Instant;
use tokio::sync::Mutex;

pub struct AppState {
    pub total_lines: Arc<Mutex<(i32, i32)>>,
    pub last_sync_count: Arc<Mutex<i32>>,
    pub db_conn: Pool<SqliteConnectionManager>,
    pub ignore_events_until: Arc<Mutex<Instant>>,
    pub current_repo_path: Arc<Mutex<Option<std::path::PathBuf>>>,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let db_conn = match modules::shared::utils::db::Database::init() {
        Ok(c) => c,
        Err(e) => {
            eprintln!("[FATAL] DB Init failed: {}", e);
            std::process::exit(1);
        }
    };

    let app_state = AppState {
        total_lines: Arc::new(Mutex::new((0, 0))),
        last_sync_count: Arc::new(Mutex::new(0)),
        db_conn,
        ignore_events_until: Arc::new(Mutex::new(Instant::now())),
        current_repo_path: Arc::new(Mutex::new(None)),
    };

    tauri::Builder::default()
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            handlers::run_shadow_commit,
            handlers::get_initial_stats,
            handlers::git_init,
            handlers::stage_files,
            handlers::commit_changes,
            handlers::commit_and_push,
            handlers::push_changes,
            handlers::pull_changes,
            handlers::get_working_status,
            open_folder::update_repo_path,
            open_folder::open_folder_dialog
        ])
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

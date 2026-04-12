// 1. 声明顶级模块
mod modules {
    // 仓库核心
    pub mod repo {
        pub mod state;
        pub mod diff;
        pub mod history;
    }
    // 动作指令
    pub mod operations {
        pub mod add;
        pub mod commit;
        pub mod push;
        pub mod checkout;
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
            pub mod utils;
        }
    }
}

// 2. 引入我们需要的东西
use notify::{Watcher, RecursiveMode, Event};
use std::env;
use tokio::sync::mpsc;
use ignore::gitignore::GitignoreBuilder;


#[tokio::main]
async fn main() -> anyhow::Result<()> {
    println!("--------------------------------------------------");
    println!("[SYSTEM] HumanGit Protocol Initialized.");
    println!("[STATUS] Monitoring baseline reality...");
    println!("--------------------------------------------------");

    // TODO: 数据库初始化（等你 utils.rs 准备好后，把下面这行注释解开）
    // crate::modules::shared::utils::Database::init()?;

    // 1. 建立通讯桥梁 (Channel)：容量设为 100
    // tx: 发送端 (给 notify 用)
    // rx: 接收端 (给 tokio 异步循环用)
    let (tx, mut rx) = mpsc::channel::<Event>(100);

    // 2. 启动文件监听探头 (使用 move 把 tx 强行塞进闭包)
    let mut watcher = notify::recommended_watcher(move |res: notify::Result<Event>| {
        if let Ok(event) = res {
            // 核心过滤逻辑：暴击拦截 .git 和 target
            let is_noise = event.paths.iter().any(|p| {
                let path_str = p.to_string_lossy();
                path_str.contains(".git") || path_str.contains("target")
            });

            if !is_noise {
                // 因为闭包在同步线程，这里必须用 blocking_send 发送到异步世界
                let _ = tx.blocking_send(event);
            }
        }
    })?;

    // 3. 锁定当前目录并启动
    let current_dir = env::current_dir()?;
    watcher.watch(&current_dir, RecursiveMode::Recursive)?;

    println!("[SUCCESS] HumanGit is now visually active.");

    // 4. 在后台开启一个异步黑洞，专门吞噬并打印事件
    tokio::spawn(async move {
        while let Some(event) = rx.recv().await {
            // 这里就是 HumanGit 的神经末梢
            println!("[WARN] detected: {:?}", event.paths);
        }
    });

    // 5. 挂起主线程
    // 异步程序如果主函数结束，所有后台任务都会被强制物理超度。
    // 我们用 ctrl_c 拦截器卡住主线程，直到你按 Ctrl+C 退出。
    // 等以后接入 Tauri，这里会被 tauri::Builder 取代。
    tokio::signal::ctrl_c().await?;
    println!("[SYSTEM] Shutting down...");

    Ok(())
}

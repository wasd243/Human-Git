use anyhow::{Context, Result};
use std::path::Path;
use std::process::Command;

/// 在给定的仓库路径下执行一次“shadow sync”：
/// - 使用 `git stash push -u -m "humangit-shadow-sync"` 保存当前未提交的修改（含未跟踪文件）
/// - 如果存在待提交的变更（git status --porcelain 非空），执行 git add -A && git commit -m "[HumanGit] shadow sync" && git push（尝试）
/// - 最后，如果之前创建了 stash，则执行 git stash pop 恢复工作区
///
/// 该函数尽量将可能发生的错误包装并返回，但对部分非致命错误会容忍，以避免阻塞主流程。
pub fn run_shadow_sync(repo_path: &str) -> Result<()> {
    let repo = Path::new(repo_path);

    // Helper：执行命令并返回成功结果
    let run_git = |args: &[&str]| -> Result<String> {
        let output = Command::new("git")
            .args(args)
            .current_dir(repo)
            .output()
            .with_context(|| format!("Failed: git {:?}", args))?;
        if !output.status.success() {
            return Err(anyhow::anyhow!("git {:?} failed", args));
        }
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    };

    // --- 新增安全检查 ---
    let current = run_git(&["rev-parse", "--abbrev-ref", "HEAD"])?;
    if current == "humangit-shadow" {
        // 如果已经在这个分支了，说明上次同步可能中断了，直接强制切回去
        // 这里假设你的主分支是 develop，或者你手动切回。我们这里先报错保护。
        return Err(anyhow::anyhow!("Already in shadow branch. Please switch back to develop manually first."));
    }
    // ------------------

    // 1) 获取当前分支名，记下“回家的路”
    let original_branch = run_git(&["rev-parse", "--abbrev-ref", "HEAD"])?;

    // 2) 尝试创建 stash（保存所有改动，含未跟踪文件）
    let stash_output = Command::new("git")
        .args(&["stash", "push", "-u", "-m", "humangit-shadow-sync"])
        .current_dir(repo)
        .output()?;

    let stash_stdout = String::from_utf8_lossy(&stash_output.stdout);
    let stash_created = stash_output.status.success()
        && !stash_stdout.contains("No local changes to save");

    if !stash_created {
        eprintln!("[SHADOW] No changes to archive. Reality is stable.");
        return Ok(());
    }

    eprintln!("[SHADOW] Data captured. Switching to shadow dimension...");

    // 3) 切换到影子分支 (如果不存在则创建)
    run_git(&["checkout", "-B", "humangit-shadow"])?;

    // 4) 把刚才存的东西“复印”一份到影子分支
    // 注意：用 apply 而不是 pop，这样 stash 里的备份还在，防止后续出错
    let _ = run_git(&["stash", "apply"]);
    let _ = run_git(&["add", "-A"]);
    let _ = Command::new("git")
        .args(&["commit", "-m", "[HumanGit] shadow sync checkpoint"])
        .current_dir(repo)
        .output();

    // 5) 尝试 Push（可选，如果没上游会失败但没关系）
    let _ = Command::new("git").args(&["push"]).current_dir(repo).output();

    // 6) 回归原始时空
    run_git(&["checkout", &original_branch])?;

    // 7) 恢复 IDE 的彩色标记：把 stash pop 出来
    // 这样你的 IDE 会认为代码从来没被提交过，颜色条依旧在
    if let Ok(_) = run_git(&["stash", "pop"]) {
        eprintln!("[SUCCESS] Shadow checkpoint created. IDE markers preserved.");
    }

    Ok(())
}

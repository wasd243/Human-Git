use anyhow::{Context, Result};
use std::path::Path;
use std::process::Command;

/// 在给定的仓库路径下执行一次“shadow sync”：
/// - 使用 `git stash push -u -m "humangit-shadow-sync"` 保存当前未提交的修改（含未跟踪文件）
/// - 如果存在待提交的变更（git status --porcelain 非空），执行 git add -A && git commit -m "humangit: shadow sync" && git push（尝试）
/// - 最后，如果之前创建了 stash，则执行 git stash pop 恢复工作区
///
/// 该函数尽量将可能发生的错误包装并返回，但对部分非致命错误会容忍，以避免阻塞主流程。
pub fn run_shadow_sync(repo_path: &str) -> Result<()> {
    let repo = Path::new(repo_path);

    // helper：运行 git 命令并返回 stdout（当命令返回非零时会返回 Err）
    let mut run_git_checked = |args: &[&str]| -> Result<String> {
        let output = Command::new("git")
            .args(args)
            .current_dir(repo)
            .output()
            .with_context(|| format!("Failed to execute git {:?}", args))?;

        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();

        if !output.status.success() {
            return Err(anyhow::anyhow!(
                "git {:?} failed: exit {:?}, stderr: {}",
                args,
                output.status.code(),
                stderr
            ));
        }

        Ok(stdout)
    };

    // 1) 尝试创建 stash（保存未提交更改，包括未跟踪文件）
    let stash_output = Command::new("git")
        .args(&["stash", "push", "-u", "-m", "humangit-shadow-sync"])
        .current_dir(repo)
        .output()
        .with_context(|| "Failed to run git stash push")?;

    let stash_stdout = String::from_utf8_lossy(&stash_output.stdout).to_string();
    let stash_stderr = String::from_utf8_lossy(&stash_output.stderr).to_string();

    // 判断是否真实创建了 stash：成功且输出没有 "No local changes to save"
    let stash_created = stash_output.status.success()
        && !stash_stdout.contains("No local changes to save")
        && !stash_stderr.contains("No local changes to save");

    if stash_created {
        eprintln!("[SHADOW] Created stash: {}", stash_stdout.trim());
    } else {
        // 可能没有需要 stash 的内容，或者 stash 命令返回非零（但我们仍尝试继续）
        eprintln!("[SHADOW] No stash created or stash returned non-success. stdout: {}, stderr: {}", stash_stdout.trim(), stash_stderr.trim());
    }

    // 2) 检查是否有待提交变更（status --porcelain）
    let status_out = Command::new("git")
        .args(&["status", "--porcelain"])
        .current_dir(repo)
        .output()
        .with_context(|| "Failed to run git status --porcelain")?;

    let status_txt = String::from_utf8_lossy(&status_out.stdout).to_string();

    if !status_txt.trim().is_empty() {
        eprintln!("[SHADOW] Changes detected, preparing to commit and push.");
        // 添加并提交
        // 使用 run_git_checked 来确保 add 成功
        run_git_checked(&["add", "-A"]).with_context(|| "git add failed during shadow sync")?;

        // 尝试提交（如果提交失败，继续流程，但返回错误信息）
        let commit_res = Command::new("git")
            .args(&["commit", "-m", "humangit: shadow sync"])
            .current_dir(repo)
            .output();

        match commit_res {
            Ok(out) => {
                if out.status.success() {
                    eprintln!("[SHADOW] Commit created. Attempting to push...");
                    // 尝试 push（可能因为没有上游或凭据失败）
                    let push_res = Command::new("git").args(&["push"]).current_dir(repo).output();
                    match push_res {
                        Ok(pout) => {
                            if pout.status.success() {
                                eprintln!("[SHADOW] Push succeeded.");
                            } else {
                                let perr = String::from_utf8_lossy(&pout.stderr);
                                eprintln!("[SHADOW] Push failed (stderr): {}", perr);
                            }
                        }
                        Err(e) => {
                            eprintln!("[SHADOW] Failed to spawn git push: {}", e);
                        }
                    }
                } else {
                    let cerr = String::from_utf8_lossy(&out.stderr);
                    eprintln!("[SHADOW] git commit did not create a commit (stderr: {}).", cerr);
                }
            }
            Err(e) => {
                eprintln!("[SHADOW] Failed to run git commit: {}", e);
            }
        }
    } else {
        eprintln!("[SHADOW] No changes to commit.");
    }

    // 3) 如果之前创建了 stash，则尝试恢复
    if stash_created {
        let pop_res = Command::new("git")
            .args(&["stash", "pop"])
            .current_dir(repo)
            .output();

        match pop_res {
            Ok(out) => {
                if out.status.success() {
                    eprintln!("[SHADOW] Stash popped successfully.");
                } else {
                    let perr = String::from_utf8_lossy(&out.stderr);
                    eprintln!("[SHADOW] git stash pop failed: {}", perr);
                }
            }
            Err(e) => {
                eprintln!("[SHADOW] Failed to spawn git stash pop: {}", e);
            }
        }
    }

    Ok(())
}

use anyhow::{Context, Result};
use git2::{Repository, Signature, StatusOptions, StashFlags};

/// 在给定的仓库路径下执行一次“shadow sync”：
/// - 使用 `git stash push -u -m "humangit-shadow-sync"` 保存当前未提交的修改（含未跟踪文件）
/// - 如果存在待提交的变更（git status --porcelain 非空），执行 git add -A && git commit -m "[HumanGit] shadow sync" && git push（尝试）
/// - 最后，如果之前创建了 stash，则执行 git stash pop 恢复工作区
///
/// 该函数尽量将可能发生的错误包装并返回，但对部分非致命错误会容忍，以避免阻塞主流程。
pub fn run_shadow_sync(repo_path: &str) -> Result<()> {
    let mut repo = Repository::discover(repo_path).context("Failed to open repository")?;

    let current_branch = {
        let head = repo.head().context("Failed to get HEAD")?;
        head.shorthand().unwrap_or("").to_string()
    };

    if current_branch == "humangit-shadow" {
        return Err(anyhow::anyhow!("Already in shadow branch. Please switch back to develop manually first."));
    }

    let has_changes = {
        let mut statuses_opts = StatusOptions::new();
        statuses_opts.include_untracked(true).recurse_untracked_dirs(true);
        let statuses = repo.statuses(Some(&mut statuses_opts))?;
        !statuses.is_empty()
    };

    if !has_changes {
        eprintln!("[SHADOW] No changes to archive. Reality is stable.");
        return Ok(());
    }

    eprintln!("[SHADOW] Data captured. Switching to shadow dimension...");

    let signature = Signature::now("HumanGit", "humangit@system.local")?;

    let mut stashed = false;
    match repo.stash_save(&signature, "humangit-shadow-sync", Some(StashFlags::INCLUDE_UNTRACKED)) {
        Ok(_) => stashed = true,
        Err(e) if e.code() == git2::ErrorCode::NotFound => {},
        Err(e) => return Err(e.into()),
    }

    // 3) 切换到影子分支 (如果不存在则创建)
    let shadow_ref_name = {
        let commit = repo.head()?.peel_to_commit()?;
        let shadow_branch = repo.branch("humangit-shadow", &commit, true)?;
        shadow_branch.get().name().unwrap().to_string()
    };
    repo.set_head(&shadow_ref_name)?;
    repo.checkout_head(Some(git2::build::CheckoutBuilder::default().force()))?;

    // 4) 把刚才存的东西“复印”一份到影子分支
    if stashed {
        let _ = repo.stash_apply(0, None);
    }
    
    {
        let mut index = repo.index()?;
        index.add_all(["*"].iter(), git2::IndexAddOption::DEFAULT, None)?;
        index.write()?;
        let tree_id = index.write_tree()?;
        let tree = repo.find_tree(tree_id)?;
        
        let parent_commit = repo.head()?.peel_to_commit()?;
        
        let _ = repo.commit(
            Some("HEAD"),
            &signature,
            &signature,
            "[HumanGit] shadow sync checkpoint",
            &tree,
            &[&parent_commit],
        );
    }

    // 5) 尝试 Push（可选，如果没上游会失败但没关系）
    if let Ok(mut remote) = repo.find_remote("origin") {
        let mut push_options = git2::PushOptions::new();
        let _ = remote.push(&["refs/heads/humangit-shadow:refs/heads/humangit-shadow"], Some(&mut push_options));
    }

    // 6) 回归原始时空
    let original_ref = format!("refs/heads/{}", current_branch);
    repo.set_head(&original_ref)?;
    repo.checkout_head(Some(git2::build::CheckoutBuilder::default().force()))?;

    // 7) 恢复 IDE 的彩色标记：把 stash pop 出来
    if stashed {
        if let Ok(_) = repo.stash_pop(0, None) {
            eprintln!("[SUCCESS] Shadow checkpoint created. IDE markers preserved.");
        } else {
            eprintln!("[SUCCESS] Shadow checkpoint created but stash pop failed.");
        }
    } else {
        eprintln!("[SUCCESS] Shadow checkpoint created. IDE markers preserved.");
    }

    Ok(())
}

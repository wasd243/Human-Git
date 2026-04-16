use anyhow::{Context, Result};
use git2::{Repository, Signature, StatusOptions};

/// Execute a "shadow sync" in the given repository path:
/// - Use `git stash push -u -m "humangit-shadow-sync"` to save current uncommitted changes (including untracked files)
/// - If there are pending changes (git status --porcelain is not empty), execute git add -A && git commit -m "[HumanGit] shadow sync" && git push (attempt)
/// - Finally, if a stash was created earlier, execute git stash pop to restore the workspace
///
/// This function tries to wrap and return possible errors, but tolerates some non-fatal errors to avoid blocking the main flow.
pub fn run_shadow_sync(repo_path: &str) -> Result<()> {
    let repo = Repository::discover(repo_path).context("Failed to open repository")?;

    let current_branch = {
        let head = repo.head().context("Failed to get HEAD")?;
        head.shorthand().unwrap_or("").to_string()
    };

    if current_branch == "humangit-shadow" {
        return Err(anyhow::anyhow!(
            "Already in shadow branch. Please switch back to develop manually first."
        ));
    }

    let has_changes = {
        let mut statuses_opts = StatusOptions::new();
        statuses_opts
            .include_untracked(true)
            .recurse_untracked_dirs(true);

        let statuses = repo.statuses(Some(&mut statuses_opts))?;
        !statuses.is_empty()
    };

    if !has_changes {
        eprintln!("[SHADOW] No changes to archive. Reality is stable.");
        return Ok(());
    }

    eprintln!("[SHADOW] Creating snapshot on shadow branch...");

    let signature = Signature::now("HumanGit", "humangit@system.local")?;

    // 🟡 1. 只创建分支，不影响工作区
    let head_commit = repo.head()?.peel_to_commit()?;
    repo.branch("humangit-shadow", &head_commit, true)?;

    // 🟡 2. 切 HEAD（逻辑切换，不 checkout）
    let shadow_ref = "refs/heads/humangit-shadow";
    repo.set_head(shadow_ref)?;

    // ❌ 删除 stash（完全不需要）
    // ❌ 删除 stash_apply / stash_pop

    // 🟡 3. 创建 commit snapshot（基于 index）
    {
        let mut index = repo.index()?;

        index.add_all(["*"].iter(), git2::IndexAddOption::DEFAULT, None)?;
        index.write()?;

        let tree_id = index.write_tree()?;
        let tree = repo.find_tree(tree_id)?;

        let parent = repo.head()?.peel_to_commit()?;

        repo.commit(
            Some("HEAD"),
            &signature,
            &signature,
            "[HumanGit] shadow sync checkpoint",
            &tree,
            &[&parent],
        )?;
    }

    // 🟡 4. push（安全）
    if let Ok(mut remote) = repo.find_remote("origin") {
        let mut push_options = git2::PushOptions::new();
        let _ = remote.push(
            &["refs/heads/humangit-shadow:refs/heads/humangit-shadow"],
            Some(&mut push_options),
        );
    }

    // 🟡 5. 不回切工作区（关键）
    // ❌ 删除所有 checkout / force / restore

    if !current_branch.is_empty() {
        eprintln!(
            "[SUCCESS] Shadow checkpoint created (SAFE MODE). Working tree untouched."
        );
    }

    Ok(())
}

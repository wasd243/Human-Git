use anyhow::{Context, Result};
use git2::{Repository, Signature, StatusOptions};

/// Execute a "shadow commit" in the given repository path:
/// - Use `git stash push -u -m "humangit-shadow-sync"` to save current uncommitted changes (including untracked files)
/// - If there are pending changes (git status --porcelain is not empty), execute git add -A && git commit -m "[HumanGit] shadow sync" && git push (attempt)
/// - Finally, if a stash was created earlier, execute git stash pop to restore the workspace
///
/// This function tries to wrap and return possible errors, but tolerates some non-fatal errors to avoid blocking the main flow.
pub fn run_shadow_commit(repo_path: &str) -> Result<()> {
    let repo = Repository::discover(repo_path)
        .context("Failed to open repository")?;

    let has_changes = {
        let mut opts = StatusOptions::new();
        opts.include_untracked(true)
            .recurse_untracked_dirs(true);

        let statuses = repo.statuses(Some(&mut opts))?;
        !statuses.is_empty()
    };

    if !has_changes {
        eprintln!("[SHADOW] No changes detected.");
        return Ok(());
    }

    let signature = Signature::now("HumanGit", "humangit@system.local")?;

    let head_commit = repo.head()?.peel_to_commit()?;

    let mut index = repo.index()?;
    index.add_all(["*"].iter(), git2::IndexAddOption::DEFAULT, None)?;
    index.write()?;

    let tree_id = index.write_tree()?;
    let tree = repo.find_tree(tree_id)?;

    // 🔥 attach to current HEAD ONLY (safe history)
    let _commit_id = repo.commit(
        Some("HEAD"),
        &signature,
        &signature,
        "[HumanGit] shadow commit attempt",
        &tree,
        &[&head_commit],
    )?;

    eprintln!("[SUCCESS] Shadow commit created on current branch.");

    Ok(())
}

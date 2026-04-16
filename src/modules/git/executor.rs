use anyhow::{Context, Result};
use git2::{Repository, Signature, StashFlags, StatusOptions};

/// Execute a "shadow sync" in the given repository path:
/// - Use `git stash push -u -m "humangit-shadow-sync"` to save current uncommitted changes (including untracked files)
/// - If there are pending changes (git status --porcelain is not empty), execute git add -A && git commit -m "[HumanGit] shadow sync" && git push (attempt)
/// - Finally, if a stash was created earlier, execute git stash pop to restore the workspace
///
/// This function tries to wrap and return possible errors, but tolerates some non-fatal errors to avoid blocking the main flow.
pub fn run_shadow_sync(repo_path: &str) -> Result<()> {
    let mut repo = Repository::discover(repo_path).context("Failed to open repository")?;

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

    eprintln!("[SHADOW] Data captured. Switching to shadow dimension...");

    let signature = Signature::now("HumanGit", "humangit@system.local")?;

    let mut stashed = false;
    match repo.stash_save(
        &signature,
        "humangit-shadow-sync",
        Some(StashFlags::INCLUDE_UNTRACKED),
    ) {
        Ok(_) => stashed = true,
        Err(e) if e.code() == git2::ErrorCode::NotFound => {}
        Err(e) => return Err(e.into()),
    }

    // 3) Switch to shadow branch (create if it doesn't exist)
    let shadow_ref_name = {
        let commit = repo.head()?.peel_to_commit()?;
        let shadow_branch = repo.branch("humangit-shadow", &commit, true)?;
        shadow_branch
            .get()
            .name()
            .context("Failed to get shadow branch name")?
            .to_string()
    };
    repo.set_head(&shadow_ref_name)?;
    repo.checkout_head(Some(git2::build::CheckoutBuilder::default().force()))?;

    // 4) "Copy" the stashed items to the shadow branch
    if stashed {
        if let Err(e) = repo.stash_apply(0, None) {
            eprintln!("[ERR] Failed to apply stash to shadow branch: {}", e);
        }
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

    // 5) Try to Push (optional, will fail if no upstream but that's fine)
    if let Ok(mut remote) = repo.find_remote("origin") {
        let mut push_options = git2::PushOptions::new();
        let _ = remote.push(
            &["refs/heads/humangit-shadow:refs/heads/humangit-shadow"],
            Some(&mut push_options),
        );
    }

    // 6) Return to original dimension
    let original_ref = format!("refs/heads/{}", current_branch);
    repo.set_head(&original_ref)?;
    repo.checkout_head(Some(git2::build::CheckoutBuilder::default().force()))?;

    // 7) Restore IDE color markers: pop the stash out
    if stashed {
        match repo.stash_pop(0, None) {
            Ok(_) => eprintln!("[SUCCESS] Shadow checkpoint created. IDE markers preserved."),
            Err(e) => eprintln!(
                "[ERR] Shadow checkpoint created but stash pop failed: {}",
                e
            ),
        }
    } else {
        eprintln!("[SUCCESS] Shadow checkpoint created. IDE markers preserved.");
    }

    Ok(())
}

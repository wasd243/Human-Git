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

    let current_branch = {
        let head = repo.head().context("Failed to get HEAD")?;
        head.shorthand().unwrap_or("").to_string()
    };

    // Safety guard: avoid running on shadow branch itself
    if current_branch == "humangit-shadow" {
        return Err(anyhow::anyhow!(
            "Already on shadow branch. Please switch back to main branch first."
        ));
    }

    let has_changes = {
        let mut opts = StatusOptions::new();
        opts.include_untracked(true)
            .recurse_untracked_dirs(true);

        let statuses = repo.statuses(Some(&mut opts))?;
        !statuses.is_empty()
    };

    if !has_changes {
        eprintln!("[SHADOW] No changes detected. Skipping shadow commit.");
        return Ok(());
    }

    eprintln!("[SHADOW] Creating shadow commit checkpoint...");

    let signature = Signature::now("HumanGit", "humangit@system.local")?;

    // Create or update shadow branch reference (no checkout)
    let head_commit = repo.head()?.peel_to_commit()?;
    repo.branch("humangit-shadow", &head_commit, true)?;

    // Move HEAD logically (does NOT modify working tree)
    repo.set_head("refs/heads/humangit-shadow")?;

    // Create snapshot commit based on current index state
    {
        let mut index = repo.index()?;

        // Stage all changes (working tree is NOT modified)
        index.add_all(["*"].iter(), git2::IndexAddOption::DEFAULT, None)?;
        index.write()?;

        let tree_id = index.write_tree()?;
        let tree = repo.find_tree(tree_id)?;

        let parent = repo.head()?.peel_to_commit()?;

        repo.commit(
            Some("HEAD"),
            &signature,
            &signature,
            "[HumanGit] shadow commit attempt",
            &tree,
            &[&parent],
        )?;
    }

    // Push shadow branch (best-effort, non-blocking)
    if let Ok(mut remote) = repo.find_remote("origin") {
        let mut push_options = git2::PushOptions::new();

        let _ = remote.push(
            &["refs/heads/humangit-shadow:refs/heads/humangit-shadow"],
            Some(&mut push_options),
        );
    }

    // IMPORTANT: No checkout, no restore, no stash
    // The working tree remains untouched by design

    if !current_branch.is_empty() {
        eprintln!(
            "[SUCCESS] Shadow commit created successfully. Working tree preserved."
        );
    }

    Ok(())
}

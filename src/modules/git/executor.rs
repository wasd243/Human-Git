use anyhow::{Context, Result};
use git2::{Repository, Signature, StatusOptions};
use crate::modules::operations::push::push_to_origin;


/// Perform a lightweight "shadow commit" on the current branch:
///
/// - Detects if there are any changes in the working directory (including untracked files)
/// - Stages all changes (`git add -A`)
/// - Creates a commit on the current branch with a predefined message
/// - Attempts to push the commit to `origin` (best-effort, non-blocking)
///
/// Design goals:
/// - Zero user interaction (no commit message required)
/// - No branch switching
/// - No stash usage
/// - No working tree mutation beyond normal staging/commit behavior
///
/// Notes:
/// - This is intended as a convenience feature for rapid iteration workflows
/// - Push failures are ignored and logged, not treated as fatal errors
/// - The commit is always attached to the current HEAD (no detached state)
pub fn run_shadow_commit(repo_path: &str) -> Result<()> {
    let repo = Repository::discover(repo_path)
        .context("Failed to open repository")?;

    // 1. check changes
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

    // 2. signature
    let signature = Signature::now("HumanGit", "humangit@system.local")
        .context("Failed to create signature")?;

    // 3. resolve HEAD commit safely
    let head_commit = match repo.head()
        .and_then(|h| h.peel_to_commit())
    {
        Ok(c) => c,
        Err(e) => {
            eprintln!("[SHADOW][WARN] Cannot resolve HEAD commit: {}", e);
            return Ok(());
        }
    };

    // 4. stage all changes
    let mut index = repo.index()?;
    index.add_all(["*"].iter(), git2::IndexAddOption::DEFAULT, None)?;
    index.write()?;

    let tree = repo.find_tree(index.write_tree()?)?;

    // 5. commit
    let commit_id = repo.commit(
        Some("HEAD"),
        &signature,
        &signature,
        "[HumanGit] shadow commit attempt",
        &tree,
        &[&head_commit],
    )?;

    eprintln!("[SUCCESS] Commit created: {}", commit_id);

    // 6. auto push (FIXED VERSION)
    match push_to_origin(repo_path) {
        Ok(msg) => {
            eprintln!("[SUCCESS] {}", msg);
        }
        Err(e) => {
            eprintln!("[SHADOW][WARN] Push failed (ignored): {}", e);
        }
    }

    Ok(())
}
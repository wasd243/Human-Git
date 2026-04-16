use anyhow::{Context, Result};
use git2::{Repository, Signature, StatusOptions};

/// Execute a "shadow commit" in the given repository path:
/// - Use `git stash push -u -m "humangit-shadow-sync"` to save current uncommitted changes (including untracked files)
/// - If there are pending changes (git status --porcelain is not empty), execute git add -A && git commit -m "[HumanGit] shadow commit" && git push (attempt)
/// - Finally, if a stash was created earlier, execute git stash pop to restore the workspace
///
/// This function tries to wrap and return possible errors, but tolerates some non-fatal errors to avoid blocking the main flow.
pub fn run_shadow_commit(repo_path: &str) -> Result<()> {
    let repo = Repository::discover(repo_path)
        .context("Failed to open repository")?;

    // 1. check changes (safe)
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

    // 2. signature (avoid unwrap/panic risk)
    let signature = Signature::now("HumanGit", "humangit@system.local")
        .context("Failed to create git signature")?;

    // 3. safe HEAD resolve (avoid unwrap chain panic risk)
    let head_commit = match repo.head() {
        Ok(head) => match head.peel_to_commit() {
            Ok(commit) => commit,
            Err(e) => {
                eprintln!("[SHADOW][WARN] Failed to resolve HEAD commit: {}", e);
                return Ok(()); // graceful exit
            }
        },
        Err(e) => {
            eprintln!("[SHADOW][WARN] Failed to read HEAD: {}", e);
            return Ok(());
        }
    };

    // 4. stage all changes
    let mut index = repo.index()?;
    index.add_all(["*"].iter(), git2::IndexAddOption::DEFAULT, None)?;
    index.write()?;

    let tree_id = index.write_tree()?;
    let tree = repo.find_tree(tree_id)?;

    // 5. commit onto current branch (safe history append)
    let commit_id = repo.commit(
        Some("HEAD"),
        &signature,
        &signature,
        "[HumanGit] shadow commit attempt",
        &tree,
        &[&head_commit],
    )?;

    eprintln!("[SUCCESS] Shadow commit created: {}", commit_id);

    // 6. optional best-effort push (no panic, no fail blocking)
    if let Ok(mut remote) = repo.find_remote("origin") {
        let mut push_opts = git2::PushOptions::new();

        if let Err(e) = remote.push(
            &["HEAD:HEAD"],
            Some(&mut push_opts),
        ) {
            eprintln!("[SHADOW][WARN] Push failed (ignored): {}", e);
        } else {
            eprintln!("[SUCCESS] Shadow commit pushed (best-effort).");
        }
    }

    Ok(())
}

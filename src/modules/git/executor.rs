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
    if let Ok(mut remote) = repo.find_remote("origin") {
        let mut push_opts = git2::PushOptions::new();

        let ref_name = match repo.head() {
            Ok(h) => match h.name() {
                Some(n) => n.to_string(),
                None => {
                    eprintln!("[SHADOW][WARN] HEAD name missing");
                    return Ok(());
                }
            },
            Err(e) => {
                eprintln!("[SHADOW][WARN] Cannot resolve HEAD: {}", e);
                return Ok(());
            }
        };

        let refspec = format!("{0}:{0}", ref_name);

        if let Err(e) = remote.push(&[refspec], Some(&mut push_opts)) {
            eprintln!("[SHADOW][WARN] Push failed: {}", e);
        }
    }

    Ok(())
}
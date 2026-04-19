use anyhow::{Context, Result};
use git2::Repository;
use std::process::Command;

/// Creates a commit with currently staged contents.
///
/// Uses the Git CLI so repository signing settings (including SSH signing)
/// are honored.
pub fn commit_changes(repo_path: &str, message: &str) -> Result<String> {
    let repo = Repository::discover(repo_path).context("Failed to open repository")?;
    let workdir = repo
        .workdir()
        .context("Failed to resolve repository worktree path")?;
    let msg = message.trim();
    if msg.is_empty() {
        return Err(anyhow::anyhow!("Commit message cannot be empty."));
    }

    let output = Command::new("git")
        .arg("-C")
        .arg(workdir)
        .arg("commit")
        .arg("-m")
        .arg(msg)
        .output()
        .context("Failed to execute git commit")?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        let detail = if !stderr.is_empty() { stderr } else { stdout };
        return Err(anyhow::anyhow!("Failed to create commit: {}", detail));
    }

    let commit_id = repo
        .head()
        .context("Failed to resolve HEAD after commit")?
        .target()
        .context("Failed to resolve commit id after commit")?;

    Ok(format!("Commit successful: {}", commit_id))
}

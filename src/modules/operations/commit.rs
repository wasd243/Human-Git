use anyhow::{Context, Result};
use git2::Repository;
use std::process::Command;

use crate::modules::operations::add::stage_all_changes;
use crate::modules::operations::push::push_to_origin_with_force;

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

fn default_quick_deploy_message() -> String {
    format!("HumanGit quick deploy {}", unix_timestamp_tag())
}

fn unix_timestamp_tag() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};

    match SystemTime::now().duration_since(UNIX_EPOCH) {
        Ok(duration) => format!("unix-{}", duration.as_secs()),
        Err(_) => "now".to_string(),
    }
}

/// Quick deployment flow:
/// 1) stage all changes (add.rs)
/// 2) commit staged changes (commit.rs)
/// 3) push to origin (push.rs)
pub fn quick_deploy(repo_path: &str, message: Option<&str>, force: bool) -> Result<String> {
    let repo = Repository::discover(repo_path).context("Failed to open repository")?;
    let mut index = repo.index().context("Failed to open repository index")?;

    stage_all_changes(&mut index).context("Failed to stage all changes")?;
    index.write().context("Failed to write Git index")?;

    let commit_message = message
        .map(str::trim)
        .filter(|m| !m.is_empty())
        .map(ToOwned::to_owned)
        .unwrap_or_else(default_quick_deploy_message);

    let commit_result =
        commit_changes(repo_path, &commit_message).context("Failed to create commit")?;
    let push_result =
        push_to_origin_with_force(repo_path, force).context("Failed to push to origin")?;

    Ok(format!("{}\n{}", commit_result, push_result))
}

use anyhow::{anyhow, Context, Result};
use std::process::Command;

pub fn push_tags(repo_path: &str) -> Result<String> {
    let output = Command::new("git")
        .arg("push")
        .arg("--tags")
        .current_dir(repo_path)
        .output()
        .with_context(|| format!("Failed to execute `git push --tags` in '{}'", repo_path))?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if stdout.is_empty() {
            Ok("All tags pushed successfully.".to_string())
        } else {
            Ok(format!("Tags pushed successfully. {}", stdout))
        }
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        let message = if stderr.is_empty() {
            "git push --tags failed with an unknown error.".to_string()
        } else {
            format!("git push --tags failed: {}", stderr)
        };
        Err(anyhow!(message))
    }
}

use anyhow::{anyhow, Context, Result};
use std::process::Command;

pub fn delete_tag(repo_path: &str, tag_name: &str) -> Result<String> {
    let name = tag_name.trim();

    if name.is_empty() {
        return Err(anyhow!("Tag name cannot be empty."));
    }

    let output = Command::new("git")
        .arg("tag")
        .arg("-d")
        .arg(name)
        .current_dir(repo_path)
        .output()
        .with_context(|| format!("Failed to execute `git tag -d {}` in '{}'", name, repo_path))?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if stdout.is_empty() {
            Ok(format!("Tag '{}' deleted.", name))
        } else {
            Ok(stdout)
        }
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        let message = if stderr.is_empty() {
            format!("Failed to delete tag '{}'.", name)
        } else {
            stderr
        };
        Err(anyhow!(message))
    }
}

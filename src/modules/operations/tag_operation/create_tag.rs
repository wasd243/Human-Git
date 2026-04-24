use anyhow::{anyhow, Context, Result};
use std::process::Command;

fn validate_tag_name(tag_name: &str) -> Result<()> {
    let name = tag_name.trim();

    if name.is_empty() {
        return Err(anyhow!("Tag name cannot be empty."));
    }

    if name == "@" {
        return Err(anyhow!("Invalid tag name."));
    }

    if name.starts_with('/') || name.ends_with('/') {
        return Err(anyhow!("Tag name cannot start or end with '/'."));
    }

    if name.starts_with('.') || name.ends_with('.') {
        return Err(anyhow!("Tag name cannot start or end with '.'."));
    }

    if name.contains("..") {
        return Err(anyhow!("Tag name cannot contain '..'."));
    }

    if name.contains("//") {
        return Err(anyhow!("Tag name cannot contain '//'."));
    }

    if name.contains("@{") {
        return Err(anyhow!("Tag name cannot contain '@{{'."));
    }

    if name.ends_with(".lock") {
        return Err(anyhow!("Tag name cannot end with '.lock'."));
    }

    let forbidden = ['~', '^', ':', '?', '*', '[', '\\', ' '];
    if name.chars().any(|c| c.is_control() || forbidden.contains(&c)) {
        return Err(anyhow!("Tag name contains invalid characters."));
    }

    for part in name.split('/') {
        if part.is_empty() {
            return Err(anyhow!("Tag name has an empty path segment."));
        }
        if part.starts_with('.') {
            return Err(anyhow!("Tag name segments cannot start with '.'."));
        }
        if part.ends_with('.') {
            return Err(anyhow!("Tag name segments cannot end with '.'."));
        }
    }

    Ok(())
}

pub fn create_tag(repo_path: &str, tag_name: &str) -> Result<String> {
    let name = tag_name.trim();
    validate_tag_name(name)?;

    let output = Command::new("git")
        .arg("-C")
        .arg(repo_path)
        .arg("tag")
        .arg(name)
        .output()
        .context("Failed to execute 'git tag' command")?;

    if output.status.success() {
        Ok(format!("Tag '{}' created.", name))
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        let details = if !stderr.is_empty() {
            stderr
        } else if !stdout.is_empty() {
            stdout
        } else {
            "Unknown git error.".to_string()
        };

        Err(anyhow!("Failed to create tag '{}': {}", name, details))
    }
}

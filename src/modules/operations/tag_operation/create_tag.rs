use anyhow::{anyhow, Context, Result};
use git2::{ObjectType, Repository};

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

    let repo = Repository::open(repo_path).context("Failed to open current repository")?;
    let head = repo
        .head()
        .context("Failed to resolve HEAD. Commit at least once before tagging.")?;
    let target = head
        .peel(ObjectType::Commit)
        .context("Failed to resolve HEAD commit for tagging.")?;

    repo.tag_lightweight(name, &target, false)
        .with_context(|| format!("Failed to create tag '{}'", name))?;

    Ok(format!("Tag '{}' created.", name))
}

use anyhow::{Context, Result};
use git2::Repository;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TagInfo {
    pub tag: String,
    pub hash: String,
    pub commit: String,
}

pub fn list_tags(repo_path: &str) -> Result<Vec<TagInfo>> {
    let repo = Repository::open(repo_path).context("Failed to open current repository")?;
    let tag_names = repo.tag_names(None).context("Failed to read tag names")?;

    let mut tags = Vec::new();

    for tag_name in tag_names.iter().flatten() {
        let ref_name = format!("refs/tags/{}", tag_name);
        let target = repo
            .revparse_single(&ref_name)
            .with_context(|| format!("Failed to resolve tag '{}'", tag_name))?;
        let commit = target
            .peel_to_commit()
            .with_context(|| format!("Failed to resolve commit for tag '{}'", tag_name))?;

        tags.push(TagInfo {
            tag: tag_name.to_string(),
            hash: commit.id().to_string(),
            commit: commit.summary().unwrap_or("<no-commit-message>").to_string(),
        });
    }

    tags.sort_by(|a, b| a.tag.cmp(&b.tag));
    Ok(tags)
}

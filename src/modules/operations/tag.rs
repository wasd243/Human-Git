use anyhow::{Context, Result};
use git2::Repository;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TagInfo {
    pub tag: String,
    pub hash: String,
    pub created_at: i64,
    pub commit: String,
}

pub fn list_tags(repo_path: &str) -> Result<Vec<TagInfo>> {
    let repo = Repository::open(repo_path).context("Failed to open current repository")?;
    let tag_names = repo.tag_names(None).context("Failed to read tag names")?;

    let mut timed_tags: Vec<(i64, TagInfo)> = Vec::new();

    for tag_name in tag_names.iter().flatten() {
        let ref_name = format!("refs/tags/{}", tag_name);
        let target = repo
            .revparse_single(&ref_name)
            .with_context(|| format!("Failed to resolve tag '{}'", tag_name))?;

        let commit = target
            .peel_to_commit()
            .with_context(|| format!("Failed to resolve commit for tag '{}'", tag_name))?;

        let commit_ts = commit.time().seconds();

        // Prefer annotated tagger time (actual tag creation metadata) when available.
        // For lightweight tags, fall back to commit time.
        let tag_ts = match repo.find_reference(&ref_name).and_then(|r| r.peel_to_tag()) {
            Ok(tag_obj) => tag_obj
                .tagger()
                .map(|sig| sig.when().seconds())
                .unwrap_or(commit_ts),
            Err(_) => commit_ts,
        };

        timed_tags.push((
            tag_ts,
            TagInfo {
                tag: tag_name.to_string(),
                hash: commit.id().to_string(),
                created_at: tag_ts,
                commit: commit
                    .summary()
                    .unwrap_or("<no-commit-message>")
                    .to_string(),
            },
        ));
    }

    // Newest first, oldest last.
    timed_tags.sort_by(|a, b| b.0.cmp(&a.0).then_with(|| a.1.tag.cmp(&b.1.tag)));

    Ok(timed_tags.into_iter().map(|(_, tag)| tag).collect())
}

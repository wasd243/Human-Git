use anyhow::{Context, Result};
use git2::Repository;

/// Creates a commit with the current index contents.
pub fn commit_changes(repo_path: &str, message: &str) -> Result<String> {
    let repo = Repository::discover(repo_path).context("Failed to open repository")?;
    let mut index = repo.index().context("Failed to open Git index")?;
    let tree_id = index.write_tree().context("Failed to write tree from index")?;
    let tree = repo.find_tree(tree_id).context("Failed to resolve tree")?;

    let signature = repo
        .signature()
        .context("Failed to resolve Git identity. Please set user.name and user.email.")?;

    // Get parent commit(s)
    let mut parents = Vec::new();
    if let Ok(head_ref) = repo.head() {
        if let Ok(parent) = head_ref.peel_to_commit() {
            parents.push(parent);
        }
    }

    let parent_refs: Vec<&git2::Commit<'_>> = parents.iter().collect();

    let commit_id = repo
        .commit(
            Some("HEAD"),
            &signature,
            &signature,
            message,
            &tree,
            &parent_refs,
        )
        .context("Failed to create commit")?;

    Ok(format!("Commit successful: {}", commit_id))
}

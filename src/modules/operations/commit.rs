use anyhow::{Context, Result};
use git2::{Repository, Signature};

/// Creates a commit with the current index contents.
pub fn commit_changes(repo_path: &str, message: &str) -> Result<String> {
    let repo = Repository::discover(repo_path).context("Failed to open repository")?;
    let mut index = repo.index()?;
    let tree_id = index.write_tree()?;
    let tree = repo.find_tree(tree_id)?;

    let signature = Signature::now("HumanGit", "humangit@system.local")?;

    // Get parent commit(s)
    let mut parents = Vec::new();
    if let Ok(head_ref) = repo.head() {
        if let Ok(parent) = head_ref.peel_to_commit() {
            parents.push(parent);
        }
    }

    let parent_refs: Vec<&git2::Commit> = parents.iter().collect();

    let commit_id = repo.commit(
        Some("HEAD"),
        &signature,
        &signature,
        message,
        &tree,
        &parent_refs,
    )?;

    Ok(format!("Commit successful: {}", commit_id))
}

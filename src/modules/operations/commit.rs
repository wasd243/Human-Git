use anyhow::{Context, Result};
use git2::{Config, Repository, Signature};

/// Creates a commit with the current index contents.
pub fn commit_changes(repo_path: &str, message: &str) -> Result<String> {
    let repo = Repository::discover(repo_path).context("Failed to open repository")?;
    let mut index = repo.index()?;
    let tree_id = index.write_tree()?;
    let tree = repo.find_tree(tree_id)?;

    // Get user signature from Git config
    let config = Config::open_default().context("Failed to open Git config")?;
    let name = config
        .get_string("user.name")
        .unwrap_or_else(|_| "HumanGit".to_string());
    let email = config
        .get_string("user.email")
        .unwrap_or_else(|_| "humangit@system.local".to_string());

    let signature = Signature::now(&name, &email)?;

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

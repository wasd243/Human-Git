use anyhow::{anyhow, Context, Result};
use git2::Repository;

pub fn add_remote_origin(repo_path: &str, url: &str) -> Result<String> {
    let trimmed = url.trim();
    if trimmed.is_empty() {
        return Err(anyhow!("Remote URL cannot be empty."));
    }

    let repo = Repository::discover(repo_path).context("Failed to open repository")?;

    if repo.find_remote("origin").is_ok() {
        return Err(anyhow!(
            "Remote 'origin' already exists. Please remove it first or use another remote name."
        ));
    }

    repo.remote("origin", trimmed)
        .context("Failed to add remote 'origin'")?;

    Ok(format!("Remote 'origin' added: {}", trimmed))
}

pub fn list_remotes(repo_path: &str) -> Result<Vec<String>> {
    let repo = Repository::discover(repo_path).context("Failed to open repository")?;
    let remotes = repo.remotes().context("Failed to read remotes")?;

    let mut result = Vec::new();

    for name in remotes.iter().flatten() {
        let remote = repo
            .find_remote(name)
            .with_context(|| format!("Failed to inspect remote '{}'", name))?;
        let url = remote.url().unwrap_or("<no-url>");
        result.push(format!("{} -> {}", name, url));
    }

    Ok(result)
}

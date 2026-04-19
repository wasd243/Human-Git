use anyhow::{anyhow, Context, Result};
use git2::{AutotagOption, FetchOptions, Repository};

pub fn fetch_from_remote(repo_path: &str, remote_name: Option<&str>) -> Result<String> {
    let remote_name = remote_name.unwrap_or("origin").trim();
    if remote_name.is_empty() {
        return Err(anyhow!("Remote name cannot be empty."));
    }

    let repo = Repository::discover(repo_path).context("Failed to open repository")?;
    let mut remote = repo
        .find_remote(remote_name)
        .with_context(|| format!("Remote '{}' not found", remote_name))?;

    let remote_url = remote.url().unwrap_or("<no-url>").to_string();

    let mut fetch_options = FetchOptions::new();
    fetch_options.download_tags(AutotagOption::All);

    remote
        .fetch(&[] as &[&str], Some(&mut fetch_options), None)
        .with_context(|| format!("Failed to fetch from remote '{}'", remote_name))?;

    Ok(format!(
        "Fetch completed from '{}' ({})",
        remote_name, remote_url
    ))
}

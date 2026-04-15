use git2::{Repository, RemoteCallbacks, PushOptions, Cred, CredentialType};
use anyhow::{Result, Context, anyhow};

pub fn push_to_origin(repo_path: &str) -> Result<String> {
    let repo = Repository::discover(repo_path).context("Failed to open repository")?;
    let mut remote = repo.find_remote("origin").context("Remote 'origin' not found")?;
    let head = repo.head().context("Failed to resolve HEAD")?;
    let branch_name = head
        .shorthand()
        .filter(|name| !name.is_empty())
        .ok_or_else(|| anyhow!("Failed to determine current branch"))?
        .to_string();

    let mut callbacks = RemoteCallbacks::new();
    callbacks.credentials(|url, username_from_url, allowed_types| {
        if allowed_types.contains(CredentialType::USERNAME) {
            Cred::username(username_from_url.unwrap_or("git"))
        } else if allowed_types.contains(CredentialType::SSH_KEY) {
            Cred::ssh_key_from_agent(username_from_url.unwrap_or("git"))
        } else if allowed_types.contains(CredentialType::DEFAULT) {
            Cred::default()
        } else if allowed_types.contains(CredentialType::USER_PASS_PLAINTEXT) {
            let config = repo.config()?;
            Cred::credential_helper(&config, url, username_from_url)
        } else {
            Err(git2::Error::from_str("Unsupported credential type"))
        }
    });

    let mut push_options = PushOptions::new();
    push_options.remote_callbacks(callbacks);

    let refspec = format!("refs/heads/{0}:refs/heads/{0}", branch_name);
    remote.push(&[refspec.as_str()], Some(&mut push_options))?;

    Ok(format!("Push successful to origin/{}.", branch_name))
}

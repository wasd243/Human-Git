use git2::{Repository, RemoteCallbacks, PushOptions, Cred, CredentialType};
use anyhow::{Result, Context};

pub fn push_to_origin(repo_path: &str) -> Result<String> {
    let repo = Repository::discover(repo_path).context("Failed to open repository")?;
    let mut remote = repo.find_remote("origin").context("Remote 'origin' not found")?;

    let mut callbacks = RemoteCallbacks::new();
    callbacks.credentials(|_url, username_from_url, allowed_types| {
        if allowed_types.contains(CredentialType::SSH_KEY) {
            Cred::ssh_key_from_agent(username_from_url.unwrap_or("git"))
        } else if allowed_types.contains(CredentialType::USER_PASS_PLAINTEXT) {
            let config = repo.config()?;
            Cred::credential_helper(&config, _url, username_from_url)
        } else {
            Err(git2::Error::from_str("Unsupported credential type"))
        }
    });

    let mut push_options = PushOptions::new();
    push_options.remote_callbacks(callbacks);

    // Following the implementation strategy from the plan: push main branch
    remote.push(&["refs/heads/main:refs/heads/main"], Some(&mut push_options))?;

    Ok("Push successful to origin/main.".to_string())
}

use anyhow::{Context, Result};
use git2::{Config, ErrorCode, IndexAddOption, PushOptions, RemoteCallbacks, Repository, Signature};

fn default_commit_message() -> String {
    format!(
        "HumanGit quick deploy {}",
        chrono_like_timestamp()
    )
}

fn chrono_like_timestamp() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};

    match SystemTime::now().duration_since(UNIX_EPOCH) {
        Ok(duration) => format!("unix-{}", duration.as_secs()),
        Err(_) => "now".to_string(),
    }
}

fn build_signature(repo: &Repository) -> Result<Signature<'_>> {
    let config = repo
        .config()
        .or_else(|_| Config::open_default())
        .context("Failed to open Git config")?;
    let name = config
        .get_string("user.name")
        .unwrap_or_else(|_| "HumanGit".to_string());
    let email = config
        .get_string("user.email")
        .unwrap_or_else(|_| "humangit@system.local".to_string());

    Signature::now(&name, &email).context("Failed to build Git signature")
}

fn push_head(repo: &Repository) -> Result<String> {
    let mut remote = repo
        .find_remote("origin")
        .context("Remote 'origin' not found")?;
    let head = repo.head().context("Failed to resolve HEAD")?;
    let branch_name = head
        .shorthand()
        .filter(|name| !name.is_empty())
        .context("Failed to determine current branch")?
        .to_string();

    let mut callbacks = RemoteCallbacks::new();
    callbacks.credentials(|url, username_from_url, allowed_types| {
        use git2::{Cred, CredentialType};

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
    remote
        .push(&[refspec.as_str()], Some(&mut push_options))
        .map_err(|error| match error.code() {
            ErrorCode::NotFastForward => anyhow::anyhow!(
                "NotFastForward: remote branch '{}' contains commits not present locally. Pull or rebase, then try again.",
                branch_name
            ),
            _ => anyhow::Error::new(error)
                .context(format!("Push failed for branch '{}'", branch_name)),
        })?;

    Ok(branch_name)
}

pub fn commit_and_push(repo_path: &str, message: Option<&str>) -> Result<String> {
    let repo = Repository::discover(repo_path).context("Failed to open repository")?;

    let mut index = repo.index().context("Failed to open Git index")?;
    index
        .add_all(["*"].iter(), IndexAddOption::DEFAULT, None)
        .context("Failed to stage changes")?;
    index.write().context("Failed to write staged changes")?;

    let tree_id = index.write_tree().context("Failed to write tree")?;
    let tree = repo.find_tree(tree_id).context("Failed to find written tree")?;
    let signature = build_signature(&repo)?;

    let mut parents = Vec::new();
    if let Ok(head_ref) = repo.head() {
        if let Ok(parent) = head_ref.peel_to_commit() {
            parents.push(parent);
        }
    }
    let parent_refs: Vec<&git2::Commit<'_>> = parents.iter().collect();

    let trimmed_message = message.map(str::trim).filter(|msg| !msg.is_empty());
    let final_message = trimmed_message
        .map(ToOwned::to_owned)
        .unwrap_or_else(default_commit_message);

    let commit_id = repo
        .commit(
            Some("HEAD"),
            &signature,
            &signature,
            &final_message,
            &tree,
            &parent_refs,
        )
        .context("Failed to create commit")?;

    let branch_name = push_head(&repo)?;

    Ok(format!(
        "Quick deploy successful: committed {} and pushed origin/{}.",
        commit_id, branch_name
    ))
}

use anyhow::{anyhow, Context, Result};
use git2::{
    build::CheckoutBuilder, Config, Cred, CredentialType, FetchOptions, MergeAnalysis,
    RemoteCallbacks, Repository, Signature,
};

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

pub fn pull_from_origin(repo_path: &str) -> Result<String> {
    let repo = Repository::discover(repo_path).context("Failed to open repository")?;
    let head = repo.head().context("Failed to resolve HEAD")?;
    let branch_name = head
        .shorthand()
        .filter(|name| !name.is_empty())
        .ok_or_else(|| anyhow!("Failed to determine current branch"))?
        .to_string();

    let mut remote = repo
        .find_remote("origin")
        .context("Remote 'origin' not found. Configure a remote before pulling.")?;

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

    let mut fetch_options = FetchOptions::new();
    fetch_options.remote_callbacks(callbacks);

    let fetch_refspec = format!("refs/heads/{0}:refs/remotes/origin/{0}", branch_name);
    remote
        .fetch(&[fetch_refspec.as_str()], Some(&mut fetch_options), None)
        .context("Failed to fetch from origin")?;

    let fetch_head = repo
        .find_reference("FETCH_HEAD")
        .context("Failed to read FETCH_HEAD after fetch")?;
    let fetch_commit = repo
        .reference_to_annotated_commit(&fetch_head)
        .context("Failed to parse fetched commit")?;

    let (analysis, _) = repo
        .merge_analysis(&[&fetch_commit])
        .context("Failed to analyze merge state")?;

    if analysis.contains(MergeAnalysis::ANALYSIS_UP_TO_DATE) {
        return Ok(format!(
            "Already up to date with origin/{}.",
            branch_name
        ));
    }

    if analysis.contains(MergeAnalysis::ANALYSIS_FASTFORWARD) {
        let refname = format!("refs/heads/{}", branch_name);
        let mut reference = repo
            .find_reference(&refname)
            .context("Failed to resolve local branch reference")?;

        reference
            .set_target(fetch_commit.id(), "Fast-forward")
            .context("Failed to fast-forward local branch")?;
        repo.set_head(&refname)
            .context("Failed to move HEAD to fast-forwarded branch")?;
        repo.checkout_head(Some(CheckoutBuilder::new().safe()))
            .context("Failed to update working tree after fast-forward")?;

        return Ok(format!(
            "Pull successful: fast-forwarded to origin/{}.",
            branch_name
        ));
    }

    if analysis.contains(MergeAnalysis::ANALYSIS_NORMAL) {
        let local_commit = repo
            .head()
            .context("Failed to read HEAD for merge")?
            .peel_to_commit()
            .context("Failed to resolve local commit")?;
        let remote_commit = repo
            .find_commit(fetch_commit.id())
            .context("Failed to resolve fetched commit")?;

        let mut index = repo
            .merge_commits(&local_commit, &remote_commit, None)
            .context("Failed to perform merge analysis")?;

        if index.has_conflicts() {
            return Err(anyhow!(
                "Pull would create merge conflicts. Resolve them manually and retry."
            ));
        }

        let tree_id = index
            .write_tree_to(&repo)
            .context("Failed to write merge tree")?;
        let tree = repo
            .find_tree(tree_id)
            .context("Failed to resolve merge tree")?;
        let signature = build_signature(&repo)?;
        let message = format!("Merge remote-tracking branch 'origin/{}'", branch_name);

        repo.commit(
            Some("HEAD"),
            &signature,
            &signature,
            &message,
            &tree,
            &[&local_commit, &remote_commit],
        )
        .context("Failed to create merge commit during pull")?;

        repo.checkout_head(Some(CheckoutBuilder::new().safe()))
            .context("Failed to checkout merged result")?;
        repo.cleanup_state()
            .context("Failed to cleanup repository state after pull")?;

        return Ok(format!(
            "Pull successful: merged origin/{} into local branch.",
            branch_name
        ));
    }

    Err(anyhow!(
        "Pull failed: unsupported merge analysis result for current branch."
    ))
}

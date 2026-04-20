use anyhow::{Context, Result};
use git2::{ErrorCode, PushOptions, RemoteCallbacks, Repository};

use crate::modules::operations::commit::commit_changes;
use crate::modules::operations::push::push_to_origin;
use crate::modules::operations::add::stage_all_changes;

fn default_commit_message() -> String {
    format!("HumanGit quick deploy {}", chrono_like_timestamp())
}

fn chrono_like_timestamp() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};

    match SystemTime::now().duration_since(UNIX_EPOCH) {
        Ok(duration) => format!("unix-{}", duration.as_secs()),
        Err(_) => "now".to_string(),
    }
}

pub fn commit_and_push(repo_path: &str, message: Option<&str>) -> Result<None> {
    stage_all_changes();
    push_to_origin(repo_path).with_context(|| "Failed to push to origin")?;
    commit_changes(repo_path, message.unwrap_or(&default_commit_message()))?;
}

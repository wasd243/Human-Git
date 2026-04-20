use anyhow::Result;

use crate::modules::operations::commit::quick_deploy;

pub fn commit_and_push(repo_path: &str, message: Option<&str>) -> Result<String> {
    quick_deploy(repo_path, message, false)
}

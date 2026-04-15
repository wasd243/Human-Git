use git2::{Repository, IndexAddOption};
use std::path::Path;
use anyhow::Result;

/// Stages specific files or all changes into the Git index.
pub fn stage_files(repo_path: &str, paths: Vec<String>) -> Result<String> {
    let repo = Repository::discover(repo_path)?;
    let mut index = repo.index()?;

    if paths.iter().any(|p| p == "*") {
        index.add_all(["*"].iter(), IndexAddOption::DEFAULT, None)?;
    } else {
        for path in paths {
            index.add_path(Path::new(&path))?;
        }
    }

    index.write()?;
    Ok("Files staged successfully.".to_string())
}

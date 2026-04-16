use anyhow::Result;
use git2::{Index, IndexAddOption, Repository};
use std::path::Path;

pub fn stage_all_changes(index: &mut Index) -> Result<()> {
    index.add_all(["."].iter(), IndexAddOption::DEFAULT, None)?;
    index.update_all(["."].iter(), None)?;
    Ok(())
}

/// Stages specific files or all changes into the Git index.
pub fn stage_files(repo_path: &str, paths: Vec<String>) -> Result<String> {
    let repo = Repository::discover(repo_path)?;
    let mut index = repo.index()?;

    if paths.iter().any(|p| p == "*") {
        stage_all_changes(&mut index)?;
    } else {
        for path in paths {
            index.add_path(Path::new(&path))?;
        }
    }

    index.write()?;
    Ok("Files staged successfully.".to_string())
}

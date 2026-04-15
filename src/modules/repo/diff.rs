use git2::{DiffOptions, Repository};

#[derive(Debug)]
pub struct DiffStats {
    pub insertions: i32,
    pub deletions: i32,
    pub files_changed: i32,
}

pub fn get_stats(repo_path: &str) -> anyhow::Result<DiffStats> {
    let repo = Repository::discover(repo_path)?;
    let mut opts = DiffOptions::new();
    opts.include_untracked(true).recurse_untracked_dirs(true);

    let head_tree = repo.head().ok().and_then(|head| head.peel_to_tree().ok());
    let diff = repo.diff_tree_to_workdir_with_index(head_tree.as_ref(), Some(&mut opts))?;
    let stats = diff.stats()?;

    Ok(DiffStats {
        insertions: stats.insertions() as i32,
        deletions: stats.deletions() as i32,
        files_changed: stats.files_changed() as i32,
    })
}

use git2::{DiffOptions, Repository};

#[derive(Debug)]
pub struct DiffStats {
    pub insertions: i32,
    pub deletions: i32,
    pub files_changed: i32,
}

pub fn get_stats(repo_path: &str) -> anyhow::Result<DiffStats> {
    let repo = Repository::open(repo_path)?;
    let head = repo.head()?.peel_to_tree()?;
    let mut opts = DiffOptions::new();
    opts.include_untracked(true);

    let diff = repo.diff_tree_to_workdir_with_index(Some(&head), Some(&mut opts))?;
    let stats = diff.stats()?;

    // 优雅，太优雅了！直接调用原生 API，不用去切字符串了。
    Ok(DiffStats {
        insertions: stats.insertions() as i32,
        deletions: stats.deletions() as i32,
        files_changed: stats.files_changed() as i32,
    })
}
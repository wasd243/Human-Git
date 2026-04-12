use git2::{DiffOptions, Repository};

pub fn get_stats(repo_path: &str) -> anyhow::Result<String> {
    let repo = Repository::open(repo_path)?;
    let head = repo.head()?.peel_to_tree()?;
    let mut opts = DiffOptions::new();
    opts.include_untracked(true);

    let diff = repo.diff_tree_to_workdir_with_index(Some(&head), Some(&mut opts))?;
    let stats = diff.stats()?;

    // --- 修改这里 ---
    let stats_buf = stats.to_buf(git2::DiffStatsFormat::SHORT, 80)?; // 直接让 stats 返回一个新的 Buf

    // 增加一层检查：如果结果是空的，返回一个默认值
    if stats_buf.is_empty() {
        return Ok("No changes detected.".to_string());
    }

    Ok(String::from_utf8_lossy(&stats_buf).to_string())
}
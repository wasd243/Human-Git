use git2::{DiffOptions, Repository};

// 定义新的结构体
#[derive(Debug)]
pub struct DiffStats {
    insertions: i32,
    deletions: i32,
    files_changed: i32,
}

impl DiffStats {
    pub fn new(insertions: i32, deletions: i32, files_changed: i32) -> Self {
        DiffStats {
            insertions,
            deletions,
            files_changed,
        }
    }
}

pub fn get_stats(repo_path: &str) -> anyhow::Result<DiffStats> {
    let repo = Repository::open(repo_path)?;
    let head = repo.head()?.peel_to_tree()?;
    let mut opts = DiffOptions::new();
    opts.include_untracked(true);

    let diff = repo.diff_tree_to_workdir_with_index(Some(&head), Some(&mut opts))?;
    let stats = diff.stats()?;

    // --- 修改这里 ---
    let stats_buf = stats.to_buf(git2::DiffStatsFormat::SHORT, 80)?; // 直接让 stats 返回一个新的 Buf

    // 解析 diff stats 字符串
    let stats_str = String::from_utf8_lossy(&stats_buf);
    let parts: Vec<&str> = stats_str.split_whitespace().collect();

    // 假设格式为 "## insertions, ## deletions" (例如: 123, 456)
    if parts.len() < 3 {
        return Ok(DiffStats::new(0, 0, 0));
    }

    let insertions = parts[0].parse::<i32>().unwrap_or(0);
    let deletions = parts[1].parse::<i32>().unwrap_or(0);
    let files_changed = parts[2].parse::<i32>().unwrap_or(0);

    // 增加一层检查：如果结果是空的，返回一个默认值
    if insertions == 0 && deletions == 0 && files_changed == 0 {
        return Ok(DiffStats::new(0, 0, 0));
    }

    Ok(DiffStats::new(insertions, deletions, files_changed))
}

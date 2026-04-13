use std::process::Command;
use std::io::{self, Error, ErrorKind};

#[derive(Debug)]
pub struct Commit {
    pub hash: String,
    pub parents: Vec<String>,
    pub message: String,
}

#[derive(Debug)]
pub struct FileStatus {
    pub x: char,   // staged 状态
    pub y: char,   // unstaged 状态
    pub path: String,
}

/// 执行 Git 命令并获取输出字符串
fn run_git_command(args: &[&str]) -> io::Result<String> {
    let output = Command::new("git")
        .args(args)
        .output()?;

    if !output.status.success() {
        let err_msg = String::from_utf8_lossy(&output.stderr);
        return Err(Error::new(ErrorKind::Other, err_msg.trim()));
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

/// 获取 commit 历史
pub fn get_commit_history() -> io::Result<Vec<Commit>> {
    let output = run_git_command(&["log", "--pretty=format:%h|%p|%s", "-n", "100"])?;
    
    let mut commits = Vec::new();
    for line in output.lines() {
        if line.is_empty() { continue; }
        
        let parts: Vec<&str> = line.splitn(3, '|').collect();
        if parts.len() < 3 { continue; }

        let hash = parts[0].to_string();
        let parents = if parts[1].is_empty() {
            Vec::new()
        } else {
            parts[1].split_whitespace().map(|s| s.to_string()).collect()
        };
        let message = parts[2].to_string();

        commits.push(Commit { hash, parents, message });
    }
    
    Ok(commits)
}

/// 获取当前工作区状态
pub fn get_working_status() -> io::Result<Vec<FileStatus>> {
    let output = run_git_command(&["status", "--porcelain"])?;
    
    let mut statuses = Vec::new();
    for line in output.lines() {
        if line.len() < 4 { continue; }

        let bytes = line.as_bytes();
        let x = bytes[0] as char;
        let y = bytes[1] as char;
        let path = line[3..].to_string();

        statuses.push(FileStatus { x, y, path });
    }
    
    Ok(statuses)
}

/// 判断是否有未提交改动
/// 获取还没有 commit 的文件列表
pub fn get_uncommitted_files() -> io::Result<String> {
    // 获取 HEAD 的变动文件列表 (包括暂存和未暂存)
    run_git_command(&["diff", "--name-only", "HEAD"])
}

pub fn has_changes(files: &Vec<FileStatus>) -> bool {
    !files.is_empty()
}

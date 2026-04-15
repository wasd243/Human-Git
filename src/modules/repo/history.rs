use git2::{Repository, StatusOptions, Sort};
use std::io::{self, Error};
use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Commit {
    pub hash: String,
    pub parents: Vec<String>,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FileStatus {
    pub x: char,   // staged status
    pub y: char,   // unstaged status
    pub path: String,
}

pub fn get_commit_history(repo_path: &str) -> io::Result<Vec<Commit>> {
    let repo = Repository::discover(repo_path).map_err(|e| Error::other(e.to_string()))?;
    let mut revwalk = repo.revwalk().map_err(|e| Error::other(e.to_string()))?;
    revwalk.set_sorting(Sort::TIME).map_err(|e| Error::other(e.to_string()))?;
    if revwalk.push_head().is_err() {
        return Ok(Vec::new());
    }

    let mut commits = Vec::new();
    for oid in revwalk.take(100).flatten() {
        if let Ok(commit) = repo.find_commit(oid) {
            let hash = commit.id().to_string().chars().take(7).collect::<String>();
            let parents = commit.parent_ids().map(|id| id.to_string().chars().take(7).collect::<String>()).collect();
            let message = commit.summary().unwrap_or("").to_string();
            commits.push(Commit { hash, parents, message });
        }
    }
    
    Ok(commits)
}

pub fn get_working_status(repo_path: &str) -> io::Result<Vec<FileStatus>> {
    let repo = Repository::discover(repo_path).map_err(|e| Error::other(e.to_string()))?;
    let mut opts = StatusOptions::new();
    opts.include_untracked(true).recurse_untracked_dirs(true);
    let statuses_repo = repo.statuses(Some(&mut opts)).map_err(|e| Error::other(e.to_string()))?;

    let mut statuses = Vec::new();
    for entry in statuses_repo.iter() {
        let status = entry.status();
        let path = entry.path().unwrap_or("").to_string();
        
        let mut x = ' ';
        let mut y = ' ';
        
        if status.contains(git2::Status::INDEX_NEW) { x = 'A'; }
        else if status.contains(git2::Status::INDEX_MODIFIED) { x = 'M'; }
        else if status.contains(git2::Status::INDEX_DELETED) { x = 'D'; }
        else if status.contains(git2::Status::INDEX_RENAMED) { x = 'R'; }
        else if status.contains(git2::Status::INDEX_TYPECHANGE) { x = 'T'; }
        
        if status.contains(git2::Status::WT_NEW) { y = '?'; x = '?'; }
        else if status.contains(git2::Status::WT_MODIFIED) { y = 'M'; }
        else if status.contains(git2::Status::WT_DELETED) { y = 'D'; }
        else if status.contains(git2::Status::WT_RENAMED) { y = 'R'; }
        else if status.contains(git2::Status::WT_TYPECHANGE) { y = 'T'; }
        
        if x == ' ' && y == ' ' { continue; }
        
        statuses.push(FileStatus { x, y, path });
    }
    
    Ok(statuses)
}

pub fn get_uncommitted_files(repo_path: &str) -> io::Result<String> {
    let statuses = get_working_status(repo_path)?;
    let mut files = Vec::new();
    for status in statuses {
        files.push(status.path);
    }
    Ok(files.join("\n"))
}

pub fn has_changes(files: &[FileStatus]) -> bool {
    !files.is_empty()
}

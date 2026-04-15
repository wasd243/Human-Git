use git2::{Repository, Signature};
use std::path::Path;
use anyhow::{Result, anyhow};
use std::fs::File;
use std::io::Write;

/// Initializes a new Git repository at the specified path and creates an initial commit.
pub fn init_repo(path: &str) -> Result<String> {
    let repo_path = Path::new(path);
    
    // Check if .git exists to avoid re-initialization error
    if repo_path.join(".git").exists() {
        return Err(anyhow!("Repository already exists in this directory."));
    }

    // 1. git init
    let repo = Repository::init(path)?;

    // 2. Create basic README.md and .gitignore to avoid "unborn branch"
    let readme_path = repo_path.join("README.md");
    if !readme_path.exists() {
        let mut file = File::create(&readme_path)?;
        writeln!(file, "# Project Initialized by HumanGit")?;
    }

    let gitignore_path = repo_path.join(".gitignore");
    if !gitignore_path.exists() {
        let mut file = File::create(&gitignore_path)?;
        writeln!(file, "target/\n.idea/\n*.log\nhumangit_cache.db*")?;
    }

    // 3. Initial commit
    let mut index = repo.index()?;
    index.add_path(Path::new("README.md"))?;
    index.add_path(Path::new(".gitignore"))?;
    index.write()?;
    
    let oid = index.write_tree()?;
    let tree = repo.find_tree(oid)?;
    
    // Create a signature
    let signature = Signature::now("HumanGit", "humangit@example.com")?;
    
    repo.commit(
        Some("HEAD"),
        &signature,
        &signature,
        "Initial commit by HumanGit",
        &tree,
        &[],
    )?;

    Ok("Repository initialized successfully with README.md and .gitignore.".to_string())
}

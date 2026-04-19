use anyhow::{anyhow, Context, Result};
use git2::Repository;
use std::fs::File;
use std::io::Write;
use std::path::Path;

/// Initializes a new Git repository at the specified path and creates an initial commit.
pub fn init_repo(path: &str) -> Result<String> {
    let repo_path = Path::new(path);

    // Check if .git exists to avoid re-initialization error
    if repo_path.join(".git").exists() {
        return Err(anyhow!("Repository already exists in this directory."));
    }

    // 1. git init
    let repo = Repository::init(path).context("Failed to initialize repository")?;

    // 2. Create basic README.md and .gitignore to avoid "unborn branch"
    let readme_path = repo_path.join("README.md");
    if !readme_path.exists() {
        let mut file = File::create(&readme_path).context("Failed to create README.md")?;
        writeln!(file, "# Project Initialized by HumanGit").context("Failed to write README.md")?;
    }

    let gitignore_path = repo_path.join(".gitignore");
    if !gitignore_path.exists() {
        let mut file = File::create(&gitignore_path).context("Failed to create .gitignore")?;
        writeln!(file, "target/\n.idea/\n*.log\nhumangit_cache.db*")
            .context("Failed to write .gitignore")?;
    }

    // 3. Initial commit
    let mut index = repo.index().context("Failed to open Git index")?;
    index.add_path(Path::new("README.md")).context("Failed to stage README.md")?;
    index
        .add_path(Path::new(".gitignore"))
        .context("Failed to stage .gitignore")?;
    index.write().context("Failed to write Git index")?;

    let oid = index.write_tree().context("Failed to write tree")?;
    let tree = repo.find_tree(oid).context("Failed to resolve tree")?;

    let signature = repo
        .signature()
        .context("Failed to resolve Git identity. Please set user.name and user.email.")?;

    repo.commit(
        Some("HEAD"),
        &signature,
        &signature,
        "Initial commit by HumanGit",
        &tree,
        &[],
    )
    .context("Failed to create initial commit")?;

    Ok("Repository initialized successfully with README.md and .gitignore.".to_string())
}

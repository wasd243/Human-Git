PRAGMA journal_mode = WAL;

-- HumanGit cache
CREATE TABLE IF NOT EXISTS commits_cache
(
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    hash    TEXT NOT NULL UNIQUE,
    message TEXT,
    pos_x   REAL DEFAULT 0.0,
    pos_y   REAL DEFAULT 0.0
);

CREATE TABLE IF NOT EXISTS app_cache
(
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_commits_hash ON commits_cache (hash);

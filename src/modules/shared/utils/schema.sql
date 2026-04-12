-- HumanGit 基础缓存表
CREATE TABLE IF NOT EXISTS commits_cache
(
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    hash    TEXT NOT NULL UNIQUE,
    message TEXT,
    pos_x   REAL DEFAULT 0.0,
    pos_y   REAL DEFAULT 0.0
);

-- 专门用于防丢失的“影子记录”表
CREATE TABLE IF NOT EXISTS shadow_history
(
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    file_path  TEXT,
    diff_stats TEXT,
    timestamp  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_commits_hash ON commits_cache (hash);

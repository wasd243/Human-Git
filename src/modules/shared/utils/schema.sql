-- HumanGit 基础缓存表
CREATE TABLE IF NOT EXISTS commits_cache (
                                             id          INTEGER PRIMARY KEY AUTOINCREMENT,
                                             hash        TEXT NOT NULL UNIQUE,
                                             message     TEXT,
                                             pos_x       REAL DEFAULT 0.0, -- 水墨树 X 坐标
                                             pos_y       REAL DEFAULT 0.0  -- 水墨树 Y 坐标
);

-- 以后可以在这里添加索引来加速查询
CREATE INDEX IF NOT EXISTS idx_commits_hash ON commits_cache (hash);
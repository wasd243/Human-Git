use rusqlite::{Connection, Result};

// 在编译时将文件内容“拍”进变量里
const INIT_SQL: &str = include_str!("schema.sql");

pub struct Database;

impl Database {
    pub fn init() -> Result<Connection> {
        let path = "humangit_cache.db";
        let conn = Connection::open(path)?;

        println!("[DB] Connection established: {}", path);

        // 直接执行整段 SQL 脚本
        conn.execute_batch(INIT_SQL)?;

        println!("[DB] Tables verified via schema.sql.");
        Ok(conn)
    }
}

use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;

// "Bake" the file content into a variable at compile time
const INIT_SQL: &str = include_str!("schema.sql");

pub struct Database;

impl Database {
    pub fn init() -> anyhow::Result<Pool<SqliteConnectionManager>> {
        let path = "humangit_cache.db";
        let manager = SqliteConnectionManager::file(path);
        let pool = Pool::new(manager)?;

        println!("[DB] Connection pool established: {}", path);

        // Execute the entire SQL script directly
        let conn = pool.get()?;
        conn.execute_batch(INIT_SQL)?;

        println!("[DB] Tables verified via schema.sql.");
        Ok(pool)
    }
}

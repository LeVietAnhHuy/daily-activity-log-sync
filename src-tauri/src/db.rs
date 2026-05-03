use rusqlite::{Connection, Result, params};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::Utc;
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

#[derive(Debug, Serialize, Deserialize)]
pub struct ActivityLog {
    pub id: String,
    pub content: String,
    pub timestamp: String,
    pub duration: Option<i32>,
    pub tags: Option<Vec<String>>,
    pub is_starred: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SpendLog {
    pub id: String,
    pub amount: f64,
    pub product_name: String,
    pub timestamp: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SpendAggregates {
    pub daily: f64,
    pub weekly: f64,
    pub monthly: f64,
}


pub fn init_db(app_handle: &tauri::AppHandle) -> Result<Connection> {
    let app_dir = app_handle.path().app_data_dir().unwrap_or_else(|_| {
        let mut path = PathBuf::new();
        path.push(".daily-activity-log");
        path
    });

    if !app_dir.exists() {
        fs::create_dir_all(&app_dir).expect("Failed to create app data directory");
    }

    let db_path = app_dir.join("activity_logs.db");
    let conn = Connection::open(db_path)?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS activity_logs (
            id TEXT PRIMARY KEY,
            content TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            duration INTEGER,
            tags TEXT,
            is_starred BOOLEAN NOT NULL
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS spend_logs (
            id TEXT PRIMARY KEY,
            amount REAL NOT NULL,
            product_name TEXT NOT NULL,
            timestamp TEXT NOT NULL
        )",
        [],
    )?;

    Ok(conn)
}

pub fn add_log(conn: &Connection, content: String, duration: Option<i32>, tags: Option<Vec<String>>) -> Result<ActivityLog> {
    let id = Uuid::new_v4().to_string();
    let timestamp = Utc::now().to_rfc3339();
    let tags_json = match &tags {
        Some(t) => Some(serde_json::to_string(t).unwrap_or_default()),
        None => None,
    };
    
    conn.execute(
        "INSERT INTO activity_logs (id, content, timestamp, duration, tags, is_starred)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            &id,
            &content,
            &timestamp,
            &duration,
            &tags_json,
            false,
        ],
    )?;

    Ok(ActivityLog {
        id,
        content,
        timestamp,
        duration,
        tags,
        is_starred: false,
    })
}

pub fn get_logs(conn: &Connection) -> Result<Vec<ActivityLog>> {
    let mut stmt = conn.prepare("SELECT id, content, timestamp, duration, tags, is_starred FROM activity_logs ORDER BY timestamp DESC")?;
    let log_iter = stmt.query_map([], |row| {
        let tags_str: Option<String> = row.get(4)?;
        let tags = match tags_str {
            Some(s) if !s.is_empty() => serde_json::from_str(&s).unwrap_or(None),
            _ => None,
        };

        Ok(ActivityLog {
            id: row.get(0)?,
            content: row.get(1)?,
            timestamp: row.get(2)?,
            duration: row.get(3)?,
            tags,
            is_starred: row.get(5)?,
        })
    })?;

    let mut logs = Vec::new();
    for log in log_iter {
        logs.push(log?);
    }
    
    Ok(logs)
}

pub fn search_logs(conn: &Connection, keyword: &str) -> Result<Vec<ActivityLog>> {
    let query = format!("%{}%", keyword);
    let mut stmt = conn.prepare("SELECT id, content, timestamp, duration, tags, is_starred FROM activity_logs WHERE content LIKE ?1 ORDER BY timestamp DESC")?;
    let log_iter = stmt.query_map([&query], |row| {
        let tags_str: Option<String> = row.get(4)?;
        let tags = match tags_str {
            Some(s) if !s.is_empty() => serde_json::from_str(&s).unwrap_or(None),
            _ => None,
        };

        Ok(ActivityLog {
            id: row.get(0)?,
            content: row.get(1)?,
            timestamp: row.get(2)?,
            duration: row.get(3)?,
            tags,
            is_starred: row.get(5)?,
        })
    })?;

    let mut logs = Vec::new();
    for log in log_iter {
        logs.push(log?);
    }
    
    Ok(logs)
}

pub fn get_logs_for_date(conn: &Connection, date: &str) -> Result<Vec<ActivityLog>> {
    // date format: YYYY-MM-DD
    let like_pattern = format!("{}%", date);
    let mut stmt = conn.prepare(
        "SELECT id, content, timestamp, duration, tags, is_starred FROM activity_logs WHERE timestamp LIKE ?1 ORDER BY timestamp ASC"
    )?;
    let log_iter = stmt.query_map([&like_pattern], |row| {
        let tags_str: Option<String> = row.get(4)?;
        let tags = match tags_str {
            Some(s) if !s.is_empty() => serde_json::from_str(&s).unwrap_or(None),
            _ => None,
        };
        Ok(ActivityLog {
            id: row.get(0)?,
            content: row.get(1)?,
            timestamp: row.get(2)?,
            duration: row.get(3)?,
            tags,
            is_starred: row.get(5)?,
        })
    })?;

    let mut logs = Vec::new();
    for log in log_iter {
        logs.push(log?);
    }
    Ok(logs)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DayCount {
    pub date: String,
    pub count: i64,
}

pub fn get_task_counts(conn: &Connection) -> Result<Vec<DayCount>> {
    let mut stmt = conn.prepare(
        "SELECT substr(timestamp, 1, 10) as day, COUNT(*) as cnt FROM activity_logs GROUP BY day ORDER BY day DESC"
    )?;
    let iter = stmt.query_map([], |row| {
        Ok(DayCount {
            date: row.get(0)?,
            count: row.get(1)?,
        })
    })?;

    let mut counts = Vec::new();
    for c in iter {
        counts.push(c?);
    }
    Ok(counts)
}

pub fn add_spend_log(conn: &Connection, amount: f64, product_name: String, timestamp_override: Option<String>) -> Result<SpendLog> {
    let id = Uuid::new_v4().to_string();
    let timestamp = timestamp_override.unwrap_or_else(|| Utc::now().to_rfc3339());

    conn.execute(
        "INSERT INTO spend_logs (id, amount, product_name, timestamp) VALUES (?1, ?2, ?3, ?4)",
        params![id, amount, product_name, timestamp],
    )?;

    Ok(SpendLog {
        id,
        amount,
        product_name,
        timestamp,
    })
}

pub fn get_spend_logs(conn: &Connection) -> Result<Vec<SpendLog>> {
    let mut stmt = conn.prepare("SELECT id, amount, product_name, timestamp FROM spend_logs ORDER BY timestamp DESC LIMIT 100")?;
    let log_iter = stmt.query_map([], |row| {
        Ok(SpendLog {
            id: row.get(0)?,
            amount: row.get(1)?,
            product_name: row.get(2)?,
            timestamp: row.get(3)?,
        })
    })?;

    let mut logs = Vec::new();
    for log in log_iter {
        logs.push(log?);
    }
    Ok(logs)
}

pub fn get_spend_aggregates(conn: &Connection) -> Result<SpendAggregates> {
    // Get daily total (UTC based for simplicity)
    let daily: f64 = conn.query_row(
        "SELECT IFNULL(SUM(amount), 0) FROM spend_logs WHERE substr(timestamp, 1, 10) = date('now')",
        [],
        |row| row.get(0),
    ).unwrap_or(0.0);

    // Get weekly total (Assuming week starts on Monday, sqlite 'weekday 1' is Monday modifier in some contexts, but 'now', '-6 days', 'weekday 1' gets last monday)
    let weekly: f64 = conn.query_row(
        "SELECT IFNULL(SUM(amount), 0) FROM spend_logs WHERE substr(timestamp, 1, 10) >= date('now', 'weekday 1', '-7 days')",
        [],
        |row| row.get(0),
    ).unwrap_or(0.0);

    // Get monthly total
    let monthly: f64 = conn.query_row(
        "SELECT IFNULL(SUM(amount), 0) FROM spend_logs WHERE substr(timestamp, 1, 7) = substr(date('now'), 1, 7)",
        [],
        |row| row.get(0),
    ).unwrap_or(0.0);

    Ok(SpendAggregates {
        daily,
        weekly,
        monthly,
    })
}

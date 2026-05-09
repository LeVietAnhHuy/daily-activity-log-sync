use chrono::Utc;
use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;
use uuid::Uuid;

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
    pub currency: String,
    pub original_amount: f64,
    pub category: String,
    pub tags: Vec<String>,
    pub payment_method: String,
    pub note: Option<String>,
    pub is_recurring: bool,
    pub recurrence_interval: Option<String>,
    pub source_recurring_payment_id: Option<String>,
    pub is_recurring_generated: bool,
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

    conn.execute_batch(
        "PRAGMA foreign_keys = ON;
         PRAGMA busy_timeout = 5000;
         PRAGMA journal_mode = WAL;",
    )?;

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

    migrate_spend_logs(&conn)?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs(timestamp DESC)",
        [],
    )?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_spend_logs_timestamp ON spend_logs(timestamp DESC)",
        [],
    )?;

    Ok(conn)
}

fn column_exists(conn: &Connection, table: &str, column: &str) -> Result<bool> {
    let mut stmt = conn.prepare(&format!("PRAGMA table_info({})", table))?;
    let columns = stmt.query_map([], |row| row.get::<_, String>(1))?;

    for col in columns {
        if col? == column {
            return Ok(true);
        }
    }

    Ok(false)
}

fn ensure_column(conn: &Connection, table: &str, column: &str, definition: &str) -> Result<()> {
    if !column_exists(conn, table, column)? {
        conn.execute(
            &format!("ALTER TABLE {} ADD COLUMN {} {}", table, column, definition),
            [],
        )?;
    }

    Ok(())
}

fn migrate_spend_logs(conn: &Connection) -> Result<()> {
    ensure_column(
        conn,
        "spend_logs",
        "currency",
        "TEXT NOT NULL DEFAULT 'VND'",
    )?;
    ensure_column(conn, "spend_logs", "original_amount", "REAL")?;
    ensure_column(
        conn,
        "spend_logs",
        "category",
        "TEXT NOT NULL DEFAULT 'Other'",
    )?;
    ensure_column(conn, "spend_logs", "tags", "TEXT")?;
    ensure_column(
        conn,
        "spend_logs",
        "payment_method",
        "TEXT NOT NULL DEFAULT 'Cash'",
    )?;
    ensure_column(conn, "spend_logs", "note", "TEXT")?;
    ensure_column(
        conn,
        "spend_logs",
        "is_recurring",
        "INTEGER NOT NULL DEFAULT 0",
    )?;
    ensure_column(conn, "spend_logs", "recurrence_interval", "TEXT")?;
    ensure_column(conn, "spend_logs", "source_recurring_payment_id", "TEXT")?;
    ensure_column(
        conn,
        "spend_logs",
        "is_recurring_generated",
        "INTEGER NOT NULL DEFAULT 0",
    )?;

    conn.execute(
        "UPDATE spend_logs
         SET original_amount = amount
         WHERE original_amount IS NULL",
        [],
    )?;
    conn.execute(
        "UPDATE spend_logs
         SET currency = 'VND'
         WHERE currency IS NULL OR trim(currency) = ''",
        [],
    )?;
    conn.execute(
        "UPDATE spend_logs
         SET category = 'Other'
         WHERE category IS NULL OR trim(category) = ''",
        [],
    )?;
    conn.execute(
        "UPDATE spend_logs
         SET payment_method = 'Cash'
         WHERE payment_method IS NULL OR trim(payment_method) = ''",
        [],
    )?;

    Ok(())
}

pub fn add_log(
    conn: &Connection,
    content: String,
    duration: Option<i32>,
    tags: Option<Vec<String>>,
) -> Result<ActivityLog> {
    let id = Uuid::new_v4().to_string();
    let timestamp = Utc::now().to_rfc3339();
    let tags_json = match &tags {
        Some(t) => Some(serde_json::to_string(t).unwrap_or_default()),
        None => None,
    };

    conn.execute(
        "INSERT INTO activity_logs (id, content, timestamp, duration, tags, is_starred)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![&id, &content, &timestamp, &duration, &tags_json, false,],
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
    let mut stmt = conn.prepare(
        "SELECT id, content, timestamp, duration, tags, is_starred
         FROM activity_logs
         WHERE date(timestamp, 'localtime') = ?1
         ORDER BY timestamp ASC",
    )?;
    let log_iter = stmt.query_map([date], |row| {
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
        "SELECT date(timestamp, 'localtime') as day, COUNT(*) as cnt
         FROM activity_logs
         GROUP BY day
         ORDER BY day DESC",
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

fn clean_text(value: Option<String>, fallback: &str) -> String {
    let cleaned = value.unwrap_or_default().trim().to_string();
    if cleaned.is_empty() {
        fallback.to_string()
    } else {
        cleaned
    }
}

fn clean_optional_text(value: Option<String>) -> Option<String> {
    value.and_then(|text| {
        let cleaned = text.trim().to_string();
        if cleaned.is_empty() {
            None
        } else {
            Some(cleaned)
        }
    })
}

fn tags_json(tags: &Vec<String>) -> Option<String> {
    if tags.is_empty() {
        None
    } else {
        Some(serde_json::to_string(tags).unwrap_or_else(|_| "[]".to_string()))
    }
}

fn parse_spend_tags(value: Option<String>) -> Vec<String> {
    match value {
        Some(s) if !s.trim().is_empty() => serde_json::from_str(&s).unwrap_or_default(),
        _ => Vec::new(),
    }
}

pub fn add_spend_log(
    conn: &Connection,
    amount: f64,
    product_name: String,
    timestamp_override: Option<String>,
    currency: Option<String>,
    original_amount: Option<f64>,
    category: Option<String>,
    tags: Option<Vec<String>>,
    payment_method: Option<String>,
    note: Option<String>,
    is_recurring: Option<bool>,
    recurrence_interval: Option<String>,
    source_recurring_payment_id: Option<String>,
    is_recurring_generated: Option<bool>,
) -> Result<SpendLog> {
    let id = Uuid::new_v4().to_string();
    let timestamp = timestamp_override.unwrap_or_else(|| Utc::now().to_rfc3339());
    let product_name = clean_text(Some(product_name), "Untitled");
    let currency = clean_text(currency, "VND");
    let original_amount = original_amount.unwrap_or(amount);
    let category = clean_text(category, "Other");
    let tags = tags.unwrap_or_default();
    let tags_json = tags_json(&tags);
    let payment_method = clean_text(payment_method, "Cash");
    let note = clean_optional_text(note);
    let is_recurring = is_recurring.unwrap_or(false);
    let recurrence_interval = if is_recurring {
        clean_optional_text(recurrence_interval).or_else(|| Some("monthly".to_string()))
    } else {
        None
    };
    let source_recurring_payment_id = clean_optional_text(source_recurring_payment_id);
    let is_recurring_generated = is_recurring_generated.unwrap_or(false);

    conn.execute(
        "INSERT INTO spend_logs (
            id, amount, product_name, timestamp, currency, original_amount, category,
            tags, payment_method, note, is_recurring, recurrence_interval,
            source_recurring_payment_id, is_recurring_generated
         )
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
        params![
            &id,
            amount,
            &product_name,
            &timestamp,
            &currency,
            original_amount,
            &category,
            &tags_json,
            &payment_method,
            &note,
            is_recurring,
            &recurrence_interval,
            &source_recurring_payment_id,
            is_recurring_generated,
        ],
    )?;

    Ok(SpendLog {
        id,
        amount,
        product_name,
        timestamp,
        currency,
        original_amount,
        category,
        tags,
        payment_method,
        note,
        is_recurring,
        recurrence_interval,
        source_recurring_payment_id,
        is_recurring_generated,
    })
}

pub fn update_spend_log(
    conn: &Connection,
    id: String,
    amount: f64,
    product_name: String,
    timestamp: String,
    currency: Option<String>,
    original_amount: Option<f64>,
    category: Option<String>,
    tags: Option<Vec<String>>,
    payment_method: Option<String>,
    note: Option<String>,
    is_recurring: Option<bool>,
    recurrence_interval: Option<String>,
    source_recurring_payment_id: Option<String>,
    is_recurring_generated: Option<bool>,
) -> Result<SpendLog> {
    let product_name = clean_text(Some(product_name), "Untitled");
    let currency = clean_text(currency, "VND");
    let original_amount = original_amount.unwrap_or(amount);
    let category = clean_text(category, "Other");
    let tags = tags.unwrap_or_default();
    let tags_json = tags_json(&tags);
    let payment_method = clean_text(payment_method, "Cash");
    let note = clean_optional_text(note);
    let is_recurring = is_recurring.unwrap_or(false);
    let recurrence_interval = if is_recurring {
        clean_optional_text(recurrence_interval).or_else(|| Some("monthly".to_string()))
    } else {
        None
    };
    let source_recurring_payment_id = clean_optional_text(source_recurring_payment_id);
    let is_recurring_generated = is_recurring_generated.unwrap_or(false);

    conn.execute(
        "UPDATE spend_logs
         SET amount = ?2,
             product_name = ?3,
             timestamp = ?4,
             currency = ?5,
             original_amount = ?6,
             category = ?7,
             tags = ?8,
             payment_method = ?9,
             note = ?10,
             is_recurring = ?11,
             recurrence_interval = ?12,
             source_recurring_payment_id = ?13,
             is_recurring_generated = ?14
         WHERE id = ?1",
        params![
            &id,
            amount,
            &product_name,
            &timestamp,
            &currency,
            original_amount,
            &category,
            &tags_json,
            &payment_method,
            &note,
            is_recurring,
            &recurrence_interval,
            &source_recurring_payment_id,
            is_recurring_generated,
        ],
    )?;

    Ok(SpendLog {
        id,
        amount,
        product_name,
        timestamp,
        currency,
        original_amount,
        category,
        tags,
        payment_method,
        note,
        is_recurring,
        recurrence_interval,
        source_recurring_payment_id,
        is_recurring_generated,
    })
}

pub fn delete_spend_log(conn: &Connection, id: String) -> Result<()> {
    conn.execute("DELETE FROM spend_logs WHERE id = ?1", params![id])?;
    Ok(())
}

pub fn get_spend_logs(conn: &Connection) -> Result<Vec<SpendLog>> {
    let mut stmt = conn.prepare(
        "SELECT id,
                amount,
                product_name,
                timestamp,
                currency,
                IFNULL(original_amount, amount),
                category,
                tags,
                payment_method,
                note,
                is_recurring,
                recurrence_interval,
                source_recurring_payment_id,
                is_recurring_generated
         FROM spend_logs
         ORDER BY timestamp DESC
         LIMIT 500",
    )?;
    let log_iter = stmt.query_map([], |row| {
        let tags_str: Option<String> = row.get(7)?;

        Ok(SpendLog {
            id: row.get(0)?,
            amount: row.get(1)?,
            product_name: row.get(2)?,
            timestamp: row.get(3)?,
            currency: row.get(4)?,
            original_amount: row.get(5)?,
            category: row.get(6)?,
            tags: parse_spend_tags(tags_str),
            payment_method: row.get(8)?,
            note: row.get(9)?,
            is_recurring: row.get(10)?,
            recurrence_interval: row.get(11)?,
            source_recurring_payment_id: row.get(12)?,
            is_recurring_generated: row.get(13)?,
        })
    })?;

    let mut logs = Vec::new();
    for log in log_iter {
        logs.push(log?);
    }
    Ok(logs)
}

pub fn get_spend_aggregates(conn: &Connection) -> Result<SpendAggregates> {
    let daily: f64 = conn
        .query_row(
            "SELECT IFNULL(SUM(amount), 0)
         FROM spend_logs
         WHERE date(timestamp, 'localtime') = date('now', 'localtime')",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0.0);

    // Monday-start week in the device's local timezone.
    let weekly: f64 = conn
        .query_row(
            "SELECT IFNULL(SUM(amount), 0)
         FROM spend_logs
         WHERE date(timestamp, 'localtime') >= date('now', 'localtime', 'weekday 0', '-6 days')",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0.0);

    let monthly: f64 = conn
        .query_row(
            "SELECT IFNULL(SUM(amount), 0)
         FROM spend_logs
         WHERE strftime('%Y-%m', timestamp, 'localtime') = strftime('%Y-%m', 'now', 'localtime')",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0.0);

    Ok(SpendAggregates {
        daily,
        weekly,
        monthly,
    })
}

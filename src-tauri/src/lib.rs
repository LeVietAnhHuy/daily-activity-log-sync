mod db;

use std::sync::Mutex;
use rusqlite::Connection;
use tauri::{Manager, State};

struct AppState {
    db_conn: Mutex<Connection>,
}

#[tauri::command]
fn add_log(state: State<AppState>, content: String, duration: Option<i32>, tags: Option<Vec<String>>) -> Result<db::ActivityLog, String> {
    let conn = state.db_conn.lock().unwrap();
    db::add_log(&conn, content, duration, tags).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_logs(state: State<AppState>) -> Result<Vec<db::ActivityLog>, String> {
    let conn = state.db_conn.lock().unwrap();
    db::get_logs(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
fn search_logs(state: State<AppState>, keyword: String) -> Result<Vec<db::ActivityLog>, String> {
    let conn = state.db_conn.lock().unwrap();
    db::search_logs(&conn, &keyword).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_logs_for_date(state: State<AppState>, date: String) -> Result<Vec<db::ActivityLog>, String> {
    let conn = state.db_conn.lock().unwrap();
    db::get_logs_for_date(&conn, &date).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_task_counts(state: State<AppState>) -> Result<Vec<db::DayCount>, String> {
    let conn = state.db_conn.lock().unwrap();
    db::get_task_counts(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
fn add_spend_log(state: State<AppState>, amount: f64, product_name: String, timestamp_override: Option<String>) -> Result<db::SpendLog, String> {
    let conn = state.db_conn.lock().unwrap();
    db::add_spend_log(&conn, amount, product_name, timestamp_override).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_spend_logs(state: State<AppState>) -> Result<Vec<db::SpendLog>, String> {
    let conn = state.db_conn.lock().unwrap();
    db::get_spend_logs(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_spend_aggregates(state: State<AppState>) -> Result<db::SpendAggregates, String> {
    let conn = state.db_conn.lock().unwrap();
    db::get_spend_aggregates(&conn).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let conn = db::init_db(app.handle()).expect("Failed to initialize database");
            app.manage(AppState {
                db_conn: Mutex::new(conn),
            });
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            add_log, get_logs, search_logs, get_logs_for_date, get_task_counts,
            add_spend_log, get_spend_logs, get_spend_aggregates
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

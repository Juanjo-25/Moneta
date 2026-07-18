use rusqlite::Connection;
use serde::Serialize;
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DatabaseStatus {
    path: String,
    migration_count: i64,
}

#[tauri::command]
fn health_check() -> String {
    "Moneta Tauri conectado".to_string()
}

#[tauri::command]
fn database_status(app: tauri::AppHandle) -> Result<DatabaseStatus, String> {
    let database_path = database_path(&app)?;
    let connection = open_database(&database_path)?;
    apply_migrations(&connection)?;

    let migration_count = connection
        .query_row("SELECT COUNT(*) FROM moneta_migrations", [], |row| {
            row.get(0)
        })
        .map_err(|error| format!("No se pudo leer el estado de migraciones: {error}"))?;

    Ok(DatabaseStatus {
        path: database_path.to_string_lossy().into_owned(),
        migration_count,
    })
}

fn database_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("No se pudo ubicar la carpeta de datos: {error}"))?;

    fs::create_dir_all(&data_dir)
        .map_err(|error| format!("No se pudo crear la carpeta de datos: {error}"))?;

    Ok(data_dir.join("moneta.sqlite3"))
}

fn open_database(path: &PathBuf) -> Result<Connection, String> {
    let connection =
        Connection::open(path).map_err(|error| format!("No se pudo abrir SQLite: {error}"))?;

    connection
        .pragma_update(None, "foreign_keys", "ON")
        .map_err(|error| format!("No se pudo activar llaves foraneas: {error}"))?;

    Ok(connection)
}

fn apply_migrations(connection: &Connection) -> Result<(), String> {
    connection
        .execute_batch(
            "
            CREATE TABLE IF NOT EXISTS moneta_migrations (
              id TEXT PRIMARY KEY,
              applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS products (
              id TEXT PRIMARY KEY,
              sku TEXT NOT NULL UNIQUE,
              name TEXT NOT NULL,
              cost_minor INTEGER NOT NULL DEFAULT 0,
              sale_price_minor INTEGER NOT NULL DEFAULT 0,
              minimum_stock INTEGER NOT NULL DEFAULT 0,
              stock INTEGER NOT NULL DEFAULT 0,
              active INTEGER NOT NULL DEFAULT 1,
              created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS customers (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              document TEXT NOT NULL UNIQUE,
              address TEXT NOT NULL DEFAULT '',
              active INTEGER NOT NULL DEFAULT 1,
              city TEXT NOT NULL DEFAULT '',
              email TEXT NOT NULL DEFAULT '',
              created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS suppliers (
              id TEXT PRIMARY KEY,
              active INTEGER NOT NULL DEFAULT 1,
              address TEXT NOT NULL DEFAULT '',
              city TEXT NOT NULL DEFAULT '',
              department TEXT NOT NULL DEFAULT 'Antioquia',
              document TEXT NOT NULL UNIQUE,
              email TEXT NOT NULL DEFAULT '',
              name TEXT NOT NULL,
              phone TEXT NOT NULL DEFAULT '',
              created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            INSERT OR IGNORE INTO moneta_migrations (id)
            VALUES ('2026-07-18-catalogos-iniciales');
            ",
        )
        .map_err(|error| format!("No se pudieron preparar las tablas iniciales: {error}"))?;

    Ok(())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![health_check, database_status])
        .run(tauri::generate_context!())
        .expect("error while running Moneta desktop app");
}

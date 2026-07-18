use rusqlite::{Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DatabaseStatus {
    path: String,
    migration_count: i64,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct CompanySettings {
    name: String,
    document: String,
    address: String,
    city: String,
    email: String,
    phone: String,
    logo_data_uri: String,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct InvoiceDesignSettings {
    accent_color: String,
    title: String,
    legal_note: String,
    observations: String,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct AppSettings {
    company: CompanySettings,
    invoice: InvoiceDesignSettings,
    sellers: Vec<String>,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct ProductRecord {
    id: String,
    sku: String,
    name: String,
    cost_minor: i64,
    sale_price_minor: i64,
    minimum_stock: i64,
    stock: i64,
    active: bool,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct CustomerRecord {
    id: String,
    name: String,
    document: String,
    address: String,
    active: bool,
    city: String,
    email: String,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct SupplierRecord {
    id: String,
    active: bool,
    address: String,
    city: String,
    department: String,
    document: String,
    email: String,
    name: String,
    phone: String,
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

#[tauri::command]
fn get_app_settings(app: tauri::AppHandle) -> Result<Option<AppSettings>, String> {
    let database_path = database_path(&app)?;
    let connection = open_database(&database_path)?;
    apply_migrations(&connection)?;

    let settings_json: Option<String> = connection
        .query_row(
            "SELECT value FROM app_settings WHERE key = 'app_settings'",
            [],
            |row| row.get(0),
        )
        .optional()
        .map_err(|error| format!("No se pudo leer la configuracion: {error}"))?;

    settings_json
        .map(|value| {
            serde_json::from_str(&value)
                .map_err(|error| format!("La configuracion guardada no es valida: {error}"))
        })
        .transpose()
}

#[tauri::command]
fn save_app_settings(app: tauri::AppHandle, settings: AppSettings) -> Result<(), String> {
    let database_path = database_path(&app)?;
    let connection = open_database(&database_path)?;
    apply_migrations(&connection)?;

    let settings_json = serde_json::to_string(&settings)
        .map_err(|error| format!("No se pudo serializar la configuracion: {error}"))?;

    connection
        .execute(
            "
            INSERT INTO app_settings (key, value, updated_at)
            VALUES ('app_settings', ?1, CURRENT_TIMESTAMP)
            ON CONFLICT(key) DO UPDATE SET
              value = excluded.value,
              updated_at = CURRENT_TIMESTAMP
            ",
            [&settings_json],
        )
        .map_err(|error| format!("No se pudo guardar la configuracion: {error}"))?;

    Ok(())
}

#[tauri::command]
fn list_products(app: tauri::AppHandle) -> Result<Vec<ProductRecord>, String> {
    let database_path = database_path(&app)?;
    let connection = open_database(&database_path)?;
    apply_migrations(&connection)?;

    let mut statement = connection
        .prepare(
            "
            SELECT id, sku, name, cost_minor, sale_price_minor, minimum_stock, stock, active
            FROM products
            ORDER BY name COLLATE NOCASE ASC
            ",
        )
        .map_err(|error| format!("No se pudo preparar la lectura de productos: {error}"))?;

    let rows = statement
        .query_map([], |row| {
            let active: i64 = row.get(7)?;

            Ok(ProductRecord {
                id: row.get(0)?,
                sku: row.get(1)?,
                name: row.get(2)?,
                cost_minor: row.get(3)?,
                sale_price_minor: row.get(4)?,
                minimum_stock: row.get(5)?,
                stock: row.get(6)?,
                active: active == 1,
            })
        })
        .map_err(|error| format!("No se pudieron leer los productos: {error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("No se pudieron convertir los productos: {error}"))
}

#[tauri::command]
fn save_product(app: tauri::AppHandle, product: ProductRecord) -> Result<(), String> {
    let database_path = database_path(&app)?;
    let connection = open_database(&database_path)?;
    apply_migrations(&connection)?;

    connection
        .execute(
            "
            INSERT INTO products (
              id,
              sku,
              name,
              cost_minor,
              sale_price_minor,
              minimum_stock,
              stock,
              active,
              updated_at
            )
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
              sku = excluded.sku,
              name = excluded.name,
              cost_minor = excluded.cost_minor,
              sale_price_minor = excluded.sale_price_minor,
              minimum_stock = excluded.minimum_stock,
              stock = excluded.stock,
              active = excluded.active,
              updated_at = CURRENT_TIMESTAMP
            ",
            (
                &product.id,
                &product.sku,
                &product.name,
                product.cost_minor,
                product.sale_price_minor,
                product.minimum_stock,
                product.stock,
                if product.active { 1 } else { 0 },
            ),
        )
        .map_err(|error| format!("No se pudo guardar el producto: {error}"))?;

    Ok(())
}

#[tauri::command]
fn list_customers(app: tauri::AppHandle) -> Result<Vec<CustomerRecord>, String> {
    let database_path = database_path(&app)?;
    let connection = open_database(&database_path)?;
    apply_migrations(&connection)?;

    let mut statement = connection
        .prepare(
            "
            SELECT id, name, document, address, active, city, email
            FROM customers
            ORDER BY name COLLATE NOCASE ASC
            ",
        )
        .map_err(|error| format!("No se pudo preparar la lectura de clientes: {error}"))?;

    let rows = statement
        .query_map([], |row| {
            let active: i64 = row.get(4)?;

            Ok(CustomerRecord {
                id: row.get(0)?,
                name: row.get(1)?,
                document: row.get(2)?,
                address: row.get(3)?,
                active: active == 1,
                city: row.get(5)?,
                email: row.get(6)?,
            })
        })
        .map_err(|error| format!("No se pudieron leer los clientes: {error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("No se pudieron convertir los clientes: {error}"))
}

#[tauri::command]
fn save_customer(app: tauri::AppHandle, customer: CustomerRecord) -> Result<(), String> {
    let database_path = database_path(&app)?;
    let connection = open_database(&database_path)?;
    apply_migrations(&connection)?;

    connection
        .execute(
            "
            INSERT INTO customers (
              id,
              name,
              document,
              address,
              active,
              city,
              email,
              updated_at
            )
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
              name = excluded.name,
              document = excluded.document,
              address = excluded.address,
              active = excluded.active,
              city = excluded.city,
              email = excluded.email,
              updated_at = CURRENT_TIMESTAMP
            ",
            (
                &customer.id,
                &customer.name,
                &customer.document,
                &customer.address,
                if customer.active { 1 } else { 0 },
                &customer.city,
                &customer.email,
            ),
        )
        .map_err(|error| format!("No se pudo guardar el cliente: {error}"))?;

    Ok(())
}

#[tauri::command]
fn list_suppliers(app: tauri::AppHandle) -> Result<Vec<SupplierRecord>, String> {
    let database_path = database_path(&app)?;
    let connection = open_database(&database_path)?;
    apply_migrations(&connection)?;

    let mut statement = connection
        .prepare(
            "
            SELECT id, active, address, city, department, document, email, name, phone
            FROM suppliers
            ORDER BY name COLLATE NOCASE ASC
            ",
        )
        .map_err(|error| format!("No se pudo preparar la lectura de proveedores: {error}"))?;

    let rows = statement
        .query_map([], |row| {
            let active: i64 = row.get(1)?;

            Ok(SupplierRecord {
                id: row.get(0)?,
                active: active == 1,
                address: row.get(2)?,
                city: row.get(3)?,
                department: row.get(4)?,
                document: row.get(5)?,
                email: row.get(6)?,
                name: row.get(7)?,
                phone: row.get(8)?,
            })
        })
        .map_err(|error| format!("No se pudieron leer los proveedores: {error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("No se pudieron convertir los proveedores: {error}"))
}

#[tauri::command]
fn save_supplier(app: tauri::AppHandle, supplier: SupplierRecord) -> Result<(), String> {
    let database_path = database_path(&app)?;
    let connection = open_database(&database_path)?;
    apply_migrations(&connection)?;

    connection
        .execute(
            "
            INSERT INTO suppliers (
              id,
              active,
              address,
              city,
              department,
              document,
              email,
              name,
              phone,
              updated_at
            )
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
              active = excluded.active,
              address = excluded.address,
              city = excluded.city,
              department = excluded.department,
              document = excluded.document,
              email = excluded.email,
              name = excluded.name,
              phone = excluded.phone,
              updated_at = CURRENT_TIMESTAMP
            ",
            (
                &supplier.id,
                if supplier.active { 1 } else { 0 },
                &supplier.address,
                &supplier.city,
                &supplier.department,
                &supplier.document,
                &supplier.email,
                &supplier.name,
                &supplier.phone,
            ),
        )
        .map_err(|error| format!("No se pudo guardar el proveedor: {error}"))?;

    Ok(())
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

            CREATE TABLE IF NOT EXISTS app_settings (
              key TEXT PRIMARY KEY,
              value TEXT NOT NULL,
              updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            INSERT OR IGNORE INTO moneta_migrations (id)
            VALUES ('2026-07-18-catalogos-iniciales');

            INSERT OR IGNORE INTO moneta_migrations (id)
            VALUES ('2026-07-18-configuracion-app');
            ",
        )
        .map_err(|error| format!("No se pudieron preparar las tablas iniciales: {error}"))?;

    Ok(())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            health_check,
            database_status,
            get_app_settings,
            save_app_settings,
            list_products,
            save_product,
            list_customers,
            save_customer,
            list_suppliers,
            save_supplier
        ])
        .run(tauri::generate_context!())
        .expect("error while running Moneta desktop app");
}

use rusqlite::{params, Connection, OptionalExtension};
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
    unit: String,
    cost_minor: i64,
    sale_price_minor: i64,
    minimum_stock: i64,
    stock: i64,
    active: bool,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct InventoryAdjustmentRecord {
    id: String,
    product_id: String,
    product_name: String,
    unit: String,
    adjustment_type: String,
    quantity: i64,
    previous_stock: i64,
    next_stock: i64,
    reason: String,
    occurred_at_ms: i64,
    occurred_at_label: String,
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
struct SaleLineRecord {
    id: String,
    product_id: String,
    product_name: String,
    unit: String,
    quantity: i64,
    unit_cost_minor_at_sale: i64,
    unit_price_minor: i64,
    discount_percent: f64,
    discount_minor: i64,
    tax_percent: f64,
    tax_minor: i64,
    subtotal_minor: i64,
    cost_minor: i64,
    margin_minor: i64,
    margin_percent: f64,
    total_minor: i64,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct SaleRecord {
    id: String,
    customer: CustomerRecord,
    customer_id: String,
    customer_name: String,
    branch: String,
    prefix: String,
    invoice_number: String,
    seller: String,
    currency: String,
    concept: String,
    issued_at: String,
    product_id: String,
    product_name: String,
    quantity: i64,
    unit_price_minor: i64,
    total_minor: i64,
    lines: Vec<SaleLineRecord>,
    payment_status: String,
    occurred_at_ms: i64,
    occurred_at_label: String,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct ReceivableRecord {
    id: String,
    customer_id: String,
    customer_name: String,
    sale_id: String,
    amount_minor: i64,
    original_amount_minor: i64,
    paid_amount_minor: i64,
    balance_minor: i64,
    due_at: String,
    status: String,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct CustomerReceiptRecord {
    active: bool,
    id: String,
    number: String,
    receivable_id: String,
    receivable_original_amount_minor: i64,
    receivable_paid_amount_minor_before: i64,
    receivable_balance_minor_before: i64,
    receivable_due_at: String,
    sale_id: String,
    customer_id: String,
    customer_name: String,
    amount_minor: i64,
    concept: String,
    received_at: String,
    received_at_ms: i64,
    received_at_label: String,
    voided_at_label: String,
    voided_at_ms: i64,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct CreditNoteLineRecord {
    id: String,
    sale_line_id: String,
    product_id: String,
    product_name: String,
    unit: String,
    quantity: i64,
    unit_price_minor: i64,
    discount_percent: f64,
    tax_percent: f64,
    cost_minor: i64,
    margin_minor: i64,
    margin_percent: f64,
    total_minor: i64,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct CreditNoteRecord {
    adjustment_type: String,
    confirmed_at_label: String,
    confirmed_at_ms: i64,
    id: String,
    number: String,
    sale_id: String,
    invoice_number: String,
    customer: CustomerRecord,
    customer_id: String,
    customer_name: String,
    issued_at: String,
    reason: String,
    receivable_due_at: String,
    status: String,
    total_minor: i64,
    lines: Vec<CreditNoteLineRecord>,
    occurred_at_ms: i64,
    occurred_at_label: String,
    voided_at_label: String,
    voided_at_ms: i64,
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

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct PurchaseLineRecord {
    id: String,
    product_id: String,
    product_name: String,
    unit: String,
    quantity: i64,
    unit_cost_minor: i64,
    discount_percent: f64,
    discount_minor: i64,
    tax_percent: f64,
    tax_minor: i64,
    subtotal_minor: i64,
    total_minor: i64,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct PurchaseRecord {
    id: String,
    supplier_id: String,
    supplier_name: String,
    expense_category: String,
    branch: String,
    prefix: String,
    currency: String,
    concept: String,
    invoice_number: String,
    issued_at: String,
    due_at: String,
    occurred_at_ms: i64,
    product_id: String,
    product_name: String,
    quantity: i64,
    unit_cost_minor: i64,
    total_minor: i64,
    lines: Vec<PurchaseLineRecord>,
    payment_status: String,
    occurred_at_label: String,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct SupplierPayableRecord {
    id: String,
    supplier_id: String,
    supplier_name: String,
    expense_category: String,
    purchase_id: String,
    invoice_number: String,
    original_amount_minor: i64,
    paid_amount_minor: i64,
    balance_minor: i64,
    due_at: String,
    status: String,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct SupplierPaymentRecord {
    id: String,
    payable_id: String,
    purchase_id: String,
    supplier_id: String,
    supplier_name: String,
    expense_category: String,
    amount_minor: i64,
    paid_at_ms: i64,
    paid_at_label: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct PurchasePersistence {
    purchase: PurchaseRecord,
    supplier_payable: Option<SupplierPayableRecord>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SupplierPaymentPersistence {
    payment: SupplierPaymentRecord,
    supplier_payable: SupplierPayableRecord,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SalePersistence {
    sale: SaleRecord,
    receivable: Option<ReceivableRecord>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SaleUpdatePersistence {
    sale: SaleRecord,
    receivable: Option<ReceivableRecord>,
    product_stock_adjustments: Vec<ProductStockAdjustment>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SaleDeletePersistence {
    sale_id: String,
    product_stock_adjustments: Vec<ProductStockAdjustment>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CustomerReceiptPersistence {
    receipt: CustomerReceiptRecord,
    receivable: ReceivableRecord,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CustomerReceiptVoidPersistence {
    receipt: CustomerReceiptRecord,
    receivable: ReceivableRecord,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreditNoteStatusPersistence {
    credit_note: CreditNoteRecord,
    receivable: Option<ReceivableRecord>,
    product_stock_adjustments: Vec<ProductStockAdjustment>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ProductStockAdjustment {
    product_id: String,
    quantity_delta: i64,
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
            SELECT id, sku, name, unit, cost_minor, sale_price_minor, minimum_stock, stock, active
            FROM products
            ORDER BY name COLLATE NOCASE ASC
            ",
        )
        .map_err(|error| format!("No se pudo preparar la lectura de productos: {error}"))?;

    let rows = statement
        .query_map([], |row| {
            let active: i64 = row.get(8)?;

            Ok(ProductRecord {
                id: row.get(0)?,
                sku: row.get(1)?,
                name: row.get(2)?,
                unit: row.get(3)?,
                cost_minor: row.get(4)?,
                sale_price_minor: row.get(5)?,
                minimum_stock: row.get(6)?,
                stock: row.get(7)?,
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
              unit,
              cost_minor,
              sale_price_minor,
              minimum_stock,
              stock,
              active,
              updated_at
            )
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
              sku = excluded.sku,
              name = excluded.name,
              unit = excluded.unit,
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
                &product.unit,
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
fn list_inventory_adjustments(
    app: tauri::AppHandle,
) -> Result<Vec<InventoryAdjustmentRecord>, String> {
    let database_path = database_path(&app)?;
    let connection = open_database(&database_path)?;
    apply_migrations(&connection)?;

    let mut statement = connection
        .prepare(
            "
            SELECT
              id,
              product_id,
              product_name,
              unit,
              adjustment_type,
              quantity,
              previous_stock,
              next_stock,
              reason,
              occurred_at_ms,
              occurred_at_label
            FROM inventory_adjustments
            ORDER BY occurred_at_ms DESC
            ",
        )
        .map_err(|error| {
            format!("No se pudo preparar la lectura de ajustes de inventario: {error}")
        })?;

    let rows = statement
        .query_map([], |row| {
            Ok(InventoryAdjustmentRecord {
                id: row.get(0)?,
                product_id: row.get(1)?,
                product_name: row.get(2)?,
                unit: row.get(3)?,
                adjustment_type: row.get(4)?,
                quantity: row.get(5)?,
                previous_stock: row.get(6)?,
                next_stock: row.get(7)?,
                reason: row.get(8)?,
                occurred_at_ms: row.get(9)?,
                occurred_at_label: row.get(10)?,
            })
        })
        .map_err(|error| format!("No se pudieron leer los ajustes de inventario: {error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("No se pudieron convertir los ajustes de inventario: {error}"))
}

#[tauri::command]
fn save_inventory_adjustment(
    app: tauri::AppHandle,
    adjustment: InventoryAdjustmentRecord,
    product: ProductRecord,
) -> Result<(), String> {
    if adjustment.product_id != product.id {
        return Err("El producto del ajuste no coincide.".to_string());
    }

    if adjustment.reason.trim().is_empty() {
        return Err("El motivo del ajuste es obligatorio.".to_string());
    }

    if adjustment.next_stock < 0 {
        return Err("El inventario no puede quedar negativo.".to_string());
    }

    if product.stock != adjustment.next_stock {
        return Err("El stock final del producto no coincide con el ajuste.".to_string());
    }

    let database_path = database_path(&app)?;
    let mut connection = open_database(&database_path)?;
    apply_migrations(&connection)?;
    let transaction = connection
        .transaction()
        .map_err(|error| format!("No se pudo iniciar el ajuste de inventario: {error}"))?;

    let stored_stock: Option<i64> = transaction
        .query_row(
            "SELECT stock FROM products WHERE id = ?1",
            [&product.id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|error| format!("No se pudo validar el producto del ajuste: {error}"))?;

    match stored_stock {
        Some(stock) if stock == adjustment.previous_stock => {}
        Some(_) => {
            return Err("El inventario cambio antes de guardar el ajuste.".to_string());
        }
        None => {
            return Err("El producto del ajuste no existe.".to_string());
        }
    }

    transaction
        .execute(
            "
            INSERT INTO inventory_adjustments (
              id,
              product_id,
              product_name,
              unit,
              adjustment_type,
              quantity,
              previous_stock,
              next_stock,
              reason,
              occurred_at_ms,
              occurred_at_label,
              created_at
            )
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, CURRENT_TIMESTAMP)
            ",
            (
                &adjustment.id,
                &adjustment.product_id,
                &adjustment.product_name,
                &adjustment.unit,
                &adjustment.adjustment_type,
                adjustment.quantity,
                adjustment.previous_stock,
                adjustment.next_stock,
                &adjustment.reason,
                adjustment.occurred_at_ms,
                &adjustment.occurred_at_label,
            ),
        )
        .map_err(|error| format!("No se pudo guardar el ajuste de inventario: {error}"))?;

    transaction
        .execute(
            "
            UPDATE products
            SET
              sku = ?2,
              name = ?3,
              unit = ?4,
              cost_minor = ?5,
              sale_price_minor = ?6,
              minimum_stock = ?7,
              stock = ?8,
              active = ?9,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?1
            ",
            (
                &product.id,
                &product.sku,
                &product.name,
                &product.unit,
                product.cost_minor,
                product.sale_price_minor,
                product.minimum_stock,
                product.stock,
                if product.active { 1 } else { 0 },
            ),
        )
        .map_err(|error| format!("No se pudo actualizar el stock del producto: {error}"))?;

    transaction
        .commit()
        .map_err(|error| format!("No se pudo confirmar el ajuste de inventario: {error}"))?;

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
fn list_sales(app: tauri::AppHandle) -> Result<Vec<SaleRecord>, String> {
    let database_path = database_path(&app)?;
    let connection = open_database(&database_path)?;
    apply_migrations(&connection)?;

    let mut statement = connection
        .prepare(
            "
            SELECT
              id,
              customer_json,
              customer_id,
              customer_name,
              branch,
              prefix,
              invoice_number,
              seller,
              currency,
              concept,
              issued_at,
              product_id,
              product_name,
              quantity,
              unit_price_minor,
              total_minor,
              payment_status,
              occurred_at_ms,
              occurred_at_label
            FROM sales
            ORDER BY occurred_at_ms DESC, id DESC
            ",
        )
        .map_err(|error| format!("No se pudo preparar la lectura de ventas: {error}"))?;

    let rows = statement
        .query_map([], |row| {
            let customer_json: String = row.get(1)?;
            let customer = serde_json::from_str(&customer_json).map_err(|error| {
                rusqlite::Error::FromSqlConversionFailure(
                    1,
                    rusqlite::types::Type::Text,
                    Box::new(error),
                )
            })?;

            Ok(SaleRecord {
                id: row.get(0)?,
                customer,
                customer_id: row.get(2)?,
                customer_name: row.get(3)?,
                branch: row.get(4)?,
                prefix: row.get(5)?,
                invoice_number: row.get(6)?,
                seller: row.get(7)?,
                currency: row.get(8)?,
                concept: row.get(9)?,
                issued_at: row.get(10)?,
                product_id: row.get(11)?,
                product_name: row.get(12)?,
                quantity: row.get(13)?,
                unit_price_minor: row.get(14)?,
                total_minor: row.get(15)?,
                lines: Vec::new(),
                payment_status: row.get(16)?,
                occurred_at_ms: row.get(17)?,
                occurred_at_label: row.get(18)?,
            })
        })
        .map_err(|error| format!("No se pudieron leer las ventas: {error}"))?;

    let mut sales = rows
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("No se pudieron convertir las ventas: {error}"))?;

    for sale in &mut sales {
        sale.lines = list_sale_lines(&connection, &sale.id)?;
    }

    Ok(sales)
}

#[tauri::command]
fn list_receivables(app: tauri::AppHandle) -> Result<Vec<ReceivableRecord>, String> {
    let database_path = database_path(&app)?;
    let connection = open_database(&database_path)?;
    apply_migrations(&connection)?;

    let mut statement = connection
        .prepare(
            "
            SELECT
              id,
              customer_id,
              customer_name,
              sale_id,
              amount_minor,
              original_amount_minor,
              paid_amount_minor,
              balance_minor,
              due_at,
              status
            FROM receivables
            WHERE balance_minor > 0
            ORDER BY due_at ASC, id ASC
            ",
        )
        .map_err(|error| {
            format!("No se pudo preparar la lectura de cartera por cobrar: {error}")
        })?;

    let rows = statement
        .query_map([], |row| {
            Ok(ReceivableRecord {
                id: row.get(0)?,
                customer_id: row.get(1)?,
                customer_name: row.get(2)?,
                sale_id: row.get(3)?,
                amount_minor: row.get(4)?,
                original_amount_minor: row.get(5)?,
                paid_amount_minor: row.get(6)?,
                balance_minor: row.get(7)?,
                due_at: row.get(8)?,
                status: row.get(9)?,
            })
        })
        .map_err(|error| format!("No se pudo leer la cartera por cobrar: {error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("No se pudo convertir la cartera por cobrar: {error}"))
}

#[tauri::command]
fn list_customer_receipts(app: tauri::AppHandle) -> Result<Vec<CustomerReceiptRecord>, String> {
    let database_path = database_path(&app)?;
    let connection = open_database(&database_path)?;
    apply_migrations(&connection)?;

    let mut statement = connection
        .prepare(
            "
            SELECT
              active,
              id,
              number,
              receivable_id,
              receivable_original_amount_minor,
              receivable_paid_amount_minor_before,
              receivable_balance_minor_before,
              receivable_due_at,
              sale_id,
              customer_id,
              customer_name,
              amount_minor,
              concept,
              received_at,
              received_at_ms,
              received_at_label,
              voided_at_label,
              voided_at_ms
            FROM customer_receipts
            ORDER BY received_at_ms DESC, id DESC
            ",
        )
        .map_err(|error| format!("No se pudo preparar la lectura de recibos de caja: {error}"))?;

    let rows = statement
        .query_map([], |row| {
            Ok(CustomerReceiptRecord {
                active: row.get::<_, i64>(0)? == 1,
                id: row.get(1)?,
                number: row.get(2)?,
                receivable_id: row.get(3)?,
                receivable_original_amount_minor: row.get(4)?,
                receivable_paid_amount_minor_before: row.get(5)?,
                receivable_balance_minor_before: row.get(6)?,
                receivable_due_at: row.get(7)?,
                sale_id: row.get(8)?,
                customer_id: row.get(9)?,
                customer_name: row.get(10)?,
                amount_minor: row.get(11)?,
                concept: row.get(12)?,
                received_at: row.get(13)?,
                received_at_ms: row.get(14)?,
                received_at_label: row.get(15)?,
                voided_at_label: row.get(16)?,
                voided_at_ms: row.get(17)?,
            })
        })
        .map_err(|error| format!("No se pudieron leer los recibos de caja: {error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("No se pudieron convertir los recibos de caja: {error}"))
}

#[tauri::command]
fn save_sale(app: tauri::AppHandle, input: SalePersistence) -> Result<(), String> {
    let database_path = database_path(&app)?;
    let mut connection = open_database(&database_path)?;
    apply_migrations(&connection)?;
    let transaction = connection
        .transaction()
        .map_err(|error| format!("No se pudo iniciar la transaccion de venta: {error}"))?;
    let customer_json = serde_json::to_string(&input.sale.customer)
        .map_err(|error| format!("No se pudo serializar el cliente de la venta: {error}"))?;

    transaction
        .execute(
            "
            INSERT INTO sales (
              id,
              customer_json,
              customer_id,
              customer_name,
              branch,
              prefix,
              invoice_number,
              seller,
              currency,
              concept,
              issued_at,
              product_id,
              product_name,
              quantity,
              unit_price_minor,
              total_minor,
              payment_status,
              occurred_at_ms,
              occurred_at_label,
              updated_at
            )
            VALUES (
              ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10,
              ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19,
              CURRENT_TIMESTAMP
            )
            ",
            params![
                &input.sale.id,
                &customer_json,
                &input.sale.customer_id,
                &input.sale.customer_name,
                &input.sale.branch,
                &input.sale.prefix,
                &input.sale.invoice_number,
                &input.sale.seller,
                &input.sale.currency,
                &input.sale.concept,
                &input.sale.issued_at,
                &input.sale.product_id,
                &input.sale.product_name,
                input.sale.quantity,
                input.sale.unit_price_minor,
                input.sale.total_minor,
                &input.sale.payment_status,
                input.sale.occurred_at_ms,
                &input.sale.occurred_at_label,
            ],
        )
        .map_err(|error| format!("No se pudo guardar la venta: {error}"))?;

    for line in &input.sale.lines {
        transaction
            .execute(
                "
                INSERT INTO sale_lines (
                  id,
                  sale_id,
                  product_id,
                  product_name,
                  unit,
                  quantity,
                  unit_cost_minor_at_sale,
                  unit_price_minor,
                  discount_percent,
                  discount_minor,
                  tax_percent,
                  tax_minor,
                  subtotal_minor,
                  cost_minor,
                  margin_minor,
                  margin_percent,
                  total_minor
                )
                VALUES (
                  ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9,
                  ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17
                )
                ",
                params![
                    &line.id,
                    &input.sale.id,
                    &line.product_id,
                    &line.product_name,
                    &line.unit,
                    line.quantity,
                    line.unit_cost_minor_at_sale,
                    line.unit_price_minor,
                    line.discount_percent,
                    line.discount_minor,
                    line.tax_percent,
                    line.tax_minor,
                    line.subtotal_minor,
                    line.cost_minor,
                    line.margin_minor,
                    line.margin_percent,
                    line.total_minor,
                ],
            )
            .map_err(|error| format!("No se pudo guardar una linea de venta: {error}"))?;

        let affected = transaction
            .execute(
                "
                UPDATE products
                SET
                  stock = stock - ?1,
                  updated_at = CURRENT_TIMESTAMP
                WHERE id = ?2 AND stock >= ?1
                ",
                params![line.quantity, &line.product_id],
            )
            .map_err(|error| format!("No se pudo descontar inventario: {error}"))?;

        if affected == 0 {
            return Err(format!(
                "No hay inventario suficiente para {} en SQLite.",
                line.product_name
            ));
        }
    }

    if let Some(receivable) = &input.receivable {
        transaction
            .execute(
                "
                INSERT INTO receivables (
                  id,
                  customer_id,
                  customer_name,
                  sale_id,
                  amount_minor,
                  original_amount_minor,
                  paid_amount_minor,
                  balance_minor,
                  due_at,
                  status,
                  updated_at
                )
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, CURRENT_TIMESTAMP)
                ",
                params![
                    &receivable.id,
                    &receivable.customer_id,
                    &receivable.customer_name,
                    &receivable.sale_id,
                    receivable.amount_minor,
                    receivable.original_amount_minor,
                    receivable.paid_amount_minor,
                    receivable.balance_minor,
                    &receivable.due_at,
                    &receivable.status,
                ],
            )
            .map_err(|error| format!("No se pudo guardar la cuenta por cobrar: {error}"))?;
    }

    transaction
        .commit()
        .map_err(|error| format!("No se pudo confirmar la venta: {error}"))?;

    Ok(())
}

#[tauri::command]
fn update_sale(app: tauri::AppHandle, input: SaleUpdatePersistence) -> Result<(), String> {
    let database_path = database_path(&app)?;
    let mut connection = open_database(&database_path)?;
    apply_migrations(&connection)?;
    let transaction = connection
        .transaction()
        .map_err(|error| format!("No se pudo iniciar la transaccion de edicion: {error}"))?;

    ensure_sale_has_no_dependent_documents(&transaction, &input.sale.id)?;

    let customer_json = serde_json::to_string(&input.sale.customer)
        .map_err(|error| format!("No se pudo serializar el cliente de la venta: {error}"))?;

    let affected = transaction
        .execute(
            "
            UPDATE sales
            SET
              customer_json = ?1,
              customer_id = ?2,
              customer_name = ?3,
              branch = ?4,
              prefix = ?5,
              invoice_number = ?6,
              seller = ?7,
              currency = ?8,
              concept = ?9,
              issued_at = ?10,
              product_id = ?11,
              product_name = ?12,
              quantity = ?13,
              unit_price_minor = ?14,
              total_minor = ?15,
              payment_status = ?16,
              occurred_at_ms = ?17,
              occurred_at_label = ?18,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?19
            ",
            params![
                &customer_json,
                &input.sale.customer_id,
                &input.sale.customer_name,
                &input.sale.branch,
                &input.sale.prefix,
                &input.sale.invoice_number,
                &input.sale.seller,
                &input.sale.currency,
                &input.sale.concept,
                &input.sale.issued_at,
                &input.sale.product_id,
                &input.sale.product_name,
                input.sale.quantity,
                input.sale.unit_price_minor,
                input.sale.total_minor,
                &input.sale.payment_status,
                input.sale.occurred_at_ms,
                &input.sale.occurred_at_label,
                &input.sale.id,
            ],
        )
        .map_err(|error| format!("No se pudo actualizar la venta: {error}"))?;

    if affected == 0 {
        return Err(format!("La venta {} no existe en SQLite.", input.sale.id));
    }

    transaction
        .execute(
            "DELETE FROM sale_lines WHERE sale_id = ?1",
            [&input.sale.id],
        )
        .map_err(|error| format!("No se pudieron reemplazar las lineas de venta: {error}"))?;

    for line in &input.sale.lines {
        transaction
            .execute(
                "
                INSERT INTO sale_lines (
                  id,
                  sale_id,
                  product_id,
                  product_name,
                  unit,
                  quantity,
                  unit_cost_minor_at_sale,
                  unit_price_minor,
                  discount_percent,
                  discount_minor,
                  tax_percent,
                  tax_minor,
                  subtotal_minor,
                  cost_minor,
                  margin_minor,
                  margin_percent,
                  total_minor
                )
                VALUES (
                  ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9,
                  ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17
                )
                ",
                params![
                    &line.id,
                    &input.sale.id,
                    &line.product_id,
                    &line.product_name,
                    &line.unit,
                    line.quantity,
                    line.unit_cost_minor_at_sale,
                    line.unit_price_minor,
                    line.discount_percent,
                    line.discount_minor,
                    line.tax_percent,
                    line.tax_minor,
                    line.subtotal_minor,
                    line.cost_minor,
                    line.margin_minor,
                    line.margin_percent,
                    line.total_minor,
                ],
            )
            .map_err(|error| format!("No se pudo guardar una linea de venta: {error}"))?;
    }

    for adjustment in &input.product_stock_adjustments {
        apply_product_stock_adjustment(&transaction, adjustment)?;
    }

    transaction
        .execute(
            "DELETE FROM receivables WHERE sale_id = ?1",
            [&input.sale.id],
        )
        .map_err(|error| format!("No se pudo reemplazar la cuenta por cobrar: {error}"))?;

    if let Some(receivable) = &input.receivable {
        transaction
            .execute(
                "
                INSERT INTO receivables (
                  id,
                  customer_id,
                  customer_name,
                  sale_id,
                  amount_minor,
                  original_amount_minor,
                  paid_amount_minor,
                  balance_minor,
                  due_at,
                  status,
                  updated_at
                )
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, CURRENT_TIMESTAMP)
                ",
                params![
                    &receivable.id,
                    &receivable.customer_id,
                    &receivable.customer_name,
                    &receivable.sale_id,
                    receivable.amount_minor,
                    receivable.original_amount_minor,
                    receivable.paid_amount_minor,
                    receivable.balance_minor,
                    &receivable.due_at,
                    &receivable.status,
                ],
            )
            .map_err(|error| format!("No se pudo guardar la cuenta por cobrar: {error}"))?;
    }

    transaction
        .commit()
        .map_err(|error| format!("No se pudo confirmar la edicion de venta: {error}"))?;

    Ok(())
}

#[tauri::command]
fn delete_sale(app: tauri::AppHandle, input: SaleDeletePersistence) -> Result<(), String> {
    let database_path = database_path(&app)?;
    let mut connection = open_database(&database_path)?;
    apply_migrations(&connection)?;
    let transaction = connection
        .transaction()
        .map_err(|error| format!("No se pudo iniciar la transaccion de eliminacion: {error}"))?;

    ensure_sale_has_no_dependent_documents(&transaction, &input.sale_id)?;

    for adjustment in &input.product_stock_adjustments {
        apply_product_stock_adjustment(&transaction, adjustment)?;
    }

    transaction
        .execute(
            "DELETE FROM receivables WHERE sale_id = ?1",
            [&input.sale_id],
        )
        .map_err(|error| format!("No se pudo eliminar la cuenta por cobrar: {error}"))?;
    transaction
        .execute(
            "DELETE FROM sale_lines WHERE sale_id = ?1",
            [&input.sale_id],
        )
        .map_err(|error| format!("No se pudieron eliminar las lineas de venta: {error}"))?;

    let affected = transaction
        .execute("DELETE FROM sales WHERE id = ?1", [&input.sale_id])
        .map_err(|error| format!("No se pudo eliminar la venta: {error}"))?;

    if affected == 0 {
        return Err(format!("La venta {} no existe en SQLite.", input.sale_id));
    }

    transaction
        .commit()
        .map_err(|error| format!("No se pudo confirmar la eliminacion de venta: {error}"))?;

    Ok(())
}

#[tauri::command]
fn save_customer_receipt(
    app: tauri::AppHandle,
    input: CustomerReceiptPersistence,
) -> Result<(), String> {
    let database_path = database_path(&app)?;
    let mut connection = open_database(&database_path)?;
    apply_migrations(&connection)?;
    let transaction = connection
        .transaction()
        .map_err(|error| format!("No se pudo iniciar la transaccion del recibo: {error}"))?;

    transaction
        .execute(
            "
            INSERT INTO customer_receipts (
              active,
              id,
              number,
              receivable_id,
              receivable_original_amount_minor,
              receivable_paid_amount_minor_before,
              receivable_balance_minor_before,
              receivable_due_at,
              sale_id,
              customer_id,
              customer_name,
              amount_minor,
              concept,
              received_at,
              received_at_ms,
              received_at_label,
              voided_at_label,
              voided_at_ms
            )
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18)
            ",
            params![
                if input.receipt.active { 1 } else { 0 },
                &input.receipt.id,
                &input.receipt.number,
                &input.receipt.receivable_id,
                input.receipt.receivable_original_amount_minor,
                input.receipt.receivable_paid_amount_minor_before,
                input.receipt.receivable_balance_minor_before,
                &input.receipt.receivable_due_at,
                &input.receipt.sale_id,
                &input.receipt.customer_id,
                &input.receipt.customer_name,
                input.receipt.amount_minor,
                &input.receipt.concept,
                &input.receipt.received_at,
                input.receipt.received_at_ms,
                &input.receipt.received_at_label,
                &input.receipt.voided_at_label,
                input.receipt.voided_at_ms,
            ],
        )
        .map_err(|error| format!("No se pudo guardar el recibo de caja: {error}"))?;

    let affected = transaction
        .execute(
            "
            UPDATE receivables
            SET
              amount_minor = ?1,
              paid_amount_minor = ?2,
              balance_minor = ?3,
              status = ?4,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?5
            ",
            params![
                input.receivable.amount_minor,
                input.receivable.paid_amount_minor,
                input.receivable.balance_minor,
                &input.receivable.status,
                &input.receivable.id,
            ],
        )
        .map_err(|error| format!("No se pudo actualizar la cuenta por cobrar: {error}"))?;

    if affected == 0 {
        return Err(format!(
            "La cuenta por cobrar {} no existe en SQLite.",
            input.receivable.sale_id
        ));
    }

    transaction
        .commit()
        .map_err(|error| format!("No se pudo confirmar el recibo de caja: {error}"))?;

    Ok(())
}

#[tauri::command]
fn void_customer_receipt(
    app: tauri::AppHandle,
    input: CustomerReceiptVoidPersistence,
) -> Result<(), String> {
    let database_path = database_path(&app)?;
    let mut connection = open_database(&database_path)?;
    apply_migrations(&connection)?;
    let transaction = connection
        .transaction()
        .map_err(|error| format!("No se pudo iniciar la transaccion de anulacion: {error}"))?;

    let affected = transaction
        .execute(
            "
            UPDATE customer_receipts
            SET
              active = 0,
              voided_at_label = ?1,
              voided_at_ms = ?2
            WHERE id = ?3 AND active = 1
            ",
            params![
                &input.receipt.voided_at_label,
                input.receipt.voided_at_ms,
                &input.receipt.id,
            ],
        )
        .map_err(|error| format!("No se pudo anular el recibo de caja: {error}"))?;

    if affected == 0 {
        return Err(format!(
            "El recibo de caja {} no existe o ya esta anulado.",
            input.receipt.number
        ));
    }

    transaction
        .execute(
            "
            INSERT INTO receivables (
              id,
              customer_id,
              customer_name,
              sale_id,
              amount_minor,
              original_amount_minor,
              paid_amount_minor,
              balance_minor,
              due_at,
              status,
              updated_at
            )
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
              amount_minor = excluded.amount_minor,
              original_amount_minor = excluded.original_amount_minor,
              paid_amount_minor = excluded.paid_amount_minor,
              balance_minor = excluded.balance_minor,
              due_at = excluded.due_at,
              status = excluded.status,
              updated_at = CURRENT_TIMESTAMP
            ",
            params![
                &input.receivable.id,
                &input.receivable.customer_id,
                &input.receivable.customer_name,
                &input.receivable.sale_id,
                input.receivable.amount_minor,
                input.receivable.original_amount_minor,
                input.receivable.paid_amount_minor,
                input.receivable.balance_minor,
                &input.receivable.due_at,
                &input.receivable.status,
            ],
        )
        .map_err(|error| format!("No se pudo restaurar la cuenta por cobrar: {error}"))?;

    transaction
        .commit()
        .map_err(|error| format!("No se pudo confirmar la anulacion del recibo: {error}"))?;

    Ok(())
}

#[tauri::command]
fn list_credit_notes(app: tauri::AppHandle) -> Result<Vec<CreditNoteRecord>, String> {
    let database_path = database_path(&app)?;
    let connection = open_database(&database_path)?;
    apply_migrations(&connection)?;

    let mut statement = connection
        .prepare(
            "
            SELECT
              adjustment_type,
              confirmed_at_label,
              confirmed_at_ms,
              id,
              number,
              sale_id,
              invoice_number,
              customer_json,
              customer_id,
              customer_name,
              issued_at,
              reason,
              receivable_due_at,
              status,
              total_minor,
              occurred_at_ms,
              occurred_at_label,
              voided_at_label,
              voided_at_ms
            FROM credit_notes
            ORDER BY occurred_at_ms DESC, id DESC
            ",
        )
        .map_err(|error| format!("No se pudo preparar la lectura de notas credito: {error}"))?;

    let rows = statement
        .query_map([], |row| {
            let customer_json: String = row.get(7)?;
            let customer = serde_json::from_str(&customer_json).map_err(|error| {
                rusqlite::Error::FromSqlConversionFailure(
                    7,
                    rusqlite::types::Type::Text,
                    Box::new(error),
                )
            })?;

            Ok(CreditNoteRecord {
                adjustment_type: row.get(0)?,
                confirmed_at_label: row.get(1)?,
                confirmed_at_ms: row.get(2)?,
                id: row.get(3)?,
                number: row.get(4)?,
                sale_id: row.get(5)?,
                invoice_number: row.get(6)?,
                customer,
                customer_id: row.get(8)?,
                customer_name: row.get(9)?,
                issued_at: row.get(10)?,
                reason: row.get(11)?,
                receivable_due_at: row.get(12)?,
                status: row.get(13)?,
                total_minor: row.get(14)?,
                lines: Vec::new(),
                occurred_at_ms: row.get(15)?,
                occurred_at_label: row.get(16)?,
                voided_at_label: row.get(17)?,
                voided_at_ms: row.get(18)?,
            })
        })
        .map_err(|error| format!("No se pudieron leer las notas credito: {error}"))?;

    let mut credit_notes = rows
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("No se pudieron convertir las notas credito: {error}"))?;

    for credit_note in &mut credit_notes {
        credit_note.lines = list_credit_note_lines(&connection, &credit_note.id)?;
    }

    Ok(credit_notes)
}

#[tauri::command]
fn save_credit_note(app: tauri::AppHandle, credit_note: CreditNoteRecord) -> Result<(), String> {
    let database_path = database_path(&app)?;
    let mut connection = open_database(&database_path)?;
    apply_migrations(&connection)?;
    let transaction = connection
        .transaction()
        .map_err(|error| format!("No se pudo iniciar la transaccion de nota credito: {error}"))?;
    let customer_json = serde_json::to_string(&credit_note.customer)
        .map_err(|error| format!("No se pudo serializar el cliente de la nota credito: {error}"))?;

    transaction
        .execute(
            "
            INSERT INTO credit_notes (
              adjustment_type,
              confirmed_at_label,
              confirmed_at_ms,
              id,
              number,
              sale_id,
              invoice_number,
              customer_json,
              customer_id,
              customer_name,
              issued_at,
              reason,
              receivable_due_at,
              status,
              total_minor,
              occurred_at_ms,
              occurred_at_label,
              voided_at_label,
              voided_at_ms,
              updated_at
            )
            VALUES (
              ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10,
              ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19,
              CURRENT_TIMESTAMP
            )
            ",
            params![
                &credit_note.adjustment_type,
                &credit_note.confirmed_at_label,
                credit_note.confirmed_at_ms,
                &credit_note.id,
                &credit_note.number,
                &credit_note.sale_id,
                &credit_note.invoice_number,
                &customer_json,
                &credit_note.customer_id,
                &credit_note.customer_name,
                &credit_note.issued_at,
                &credit_note.reason,
                &credit_note.receivable_due_at,
                &credit_note.status,
                credit_note.total_minor,
                credit_note.occurred_at_ms,
                &credit_note.occurred_at_label,
                &credit_note.voided_at_label,
                credit_note.voided_at_ms,
            ],
        )
        .map_err(|error| format!("No se pudo guardar la nota credito: {error}"))?;

    for line in &credit_note.lines {
        transaction
            .execute(
                "
                INSERT INTO credit_note_lines (
                  id,
                  credit_note_id,
                  sale_line_id,
                  product_id,
                  product_name,
                  unit,
                  quantity,
                  unit_price_minor,
                  discount_percent,
                  tax_percent,
                  cost_minor,
                  margin_minor,
                  margin_percent,
                  total_minor
                )
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)
                ",
                params![
                    &line.id,
                    &credit_note.id,
                    &line.sale_line_id,
                    &line.product_id,
                    &line.product_name,
                    &line.unit,
                    line.quantity,
                    line.unit_price_minor,
                    line.discount_percent,
                    line.tax_percent,
                    line.cost_minor,
                    line.margin_minor,
                    line.margin_percent,
                    line.total_minor,
                ],
            )
            .map_err(|error| format!("No se pudo guardar una linea de nota credito: {error}"))?;
    }

    transaction
        .commit()
        .map_err(|error| format!("No se pudo confirmar la nota credito: {error}"))?;

    Ok(())
}

#[tauri::command]
fn save_credit_note_status(
    app: tauri::AppHandle,
    input: CreditNoteStatusPersistence,
) -> Result<(), String> {
    let database_path = database_path(&app)?;
    let mut connection = open_database(&database_path)?;
    apply_migrations(&connection)?;
    let transaction = connection
        .transaction()
        .map_err(|error| format!("No se pudo iniciar la transaccion de estado: {error}"))?;

    transaction
        .execute(
            "
            UPDATE credit_notes
            SET
              status = ?1,
              confirmed_at_label = ?2,
              confirmed_at_ms = ?3,
              voided_at_label = ?4,
              voided_at_ms = ?5,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?6
            ",
            params![
                &input.credit_note.status,
                &input.credit_note.confirmed_at_label,
                input.credit_note.confirmed_at_ms,
                &input.credit_note.voided_at_label,
                input.credit_note.voided_at_ms,
                &input.credit_note.id,
            ],
        )
        .map_err(|error| format!("No se pudo actualizar la nota credito: {error}"))?;

    for adjustment in &input.product_stock_adjustments {
        let affected = transaction
            .execute(
                "
                UPDATE products
                SET
                  stock = stock + ?1,
                  updated_at = CURRENT_TIMESTAMP
                WHERE id = ?2 AND stock + ?1 >= 0
                ",
                params![adjustment.quantity_delta, &adjustment.product_id],
            )
            .map_err(|error| format!("No se pudo ajustar inventario: {error}"))?;

        if affected == 0 {
            return Err(format!(
                "No se pudo ajustar inventario para el producto {}.",
                adjustment.product_id
            ));
        }
    }

    if let Some(receivable) = &input.receivable {
        transaction
            .execute(
                "
                INSERT INTO receivables (
                  id,
                  customer_id,
                  customer_name,
                  sale_id,
                  amount_minor,
                  original_amount_minor,
                  paid_amount_minor,
                  balance_minor,
                  due_at,
                  status,
                  updated_at
                )
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, CURRENT_TIMESTAMP)
                ON CONFLICT(id) DO UPDATE SET
                  amount_minor = excluded.amount_minor,
                  original_amount_minor = excluded.original_amount_minor,
                  paid_amount_minor = excluded.paid_amount_minor,
                  balance_minor = excluded.balance_minor,
                  due_at = excluded.due_at,
                  status = excluded.status,
                  updated_at = CURRENT_TIMESTAMP
                ",
                params![
                    &receivable.id,
                    &receivable.customer_id,
                    &receivable.customer_name,
                    &receivable.sale_id,
                    receivable.amount_minor,
                    receivable.original_amount_minor,
                    receivable.paid_amount_minor,
                    receivable.balance_minor,
                    &receivable.due_at,
                    &receivable.status,
                ],
            )
            .map_err(|error| format!("No se pudo actualizar la cuenta por cobrar: {error}"))?;
    }

    transaction
        .commit()
        .map_err(|error| format!("No se pudo confirmar el estado de nota credito: {error}"))?;

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

#[tauri::command]
fn list_purchases(app: tauri::AppHandle) -> Result<Vec<PurchaseRecord>, String> {
    let database_path = database_path(&app)?;
    let connection = open_database(&database_path)?;
    apply_migrations(&connection)?;

    let mut statement = connection
        .prepare(
            "
            SELECT
              id,
              supplier_id,
              supplier_name,
              expense_category,
              branch,
              prefix,
              currency,
              concept,
              invoice_number,
              issued_at,
              due_at,
              occurred_at_ms,
              product_id,
              product_name,
              quantity,
              unit_cost_minor,
              total_minor,
              payment_status,
              occurred_at_label
            FROM purchases
            ORDER BY occurred_at_ms DESC
            ",
        )
        .map_err(|error| format!("No se pudo preparar la lectura de compras: {error}"))?;

    let rows = statement
        .query_map([], |row| {
            Ok(PurchaseRecord {
                id: row.get(0)?,
                supplier_id: row.get(1)?,
                supplier_name: row.get(2)?,
                expense_category: row.get(3)?,
                branch: row.get(4)?,
                prefix: row.get(5)?,
                currency: row.get(6)?,
                concept: row.get(7)?,
                invoice_number: row.get(8)?,
                issued_at: row.get(9)?,
                due_at: row.get(10)?,
                occurred_at_ms: row.get(11)?,
                product_id: row.get(12)?,
                product_name: row.get(13)?,
                quantity: row.get(14)?,
                unit_cost_minor: row.get(15)?,
                total_minor: row.get(16)?,
                lines: Vec::new(),
                payment_status: row.get(17)?,
                occurred_at_label: row.get(18)?,
            })
        })
        .map_err(|error| format!("No se pudieron leer las compras: {error}"))?;

    let mut purchases = rows
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("No se pudieron convertir las compras: {error}"))?;

    for purchase in &mut purchases {
        purchase.lines = list_purchase_lines(&connection, &purchase.id)?;
    }

    Ok(purchases)
}

#[tauri::command]
fn list_supplier_payables(app: tauri::AppHandle) -> Result<Vec<SupplierPayableRecord>, String> {
    let database_path = database_path(&app)?;
    let connection = open_database(&database_path)?;
    apply_migrations(&connection)?;

    let mut statement = connection
        .prepare(
            "
            SELECT
              id,
              supplier_id,
              supplier_name,
              expense_category,
              purchase_id,
              invoice_number,
              original_amount_minor,
              paid_amount_minor,
              balance_minor,
              due_at,
              status
            FROM supplier_payables
            ORDER BY due_at ASC, id ASC
            ",
        )
        .map_err(|error| format!("No se pudo preparar la lectura de cuentas por pagar: {error}"))?;

    let rows = statement
        .query_map([], |row| {
            Ok(SupplierPayableRecord {
                id: row.get(0)?,
                supplier_id: row.get(1)?,
                supplier_name: row.get(2)?,
                expense_category: row.get(3)?,
                purchase_id: row.get(4)?,
                invoice_number: row.get(5)?,
                original_amount_minor: row.get(6)?,
                paid_amount_minor: row.get(7)?,
                balance_minor: row.get(8)?,
                due_at: row.get(9)?,
                status: row.get(10)?,
            })
        })
        .map_err(|error| format!("No se pudieron leer las cuentas por pagar: {error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("No se pudieron convertir las cuentas por pagar: {error}"))
}

#[tauri::command]
fn list_supplier_payments(app: tauri::AppHandle) -> Result<Vec<SupplierPaymentRecord>, String> {
    let database_path = database_path(&app)?;
    let connection = open_database(&database_path)?;
    apply_migrations(&connection)?;

    let mut statement = connection
        .prepare(
            "
            SELECT
              id,
              payable_id,
              purchase_id,
              supplier_id,
              supplier_name,
              expense_category,
              amount_minor,
              paid_at_ms,
              paid_at_label
            FROM supplier_payments
            ORDER BY paid_at_ms DESC, id DESC
            ",
        )
        .map_err(|error| {
            format!("No se pudo preparar la lectura de pagos a proveedores: {error}")
        })?;

    let rows = statement
        .query_map([], |row| {
            Ok(SupplierPaymentRecord {
                id: row.get(0)?,
                payable_id: row.get(1)?,
                purchase_id: row.get(2)?,
                supplier_id: row.get(3)?,
                supplier_name: row.get(4)?,
                expense_category: row.get(5)?,
                amount_minor: row.get(6)?,
                paid_at_ms: row.get(7)?,
                paid_at_label: row.get(8)?,
            })
        })
        .map_err(|error| format!("No se pudieron leer los pagos a proveedores: {error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("No se pudieron convertir los pagos a proveedores: {error}"))
}

#[tauri::command]
fn save_purchase(app: tauri::AppHandle, input: PurchasePersistence) -> Result<(), String> {
    let database_path = database_path(&app)?;
    let mut connection = open_database(&database_path)?;
    apply_migrations(&connection)?;
    let transaction = connection
        .transaction()
        .map_err(|error| format!("No se pudo iniciar la transaccion de compra: {error}"))?;

    transaction
        .execute(
            "
            INSERT INTO purchases (
              id,
              supplier_id,
              supplier_name,
              expense_category,
              branch,
              prefix,
              currency,
              concept,
              invoice_number,
              issued_at,
              due_at,
              occurred_at_ms,
              product_id,
              product_name,
              quantity,
              unit_cost_minor,
              total_minor,
              payment_status,
              occurred_at_label,
              updated_at
            )
            VALUES (
              ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10,
              ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19,
              CURRENT_TIMESTAMP
            )
            ",
            params![
                &input.purchase.id,
                &input.purchase.supplier_id,
                &input.purchase.supplier_name,
                &input.purchase.expense_category,
                &input.purchase.branch,
                &input.purchase.prefix,
                &input.purchase.currency,
                &input.purchase.concept,
                &input.purchase.invoice_number,
                &input.purchase.issued_at,
                &input.purchase.due_at,
                input.purchase.occurred_at_ms,
                &input.purchase.product_id,
                &input.purchase.product_name,
                input.purchase.quantity,
                input.purchase.unit_cost_minor,
                input.purchase.total_minor,
                &input.purchase.payment_status,
                &input.purchase.occurred_at_label,
            ],
        )
        .map_err(|error| format!("No se pudo guardar la compra: {error}"))?;

    for line in &input.purchase.lines {
        transaction
            .execute(
                "
                INSERT INTO purchase_lines (
                  id,
                  purchase_id,
                  product_id,
                  product_name,
                  unit,
                  quantity,
                  unit_cost_minor,
                  discount_percent,
                  discount_minor,
                  tax_percent,
                  tax_minor,
                  subtotal_minor,
                  total_minor
                )
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)
                ",
                params![
                    &line.id,
                    &input.purchase.id,
                    &line.product_id,
                    &line.product_name,
                    &line.unit,
                    line.quantity,
                    line.unit_cost_minor,
                    line.discount_percent,
                    line.discount_minor,
                    line.tax_percent,
                    line.tax_minor,
                    line.subtotal_minor,
                    line.total_minor,
                ],
            )
            .map_err(|error| format!("No se pudo guardar una linea de compra: {error}"))?;

        let affected = transaction
            .execute(
                "
                UPDATE products
                SET
                  stock = stock + ?1,
                  cost_minor = ?2,
                  sale_price_minor = CASE
                    WHEN sale_price_minor = 0 THEN ?2
                    ELSE sale_price_minor
                  END,
                  updated_at = CURRENT_TIMESTAMP
                WHERE id = ?3
                ",
                (line.quantity, line.unit_cost_minor, &line.product_id),
            )
            .map_err(|error| format!("No se pudo actualizar inventario: {error}"))?;

        if affected == 0 {
            return Err(format!(
                "El producto {} no existe en SQLite.",
                line.product_name
            ));
        }
    }

    if let Some(payable) = &input.supplier_payable {
        transaction
            .execute(
                "
                INSERT INTO supplier_payables (
                  id,
                  supplier_id,
                  supplier_name,
                  expense_category,
                  purchase_id,
                  invoice_number,
                  original_amount_minor,
                  paid_amount_minor,
                  balance_minor,
                  due_at,
                  status,
                  updated_at
                )
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, CURRENT_TIMESTAMP)
                ",
                params![
                    &payable.id,
                    &payable.supplier_id,
                    &payable.supplier_name,
                    &payable.expense_category,
                    &payable.purchase_id,
                    &payable.invoice_number,
                    payable.original_amount_minor,
                    payable.paid_amount_minor,
                    payable.balance_minor,
                    &payable.due_at,
                    &payable.status,
                ],
            )
            .map_err(|error| format!("No se pudo guardar la cuenta por pagar: {error}"))?;
    }

    transaction
        .commit()
        .map_err(|error| format!("No se pudo confirmar la compra: {error}"))?;

    Ok(())
}

#[tauri::command]
fn save_supplier_payment(
    app: tauri::AppHandle,
    input: SupplierPaymentPersistence,
) -> Result<(), String> {
    let database_path = database_path(&app)?;
    let mut connection = open_database(&database_path)?;
    apply_migrations(&connection)?;
    let transaction = connection
        .transaction()
        .map_err(|error| format!("No se pudo iniciar la transaccion del pago: {error}"))?;

    transaction
        .execute(
            "
            INSERT INTO supplier_payments (
              id,
              payable_id,
              purchase_id,
              supplier_id,
              supplier_name,
              expense_category,
              amount_minor,
              paid_at_ms,
              paid_at_label
            )
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
            ",
            params![
                &input.payment.id,
                &input.payment.payable_id,
                &input.payment.purchase_id,
                &input.payment.supplier_id,
                &input.payment.supplier_name,
                &input.payment.expense_category,
                input.payment.amount_minor,
                input.payment.paid_at_ms,
                &input.payment.paid_at_label,
            ],
        )
        .map_err(|error| format!("No se pudo guardar el pago a proveedor: {error}"))?;

    let affected = transaction
        .execute(
            "
            UPDATE supplier_payables
            SET
              paid_amount_minor = ?1,
              balance_minor = ?2,
              status = ?3,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?4
            ",
            params![
                input.supplier_payable.paid_amount_minor,
                input.supplier_payable.balance_minor,
                &input.supplier_payable.status,
                &input.supplier_payable.id,
            ],
        )
        .map_err(|error| format!("No se pudo actualizar la cuenta por pagar: {error}"))?;

    if affected == 0 {
        return Err(format!(
            "La cuenta por pagar {} no existe en SQLite.",
            input.supplier_payable.invoice_number
        ));
    }

    transaction
        .commit()
        .map_err(|error| format!("No se pudo confirmar el pago a proveedor: {error}"))?;

    Ok(())
}

fn list_sale_lines(connection: &Connection, sale_id: &str) -> Result<Vec<SaleLineRecord>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT
              id,
              product_id,
              product_name,
              unit,
              quantity,
              unit_cost_minor_at_sale,
              unit_price_minor,
              discount_percent,
              discount_minor,
              tax_percent,
              tax_minor,
              subtotal_minor,
              cost_minor,
              margin_minor,
              margin_percent,
              total_minor
            FROM sale_lines
            WHERE sale_id = ?1
            ORDER BY id ASC
            ",
        )
        .map_err(|error| format!("No se pudo preparar la lectura de lineas de venta: {error}"))?;

    let rows = statement
        .query_map([sale_id], |row| {
            Ok(SaleLineRecord {
                id: row.get(0)?,
                product_id: row.get(1)?,
                product_name: row.get(2)?,
                unit: row.get(3)?,
                quantity: row.get(4)?,
                unit_cost_minor_at_sale: row.get(5)?,
                unit_price_minor: row.get(6)?,
                discount_percent: row.get(7)?,
                discount_minor: row.get(8)?,
                tax_percent: row.get(9)?,
                tax_minor: row.get(10)?,
                subtotal_minor: row.get(11)?,
                cost_minor: row.get(12)?,
                margin_minor: row.get(13)?,
                margin_percent: row.get(14)?,
                total_minor: row.get(15)?,
            })
        })
        .map_err(|error| format!("No se pudieron leer las lineas de venta: {error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("No se pudieron convertir las lineas de venta: {error}"))
}

fn ensure_sale_has_no_dependent_documents(
    connection: &Connection,
    sale_id: &str,
) -> Result<(), String> {
    let receipt_count: i64 = connection
        .query_row(
            "SELECT COUNT(*) FROM customer_receipts WHERE sale_id = ?1",
            [sale_id],
            |row| row.get(0),
        )
        .map_err(|error| format!("No se pudieron validar recibos de caja: {error}"))?;
    let credit_note_count: i64 = connection
        .query_row(
            "SELECT COUNT(*) FROM credit_notes WHERE sale_id = ?1",
            [sale_id],
            |row| row.get(0),
        )
        .map_err(|error| format!("No se pudieron validar notas credito: {error}"))?;

    if receipt_count > 0 || credit_note_count > 0 {
        return Err(
            "La venta tiene recibos o notas credito asociados y no se puede modificar.".to_string(),
        );
    }

    Ok(())
}

fn apply_product_stock_adjustment(
    connection: &Connection,
    adjustment: &ProductStockAdjustment,
) -> Result<(), String> {
    let affected = connection
        .execute(
            "
            UPDATE products
            SET
              stock = stock + ?1,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?2 AND stock + ?1 >= 0
            ",
            params![adjustment.quantity_delta, &adjustment.product_id],
        )
        .map_err(|error| format!("No se pudo ajustar inventario: {error}"))?;

    if affected == 0 {
        return Err(format!(
            "No se pudo ajustar inventario para el producto {}.",
            adjustment.product_id
        ));
    }

    Ok(())
}

fn list_credit_note_lines(
    connection: &Connection,
    credit_note_id: &str,
) -> Result<Vec<CreditNoteLineRecord>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT
              id,
              sale_line_id,
              product_id,
              product_name,
              unit,
              quantity,
              unit_price_minor,
              discount_percent,
              tax_percent,
              cost_minor,
              margin_minor,
              margin_percent,
              total_minor
            FROM credit_note_lines
            WHERE credit_note_id = ?1
            ORDER BY id ASC
            ",
        )
        .map_err(|error| {
            format!("No se pudo preparar la lectura de lineas de nota credito: {error}")
        })?;

    let rows = statement
        .query_map([credit_note_id], |row| {
            Ok(CreditNoteLineRecord {
                id: row.get(0)?,
                sale_line_id: row.get(1)?,
                product_id: row.get(2)?,
                product_name: row.get(3)?,
                unit: row.get(4)?,
                quantity: row.get(5)?,
                unit_price_minor: row.get(6)?,
                discount_percent: row.get(7)?,
                tax_percent: row.get(8)?,
                cost_minor: row.get(9)?,
                margin_minor: row.get(10)?,
                margin_percent: row.get(11)?,
                total_minor: row.get(12)?,
            })
        })
        .map_err(|error| format!("No se pudieron leer las lineas de nota credito: {error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("No se pudieron convertir las lineas de nota credito: {error}"))
}

fn list_purchase_lines(
    connection: &Connection,
    purchase_id: &str,
) -> Result<Vec<PurchaseLineRecord>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT
              id,
              product_id,
              product_name,
              unit,
              quantity,
              unit_cost_minor,
              discount_percent,
              discount_minor,
              tax_percent,
              tax_minor,
              subtotal_minor,
              total_minor
            FROM purchase_lines
            WHERE purchase_id = ?1
            ORDER BY id ASC
            ",
        )
        .map_err(|error| format!("No se pudo preparar la lectura de lineas de compra: {error}"))?;

    let rows = statement
        .query_map([purchase_id], |row| {
            Ok(PurchaseLineRecord {
                id: row.get(0)?,
                product_id: row.get(1)?,
                product_name: row.get(2)?,
                unit: row.get(3)?,
                quantity: row.get(4)?,
                unit_cost_minor: row.get(5)?,
                discount_percent: row.get(6)?,
                discount_minor: row.get(7)?,
                tax_percent: row.get(8)?,
                tax_minor: row.get(9)?,
                subtotal_minor: row.get(10)?,
                total_minor: row.get(11)?,
            })
        })
        .map_err(|error| format!("No se pudieron leer las lineas de compra: {error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("No se pudieron convertir las lineas de compra: {error}"))
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
              unit TEXT NOT NULL DEFAULT 'Unidad',
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

            CREATE TABLE IF NOT EXISTS inventory_adjustments (
              id TEXT PRIMARY KEY,
              product_id TEXT NOT NULL,
              product_name TEXT NOT NULL,
              unit TEXT NOT NULL,
              adjustment_type TEXT NOT NULL,
              quantity INTEGER NOT NULL,
              previous_stock INTEGER NOT NULL,
              next_stock INTEGER NOT NULL,
              reason TEXT NOT NULL,
              occurred_at_ms INTEGER NOT NULL,
              occurred_at_label TEXT NOT NULL,
              created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (product_id) REFERENCES products(id)
            );

            CREATE TABLE IF NOT EXISTS sales (
              id TEXT PRIMARY KEY,
              customer_json TEXT NOT NULL,
              customer_id TEXT NOT NULL,
              customer_name TEXT NOT NULL,
              branch TEXT NOT NULL,
              prefix TEXT NOT NULL,
              invoice_number TEXT NOT NULL,
              seller TEXT NOT NULL,
              currency TEXT NOT NULL,
              concept TEXT NOT NULL,
              issued_at TEXT NOT NULL,
              product_id TEXT NOT NULL,
              product_name TEXT NOT NULL,
              quantity INTEGER NOT NULL,
              unit_price_minor INTEGER NOT NULL,
              total_minor INTEGER NOT NULL,
              payment_status TEXT NOT NULL,
              occurred_at_ms INTEGER NOT NULL,
              occurred_at_label TEXT NOT NULL,
              created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (customer_id) REFERENCES customers(id)
            );

            CREATE TABLE IF NOT EXISTS sale_lines (
              id TEXT PRIMARY KEY,
              sale_id TEXT NOT NULL,
              product_id TEXT NOT NULL,
              product_name TEXT NOT NULL,
              unit TEXT NOT NULL,
              quantity INTEGER NOT NULL,
              unit_cost_minor_at_sale INTEGER NOT NULL,
              unit_price_minor INTEGER NOT NULL,
              discount_percent REAL NOT NULL,
              discount_minor INTEGER NOT NULL,
              tax_percent REAL NOT NULL,
              tax_minor INTEGER NOT NULL,
              subtotal_minor INTEGER NOT NULL,
              cost_minor INTEGER NOT NULL,
              margin_minor INTEGER NOT NULL,
              margin_percent REAL NOT NULL,
              total_minor INTEGER NOT NULL,
              FOREIGN KEY (sale_id) REFERENCES sales(id),
              FOREIGN KEY (product_id) REFERENCES products(id)
            );

            CREATE TABLE IF NOT EXISTS receivables (
              id TEXT PRIMARY KEY,
              customer_id TEXT NOT NULL,
              customer_name TEXT NOT NULL,
              sale_id TEXT NOT NULL,
              amount_minor INTEGER NOT NULL,
              original_amount_minor INTEGER NOT NULL,
              paid_amount_minor INTEGER NOT NULL,
              balance_minor INTEGER NOT NULL,
              due_at TEXT NOT NULL,
              status TEXT NOT NULL,
              created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (customer_id) REFERENCES customers(id),
              FOREIGN KEY (sale_id) REFERENCES sales(id)
            );

            CREATE TABLE IF NOT EXISTS customer_receipts (
              id TEXT PRIMARY KEY,
              number TEXT NOT NULL,
              receivable_id TEXT NOT NULL,
              sale_id TEXT NOT NULL,
              customer_id TEXT NOT NULL,
              customer_name TEXT NOT NULL,
              amount_minor INTEGER NOT NULL,
              active INTEGER NOT NULL DEFAULT 1,
              concept TEXT NOT NULL,
              receivable_original_amount_minor INTEGER NOT NULL DEFAULT 0,
              receivable_paid_amount_minor_before INTEGER NOT NULL DEFAULT 0,
              receivable_balance_minor_before INTEGER NOT NULL DEFAULT 0,
              receivable_due_at TEXT NOT NULL DEFAULT '',
              received_at TEXT NOT NULL,
              received_at_ms INTEGER NOT NULL,
              received_at_label TEXT NOT NULL,
              voided_at_label TEXT NOT NULL DEFAULT '',
              voided_at_ms INTEGER NOT NULL DEFAULT 0,
              created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (receivable_id) REFERENCES receivables(id),
              FOREIGN KEY (sale_id) REFERENCES sales(id),
              FOREIGN KEY (customer_id) REFERENCES customers(id)
            );

            CREATE TABLE IF NOT EXISTS credit_notes (
              id TEXT PRIMARY KEY,
              adjustment_type TEXT NOT NULL,
              confirmed_at_label TEXT NOT NULL,
              confirmed_at_ms INTEGER NOT NULL,
              number TEXT NOT NULL,
              sale_id TEXT NOT NULL,
              invoice_number TEXT NOT NULL,
              customer_json TEXT NOT NULL,
              customer_id TEXT NOT NULL,
              customer_name TEXT NOT NULL,
              issued_at TEXT NOT NULL,
              reason TEXT NOT NULL,
              receivable_due_at TEXT NOT NULL,
              status TEXT NOT NULL,
              total_minor INTEGER NOT NULL,
              occurred_at_ms INTEGER NOT NULL,
              occurred_at_label TEXT NOT NULL,
              voided_at_label TEXT NOT NULL,
              voided_at_ms INTEGER NOT NULL,
              created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (sale_id) REFERENCES sales(id),
              FOREIGN KEY (customer_id) REFERENCES customers(id)
            );

            CREATE TABLE IF NOT EXISTS credit_note_lines (
              id TEXT PRIMARY KEY,
              credit_note_id TEXT NOT NULL,
              sale_line_id TEXT NOT NULL,
              product_id TEXT NOT NULL,
              product_name TEXT NOT NULL,
              unit TEXT NOT NULL,
              quantity INTEGER NOT NULL,
              unit_price_minor INTEGER NOT NULL,
              discount_percent REAL NOT NULL,
              tax_percent REAL NOT NULL,
              cost_minor INTEGER NOT NULL,
              margin_minor INTEGER NOT NULL,
              margin_percent REAL NOT NULL,
              total_minor INTEGER NOT NULL,
              FOREIGN KEY (credit_note_id) REFERENCES credit_notes(id),
              FOREIGN KEY (product_id) REFERENCES products(id)
            );

            CREATE TABLE IF NOT EXISTS purchases (
              id TEXT PRIMARY KEY,
              supplier_id TEXT NOT NULL,
              supplier_name TEXT NOT NULL,
              expense_category TEXT NOT NULL,
              branch TEXT NOT NULL,
              prefix TEXT NOT NULL,
              currency TEXT NOT NULL,
              concept TEXT NOT NULL,
              invoice_number TEXT NOT NULL,
              issued_at TEXT NOT NULL,
              due_at TEXT NOT NULL,
              occurred_at_ms INTEGER NOT NULL,
              product_id TEXT NOT NULL,
              product_name TEXT NOT NULL,
              quantity INTEGER NOT NULL,
              unit_cost_minor INTEGER NOT NULL,
              total_minor INTEGER NOT NULL,
              payment_status TEXT NOT NULL,
              occurred_at_label TEXT NOT NULL,
              created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
            );

            CREATE TABLE IF NOT EXISTS purchase_lines (
              id TEXT PRIMARY KEY,
              purchase_id TEXT NOT NULL,
              product_id TEXT NOT NULL,
              product_name TEXT NOT NULL,
              unit TEXT NOT NULL,
              quantity INTEGER NOT NULL,
              unit_cost_minor INTEGER NOT NULL,
              discount_percent REAL NOT NULL,
              discount_minor INTEGER NOT NULL,
              tax_percent REAL NOT NULL,
              tax_minor INTEGER NOT NULL,
              subtotal_minor INTEGER NOT NULL,
              total_minor INTEGER NOT NULL,
              FOREIGN KEY (purchase_id) REFERENCES purchases(id),
              FOREIGN KEY (product_id) REFERENCES products(id)
            );

            CREATE TABLE IF NOT EXISTS supplier_payables (
              id TEXT PRIMARY KEY,
              supplier_id TEXT NOT NULL,
              supplier_name TEXT NOT NULL,
              expense_category TEXT NOT NULL,
              purchase_id TEXT NOT NULL,
              invoice_number TEXT NOT NULL,
              original_amount_minor INTEGER NOT NULL,
              paid_amount_minor INTEGER NOT NULL,
              balance_minor INTEGER NOT NULL,
              due_at TEXT NOT NULL,
              status TEXT NOT NULL,
              created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
              FOREIGN KEY (purchase_id) REFERENCES purchases(id)
            );

            CREATE TABLE IF NOT EXISTS supplier_payments (
              id TEXT PRIMARY KEY,
              payable_id TEXT NOT NULL,
              purchase_id TEXT NOT NULL,
              supplier_id TEXT NOT NULL,
              supplier_name TEXT NOT NULL,
              expense_category TEXT NOT NULL,
              amount_minor INTEGER NOT NULL,
              paid_at_ms INTEGER NOT NULL,
              paid_at_label TEXT NOT NULL,
              created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (payable_id) REFERENCES supplier_payables(id),
              FOREIGN KEY (purchase_id) REFERENCES purchases(id),
              FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
            );

            INSERT OR IGNORE INTO moneta_migrations (id)
            VALUES ('2026-07-18-catalogos-iniciales');

            INSERT OR IGNORE INTO moneta_migrations (id)
            VALUES ('2026-07-18-configuracion-app');

            INSERT OR IGNORE INTO moneta_migrations (id)
            VALUES ('2026-07-18-compras-iniciales');

            INSERT OR IGNORE INTO moneta_migrations (id)
            VALUES ('2026-07-18-pagos-proveedores');

            INSERT OR IGNORE INTO moneta_migrations (id)
            VALUES ('2026-07-18-ventas-iniciales');

            INSERT OR IGNORE INTO moneta_migrations (id)
            VALUES ('2026-07-18-recibos-caja');

            INSERT OR IGNORE INTO moneta_migrations (id)
            VALUES ('2026-07-18-notas-credito');

            INSERT OR IGNORE INTO moneta_migrations (id)
            VALUES ('2026-07-18-ajustes-inventario');
            ",
        )
        .map_err(|error| format!("No se pudieron preparar las tablas iniciales: {error}"))?;

    ensure_column(
        connection,
        "products",
        "unit",
        "ALTER TABLE products ADD COLUMN unit TEXT NOT NULL DEFAULT 'Unidad'",
    )?;
    ensure_column(
        connection,
        "customer_receipts",
        "active",
        "ALTER TABLE customer_receipts ADD COLUMN active INTEGER NOT NULL DEFAULT 1",
    )?;
    ensure_column(
        connection,
        "customer_receipts",
        "receivable_original_amount_minor",
        "ALTER TABLE customer_receipts ADD COLUMN receivable_original_amount_minor INTEGER NOT NULL DEFAULT 0",
    )?;
    ensure_column(
        connection,
        "customer_receipts",
        "receivable_paid_amount_minor_before",
        "ALTER TABLE customer_receipts ADD COLUMN receivable_paid_amount_minor_before INTEGER NOT NULL DEFAULT 0",
    )?;
    ensure_column(
        connection,
        "customer_receipts",
        "receivable_balance_minor_before",
        "ALTER TABLE customer_receipts ADD COLUMN receivable_balance_minor_before INTEGER NOT NULL DEFAULT 0",
    )?;
    ensure_column(
        connection,
        "customer_receipts",
        "receivable_due_at",
        "ALTER TABLE customer_receipts ADD COLUMN receivable_due_at TEXT NOT NULL DEFAULT ''",
    )?;
    ensure_column(
        connection,
        "customer_receipts",
        "voided_at_label",
        "ALTER TABLE customer_receipts ADD COLUMN voided_at_label TEXT NOT NULL DEFAULT ''",
    )?;
    ensure_column(
        connection,
        "customer_receipts",
        "voided_at_ms",
        "ALTER TABLE customer_receipts ADD COLUMN voided_at_ms INTEGER NOT NULL DEFAULT 0",
    )?;
    connection
        .execute(
            "
            INSERT OR IGNORE INTO moneta_migrations (id)
            VALUES ('2026-07-18-anular-recibos-caja')
            ",
            [],
        )
        .map_err(|error| {
            format!("No se pudo registrar la migracion de recibos de caja: {error}")
        })?;

    Ok(())
}

fn ensure_column(
    connection: &Connection,
    table_name: &str,
    column_name: &str,
    alter_statement: &str,
) -> Result<(), String> {
    let mut statement = connection
        .prepare(&format!("PRAGMA table_info({table_name})"))
        .map_err(|error| format!("No se pudo inspeccionar la tabla {table_name}: {error}"))?;
    let columns = statement
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(|error| format!("No se pudieron leer columnas de {table_name}: {error}"))?;
    let mut exists = false;

    for column in columns {
        if column
            .map_err(|error| format!("No se pudo convertir columna de {table_name}: {error}"))?
            == column_name
        {
            exists = true;
            break;
        }
    }

    if !exists {
        connection
            .execute(alter_statement, [])
            .map_err(|error| format!("No se pudo agregar {column_name} a {table_name}: {error}"))?;
    }

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
            list_inventory_adjustments,
            save_inventory_adjustment,
            list_customers,
            save_customer,
            list_sales,
            list_receivables,
            list_customer_receipts,
            save_sale,
            update_sale,
            delete_sale,
            save_customer_receipt,
            void_customer_receipt,
            list_credit_notes,
            save_credit_note,
            save_credit_note_status,
            list_suppliers,
            save_supplier,
            list_purchases,
            list_supplier_payables,
            list_supplier_payments,
            save_purchase,
            save_supplier_payment
        ])
        .run(tauri::generate_context!())
        .expect("error while running Moneta desktop app");
}

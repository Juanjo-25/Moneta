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

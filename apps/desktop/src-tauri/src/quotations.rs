use crate::{apply_migrations, database_path, open_database, CustomerRecord};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct QuotationLine {
    id: String,
    product_id: String,
    product_name: String,
    unit: String,
    quantity: i64,
    unit_price_minor: i64,
    discount_percent: i64,
    discount_minor: i64,
    tax_percent: i64,
    tax_minor: i64,
    subtotal_minor: i64,
    total_minor: i64,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct QuotationRecord {
    id: String,
    quotation_number: String,
    customer: CustomerRecord,
    issued_at: String,
    valid_until: String,
    seller: String,
    observations: String,
    lines: Vec<QuotationLine>,
    total_minor: i64,
    created_at_ms: i64,
}

pub(crate) fn migrate(connection: &Connection) -> Result<(), String> {
    connection
        .execute_batch(
            "CREATE TABLE IF NOT EXISTS quotations (
            id TEXT PRIMARY KEY,
            quotation_number TEXT NOT NULL UNIQUE,
            document_json TEXT NOT NULL,
            created_at_ms INTEGER NOT NULL
        );
        INSERT OR IGNORE INTO moneta_migrations (id) VALUES ('2026-10-26-cotizaciones');",
        )
        .map_err(|error| format!("No se pudo preparar la tabla de cotizaciones: {error}"))
}

fn valid_date(value: &str) -> bool {
    let bytes = value.as_bytes();
    if bytes.len() != 10
        || bytes[4] != b'-'
        || bytes[7] != b'-'
        || bytes
            .iter()
            .enumerate()
            .any(|(index, byte)| index != 4 && index != 7 && !byte.is_ascii_digit())
    {
        return false;
    }
    let year = value[..4].parse::<u32>().unwrap_or(0);
    let month = value[5..7].parse::<usize>().unwrap_or(0);
    let day = value[8..].parse::<u32>().unwrap_or(0);
    if year == 0 || month == 0 || month > 12 {
        return false;
    }
    let leap = year % 4 == 0 && (year % 100 != 0 || year % 400 == 0);
    let days = [
        31,
        if leap { 29 } else { 28 },
        31,
        30,
        31,
        30,
        31,
        31,
        30,
        31,
        30,
        31,
    ];
    day > 0 && day <= days[month - 1]
}

fn validate(quotation: &QuotationRecord) -> Result<(), String> {
    const MAX_SAFE: i64 = 9_007_199_254_740_991;
    let number = quotation
        .quotation_number
        .strip_prefix("COT-")
        .unwrap_or("");
    if quotation.id.trim().is_empty()
        || number.is_empty()
        || !number.bytes().all(|value| value.is_ascii_digit())
        || quotation.customer.id.is_empty()
        || quotation.customer.name.trim().is_empty()
        || !valid_date(&quotation.issued_at)
        || !valid_date(&quotation.valid_until)
        || quotation.valid_until < quotation.issued_at
        || quotation.lines.is_empty()
    {
        return Err("Revisa el cliente, número, fechas y productos de la cotización.".to_string());
    }
    let mut total: i128 = 0;
    for line in &quotation.lines {
        if line.quantity <= 0
            || line.quantity > MAX_SAFE
            || line.unit_price_minor <= 0
            || line.unit_price_minor > MAX_SAFE
            || !(0..=100).contains(&line.discount_percent)
            || !(0..=100).contains(&line.tax_percent)
            || line.product_id.is_empty()
            || line.product_name.trim().is_empty()
        {
            return Err("Los productos de la cotización contienen valores inválidos.".to_string());
        }
        let subtotal = i128::from(line.quantity) * i128::from(line.unit_price_minor);
        let discount = (subtotal * i128::from(line.discount_percent) + 50) / 100;
        let tax = ((subtotal - discount) * i128::from(line.tax_percent) + 50) / 100;
        let line_total = subtotal - discount + tax;
        if subtotal > i128::from(MAX_SAFE)
            || line_total > i128::from(MAX_SAFE)
            || subtotal != i128::from(line.subtotal_minor)
            || discount != i128::from(line.discount_minor)
            || tax != i128::from(line.tax_minor)
            || line_total != i128::from(line.total_minor)
        {
            return Err("Los totales de los productos no son válidos.".to_string());
        }
        total += line_total;
    }
    if total > i128::from(MAX_SAFE) || total != i128::from(quotation.total_minor) {
        return Err("El total de la cotización no es válido.".to_string());
    }
    Ok(())
}

fn save(connection: &Connection, quotation: &QuotationRecord) -> Result<(), String> {
    validate(quotation)?;
    let document = serde_json::to_string(quotation).map_err(|error| error.to_string())?;
    connection.execute(
        "INSERT INTO quotations (id, quotation_number, document_json, created_at_ms) VALUES (?1, ?2, ?3, ?4)
        ON CONFLICT(id) DO UPDATE SET quotation_number = excluded.quotation_number, document_json = excluded.document_json",
        params![quotation.id, quotation.quotation_number, document, quotation.created_at_ms]
    ).map_err(|error| format!("No se pudo guardar la cotización: {error}"))?;
    Ok(())
}

fn list(connection: &Connection) -> Result<Vec<QuotationRecord>, String> {
    let mut statement = connection.prepare("SELECT document_json FROM quotations ORDER BY created_at_ms DESC, quotation_number DESC")
        .map_err(|error| error.to_string())?;
    let documents = statement
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|error| error.to_string())?;
    documents
        .map(|document| {
            let document = document.map_err(|error| error.to_string())?;
            serde_json::from_str(&document)
                .map_err(|error| format!("No se pudo leer la cotización: {error}"))
        })
        .collect()
}

#[tauri::command]
pub(crate) fn list_quotations(app: tauri::AppHandle) -> Result<Vec<QuotationRecord>, String> {
    let connection = open_database(&database_path(&app)?)?;
    apply_migrations(&connection)?;
    list(&connection)
}

#[tauri::command]
pub(crate) fn save_quotation(
    app: tauri::AppHandle,
    quotation: QuotationRecord,
) -> Result<(), String> {
    let connection = open_database(&database_path(&app)?)?;
    apply_migrations(&connection)?;
    save(&connection, &quotation)
}

#[tauri::command]
pub(crate) fn delete_quotation(app: tauri::AppHandle, quotation_id: String) -> Result<(), String> {
    let connection = open_database(&database_path(&app)?)?;
    apply_migrations(&connection)?;
    connection
        .execute(
            "DELETE FROM quotations WHERE id = ?1",
            params![quotation_id],
        )
        .map_err(|error| format!("No se pudo eliminar la cotización: {error}"))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn fixture() -> QuotationRecord {
        serde_json::from_value(serde_json::json!({
            "id":"quotation-1", "quotationNumber":"COT-0001",
            "customer":{"id":"customer-1","name":"Cliente","document":"123","address":"Calle 1","active":true,"city":"Medellín","email":"cliente@example.com"},
            "issuedAt":"2026-10-26", "validUntil":"2026-11-10", "seller":"Ana", "observations":"Entrega en 5 días", "createdAtMs":1,
            "totalMinor":10710, "lines":[{"id":"line-1","productId":"product-1","productName":"Arroz","unit":"Libra","quantity":2,"unitPriceMinor":5000,"discountPercent":10,"discountMinor":1000,"taxPercent":19,"taxMinor":1710,"subtotalMinor":10000,"totalMinor":10710}]
        })).unwrap()
    }

    #[test]
    fn saves_updates_and_reloads_snapshots_without_inventory_or_receivables() {
        let mut connection = Connection::open_in_memory().unwrap();
        apply_migrations(&connection).unwrap();
        let mut quotation = fixture();
        save(&connection, &quotation).unwrap();
        quotation.observations = "Entrega actualizada".to_string();
        save(&connection, &quotation).unwrap();
        let stored = list(&connection).unwrap();
        assert_eq!(stored.len(), 1);
        assert_eq!(stored[0].observations, "Entrega actualizada");
        assert_eq!(stored[0].customer.name, "Cliente");
        for table in ["products", "sales", "receivables"] {
            let count: i64 = connection
                .query_row(&format!("SELECT COUNT(*) FROM {table}"), [], |row| {
                    row.get(0)
                })
                .unwrap();
            assert_eq!(count, 0);
        }
        crate::reset_database_in_connection(&mut connection).unwrap();
        assert!(list(&connection).unwrap().is_empty());
    }

    #[test]
    fn rejects_duplicate_numbers_and_invalid_amounts_without_overwriting() {
        let connection = Connection::open_in_memory().unwrap();
        apply_migrations(&connection).unwrap();
        let mut quotation = fixture();
        save(&connection, &quotation).unwrap();
        quotation.id = "quotation-2".to_string();
        assert!(save(&connection, &quotation).is_err());
        quotation.id = "quotation-1".to_string();
        quotation.total_minor = 1;
        assert!(save(&connection, &quotation).is_err());
        assert_eq!(list(&connection).unwrap()[0].total_minor, 10710);
        quotation = fixture();
        quotation.valid_until = "2026-02-30".to_string();
        assert!(save(&connection, &quotation).is_err());
    }
}

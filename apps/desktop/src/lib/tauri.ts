import type {
  AppSettings,
  CustomerReceiptRecord,
  CustomerRecord,
  CreditNoteRecord,
  InventoryAdjustmentRecord,
  ProductRecord,
  PurchaseRecord,
  ReceivableRecord,
  SaleRecord,
  SupplierPayableRecord,
  SupplierPaymentRecord,
  SupplierRecord
} from "../types";

type TauriCore = {
  invoke<T>(command: string, args?: Record<string, unknown>): Promise<T>;
};

declare global {
  interface Window {
    __TAURI__?: {
      core?: TauriCore;
    };
  }
}

export type NativeConnectionStatus =
  | {
      kind: "connected";
      message: string;
      databasePath?: string;
    }
  | {
      kind: "web";
      message: string;
    }
  | {
      kind: "error";
      message: string;
    };

type DatabaseStatus = {
  migrationCount: number;
  path: string;
};

function formatMigrationCount(count: number): string {
  return count === 1 ? "1 migracion inicial" : `${count} migraciones iniciales`;
}

export async function checkNativeConnection(): Promise<NativeConnectionStatus> {
  const invoke = window.__TAURI__?.core?.invoke;

  if (!invoke) {
    return {
      kind: "web",
      message: "Modo web: Tauri no esta disponible."
    };
  }

  try {
    await invoke<string>("health_check");
    const database = await invoke<DatabaseStatus>("database_status");

    return {
      kind: "connected",
      databasePath: database.path,
      message: `Base de datos lista (${formatMigrationCount(database.migrationCount)}).`
    };
  } catch {
    return {
      kind: "error",
      message: "No se pudo conectar con la base de datos local."
    };
  }
}

export async function loadNativeSettings(): Promise<AppSettings | null> {
  const invoke = window.__TAURI__?.core?.invoke;

  if (!invoke) {
    return null;
  }

  return invoke<AppSettings | null>("get_app_settings");
}

export async function saveNativeSettings(settings: AppSettings): Promise<boolean> {
  const invoke = window.__TAURI__?.core?.invoke;

  if (!invoke) {
    return false;
  }

  await invoke<void>("save_app_settings", { settings });

  return true;
}

export async function loadNativeProducts(): Promise<ProductRecord[] | null> {
  const invoke = window.__TAURI__?.core?.invoke;

  if (!invoke) {
    return null;
  }

  return invoke<ProductRecord[]>("list_products");
}

export async function saveNativeProduct(product: ProductRecord): Promise<boolean> {
  const invoke = window.__TAURI__?.core?.invoke;

  if (!invoke) {
    return false;
  }

  await invoke<void>("save_product", { product });

  return true;
}

export async function loadNativeInventoryAdjustments(): Promise<
  InventoryAdjustmentRecord[] | null
> {
  const invoke = window.__TAURI__?.core?.invoke;

  if (!invoke) {
    return null;
  }

  return invoke<InventoryAdjustmentRecord[]>("list_inventory_adjustments");
}

export async function saveNativeInventoryAdjustment(input: {
  adjustment: InventoryAdjustmentRecord;
  product: ProductRecord;
}): Promise<boolean> {
  const invoke = window.__TAURI__?.core?.invoke;

  if (!invoke) {
    return false;
  }

  await invoke<void>("save_inventory_adjustment", input);

  return true;
}

export async function loadNativeCustomers(): Promise<CustomerRecord[] | null> {
  const invoke = window.__TAURI__?.core?.invoke;

  if (!invoke) {
    return null;
  }

  return invoke<CustomerRecord[]>("list_customers");
}

export async function saveNativeCustomer(customer: CustomerRecord): Promise<boolean> {
  const invoke = window.__TAURI__?.core?.invoke;

  if (!invoke) {
    return false;
  }

  await invoke<void>("save_customer", { customer });

  return true;
}

export async function loadNativeSales(): Promise<SaleRecord[] | null> {
  const invoke = window.__TAURI__?.core?.invoke;

  if (!invoke) {
    return null;
  }

  return invoke<SaleRecord[]>("list_sales");
}

export async function loadNativeReceivables(): Promise<ReceivableRecord[] | null> {
  const invoke = window.__TAURI__?.core?.invoke;

  if (!invoke) {
    return null;
  }

  return invoke<ReceivableRecord[]>("list_receivables");
}

export async function loadNativeCustomerReceipts(): Promise<
  CustomerReceiptRecord[] | null
> {
  const invoke = window.__TAURI__?.core?.invoke;

  if (!invoke) {
    return null;
  }

  return invoke<CustomerReceiptRecord[]>("list_customer_receipts");
}

export async function saveNativeSale(input: {
  sale: SaleRecord;
  receivable: ReceivableRecord | null;
}): Promise<boolean> {
  const invoke = window.__TAURI__?.core?.invoke;

  if (!invoke) {
    return false;
  }

  await invoke<void>("save_sale", input);

  return true;
}

export async function updateNativeSale(input: {
  sale: SaleRecord;
  receivable: ReceivableRecord | null;
  productStockAdjustments: Array<{
    productId: string;
    quantityDelta: number;
  }>;
}): Promise<boolean> {
  const invoke = window.__TAURI__?.core?.invoke;

  if (!invoke) {
    return false;
  }

  await invoke<void>("update_sale", input);

  return true;
}

export async function deleteNativeSale(input: {
  saleId: string;
  productStockAdjustments: Array<{
    productId: string;
    quantityDelta: number;
  }>;
}): Promise<boolean> {
  const invoke = window.__TAURI__?.core?.invoke;

  if (!invoke) {
    return false;
  }

  await invoke<void>("delete_sale", input);

  return true;
}

export async function saveNativeCustomerReceipt(input: {
  receipt: CustomerReceiptRecord;
  receivable: ReceivableRecord;
}): Promise<boolean> {
  const invoke = window.__TAURI__?.core?.invoke;

  if (!invoke) {
    return false;
  }

  await invoke<void>("save_customer_receipt", input);

  return true;
}

export async function voidNativeCustomerReceipt(input: {
  receipt: CustomerReceiptRecord;
  receivable: ReceivableRecord;
}): Promise<boolean> {
  const invoke = window.__TAURI__?.core?.invoke;

  if (!invoke) {
    return false;
  }

  await invoke<void>("void_customer_receipt", input);

  return true;
}

export async function loadNativeCreditNotes(): Promise<CreditNoteRecord[] | null> {
  const invoke = window.__TAURI__?.core?.invoke;

  if (!invoke) {
    return null;
  }

  return invoke<CreditNoteRecord[]>("list_credit_notes");
}

export async function saveNativeCreditNote(
  creditNote: CreditNoteRecord
): Promise<boolean> {
  const invoke = window.__TAURI__?.core?.invoke;

  if (!invoke) {
    return false;
  }

  await invoke<void>("save_credit_note", { creditNote });

  return true;
}

export async function saveNativeCreditNoteStatus(input: {
  creditNote: CreditNoteRecord;
  receivable: ReceivableRecord | null;
  productStockAdjustments: Array<{
    productId: string;
    quantityDelta: number;
  }>;
}): Promise<boolean> {
  const invoke = window.__TAURI__?.core?.invoke;

  if (!invoke) {
    return false;
  }

  await invoke<void>("save_credit_note_status", input);

  return true;
}

export async function loadNativeSuppliers(): Promise<SupplierRecord[] | null> {
  const invoke = window.__TAURI__?.core?.invoke;

  if (!invoke) {
    return null;
  }

  return invoke<SupplierRecord[]>("list_suppliers");
}

export async function saveNativeSupplier(supplier: SupplierRecord): Promise<boolean> {
  const invoke = window.__TAURI__?.core?.invoke;

  if (!invoke) {
    return false;
  }

  await invoke<void>("save_supplier", { supplier });

  return true;
}

export async function loadNativePurchases(): Promise<PurchaseRecord[] | null> {
  const invoke = window.__TAURI__?.core?.invoke;

  if (!invoke) {
    return null;
  }

  return invoke<PurchaseRecord[]>("list_purchases");
}

export async function loadNativeSupplierPayables(): Promise<
  SupplierPayableRecord[] | null
> {
  const invoke = window.__TAURI__?.core?.invoke;

  if (!invoke) {
    return null;
  }

  return invoke<SupplierPayableRecord[]>("list_supplier_payables");
}

export async function loadNativeSupplierPayments(): Promise<
  SupplierPaymentRecord[] | null
> {
  const invoke = window.__TAURI__?.core?.invoke;

  if (!invoke) {
    return null;
  }

  return invoke<SupplierPaymentRecord[]>("list_supplier_payments");
}

export async function saveNativePurchase(input: {
  purchase: PurchaseRecord;
  supplierPayable: SupplierPayableRecord | null;
}): Promise<boolean> {
  const invoke = window.__TAURI__?.core?.invoke;

  if (!invoke) {
    return false;
  }

  await invoke<void>("save_purchase", input);

  return true;
}

export async function saveNativeSupplierPayment(input: {
  payment: SupplierPaymentRecord;
  supplierPayable: SupplierPayableRecord;
}): Promise<boolean> {
  const invoke = window.__TAURI__?.core?.invoke;

  if (!invoke) {
    return false;
  }

  await invoke<void>("save_supplier_payment", input);

  return true;
}

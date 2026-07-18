import type {
  AppSettings,
  CustomerRecord,
  ProductRecord,
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

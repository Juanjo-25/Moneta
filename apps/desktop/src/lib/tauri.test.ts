import { afterEach, describe, expect, it, vi } from "vitest";
import {
  checkNativeConnection,
  loadNativeCustomers,
  loadNativeProducts,
  loadNativePurchases,
  loadNativeSettings,
  loadNativeSupplierPayables,
  loadNativeSuppliers,
  saveNativeCustomer,
  saveNativeProduct,
  saveNativePurchase,
  saveNativeSettings,
  saveNativeSupplier
} from "./tauri";

function setTauriInvoke(
  invoke?: (command: string, args?: Record<string, unknown>) => Promise<unknown>
) {
  Object.defineProperty(window, "__TAURI__", {
    configurable: true,
    value: invoke ? { core: { invoke } } : undefined
  });
}

describe("checkNativeConnection", () => {
  afterEach(() => {
    setTauriInvoke();
  });

  it("reports web mode when Tauri is not available", async () => {
    setTauriInvoke();

    await expect(checkNativeConnection()).resolves.toEqual({
      kind: "web",
      message: "Modo web: Tauri no esta disponible."
    });
  });

  it("calls the health check command through Tauri", async () => {
    const invoke = vi.fn().mockImplementation((command: string) => {
      if (command === "health_check") {
        return Promise.resolve("Moneta Tauri conectado");
      }

      return Promise.resolve({
        migrationCount: 1,
        path: "/tmp/moneta.sqlite3"
      });
    });
    setTauriInvoke(invoke);

    await expect(checkNativeConnection()).resolves.toEqual({
      databasePath: "/tmp/moneta.sqlite3",
      kind: "connected",
      message: "Base de datos lista (1 migracion inicial)."
    });
    expect(invoke).toHaveBeenCalledWith("health_check");
    expect(invoke).toHaveBeenCalledWith("database_status");
  });

  it("formats several database migrations", async () => {
    const invoke = vi.fn().mockImplementation((command: string) => {
      if (command === "health_check") {
        return Promise.resolve("Moneta Tauri conectado");
      }

      return Promise.resolve({
        migrationCount: 2,
        path: "/tmp/moneta.sqlite3"
      });
    });
    setTauriInvoke(invoke);

    await expect(checkNativeConnection()).resolves.toEqual({
      databasePath: "/tmp/moneta.sqlite3",
      kind: "connected",
      message: "Base de datos lista (2 migraciones iniciales)."
    });
  });

  it("reports an error when the native database check fails", async () => {
    setTauriInvoke(vi.fn().mockRejectedValue(new Error("native failed")));

    await expect(checkNativeConnection()).resolves.toEqual({
      kind: "error",
      message: "No se pudo conectar con la base de datos local."
    });
  });
});

describe("native settings persistence", () => {
  afterEach(() => {
    setTauriInvoke();
  });

  it("returns null settings in web mode", async () => {
    setTauriInvoke();

    await expect(loadNativeSettings()).resolves.toBeNull();
    await expect(
      saveNativeSettings({
        company: {
          address: "",
          city: "",
          document: "",
          email: "",
          logoDataUri: "",
          name: "",
          phone: ""
        },
        invoice: {
          accentColor: "#475569",
          legalNote: "",
          observations: "",
          title: "REMISION"
        },
        sellers: []
      })
    ).resolves.toBe(false);
  });

  it("loads settings through Tauri", async () => {
    const storedSettings = {
      company: {
        address: "Calle 1",
        city: "Medellin",
        document: "900",
        email: "contabilidad@empresa.com",
        logoDataUri: "",
        name: "Empresa",
        phone: "300"
      },
      invoice: {
        accentColor: "#0f766e",
        legalNote: "Nota",
        observations: "Observaciones",
        title: "Factura"
      },
      sellers: ["Laura Gomez"]
    };
    const invoke = vi.fn().mockResolvedValue(storedSettings);
    setTauriInvoke(invoke);

    await expect(loadNativeSettings()).resolves.toEqual(storedSettings);
    expect(invoke).toHaveBeenCalledWith("get_app_settings");
  });

  it("saves settings through Tauri", async () => {
    const settings = {
      company: {
        address: "Calle 1",
        city: "Medellin",
        document: "900",
        email: "contabilidad@empresa.com",
        logoDataUri: "",
        name: "Empresa",
        phone: "300"
      },
      invoice: {
        accentColor: "#0f766e",
        legalNote: "Nota",
        observations: "Observaciones",
        title: "Factura"
      },
      sellers: ["Laura Gomez"]
    };
    const invoke = vi.fn().mockResolvedValue(undefined);
    setTauriInvoke(invoke);

    await expect(saveNativeSettings(settings)).resolves.toBe(true);
    expect(invoke).toHaveBeenCalledWith("save_app_settings", { settings });
  });
});

describe("native product persistence", () => {
  afterEach(() => {
    setTauriInvoke();
  });

  const product = {
    active: true,
    costMinor: 3200,
    id: "product-1",
    minimumStock: 1,
    name: "Arroz libra",
    salePriceMinor: 4500,
    sku: "ARZ-001",
    stock: 4
  };

  it("returns null products and skips saves in web mode", async () => {
    setTauriInvoke();

    await expect(loadNativeProducts()).resolves.toBeNull();
    await expect(saveNativeProduct(product)).resolves.toBe(false);
  });

  it("loads products through Tauri", async () => {
    const invoke = vi.fn().mockResolvedValue([product]);
    setTauriInvoke(invoke);

    await expect(loadNativeProducts()).resolves.toEqual([product]);
    expect(invoke).toHaveBeenCalledWith("list_products");
  });

  it("saves a product through Tauri", async () => {
    const invoke = vi.fn().mockResolvedValue(undefined);
    setTauriInvoke(invoke);

    await expect(saveNativeProduct(product)).resolves.toBe(true);
    expect(invoke).toHaveBeenCalledWith("save_product", { product });
  });
});

describe("native customer persistence", () => {
  afterEach(() => {
    setTauriInvoke();
  });

  const customer = {
    active: true,
    address: "Calle 1",
    city: "Medellin",
    document: "123456789",
    email: "cliente@correo.com",
    id: "customer-1",
    name: "Ana Perez"
  };

  it("returns null customers and skips saves in web mode", async () => {
    setTauriInvoke();

    await expect(loadNativeCustomers()).resolves.toBeNull();
    await expect(saveNativeCustomer(customer)).resolves.toBe(false);
  });

  it("loads customers through Tauri", async () => {
    const invoke = vi.fn().mockResolvedValue([customer]);
    setTauriInvoke(invoke);

    await expect(loadNativeCustomers()).resolves.toEqual([customer]);
    expect(invoke).toHaveBeenCalledWith("list_customers");
  });

  it("saves a customer through Tauri", async () => {
    const invoke = vi.fn().mockResolvedValue(undefined);
    setTauriInvoke(invoke);

    await expect(saveNativeCustomer(customer)).resolves.toBe(true);
    expect(invoke).toHaveBeenCalledWith("save_customer", { customer });
  });
});

describe("native supplier persistence", () => {
  afterEach(() => {
    setTauriInvoke();
  });

  const supplier = {
    active: true,
    address: "Calle 2",
    city: "Medellin",
    department: "Antioquia",
    document: "900123",
    email: "proveedor@correo.com",
    id: "supplier-1",
    name: "Distribuidora Norte",
    phone: "300"
  };

  it("returns null suppliers and skips saves in web mode", async () => {
    setTauriInvoke();

    await expect(loadNativeSuppliers()).resolves.toBeNull();
    await expect(saveNativeSupplier(supplier)).resolves.toBe(false);
  });

  it("loads suppliers through Tauri", async () => {
    const invoke = vi.fn().mockResolvedValue([supplier]);
    setTauriInvoke(invoke);

    await expect(loadNativeSuppliers()).resolves.toEqual([supplier]);
    expect(invoke).toHaveBeenCalledWith("list_suppliers");
  });

  it("saves a supplier through Tauri", async () => {
    const invoke = vi.fn().mockResolvedValue(undefined);
    setTauriInvoke(invoke);

    await expect(saveNativeSupplier(supplier)).resolves.toBe(true);
    expect(invoke).toHaveBeenCalledWith("save_supplier", { supplier });
  });
});

describe("native purchase persistence", () => {
  afterEach(() => {
    setTauriInvoke();
  });

  const purchase = {
    branch: "Principal",
    concept: "Factura de compra",
    currency: "COP" as const,
    dueAt: "2026-07-30",
    expenseCategory: "inventory" as const,
    id: "purchase-1",
    invoiceNumber: "001",
    issuedAt: "2026-07-18",
    lines: [
      {
        discountMinor: 0,
        discountPercent: 0,
        id: "purchase-1-line-0",
        productId: "product-1",
        productName: "Arroz libra",
        quantity: 2,
        subtotalMinor: 6400,
        taxMinor: 0,
        taxPercent: 0,
        totalMinor: 6400,
        unit: "Unidad",
        unitCostMinor: 3200
      }
    ],
    occurredAtLabel: "18/07/26, 12:00",
    occurredAtMs: 1,
    paymentStatus: "pending" as const,
    prefix: "",
    productId: "product-1",
    productName: "Arroz libra",
    quantity: 2,
    supplierId: "supplier-1",
    supplierName: "Distribuidora Norte",
    totalMinor: 6400,
    unitCostMinor: 3200
  };
  const supplierPayable = {
    balanceMinor: 6400,
    dueAt: "2026-07-30",
    expenseCategory: "inventory" as const,
    id: "payable-purchase-1",
    invoiceNumber: "001",
    originalAmountMinor: 6400,
    paidAmountMinor: 0,
    purchaseId: "purchase-1",
    status: "pending" as const,
    supplierId: "supplier-1",
    supplierName: "Distribuidora Norte"
  };

  it("returns null purchases and payables and skips saves in web mode", async () => {
    setTauriInvoke();

    await expect(loadNativePurchases()).resolves.toBeNull();
    await expect(loadNativeSupplierPayables()).resolves.toBeNull();
    await expect(
      saveNativePurchase({ purchase, supplierPayable })
    ).resolves.toBe(false);
  });

  it("loads purchases and supplier payables through Tauri", async () => {
    const invoke = vi.fn().mockImplementation((command: string) => {
      if (command === "list_purchases") {
        return Promise.resolve([purchase]);
      }

      return Promise.resolve([supplierPayable]);
    });
    setTauriInvoke(invoke);

    await expect(loadNativePurchases()).resolves.toEqual([purchase]);
    await expect(loadNativeSupplierPayables()).resolves.toEqual([supplierPayable]);
    expect(invoke).toHaveBeenCalledWith("list_purchases");
    expect(invoke).toHaveBeenCalledWith("list_supplier_payables");
  });

  it("saves a purchase through Tauri", async () => {
    const invoke = vi.fn().mockResolvedValue(undefined);
    setTauriInvoke(invoke);

    await expect(
      saveNativePurchase({ purchase, supplierPayable })
    ).resolves.toBe(true);
    expect(invoke).toHaveBeenCalledWith("save_purchase", {
      purchase,
      supplierPayable
    });
  });
});

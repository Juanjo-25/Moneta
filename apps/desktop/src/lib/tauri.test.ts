import { afterEach, describe, expect, it, vi } from "vitest";
import {
  checkNativeConnection,
  deleteNativeSale,
  loadNativeCreditNotes,
  loadNativeCustomers,
  loadNativeCustomerReceipts,
  loadNativeInventoryAdjustments,
  loadNativeProducts,
  loadNativePurchases,
  loadNativeReceivables,
  loadNativeSales,
  loadNativeSettings,
  loadNativeSupplierPayables,
  loadNativeSupplierPayments,
  loadNativeSuppliers,
  saveNativeCustomer,
  saveNativeCustomerReceipt,
  saveNativeCreditNote,
  saveNativeCreditNoteStatus,
  saveNativeInventoryAdjustment,
  saveNativeProduct,
  saveNativePurchase,
  saveNativeSale,
  saveNativeSettings,
  saveNativeSupplier,
  saveNativeSupplierPayment,
  updateNativeSale,
  voidNativeCustomerReceipt
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
    stock: 4,
    unit: "Unidad"
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

describe("native inventory adjustment persistence", () => {
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
    stock: 7,
    unit: "Unidad"
  };
  const adjustment = {
    adjustmentType: "entry" as const,
    id: "inventory-adjustment-1",
    nextStock: 7,
    occurredAtLabel: "18/07/26, 12:10",
    occurredAtMs: 2,
    previousStock: 4,
    productId: "product-1",
    productName: "Arroz libra",
    quantity: 3,
    reason: "Conteo bodega",
    unit: "Unidad"
  };

  it("returns null adjustments and skips saves in web mode", async () => {
    setTauriInvoke();

    await expect(loadNativeInventoryAdjustments()).resolves.toBeNull();
    await expect(
      saveNativeInventoryAdjustment({ adjustment, product })
    ).resolves.toBe(false);
  });

  it("loads inventory adjustments through Tauri", async () => {
    const invoke = vi.fn().mockResolvedValue([adjustment]);
    setTauriInvoke(invoke);

    await expect(loadNativeInventoryAdjustments()).resolves.toEqual([adjustment]);
    expect(invoke).toHaveBeenCalledWith("list_inventory_adjustments");
  });

  it("saves an inventory adjustment through Tauri", async () => {
    const invoke = vi.fn().mockResolvedValue(undefined);
    setTauriInvoke(invoke);

    await expect(
      saveNativeInventoryAdjustment({ adjustment, product })
    ).resolves.toBe(true);
    expect(invoke).toHaveBeenCalledWith("save_inventory_adjustment", {
      adjustment,
      product
    });
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

describe("native sale persistence", () => {
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
  const sale = {
    branch: "Principal",
    concept: "Factura de venta",
    currency: "COP" as const,
    customer,
    customerId: "customer-1",
    customerName: "Ana Perez",
    id: "sale-1",
    invoiceNumber: "001",
    issuedAt: "2026-07-18",
    lines: [
      {
        costMinor: 6400,
        discountMinor: 0,
        discountPercent: 0,
        id: "sale-1-line-0",
        marginMinor: 2600,
        marginPercent: 28.89,
        productId: "product-1",
        productName: "Arroz libra",
        quantity: 2,
        subtotalMinor: 9000,
        taxMinor: 0,
        taxPercent: 0,
        totalMinor: 9000,
        unit: "Unidad",
        unitCostMinorAtSale: 3200,
        unitPriceMinor: 4500
      }
    ],
    occurredAtLabel: "18/07/26, 12:20",
    occurredAtMs: 3,
    paymentStatus: "pending" as const,
    prefix: "",
    productId: "product-1",
    productName: "Arroz libra",
    quantity: 2,
    seller: "Laura Gomez",
    totalMinor: 9000,
    unitPriceMinor: 4500
  };
  const receivable = {
    amountMinor: 9000,
    balanceMinor: 9000,
    customerId: "customer-1",
    customerName: "Ana Perez",
    dueAt: "2026-08-18",
    id: "receivable-sale-1",
    originalAmountMinor: 9000,
    paidAmountMinor: 0,
    saleId: "sale-1",
    status: "pending" as const
  };
  const receipt = {
    active: true,
    amountMinor: 4500,
    concept: "Abono cartera cliente",
    customerId: "customer-1",
    customerName: "Ana Perez",
    id: "cash-receipt-1",
    number: "RC-001",
    receivableBalanceMinorBefore: 9000,
    receivableDueAt: "2026-08-18",
    receivableId: "receivable-sale-1",
    receivableOriginalAmountMinor: 9000,
    receivablePaidAmountMinorBefore: 0,
    receivedAt: "2026-07-18",
    receivedAtLabel: "18/07/26, 12:30",
    receivedAtMs: 4,
    saleId: "sale-1",
    voidedAtLabel: "",
    voidedAtMs: 0
  };
  const updatedReceivable = {
    ...receivable,
    amountMinor: 4500,
    balanceMinor: 4500,
    paidAmountMinor: 4500,
    status: "partial" as const
  };
  const creditNote = {
    adjustmentType: "return" as const,
    confirmedAtLabel: "",
    confirmedAtMs: 0,
    customer,
    customerId: "customer-1",
    customerName: "Ana Perez",
    id: "credit-note-1",
    invoiceNumber: "001",
    issuedAt: "2026-07-18",
    lines: [
      {
        costMinor: 3200,
        discountPercent: 0,
        id: "credit-note-1-line-0",
        marginMinor: 1300,
        marginPercent: 28.89,
        productId: "product-1",
        productName: "Arroz libra",
        quantity: 1,
        saleLineId: "sale-1-line-0",
        taxPercent: 0,
        totalMinor: 4500,
        unit: "Unidad",
        unitPriceMinor: 4500
      }
    ],
    number: "NC-001",
    occurredAtLabel: "18/07/26, 12:40",
    occurredAtMs: 5,
    reason: "Devolucion",
    receivableDueAt: "2026-08-18",
    saleId: "sale-1",
    status: "draft" as const,
    totalMinor: 4500,
    voidedAtLabel: "",
    voidedAtMs: 0
  };
  const confirmedCreditNote = {
    ...creditNote,
    confirmedAtLabel: "18/07/26, 12:45",
    confirmedAtMs: 6,
    status: "confirmed" as const
  };

  it("returns null sales, receivables and receipts and skips saves in web mode", async () => {
    setTauriInvoke();

    await expect(loadNativeSales()).resolves.toBeNull();
    await expect(loadNativeReceivables()).resolves.toBeNull();
    await expect(loadNativeCustomerReceipts()).resolves.toBeNull();
    await expect(loadNativeCreditNotes()).resolves.toBeNull();
    await expect(saveNativeSale({ receivable, sale })).resolves.toBe(false);
    await expect(
      updateNativeSale({
        productStockAdjustments: [{ productId: "product-1", quantityDelta: 1 }],
        receivable: updatedReceivable,
        sale
      })
    ).resolves.toBe(false);
    await expect(
      deleteNativeSale({
        productStockAdjustments: [{ productId: "product-1", quantityDelta: 2 }],
        saleId: "sale-1"
      })
    ).resolves.toBe(false);
    await expect(
      saveNativeCustomerReceipt({ receipt, receivable: updatedReceivable })
    ).resolves.toBe(false);
    await expect(
      voidNativeCustomerReceipt({ receipt, receivable })
    ).resolves.toBe(false);
    await expect(saveNativeCreditNote(creditNote)).resolves.toBe(false);
    await expect(
      saveNativeCreditNoteStatus({
        creditNote: confirmedCreditNote,
        productStockAdjustments: [{ productId: "product-1", quantityDelta: 1 }],
        receivable: updatedReceivable
      })
    ).resolves.toBe(false);
  });

  it("loads sales, receivables, receipts and credit notes through Tauri", async () => {
    const invoke = vi.fn().mockImplementation((command: string) => {
      if (command === "list_sales") {
        return Promise.resolve([sale]);
      }
      if (command === "list_customer_receipts") {
        return Promise.resolve([receipt]);
      }
      if (command === "list_credit_notes") {
        return Promise.resolve([creditNote]);
      }

      return Promise.resolve([receivable]);
    });
    setTauriInvoke(invoke);

    await expect(loadNativeSales()).resolves.toEqual([sale]);
    await expect(loadNativeReceivables()).resolves.toEqual([receivable]);
    await expect(loadNativeCustomerReceipts()).resolves.toEqual([receipt]);
    await expect(loadNativeCreditNotes()).resolves.toEqual([creditNote]);
    expect(invoke).toHaveBeenCalledWith("list_sales");
    expect(invoke).toHaveBeenCalledWith("list_receivables");
    expect(invoke).toHaveBeenCalledWith("list_customer_receipts");
    expect(invoke).toHaveBeenCalledWith("list_credit_notes");
  });

  it("saves a sale through Tauri", async () => {
    const invoke = vi.fn().mockResolvedValue(undefined);
    setTauriInvoke(invoke);

    await expect(saveNativeSale({ receivable, sale })).resolves.toBe(true);
    expect(invoke).toHaveBeenCalledWith("save_sale", { receivable, sale });
  });

  it("updates a sale through Tauri", async () => {
    const invoke = vi.fn().mockResolvedValue(undefined);
    setTauriInvoke(invoke);

    await expect(
      updateNativeSale({
        productStockAdjustments: [{ productId: "product-1", quantityDelta: 1 }],
        receivable: updatedReceivable,
        sale
      })
    ).resolves.toBe(true);
    expect(invoke).toHaveBeenCalledWith("update_sale", {
      productStockAdjustments: [{ productId: "product-1", quantityDelta: 1 }],
      receivable: updatedReceivable,
      sale
    });
  });

  it("deletes a sale through Tauri", async () => {
    const invoke = vi.fn().mockResolvedValue(undefined);
    setTauriInvoke(invoke);

    await expect(
      deleteNativeSale({
        productStockAdjustments: [{ productId: "product-1", quantityDelta: 2 }],
        saleId: "sale-1"
      })
    ).resolves.toBe(true);
    expect(invoke).toHaveBeenCalledWith("delete_sale", {
      productStockAdjustments: [{ productId: "product-1", quantityDelta: 2 }],
      saleId: "sale-1"
    });
  });

  it("saves a customer receipt through Tauri", async () => {
    const invoke = vi.fn().mockResolvedValue(undefined);
    setTauriInvoke(invoke);

    await expect(
      saveNativeCustomerReceipt({ receipt, receivable: updatedReceivable })
    ).resolves.toBe(true);
    expect(invoke).toHaveBeenCalledWith("save_customer_receipt", {
      receipt,
      receivable: updatedReceivable
    });
  });

  it("voids a customer receipt through Tauri", async () => {
    const invoke = vi.fn().mockResolvedValue(undefined);
    setTauriInvoke(invoke);
    const voidedReceipt = {
      ...receipt,
      active: false,
      voidedAtLabel: "18/07/26, 13:00",
      voidedAtMs: 7
    };

    await expect(
      voidNativeCustomerReceipt({ receipt: voidedReceipt, receivable })
    ).resolves.toBe(true);
    expect(invoke).toHaveBeenCalledWith("void_customer_receipt", {
      receipt: voidedReceipt,
      receivable
    });
  });

  it("saves a credit note through Tauri", async () => {
    const invoke = vi.fn().mockResolvedValue(undefined);
    setTauriInvoke(invoke);

    await expect(saveNativeCreditNote(creditNote)).resolves.toBe(true);
    expect(invoke).toHaveBeenCalledWith("save_credit_note", { creditNote });
  });

  it("saves a credit note status through Tauri", async () => {
    const invoke = vi.fn().mockResolvedValue(undefined);
    setTauriInvoke(invoke);

    await expect(
      saveNativeCreditNoteStatus({
        creditNote: confirmedCreditNote,
        productStockAdjustments: [{ productId: "product-1", quantityDelta: 1 }],
        receivable: updatedReceivable
      })
    ).resolves.toBe(true);
    expect(invoke).toHaveBeenCalledWith("save_credit_note_status", {
      creditNote: confirmedCreditNote,
      productStockAdjustments: [{ productId: "product-1", quantityDelta: 1 }],
      receivable: updatedReceivable
    });
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
  const supplierPayment = {
    amountMinor: 3200,
    expenseCategory: "inventory" as const,
    id: "supplier-payment-1",
    paidAtLabel: "18/07/26, 12:10",
    paidAtMs: 2,
    payableId: "payable-purchase-1",
    purchaseId: "purchase-1",
    supplierId: "supplier-1",
    supplierName: "Distribuidora Norte"
  };
  const updatedSupplierPayable = {
    ...supplierPayable,
    balanceMinor: 3200,
    paidAmountMinor: 3200,
    status: "partial" as const
  };

  it("returns null purchases and payables and skips saves in web mode", async () => {
    setTauriInvoke();

    await expect(loadNativePurchases()).resolves.toBeNull();
    await expect(loadNativeSupplierPayables()).resolves.toBeNull();
    await expect(loadNativeSupplierPayments()).resolves.toBeNull();
    await expect(
      saveNativePurchase({ purchase, supplierPayable })
    ).resolves.toBe(false);
    await expect(
      saveNativeSupplierPayment({
        payment: supplierPayment,
        supplierPayable: updatedSupplierPayable
      })
    ).resolves.toBe(false);
  });

  it("loads purchases, supplier payables and supplier payments through Tauri", async () => {
    const invoke = vi.fn().mockImplementation((command: string) => {
      if (command === "list_purchases") {
        return Promise.resolve([purchase]);
      }
      if (command === "list_supplier_payments") {
        return Promise.resolve([supplierPayment]);
      }

      return Promise.resolve([supplierPayable]);
    });
    setTauriInvoke(invoke);

    await expect(loadNativePurchases()).resolves.toEqual([purchase]);
    await expect(loadNativeSupplierPayables()).resolves.toEqual([supplierPayable]);
    await expect(loadNativeSupplierPayments()).resolves.toEqual([supplierPayment]);
    expect(invoke).toHaveBeenCalledWith("list_purchases");
    expect(invoke).toHaveBeenCalledWith("list_supplier_payables");
    expect(invoke).toHaveBeenCalledWith("list_supplier_payments");
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

  it("saves a supplier payment through Tauri", async () => {
    const invoke = vi.fn().mockResolvedValue(undefined);
    setTauriInvoke(invoke);

    await expect(
      saveNativeSupplierPayment({
        payment: supplierPayment,
        supplierPayable: updatedSupplierPayable
      })
    ).resolves.toBe(true);
    expect(invoke).toHaveBeenCalledWith("save_supplier_payment", {
      payment: supplierPayment,
      supplierPayable: updatedSupplierPayable
    });
  });
});

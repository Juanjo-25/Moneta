import { describe, expect, it } from "vitest";
import { buildDashboardSummary } from "./dashboard-summary";
import type {
  CustomerReceiptRecord,
  ProductRecord,
  ReceivableRecord,
  SaleRecord,
  SupplierPayableRecord
} from "../../types";

const formatCurrency = (minor: number) => `$${minor / 100}`;
const today = new Date(2026, 10, 11, 10, 0, 0);

function sale(overrides: Partial<SaleRecord>): SaleRecord {
  return {
    branch: "Principal",
    concept: "",
    currency: "COP",
    customer: {} as SaleRecord["customer"],
    customerId: "c1",
    customerName: "Cliente",
    footerNote: "",
    id: Math.random().toString(36),
    invoiceNumber: "1",
    issuedAt: "2026-11-11",
    lines: [],
    observations: "",
    occurredAtLabel: "",
    occurredAtMs: 0,
    paymentStatus: "paid",
    prefix: "FV",
    productId: "p1",
    productName: "Producto",
    quantity: 1,
    seller: "",
    totalMinor: 0,
    unitPriceMinor: 0,
    ...overrides
  };
}

function product(overrides: Partial<ProductRecord>): ProductRecord {
  return {
    active: true,
    costMinor: 0,
    id: Math.random().toString(36),
    minimumStock: 0,
    name: "Producto",
    salePriceMinor: 0,
    sku: "SKU",
    stock: 10,
    unit: "Unidad",
    ...overrides
  };
}

const baseInput = {
  creditNotes: [],
  customerReceipts: [] as CustomerReceiptRecord[],
  formatCurrency,
  lowStockProducts: [] as ProductRecord[],
  products: [] as ProductRecord[],
  receivables: [] as ReceivableRecord[],
  sales: [] as SaleRecord[],
  supplierPayables: [] as SupplierPayableRecord[],
  today
};

describe("buildDashboardSummary", () => {
  it("compares month sales with the same cutoff of the previous month", () => {
    const summary = buildDashboardSummary({
      ...baseInput,
      sales: [
        sale({ issuedAt: "2026-11-05", totalMinor: 12000 }),
        sale({ issuedAt: "2026-10-08", totalMinor: 10000 }),
        sale({ issuedAt: "2026-10-20", totalMinor: 50000 })
      ]
    });

    const monthMetric = summary.metrics.find((metric) => metric.label === "Ventas del mes");
    expect(monthMetric?.value).toBe("$120");
    expect(monthMetric?.tone).toBe("positive");
    expect(monthMetric?.detail).toMatch(/▲ 20,0% vs\. octubre a esta fecha/);
  });

  it("splits today's sales into paid and credit and adds receipts", () => {
    const summary = buildDashboardSummary({
      ...baseInput,
      customerReceipts: [
        {
          active: true,
          amountMinor: 3000,
          receivedAt: "2026-11-11",
          receivedAtMs: 0
        } as CustomerReceiptRecord,
        {
          active: false,
          amountMinor: 9000,
          receivedAt: "2026-11-11",
          receivedAtMs: 0
        } as CustomerReceiptRecord
      ],
      sales: [
        sale({ paymentStatus: "paid", totalMinor: 7000 }),
        sale({ paymentStatus: "pending", totalMinor: 2000 }),
        sale({ issuedAt: "2026-11-04", totalMinor: 4000 })
      ]
    });

    expect(summary.todayCash).toMatchObject({
      creditMinor: 2000,
      invoiceCount: 2,
      lastWeekNetMinor: 4000,
      netSalesMinor: 9000,
      paidMinor: 7000,
      receiptsMinor: 3000
    });
  });

  it("lists overdue receivables, low stock and supplier payments due this week", () => {
    const lowStock = [
      product({ name: "Tornillo" }),
      product({ name: "Pintura" }),
      product({ name: "Cemento" })
    ];
    const summary = buildDashboardSummary({
      ...baseInput,
      lowStockProducts: lowStock,
      products: lowStock,
      receivables: [
        { amountMinor: 5000, customerName: "Alba", dueAt: "2026-11-01" },
        { amountMinor: 1000, customerName: "Ruiz", dueAt: "2026-11-09" },
        { amountMinor: 8000, customerName: "Futuro", dueAt: "2026-12-01" }
      ] as ReceivableRecord[],
      supplierPayables: [
        { balanceMinor: 4000, dueAt: "2026-11-14", status: "pending", supplierName: "Andina" },
        { balanceMinor: 0, dueAt: "2026-11-12", status: "paid", supplierName: "Pagado" },
        { balanceMinor: 9000, dueAt: "2026-12-20", status: "pending", supplierName: "Lejos" }
      ] as SupplierPayableRecord[]
    });

    expect(summary.overdueReceivablesCount).toBe(2);
    expect(summary.pendingTasks.map((task) => [task.id, task.count])).toEqual([
      ["overdue-receivables", 2],
      ["low-stock", 3],
      ["supplier-payables", 1]
    ]);
    expect(summary.pendingTasks[0]?.body).toBe("$60 · la más antigua, Alba");
    expect(summary.pendingTasks[1]?.body).toBe("Tornillo, Pintura y 1 más");
    expect(summary.metrics.find((metric) => metric.label === "Cartera pendiente")?.detail).toBe(
      "$60 vencida"
    );
  });

  it("returns no pending tasks when everything is up to date", () => {
    const summary = buildDashboardSummary(baseInput);

    expect(summary.pendingTasks).toEqual([]);
    expect(summary.metrics.find((metric) => metric.label === "Margen bruto del mes")?.value).toBe(
      "—"
    );
  });
});

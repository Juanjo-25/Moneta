import type { ComponentProps } from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as native from "../../lib/tauri";
import { dailyCredit, dailySale } from "../../test/daily-sales-fixture";
import type { PurchaseRecord, ReceivableRecord, SupplierPayableRecord } from "../../types";
import { ReportsSection } from "./ReportsSection";
import { isInReportMonth, reportDocumentTime, shiftReportMonth } from "./report-period";

function sale(id: string, date: string, total: number, cost: number) {
  return {
    ...dailySale(id, date, total),
    lines: [{
      id: `line-${id}`, productId: "product-1", productName: "Arroz", unit: "Kg",
      quantity: 1, unitCostMinorAtSale: cost, unitPriceMinor: total,
      discountPercent: 0, discountMinor: 0, taxPercent: 0, taxMinor: 0,
      subtotalMinor: total, costMinor: cost, marginMinor: total - cost,
      marginPercent: (total - cost) / total * 100, totalMinor: total
    }]
  };
}

const sales = [
  sale("september", "2026-09-30", 10000, 6000),
  sale("october-1", "2026-10-01", 20000, 12000),
  sale("october-2", "2026-10-31", 30000, 18000),
  sale("november", "2026-11-01", 40000, 24000)
];

const purchase: PurchaseRecord = {
  id: "purchase-september", supplierId: "supplier", supplierName: "Proveedor de septiembre",
  expenseCategory: "services", branch: "Principal", prefix: "", currency: "COP",
  concept: "Compra", invoiceNumber: "FC-1", issuedAt: "2026-09-30", dueAt: "2026-10-20",
  occurredAtMs: new Date(2026, 9, 1).getTime(), productId: "product-1", productName: "Arroz",
  quantity: 1, unitCostMinor: 5000, totalMinor: 5000, lines: [], paymentStatus: "pending",
  occurredAtLabel: "30/09/2026"
};
const receivable: ReceivableRecord = {
  id: "receivable", customerId: "customer-1", customerName: "Cliente de prueba",
  saleId: "september", amountMinor: 2000, originalAmountMinor: 10000,
  paidAmountMinor: 8000, balanceMinor: 2000, dueAt: "2026-10-15", status: "partial"
};
const payable: SupplierPayableRecord = {
  id: "payable", supplierId: purchase.supplierId, supplierName: purchase.supplierName,
  expenseCategory: "services", purchaseId: purchase.id, invoiceNumber: purchase.invoiceNumber,
  originalAmountMinor: 5000, paidAmountMinor: 1000, balanceMinor: 4000,
  dueAt: "2026-10-20", status: "partial"
};

function setup(overrides: Partial<ComponentProps<typeof ReportsSection>> = {}) {
  render(<ReportsSection
    creditNotes={[]} customerReceipts={[]} formatCurrency={(value) => `$${value}`}
    purchases={[]} receivables={[]} sales={sales} supplierPayables={[]} supplierPayments={[]}
    {...overrides}
  />);
  return userEvent.setup();
}

function selectMonth(value: string) {
  fireEvent.change(screen.getByLabelText("Consultar mes"), { target: { value } });
}
function reportTab(name: string) {
  return within(screen.getByRole("tablist", { name: "Tipos de reportes" })).getByRole("tab", { name });
}
function summaryValue(region: string, label: string) {
  return within(screen.getByLabelText(region)).getByText(label).closest(".summary-card")?.textContent;
}
function exportXml() {
  return decodeURIComponent(screen.getByRole("link", { name: "Descargar archivo Excel" }).getAttribute("href")!.split(",")[1]!);
}

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("monthly reports", () => {
  it("uses local calendar boundaries, leap days and year changes", () => {
    expect(isInReportMonth(new Date(2024, 1, 29, 23, 59, 59).getTime(), "2024-02")).toBe(true);
    expect(isInReportMonth(new Date(2024, 2, 1).getTime(), "2024-02")).toBe(false);
    expect(isInReportMonth(new Date(2026, 8, 30, 23, 59, 59).getTime(), "2026-10")).toBe(false);
    expect(isInReportMonth(Number.POSITIVE_INFINITY, "2026-10")).toBe(false);
    expect(isInReportMonth(Number.POSITIVE_INFINITY, "")).toBe(true);
    expect(shiftReportMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftReportMonth("2026-12", 1)).toBe("2027-01");
    expect(reportDocumentTime(sales[0]!)).toBe(new Date(2026, 8, 30).getTime());
  });

  it("filters summaries, details and Excel by emission month and clears old downloads", async () => {
    const user = setup();
    selectMonth("2026-10");
    expect(summaryValue("Resumen rentabilidad general", "Ingresos totales")).toContain("$50000");
    expect(summaryValue("Resumen rentabilidad general", "Margen bruto")).toContain("$20000");
    await user.click(screen.getByRole("tab", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Abrir detalle de margen por venta" }));
    const table = screen.getByRole("table", { name: "Detalle margen por venta" });
    expect(within(table).getByText("october-1")).toBeTruthy();
    expect(within(table).getByText("october-2")).toBeTruthy();
    expect(within(table).queryByText("september")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Exportar a Excel" }));
    const link = screen.getByRole("link", { name: "Descargar archivo Excel" });
    expect(link.getAttribute("download")).toBe("moneta-rentabilidad-2026-10.xls");
    expect(exportXml()).toContain("octubre de 2026");
    expect(exportXml()).not.toContain("FV-september");
    expect(exportXml()).not.toContain('>september<');
    selectMonth("2026-12");
    expect(screen.getByText("Sin movimientos en este mes")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Descargar archivo Excel" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Todo el historial" }));
    await user.click(screen.getByRole("tab", { name: "Dashboard general" }));
    expect(summaryValue("Resumen rentabilidad general", "Ingresos totales")).toContain("$100000");
  });

  it("discards an export completed after the selected month changes", async () => {
    let finish!: (value: null) => void;
    vi.spyOn(native, "saveNativeExcelExport").mockImplementation(() =>
      new Promise((resolve) => { finish = resolve; })
    );
    setup();
    selectMonth("2026-10");
    fireEvent.click(screen.getByRole("button", { name: "Exportar a Excel" }));
    selectMonth("2026-09");
    await act(async () => { finish(null); });
    expect(screen.queryByRole("link", { name: "Descargar archivo Excel" })).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("retains the month between reports and navigates across years", async () => {
    const user = setup();
    selectMonth("2026-01");
    await user.click(screen.getByRole("button", { name: "Mes anterior" }));
    expect((screen.getByLabelText("Consultar mes") as HTMLInputElement).value).toBe("2025-12");
    await user.click(reportTab("Egresos"));
    expect((screen.getByLabelText("Consultar mes") as HTMLInputElement).value).toBe("2025-12");
    await user.click(screen.getByRole("button", { name: "Mes siguiente" }));
    expect((screen.getByLabelText("Consultar mes") as HTMLInputElement).value).toBe("2026-01");
    await user.click(screen.getByRole("button", { name: "Este mes" }));
    const now = new Date();
    expect((screen.getByLabelText("Consultar mes") as HTMLInputElement).value)
      .toBe(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  });

  it("keeps credits from older sales in their own month, with negative margins and the original seller", async () => {
    const note = { ...dailyCredit("later-credit", "2026-12-05", 3000), saleId: "september",
      lines: [{ ...sales[0]!.lines[0]!, saleLineId: "line-september", totalMinor: 3000, costMinor: 1800 }] };
    const user = setup({ creditNotes: [note] });
    selectMonth("2026-12");
    expect(summaryValue("Resumen rentabilidad general", "Ingresos totales")).toContain("$-3000");
    expect(summaryValue("Resumen rentabilidad general", "Margen bruto")).toContain("$-1200");
    await user.click(screen.getByRole("tab", { name: "Vendedores" }));
    await user.click(screen.getByRole("button", { name: "Abrir detalle de ventas por vendedor" }));
    expect(within(screen.getByRole("table", { name: "Detalle ventas por vendedor" })).getByText("Ana")).toBeTruthy();
    await user.click(reportTab("Flujo de caja"));
    expect(within(screen.getByRole("table", { name: "Detalle flujo de caja" })).getByText("Nota credito")).toBeTruthy();
    expect(summaryValue("Resumen flujo de caja", "Salidas reales")).toContain("$3000");
    await user.click(reportTab("Utilidades"));
    expect(summaryValue("Resumen utilidades", "Utilidad total")).toContain("$-1200");
    expect(screen.getByLabelText("Grafico utilidades por periodo").querySelector(".report-bar-fill-negative")).toBeTruthy();
  });

  it("filters DSO by invoice month and cashflow and expenses by payment or due date", async () => {
    const user = setup({
      receivables: [receivable], purchases: [purchase], supplierPayables: [payable],
      supplierPayments: [{ id: "payment", payableId: payable.id, purchaseId: purchase.id,
        supplierId: purchase.supplierId, supplierName: purchase.supplierName, expenseCategory: "services",
        amountMinor: 1000, paidAtMs: new Date(2026, 9, 2, 14).getTime(), paidAtLabel: "02/10/2026" }],
      customerReceipts: [{ active: true, id: "receipt", number: "RC-1", receivableId: receivable.id,
        receivableOriginalAmountMinor: 10000, receivablePaidAmountMinorBefore: 0,
        receivableBalanceMinorBefore: 10000, receivableDueAt: receivable.dueAt, saleId: "september",
        customerId: "customer-1", customerName: "Cliente de prueba", amountMinor: 8000, concept: "Abono",
        receivedAt: "2026-10-02", receivedAtMs: new Date(2026, 9, 2, 10).getTime(),
        receivedAtLabel: "02/10/2026", voidedAtLabel: "", voidedAtMs: 0 }]
    });
    selectMonth("2026-10");
    await user.click(reportTab("DSO"));
    expect(summaryValue("Resumen DSO", "Cartera abierta")).toContain("$0");
    selectMonth("2026-09");
    expect(summaryValue("Resumen DSO", "Cartera abierta")).toContain("$2000");
    selectMonth("2026-10");
    await user.click(reportTab("Flujo de caja"));
    const cashflow = within(screen.getByRole("table", { name: "Detalle flujo de caja" }));
    expect(screen.getByLabelText("Grafico flujo de caja comparativo").querySelectorAll(".cashflow-chart-row")).toHaveLength(5);
    expect(cashflow.getByText("Recibo de caja")).toBeTruthy();
    expect(cashflow.getByText("Cuenta por cobrar")).toBeTruthy();
    expect(cashflow.getByText("Abono proveedor")).toBeTruthy();
    expect(cashflow.getByText("Cuenta por pagar")).toBeTruthy();
    expect(summaryValue("Resumen flujo de caja", "Entradas reales")).toContain("$58000");
    await user.click(reportTab("Egresos"));
    expect(summaryValue("Resumen egresos", "Egresos reales")).toContain("$1000");
    expect(summaryValue("Resumen egresos", "Egresos proyectados")).toContain("$4000");
    await user.click(screen.getByRole("button", { name: "Exportar a Excel" }));
    expect(exportXml()).toContain("FC-1");
    expect(exportXml()).toContain("Proveedor de septiembre");
  });

  it("groups daily utility and cashflow into months without changing totals and exports the selected grouping", async () => {
    const user = setup();
    await user.click(reportTab("Utilidades"));
    expect(within(screen.getByRole("table", { name: "Detalle utilidades por periodo" })).getAllByRole("row")).toHaveLength(5);
    await user.click(screen.getByRole("radio", { name: "Mes" }));
    const table = within(screen.getByRole("table", { name: "Detalle utilidades por periodo" }));
    expect(table.getAllByRole("row")).toHaveLength(4);
    expect(table.getByText("octubre de 2026")).toBeTruthy();
    expect(table.getByText("$50000")).toBeTruthy();
    expect(summaryValue("Resumen utilidades", "Utilidad total")).toContain("$40000");
    await user.click(screen.getByRole("button", { name: "Exportar a Excel" }));
    expect(exportXml()).toContain("octubre de 2026");
    expect(exportXml()).not.toContain("31/10/2026");
    await user.click(reportTab("Flujo de caja"));
    expect(screen.getByLabelText("Grafico flujo de caja comparativo").querySelectorAll(".cashflow-chart-row")).toHaveLength(3);
    expect(summaryValue("Resumen flujo de caja", "Entradas reales")).toContain("$100000");
  });
});

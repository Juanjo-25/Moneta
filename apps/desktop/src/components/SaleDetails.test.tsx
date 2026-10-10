import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import type { ReceivableRecord, SaleRecord } from "../types";
import { SaleDetails } from "./SaleDetails";

const sale: SaleRecord = {
  id: "sale-1", invoiceNumber: "FV-010", issuedAt: "2026-10-10",
  customerId: "customer-1", customerName: "Cliente histórico",
  customer: { id: "customer-1", name: "Cliente histórico", document: "DOC-1", address: "Dirección registrada", city: "Bogotá", email: "", active: true },
  branch: "Principal", prefix: "FV", seller: "Ana", currency: "COP", concept: "Pedido",
  observations: "Entrega en tienda", footerNote: "Gracias",
  productId: "product-1", productName: "Producto registrado", quantity: 2,
  unitPriceMinor: 5000, totalMinor: 10710, paymentStatus: "pending",
  occurredAtMs: new Date(2026, 9, 10).getTime(), occurredAtLabel: "",
  lines: [{ id: "line-1", productId: "product-1", productName: "Producto registrado", unit: "Unidad", quantity: 2,
    unitCostMinorAtSale: 3000, unitPriceMinor: 5000, discountPercent: 10, discountMinor: 1000,
    taxPercent: 19, taxMinor: 1710, subtotalMinor: 10000, costMinor: 6000, marginMinor: 3000, marginPercent: 33.33, totalMinor: 10710 }]
};

afterEach(cleanup);

it("shows the saved discount and tax breakdown together with the current partial balance", () => {
  const receivable: ReceivableRecord = {
    id: "receivable-1", saleId: sale.id, customerId: sale.customerId, customerName: sale.customerName,
    amountMinor: 10710, originalAmountMinor: 10710, paidAmountMinor: 3000,
    balanceMinor: 7710, dueAt: "2026-11-10", status: "partial"
  };
  render(<SaleDetails sale={sale} receivables={[receivable]} formatCurrency={String} />);
  for (const [label, amount] of [["Subtotal", "10000"], ["Descuentos", "1000"], ["Base después de descuentos", "9000"], ["Impuestos", "1710"], ["Total de la venta", "10710"], ["Abonos registrados", "3000"], ["Saldo pendiente", "7710"]]) {
    expect(screen.getByText(label!, { selector: "dt" }).nextElementSibling?.textContent).toBe(amount);
  }
  expect(screen.getByText("Pago parcial")).toBeTruthy();
  expect(screen.getByText("DOC-1")).toBeTruthy();
  expect(screen.getByText("Dirección registrada")).toBeTruthy();
  expect(screen.getByText("Entrega en tienda")).toBeTruthy();
  expect(screen.getByText("Gracias")).toBeTruthy();
  const table = screen.getByRole("table", { name: "Productos de venta FV-010" });
  expect(within(table).getByText("(10%)")).toBeTruthy();
  expect(within(table).getByText("(19%)")).toBeTruthy();
});

it("keeps legacy sales readable without inventing a missing breakdown", () => {
  render(<SaleDetails sale={{ ...sale, lines: [], issuedAt: "" }} formatCurrency={String} />);
  expect(screen.getByText("Producto registrado")).toBeTruthy();
  expect(screen.getByText("Desglose no disponible")).toBeTruthy();
  expect(screen.queryByText("Base después de descuentos")).toBeNull();
  expect(screen.queryByText("Saldo pendiente")).toBeNull();
  expect(screen.getByText("Fecha de elaboración").nextElementSibling?.textContent).toBe("10/10/2026");
});

it("shows zero outstanding balance for a paid sale without inventing receipt amounts", () => {
  render(<SaleDetails sale={{ ...sale, paymentStatus: "paid" }} receivables={[]} formatCurrency={String} />);
  expect(screen.getByText("Sin saldo pendiente")).toBeTruthy();
  expect(screen.getByText("Saldo pendiente").nextElementSibling?.textContent).toBe("0");
  expect(screen.queryByText("Abonos registrados")).toBeNull();
  expect(screen.queryByText("Fecha de vencimiento")).toBeNull();
});

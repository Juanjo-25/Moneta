import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import type { PurchaseRecord, SupplierPayableRecord } from "../types";
import { PurchaseDetails } from "./PurchaseDetails";

const purchase: PurchaseRecord = {
  id: "purchase-1", invoiceNumber: "FC-010", issuedAt: "2026-10-10", dueAt: "2026-11-10",
  supplierId: "supplier-1", supplierName: "Proveedor registrado", expenseCategory: "inventory",
  branch: "Principal", prefix: "FC", currency: "COP", concept: "Pedido de inventario",
  productId: "product-1", productName: "Producto registrado", quantity: 2,
  unitCostMinor: 5000, totalMinor: 10710, paymentStatus: "pending",
  occurredAtMs: new Date(2026, 9, 10).getTime(), occurredAtLabel: "",
  lines: [{ id: "line-1", productId: "product-1", productName: "Producto registrado", unit: "Unidad", quantity: 2,
    unitCostMinor: 5000, discountPercent: 10, discountMinor: 1000,
    taxPercent: 19, taxMinor: 1710, subtotalMinor: 10000, totalMinor: 10710 }]
};

afterEach(cleanup);

it("shows the saved costs, discount, tax and current partial balance", () => {
  const payable: SupplierPayableRecord = {
    id: "payable-1", purchaseId: purchase.id, supplierId: purchase.supplierId, supplierName: purchase.supplierName,
    expenseCategory: "inventory", invoiceNumber: purchase.invoiceNumber, originalAmountMinor: 10710,
    paidAmountMinor: 3000, balanceMinor: 7710, dueAt: purchase.dueAt, status: "partial"
  };
  render(<PurchaseDetails purchase={purchase} payable={payable} categoryLabel="Inventario / proveedores" formatCurrency={String} />);
  for (const [label, amount] of [["Subtotal", "10000"], ["Descuentos", "1000"], ["Base después de descuentos", "9000"], ["Impuestos", "1710"], ["Total de la compra", "10710"], ["Abonos registrados", "3000"], ["Saldo pendiente", "7710"]]) {
    expect(screen.getByText(label!, { selector: "dt" }).nextElementSibling?.textContent).toBe(amount);
  }
  expect(screen.getByText("Abonada")).toBeTruthy();
  expect(screen.getByText("Proveedor registrado")).toBeTruthy();
  expect(screen.getByText("Pedido de inventario")).toBeTruthy();
  expect(screen.getByText("Fecha de vencimiento").nextElementSibling?.textContent).toBe("10/11/2026");
  const table = screen.getByRole("table", { name: "Productos de compra FC-010" });
  expect(within(table).getByText("5000")).toBeTruthy();
  expect(within(table).getByText("(10%)")).toBeTruthy();
  expect(within(table).getByText("(19%)")).toBeTruthy();
});

it("keeps legacy purchases readable without inventing a missing breakdown or balance", () => {
  render(<PurchaseDetails purchase={{ ...purchase, lines: [], issuedAt: "" }} payable={undefined} categoryLabel="Inventario / proveedores" formatCurrency={String} />);
  expect(screen.getByText("Producto registrado")).toBeTruthy();
  expect(screen.getByText("Desglose no disponible")).toBeTruthy();
  expect(screen.queryByText("Base después de descuentos")).toBeNull();
  expect(screen.getByText("Saldo pendiente").nextElementSibling?.textContent).toBe("No disponible");
  expect(screen.getByText("Fecha de emisión").nextElementSibling?.textContent).toBe("10/10/2026");
});

it("shows zero outstanding balance for a paid purchase without inventing receipt amounts", () => {
  render(<PurchaseDetails purchase={{ ...purchase, paymentStatus: "paid", dueAt: "" }} payable={undefined} categoryLabel="Inventario / proveedores" formatCurrency={String} />);
  expect(screen.getByText("Sin saldo pendiente")).toBeTruthy();
  expect(screen.getByText("Saldo pendiente").nextElementSibling?.textContent).toBe("0");
  expect(screen.queryByText("Abonos registrados")).toBeNull();
  expect(screen.queryByText("Fecha de vencimiento")).toBeNull();
});

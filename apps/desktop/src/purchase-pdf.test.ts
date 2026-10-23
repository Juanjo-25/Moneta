import { expect, it } from "vitest";
import { generatePurchasePdf } from "./purchase-pdf";
import type { PurchaseRecord } from "./types";

const purchase: PurchaseRecord = {
  id: "purchase-1", supplierId: "supplier-1", supplierName: "Proveedor Norte",
  branch: "Principal", concept: "Mercancia recibida", currency: "COP", expenseCategory: "inventory",
  prefix: "PR", invoiceNumber: "PR-075", issuedAt: "2026-10-23", dueAt: "2026-11-23",
  occurredAtMs: 1, occurredAtLabel: "23/10/26", paymentStatus: "pending",
  productId: "rice", productName: "Arroz", quantity: 3, unitCostMinor: 3000, totalMinor: 9639,
  lines: [{ id: "line", productId: "rice", productName: "Arroz", unit: "Libra", quantity: 3,
    unitCostMinor: 3000, discountPercent: 10, discountMinor: 900, taxPercent: 19, taxMinor: 1539,
    subtotalMinor: 9000, totalMinor: 9639 }]
};

function pdfText(dataUri: string) {
  return atob(dataUri.split(",")[1]!);
}

it("creates an actual PDF with purchase amounts, discounts, taxes and a safe filename", () => {
  const result = generatePurchasePdf({ purchase });
  const content = pdfText(result.dataUri);
  expect(content.startsWith("%PDF-")).toBe(true);
  for (const value of ["FACTURA DE COMPRA PR-075", "Proveedor Norte", "Arroz", "$ 900", "$ 1.539", "$ 9.639", "Descuentos", "Impuestos"]) {
    expect(content).toContain(value);
  }
  expect(result.fileName).toBe("compra-PR-075.pdf");
  expect(generatePurchasePdf({ purchase: { ...purchase, invoiceNumber: "../PR/075" } }).fileName).toBe("compra-___PR_075.pdf");
});

it("paginates long purchases and includes every product and final totals", () => {
  const lines = Array.from({ length: 45 }, (_, index) => ({ ...purchase.lines[0]!, id: `line-${index}`, productName: `Producto ${index + 1}` }));
  const content = pdfText(generatePurchasePdf({ purchase: { ...purchase, lines, totalMinor: 9639 * 45 } }).dataUri);
  expect(content.match(/\/Type \/Page\b/g)!.length).toBeGreaterThan(1);
  expect(content).toContain("Producto 1");
  expect(content).toContain("Producto 45");
  expect(content).toContain("$ 433.755");
});

it("prints legacy purchases without inventing a tax or discount breakdown", () => {
  const content = pdfText(generatePurchasePdf({ purchase: { ...purchase, lines: [] } }).dataUri);
  expect(content).toContain("Arroz");
  expect(content).toContain("$ 9.639");
  expect(content).not.toContain("(Descuentos)");
});

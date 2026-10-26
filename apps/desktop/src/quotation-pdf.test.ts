import { expect, it } from "vitest";
import { generateQuotationPdf } from "./quotation-pdf";
import {
  quotationFixture,
  quotationSettingsFixture
} from "./test/quotation-fixture";

it("creates a quotation with customer, validity, discount, tax and totals without sale payment fields", () => {
  const result = generateQuotationPdf({
    quotation: quotationFixture,
    settings: quotationSettingsFixture
  });
  const content = atob(result.dataUri.split(",")[1]!).replace(/\u00a0/g, " ");
  expect(content.startsWith("%PDF-")).toBe(true);
  expect(result.fileName).toBe("cotizacion-COT-0001.pdf");
  for (const text of [
    "COT-0001",
    "Cliente de prueba",
    "2026-11-10",
    "Arroz libra",
    "$ 1.000",
    "$ 1.710",
    "$ 10.710",
    "Entrega en cinco dias."
  ])
    expect(content).toContain(text);
  for (const text of [
    "Contado",
    "Credito",
    "Forma de pago",
    "REMISION",
    "Nota de factura"
  ])
    expect(content).not.toContain(text);
});

it("paginates every product and long conditions without dropping content", () => {
  const lines = Array.from({ length: 60 }, (_, index) => ({
    ...quotationFixture.lines[0]!,
    id: `line-${index}`,
    productName: `Producto cotizado ${index + 1}`
  }));
  const content = atob(
    generateQuotationPdf({
      quotation: {
        ...quotationFixture,
        lines,
        totalMinor: 10710 * 60,
        observations:
          "Condiciones comerciales. ".repeat(300) + "FIN DE CONDICIONES"
      },
      settings: quotationSettingsFixture
    }).dataUri.split(",")[1]!
  ).replace(/\u00a0/g, " ");
  const pages = content.match(/\/Type \/Page\b/g)!.length;
  expect(pages).toBeGreaterThan(3);
  expect(content).toContain("Producto cotizado 1");
  expect(content).toContain("Producto cotizado 60");
  expect(content).toContain("$ 642.600");
  expect(content).toContain("FIN DE CONDICIONES");
  expect(content.match(/\(COT-0001\)/g)!.length).toBe(pages);
});

it("rejects a quotation with inconsistent amounts before generating the PDF", () => {
  expect(() =>
    generateQuotationPdf({
      quotation: { ...quotationFixture, totalMinor: 1 },
      settings: quotationSettingsFixture
    })
  ).toThrow();
});

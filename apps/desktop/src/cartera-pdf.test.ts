import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildCarteraFileName,
  generateCarteraPdf,
  type CarteraPdfInput
} from "./cartera-pdf";
import type { PurchaseRecord, SaleRecord } from "./types";

const addPageMock = vi.fn();
const outputMock = vi.fn(() => "data:application/pdf;base64,cartera-pdf");
const rectMock = vi.fn();
const lineMock = vi.fn();
const setDrawColorMock = vi.fn();
const setFillColorMock = vi.fn();
const setFontMock = vi.fn();
const setFontSizeMock = vi.fn();
const setTextColorMock = vi.fn();
const textMock = vi.fn();
const saveMock = vi.fn();

vi.mock("jspdf", () => ({
  jsPDF: vi.fn().mockImplementation(() => ({
    addPage: addPageMock,
    line: lineMock,
    output: outputMock,
    rect: rectMock,
    save: saveMock,
    setDrawColor: setDrawColorMock,
    setFillColor: setFillColorMock,
    setFont: setFontMock,
    setFontSize: setFontSizeMock,
    setTextColor: setTextColorMock,
    splitTextToSize: (text: string) => text.match(/.{1,65}/g) ?? [""],
    text: textMock
  }))
}));

const carteraInput: CarteraPdfInput = {
  generatedAtLabel: "14/08/2026, 8:00 a. m.",
  purchases: [
    {
      id: "purchase-1",
      issuedAt: "2026-07-12"
    } as PurchaseRecord
  ],
  receivables: [
    {
      amountMinor: 25000,
      balanceMinor: 25000,
      customerId: "customer-2",
      customerName: "Alquiler Amaga",
      dueAt: "2026-08-05",
      id: "receivable-2",
      invoiceNumber: "FV-2026-002",
      originalAmountMinor: 25000,
      paidAmountMinor: 0,
      saleId: "sale-2",
      status: "pending"
    },
    {
      amountMinor: 18000,
      balanceMinor: 12000,
      customerId: "customer-2",
      customerName: "Alquiler Amaga",
      dueAt: "2026-07-15",
      id: "receivable-3",
      invoiceNumber: "FV-2026-003",
      originalAmountMinor: 18000,
      paidAmountMinor: 6000,
      saleId: "sale-3",
      status: "partial"
    },
    {
      amountMinor: 13500,
      balanceMinor: 8500,
      customerId: "customer-1",
      customerName: "Carlos Ruiz",
      dueAt: "2026-07-20",
      id: "receivable-1",
      invoiceNumber: "FV-2026-001",
      originalAmountMinor: 13500,
      paidAmountMinor: 5000,
      saleId: "sale-1",
      status: "partial"
    }
  ],
  sales: [
    {
      id: "sale-1",
      invoiceNumber: "FV-2026-001",
      issuedAt: "2026-07-10"
    } as SaleRecord,
    {
      id: "sale-2",
      invoiceNumber: "FV-2026-002",
      issuedAt: "2026-08-01"
    } as SaleRecord,
    {
      id: "sale-3",
      invoiceNumber: "FV-2026-003",
      issuedAt: "2026-07-01"
    } as SaleRecord
  ],
  supplierPayables: [
    {
      balanceMinor: 10000,
      dueAt: "2026-07-30",
      expenseCategory: "inventory",
      id: "payable-1",
      invoiceNumber: "FC-100",
      originalAmountMinor: 15000,
      paidAmountMinor: 5000,
      purchaseId: "purchase-1",
      status: "partial",
      supplierId: "supplier-1",
      supplierName: "Proveedor Central"
    }
  ]
};

describe("cartera PDF", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds a stable cartera PDF filename", () => {
    expect(buildCarteraFileName()).toBe("cartera-pendiente.pdf");
  });

  it("renders receivable and payable data into a previewable PDF result", () => {
    const result = generateCarteraPdf(carteraInput);
    const renderedText = textMock.mock.calls
      .map((call) => String(call[0]))
      .join(" ");
    const renderedValues = textMock.mock.calls.map((call) => String(call[0]));
    const getRenderedIndex = (text: string) => {
      const index = renderedValues.findIndex((value) => value.includes(text));

      expect(index).toBeGreaterThanOrEqual(0);

      return index;
    };

    expect(renderedText).toContain("CARTERA PENDIENTE");
    expect(renderedText).toContain("Generado: 14/08/2026, 8:00 a. m.");
    expect(renderedText).toContain("Total por cobrar");
    expect(renderedText).toContain("Total por pagar");
    expect(renderedText).toContain("Por cobrar");
    expect(renderedText).toContain("Factura");
    expect(renderedText).toContain("Emitida");
    expect(renderedText).toContain("CLIENTE 01");
    expect(renderedText).toContain("Alquiler Amaga");
    expect(renderedText).toContain("Carlos Ruiz");
    expect(getRenderedIndex("Alquiler Amaga")).toBeLessThan(
      getRenderedIndex("Carlos Ruiz")
    );
    expect(getRenderedIndex("FV-2026-003")).toBeLessThan(
      getRenderedIndex("FV-2026-002")
    );
    expect(renderedText).toContain("FV-2026-001");
    expect(renderedText).not.toContain("sale-1");
    expect(renderedText).toContain("2026-07-10");
    expect(renderedText).toContain("$ 8.500");
    expect(renderedText).toContain("Por pagar");
    expect(renderedText).toContain("Proveedor Central");
    expect(renderedText).toContain("FC-100");
    expect(renderedText).toContain("2026-07-12");
    expect(renderedText).toContain("$ 10.000");
    expect(outputMock).toHaveBeenCalledWith("datauristring");
    expect(saveMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      dataUri: "data:application/pdf;base64,cartera-pdf",
      fileName: "cartera-pendiente.pdf"
    });
  });

  it("closes each client with its own total before the next client starts", () => {
    generateCarteraPdf(carteraInput);
    const values = textMock.mock.calls.map((call) => String(call[0]));
    const totals = values.flatMap((value, index) => value === "TOTAL DEL CLIENTE" ? [index] : []);
    expect(totals).toHaveLength(2);
    expect(values[totals[0]! + 1]).toBe("$ 37.000");
    expect(values[totals[1]! + 1]).toBe("$ 8.500");
    expect(totals[0]).toBeLessThan(values.indexOf("CLIENTE 02"));
    expect(totals[1]).toBeGreaterThan(values.indexOf("FV-2026-001"));
  });

  it("repeats client identity and columns on continuation pages and keeps all invoices within the print area", () => {
    let page = 1;
    const texts: Array<{ text: string; page: number; y: number }> = [];
    addPageMock.mockImplementation(() => { page += 1; });
    textMock.mockImplementation((text: string, _x: number, y: number) => { texts.push({ text, page, y }); });
    const receivables = Array.from({ length: 40 }, (_, index) => ({
      ...carteraInput.receivables[0]!, id: `receivable-${index}`, invoiceNumber: `FV-${String(index + 1).padStart(3, "0")}`
    }));
    generateCarteraPdf({ ...carteraInput, receivables, supplierPayables: [] });
    expect(page).toBeGreaterThan(1);
    const invoiceTexts = texts.filter((entry) => /^FV-\d{3}$/.test(entry.text));
    expect(invoiceTexts).toHaveLength(40);
    expect(invoiceTexts.every((entry) => entry.y < 276)).toBe(true);
    for (const pageNumber of new Set(invoiceTexts.map((entry) => entry.page))) {
      const pageTexts = texts.filter((entry) => entry.page === pageNumber);
      expect(pageTexts.some((entry) => entry.text === "Alquiler Amaga")).toBe(true);
      expect(pageTexts.some((entry) => entry.text === "Factura")).toBe(true);
      if (pageNumber > 1) expect(pageTexts.some((entry) => entry.text === "CLIENTE 01 - CONTINUACION")).toBe(true);
    }
    expect(texts.filter((entry) => entry.text === "TOTAL DEL CLIENTE")).toHaveLength(1);
  });

  it("keeps a short client block on one page and prints long customer names without truncating them", () => {
    let page = 1;
    const texts: Array<{ text: string; page: number }> = [];
    addPageMock.mockImplementation(() => { page += 1; });
    textMock.mockImplementation((text: string) => { texts.push({ text, page }); });
    const longName = "Comercializadora de productos nacionales y suministros industriales del municipio de Medellin";
    const receivables = Array.from({ length: 6 }, (_, index) => ({
      ...carteraInput.receivables[0]!, customerId: `customer-${index}`, customerName: `Cliente ${index}`, id: `receivable-${index}`, invoiceNumber: `SINGLE-${index}`
    }));
    receivables.push({ ...carteraInput.receivables[0]!, customerId: "last", customerName: longName, invoiceNumber: "LONG-NAME" });
    generateCarteraPdf({ ...carteraInput, receivables, supplierPayables: [] });
    for (let index = 0; index < 6; index += 1) {
      const customer = texts.find((entry) => entry.text === `Cliente ${index}`)!;
      const invoice = texts.find((entry) => entry.text === `SINGLE-${index}`)!;
      expect(customer.page).toBe(invoice.page);
    }
    expect(texts.map((entry) => entry.text).join(" ")).toContain(longName.slice(0, 65));
    expect(texts.map((entry) => entry.text).join(" ")).toContain(longName.slice(65));
  });
});

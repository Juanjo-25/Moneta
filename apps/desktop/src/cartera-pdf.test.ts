import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildCarteraFileName,
  generateCarteraPdf,
  type CarteraPdfInput
} from "./cartera-pdf";

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
    text: textMock
  }))
}));

const carteraInput: CarteraPdfInput = {
  generatedAtLabel: "14/08/2026, 8:00 a. m.",
  receivables: [
    {
      amountMinor: 13500,
      balanceMinor: 8500,
      customerId: "customer-1",
      customerName: "Carlos Ruiz",
      dueAt: "2026-07-20",
      id: "receivable-1",
      originalAmountMinor: 13500,
      paidAmountMinor: 5000,
      saleId: "sale-1",
      status: "partial"
    }
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

    expect(renderedText).toContain("CARTERA PENDIENTE");
    expect(renderedText).toContain("Generado: 14/08/2026, 8:00 a. m.");
    expect(renderedText).toContain("Total por cobrar");
    expect(renderedText).toContain("Total por pagar");
    expect(renderedText).toContain("Por cobrar");
    expect(renderedText).toContain("Carlos Ruiz");
    expect(renderedText).toContain("sale-1");
    expect(renderedText).toContain("$ 8.500");
    expect(renderedText).toContain("Por pagar");
    expect(renderedText).toContain("Proveedor Central");
    expect(renderedText).toContain("FC-100");
    expect(renderedText).toContain("$ 10.000");
    expect(outputMock).toHaveBeenCalledWith("datauristring");
    expect(saveMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      dataUri: "data:application/pdf;base64,cartera-pdf",
      fileName: "cartera-pendiente.pdf"
    });
  });
});

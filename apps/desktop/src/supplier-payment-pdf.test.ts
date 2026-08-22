import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildSupplierPaymentFileName,
  generateSupplierPaymentPdf,
  type SupplierPaymentPdfInput
} from "./supplier-payment-pdf";

const textMock = vi.fn();
const setFontMock = vi.fn();
const setFontSizeMock = vi.fn();
const setFillColorMock = vi.fn();
const setDrawColorMock = vi.fn();
const setTextColorMock = vi.fn();
const rectMock = vi.fn();
const lineMock = vi.fn();
const outputMock = vi.fn(() => "data:application/pdf;base64,supplier-payment-pdf");

vi.mock("jspdf", () => ({
  jsPDF: vi.fn().mockImplementation(() => ({
    line: lineMock,
    output: outputMock,
    rect: rectMock,
    setDrawColor: setDrawColorMock,
    setFillColor: setFillColorMock,
    setFont: setFontMock,
    setFontSize: setFontSizeMock,
    setTextColor: setTextColorMock,
    text: textMock
  }))
}));

const paymentInput: SupplierPaymentPdfInput = {
  payable: {
    balanceMinor: 10000,
    dueAt: "2026-07-30",
    expenseCategory: "inventory",
    id: "payable-purchase-1",
    invoiceNumber: "001",
    originalAmountMinor: 15000,
    paidAmountMinor: 5000,
    purchaseId: "purchase-1",
    status: "partial",
    supplierId: "supplier-1",
    supplierName: "Proveedor Central"
  },
  payment: {
    amountMinor: 5000,
    expenseCategory: "inventory",
    id: "supplier-payment-1",
    paidAtLabel: "24/07/26, 4:30 p. m.",
    paidAtMs: 1784910600000,
    payableId: "payable-purchase-1",
    purchaseId: "purchase-1",
    supplierId: "supplier-1",
    supplierName: "Proveedor Central"
  }
};

describe("supplier payment PDF", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds a stable supplier payment PDF filename", () => {
    expect(buildSupplierPaymentFileName("supplier-payment-1")).toBe(
      "abono-proveedor-supplier-payment-1.pdf"
    );
  });

  it("renders supplier payment data into a previewable PDF result", () => {
    const result = generateSupplierPaymentPdf(paymentInput);

    const renderedText = textMock.mock.calls
      .map((call) => String(call[0]))
      .join(" ");

    expect(renderedText).toContain("COMPROBANTE DE ABONO A PROVEEDOR");
    expect(renderedText).toContain("supplier-payment-1");
    expect(renderedText).toContain("Proveedor Central");
    expect(renderedText).toContain("Factura proveedor: 001");
    expect(renderedText).toContain("Valor abonado");
    expect(renderedText).toContain("$ 5.000");
    expect(renderedText).toContain("$ 10.000");
    expect(outputMock).toHaveBeenCalledWith("datauristring");
    expect(result).toEqual({
      dataUri: "data:application/pdf;base64,supplier-payment-pdf",
      fileName: "abono-proveedor-supplier-payment-1.pdf"
    });
  });
});

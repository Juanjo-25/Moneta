import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildCashReceiptFileName,
  generateCashReceiptPdf,
  type CashReceiptPdfInput
} from "./cash-receipt-pdf";

const textMock = vi.fn();
const setFontMock = vi.fn();
const setFontSizeMock = vi.fn();
const setFillColorMock = vi.fn();
const setDrawColorMock = vi.fn();
const setTextColorMock = vi.fn();
const rectMock = vi.fn();
const lineMock = vi.fn();
const outputMock = vi.fn(() => "data:application/pdf;base64,cash-receipt-pdf");

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

const receiptInput: CashReceiptPdfInput = {
  receipt: {
    active: true,
    amountMinor: 5000,
    concept: "Abono cartera cliente",
    customerId: "customer-1",
    customerName: "Carlos Ruiz",
    id: "cash-receipt-1",
    number: "RC-001",
    receivableBalanceMinorBefore: 13500,
    receivableDueAt: "2026-07-20",
    receivableId: "receivable-1",
    receivableOriginalAmountMinor: 13500,
    receivablePaidAmountMinorBefore: 0,
    receivedAt: "2026-07-21",
    receivedAtLabel: "21/07/26, 12:00 p. m.",
    receivedAtMs: 1784649600000,
    saleId: "sale-1",
    voidedAtLabel: "",
    voidedAtMs: 0
  }
};

describe("cash receipt PDF", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds a stable cash receipt PDF filename", () => {
    expect(buildCashReceiptFileName("RC-001")).toBe("recibo-caja-RC-001.pdf");
  });

  it("renders cash receipt data into a previewable PDF result", () => {
    const result = generateCashReceiptPdf(receiptInput);

    const renderedText = textMock.mock.calls
      .map((call) => String(call[0]))
      .join(" ");

    expect(renderedText).toContain("RECIBO DE CAJA");
    expect(renderedText).toContain("No. RC-001");
    expect(renderedText).toContain("Carlos Ruiz");
    expect(renderedText).toContain("Venta: sale-1");
    expect(renderedText).toContain("Abono cartera cliente");
    expect(renderedText).toContain("Valor recibido");
    expect(renderedText).toContain("$ 5.000");
    expect(renderedText).toContain("$ 8.500");
    expect(outputMock).toHaveBeenCalledWith("datauristring");
    expect(result).toEqual({
      dataUri: "data:application/pdf;base64,cash-receipt-pdf",
      fileName: "recibo-caja-RC-001.pdf"
    });
  });
});

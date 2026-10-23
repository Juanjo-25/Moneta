import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildInvoiceFileName,
  buildInvoicePaymentLabel,
  generateInvoicePdf,
  type InvoicePdfInput
} from "./invoice-pdf";

const saveMock = vi.fn();
const textMock = vi.fn();
const setFontMock = vi.fn();
const setFontSizeMock = vi.fn();
const setFillColorMock = vi.fn();
const setDrawColorMock = vi.fn();
const setTextColorMock = vi.fn();
const rectMock = vi.fn();
const lineMock = vi.fn();
const addImageMock = vi.fn();
const addPageMock = vi.fn();
const splitTextToSizeMock = vi.fn((text: string) => text.split("\n"));
const outputMock = vi.fn(() => "data:application/pdf;base64,invoice-pdf");

vi.mock("jspdf", () => ({
  jsPDF: vi.fn().mockImplementation(() => ({
    addImage: addImageMock,
    addPage: addPageMock,
    splitTextToSize: splitTextToSizeMock,
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

const invoiceInput: InvoicePdfInput = {
  customer: {
    address: "Calle 10 # 20-30",
    city: "Medellin",
    document: "123456789",
    email: "ana@example.com",
    name: "Ana Perez"
  },
  dueDate: "30/07/2026",
  invoiceNumber: "FE-sale-1",
  issueDate: "30/06/2026, 8:30 a. m.",
  item: {
    description: "Arroz libra",
    quantity: 2,
    totalMinor: 9000,
    unitPriceMinor: 4500
  },
  paymentStatus: "paid"
};

describe("invoice PDF", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds a stable invoice PDF filename", () => {
    expect(buildInvoiceFileName("FE-sale-1")).toBe("factura-FE-sale-1.pdf");
  });

  it("maps sale payment status to Spanish invoice labels", () => {
    expect(buildInvoicePaymentLabel("paid")).toBe("Contado");
    expect(buildInvoicePaymentLabel("pending")).toBe("Credito");
  });

  it("renders customer, item, payment, and totals into a previewable PDF result", () => {
    const result = generateInvoicePdf(invoiceInput);

    const renderedText = textMock.mock.calls
      .map((call) => String(call[0]))
      .join(" ");

    expect(renderedText).toContain("REMISION");
    expect(renderedText).toContain("FE-sale-1");
    expect(renderedText).toContain("SENOR(ES)");
    expect(renderedText).toContain("FECHA DE EXPEDICION");
    expect(renderedText).toContain("FECHA DE VENCIMIENTO");
    expect(renderedText).toContain("30/07/2026");
    expect(renderedText).toContain("Ana Perez");
    expect(renderedText).toContain("123456789");
    expect(renderedText).toContain("Calle 10 # 20-30");
    expect(renderedText).toContain("Medellin");
    expect(renderedText).toContain("ana@example.com");
    expect(renderedText).toContain("ARROZ LIBRA");
    expect(renderedText).toContain("Contado");
    expect(renderedText).toContain("$ 9.000");
    expect(outputMock).toHaveBeenCalledWith("datauristring");
    expect(saveMock).not.toHaveBeenCalled();
    expect(textMock).toHaveBeenCalledWith("30/06/2026, 8:30 a. m.", 179, 60, {
      align: "center"
    });
    expect(textMock).toHaveBeenCalledWith("30/07/2026", 179, 74, {
      align: "center"
    });
    expect(result).toEqual({
      dataUri: "data:application/pdf;base64,invoice-pdf",
      fileName: "factura-FE-sale-1.pdf"
    });
  });

  it("prints No registrado for empty optional customer fields", () => {
    generateInvoicePdf({
      ...invoiceInput,
      customer: {
        address: "",
        city: "",
        document: "123456789",
        email: "",
        name: "Ana Perez"
      }
    });

    const renderedText = textMock.mock.calls
      .map((call) => String(call[0]))
      .join(" ");

    expect(renderedText).toContain("No registrado");
    expect(renderedText).toContain("Email: No registrado");
  });

  it("prints No aplica as due date for paid invoices without a due date", () => {
    generateInvoicePdf({
      ...invoiceInput,
      dueDate: ""
    });

    expect(textMock).toHaveBeenCalledWith("No aplica", 179, 74, {
      align: "center"
    });
  });

  it("renders configured company and invoice design text", () => {
    generateInvoicePdf({
      ...invoiceInput,
      settings: {
        company: {
          address: "Carrera 80 # 10-20",
          city: "Medellin",
          document: "901222333-4",
          email: "facturas@la80.com",
          logoDataUri: "data:image/png;base64,logo",
          name: "Comercial La 80",
          phone: "3001234567"
        },
        invoice: {
          accentColor: "#2563eb",
          legalNote: "Nota legal propia",
          observations: "Observacion propia",
          title: "CUENTA DE COBRO"
        }
      }
    });

    const renderedText = textMock.mock.calls
      .map((call) => String(call[0]))
      .join(" ");

    expect(renderedText).toContain("Comercial La 80");
    expect(renderedText).toContain("901222333-4");
    expect(renderedText).toContain("CUENTA DE COBRO");
    expect(renderedText).toContain("Nota legal propia");
    expect(renderedText).toContain("Observacion propia");
    expect(textMock).toHaveBeenCalledWith("Nota legal propia", 12, 261, undefined);
    expect(textMock).toHaveBeenCalledWith("Observacion propia", 8, 292, {
      maxWidth: 194
    });
    expect(setFillColorMock).toHaveBeenCalledWith(37, 99, 235);
    expect(addImageMock).toHaveBeenCalledWith(
      "data:image/png;base64,logo",
      "PNG",
      18,
      15,
      24,
      24
    );
  });

  it("shows complete bank instructions in larger text beside the total", () => {
    const note = "Banco de ejemplo - Cuenta de ahorros\nTitular: Comercial La 80\nNumero de cuenta: 00000012345678901234567890";
    generateInvoicePdf({ ...invoiceInput, footerNote: note });
    expect(splitTextToSizeMock).toHaveBeenCalledWith(note, 110);
    expect(setFontSizeMock).toHaveBeenCalledWith(11);
    expect(textMock).toHaveBeenCalledWith("Banco de ejemplo - Cuenta de ahorros", 12, 251, undefined);
    expect(textMock).toHaveBeenCalledWith("Numero de cuenta: 00000012345678901234567890", 12, 261, undefined);
    expect(textMock).toHaveBeenCalledWith("Total", 164, 261, { align: "right" });
    expect(addPageMock).not.toHaveBeenCalled();
  });

  it("preserves long legal notes on a continuation page without covering signatures", () => {
    const note = Array.from({ length: 8 }, (_, index) => `Instruccion de pago ${index + 1}`).join("\n");
    generateInvoicePdf({ ...invoiceInput, footerNote: note });
    expect(addPageMock).toHaveBeenCalledOnce();
    expect(textMock).toHaveBeenCalledWith("Nota completa en la siguiente pagina.", 12, 261, undefined);
    expect(textMock).toHaveBeenCalledWith("Instruccion de pago 8", 14, 63, undefined);
  });
});

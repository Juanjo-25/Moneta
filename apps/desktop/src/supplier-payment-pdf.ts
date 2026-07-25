import { jsPDF } from "jspdf";
import type {
  AppSettings,
  SupplierPayableRecord,
  SupplierPaymentRecord
} from "./types";

export type SupplierPaymentPdfInput = {
  payment: SupplierPaymentRecord;
  payable?: SupplierPayableRecord | null | undefined;
  settings?: AppSettings | undefined;
};

export type SupplierPaymentPdfResult = {
  dataUri: string;
  fileName: string;
};

function formatCurrency(minor: number): string {
  const amount = new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: 0
  }).format(minor);

  return `$ ${amount}`;
}

function fieldValue(value: string): string {
  return value.trim() === "" ? "No registrado" : value.trim();
}

function parseHexColor(hex: string): [number, number, number] {
  const normalized = /^#[0-9a-f]{6}$/i.test(hex) ? hex.slice(1) : "475569";

  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16)
  ];
}

function getCompanySettings(settings?: AppSettings) {
  return {
    accentColor: settings?.invoice.accentColor ?? "#475569",
    address: settings?.company.address ?? "Calle 00 # 00-00",
    city: settings?.company.city ?? "Colombia",
    document: settings?.company.document ?? "900.123.456-7",
    email: settings?.company.email ?? "contacto@empresa.com",
    name: settings?.company.name ?? "NOMBRE DE LA EMPRESA S.A.S.",
    phone: settings?.company.phone ?? ""
  };
}

function writeText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  options?: { align?: "left" | "center" | "right"; maxWidth?: number }
) {
  doc.text(text, x, y, options);
}

function fitText(text: string, maxLength: number): string {
  const value = text.trim();

  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

export function buildSupplierPaymentFileName(paymentId: string): string {
  return `abono-proveedor-${paymentId}.pdf`;
}

export function generateSupplierPaymentPdf(
  input: SupplierPaymentPdfInput
): SupplierPaymentPdfResult {
  const doc = new jsPDF({ format: "a4", unit: "mm" });
  const company = getCompanySettings(input.settings);
  const [accentRed, accentGreen, accentBlue] = parseHexColor(company.accentColor);
  const invoiceNumber = input.payable?.invoiceNumber ?? input.payment.purchaseId;
  const originalAmountMinor = input.payable?.originalAmountMinor ?? 0;
  const paidAmountMinor = input.payable?.paidAmountMinor ?? input.payment.amountMinor;
  const balanceMinor = input.payable?.balanceMinor ?? 0;

  doc.setDrawColor(72, 72, 72);
  doc.setTextColor(17, 24, 39);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  writeText(doc, fieldValue(company.name), 105, 18, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  writeText(
    doc,
    `NIT / C.C.: ${fieldValue(company.document)} | ${fieldValue(company.address)} | ${fieldValue(company.city)}`,
    105,
    25,
    { align: "center", maxWidth: 130 }
  );
  writeText(doc, fieldValue(company.email), 105, 31, { align: "center" });

  doc.setFillColor(accentRed, accentGreen, accentBlue);
  doc.rect(14, 42, 182, 12, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  writeText(doc, "COMPROBANTE DE ABONO A PROVEEDOR", 105, 50, {
    align: "center"
  });

  doc.setTextColor(17, 24, 39);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  writeText(doc, `No. ${input.payment.id}`, 14, 66);
  writeText(doc, `Fecha: ${input.payment.paidAtLabel}`, 132, 66);
  writeText(doc, `Proveedor: ${fitText(input.payment.supplierName, 58)}`, 14, 77);
  writeText(doc, `Factura proveedor: ${invoiceNumber}`, 14, 87);
  writeText(doc, `Referencia compra: ${input.payment.purchaseId}`, 14, 97);

  const tableTop = 112;
  const pageLeft = 14;
  const pageRight = 196;
  const pageWidth = pageRight - pageLeft;

  doc.setFillColor(accentRed, accentGreen, accentBlue);
  doc.rect(pageLeft, tableTop, pageWidth, 8, "F");
  doc.rect(pageLeft, tableTop, pageWidth, 58);
  doc.line(112, tableTop, 112, tableTop + 58);
  doc.line(pageLeft, tableTop + 8, pageRight, tableTop + 8);
  doc.line(pageLeft, tableTop + 20, pageRight, tableTop + 20);
  doc.line(pageLeft, tableTop + 32, pageRight, tableTop + 32);
  doc.line(pageLeft, tableTop + 44, pageRight, tableTop + 44);

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  writeText(doc, "Concepto", 18, tableTop + 5.5);
  writeText(doc, "Valor", 190, tableTop + 5.5, { align: "right" });

  doc.setTextColor(17, 24, 39);
  doc.setFont("helvetica", "normal");
  writeText(doc, "Valor abonado", 18, tableTop + 16);
  writeText(doc, formatCurrency(input.payment.amountMinor), 190, tableTop + 16, {
    align: "right"
  });
  writeText(doc, "Total factura", 18, tableTop + 28);
  writeText(doc, formatCurrency(originalAmountMinor), 190, tableTop + 28, {
    align: "right"
  });
  writeText(doc, "Total abonado acumulado", 18, tableTop + 40);
  writeText(doc, formatCurrency(paidAmountMinor), 190, tableTop + 40, {
    align: "right"
  });
  writeText(doc, "Saldo pendiente despues del abono", 18, tableTop + 52);
  writeText(doc, formatCurrency(balanceMinor), 190, tableTop + 52, {
    align: "right"
  });

  doc.line(24, 226, 84, 226);
  doc.line(126, 226, 186, 226);
  doc.setFontSize(8);
  writeText(doc, "ELABORADO POR", 54, 232, { align: "center" });
  writeText(doc, "RECIBIDO POR PROVEEDOR", 156, 232, { align: "center" });

  doc.setFontSize(7);
  writeText(
    doc,
    "Documento generado desde Moneta para control interno de tesoreria.",
    pageLeft,
    280,
    { maxWidth: pageWidth }
  );

  return {
    dataUri: doc.output("datauristring"),
    fileName: buildSupplierPaymentFileName(input.payment.id)
  };
}

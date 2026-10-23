import { jsPDF } from "jspdf";
import { parseLocalDate } from "./lib/dates";
import type { AppSettings, PurchaseRecord, SupplierPayableRecord, SupplierRecord } from "./types";
import type { InvoicePdfResult } from "./invoice-pdf";

export type PurchasePdfInput = {
  purchase: PurchaseRecord;
  supplier?: SupplierRecord | undefined;
  payable?: SupplierPayableRecord | undefined;
  settings?: AppSettings | undefined;
};

export function generatePurchasePdf({ purchase, supplier, payable, settings }: PurchasePdfInput): InvoicePdfResult {
  const doc = new jsPDF({ format: "a4", unit: "mm" });
  const money = (value: number) => `$ ${new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(value)}`;
  const date = (value: string) => parseLocalDate(value)?.toLocaleDateString("es-CO") ?? (value || "Sin registrar");
  const accent = /^#[0-9a-f]{6}$/i.test(settings?.invoice.accentColor ?? "") ? settings!.invoice.accentColor : "#475569";
  const left = 8;
  const right = 202;
  const width = right - left;
  const columns = [left, 98, 122, 140, 164, 182, right];
  let y = 0;

  const header = () => {
    doc.setDrawColor(accent);
    doc.setTextColor("#111827");
    const logo = settings?.company.logoDataUri;
    if (logo) {
      try {
        const format = /^data:image\/jpe?g/.test(logo) ? "JPEG" : logo.startsWith("data:image/webp") ? "WEBP" : "PNG";
        doc.addImage(logo, format, 10, 14, 25, 25);
      } catch {
        doc.rect(10, 14, 25, 25);
      }
    } else {
      doc.rect(10, 14, 25, 25);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text("Logo", 22.5, 28, { align: "center" });
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    const companyName = doc.splitTextToSize(settings?.company.name || "Moneta", 88) as string[];
    companyName.forEach((line, index) => doc.text(line, 84, 18 + index * 5, { align: "center" }));
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    let companyY = 18 + companyName.length * 5;
    const companyDetails = [
      settings?.company.document ? `NIT / C.C.: ${settings.company.document}` : "",
      [settings?.company.address, settings?.company.city].filter(Boolean).join(" | "),
      [settings?.company.phone, settings?.company.email].filter(Boolean).join(" | ")
    ].filter(Boolean);
    for (const value of companyDetails) {
      const lines = doc.splitTextToSize(value, 88) as string[];
      lines.forEach((line) => { doc.text(line, 84, companyY, { align: "center" }); companyY += 4; });
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("FACTURA DE COMPRA", 168.5, 19, { align: "center" });
    const number = purchase.invoiceNumber || "Sin numero";
    doc.setFontSize(26);
    const numberSize = Math.max(16, Math.min(26, 26 * 59 / Math.max(1, doc.getTextWidth(number))));
    doc.setFontSize(numberSize);
    const numberLines = doc.splitTextToSize(number, 59) as string[];
    const numberLineHeight = numberSize * 0.42;
    numberLines.forEach((line, index) => doc.text(line, 168.5, 32 + index * numberLineHeight, { align: "center" }));
    const numberBottom = Math.max(43, 36 + (numberLines.length - 1) * numberLineHeight);
    doc.rect(135, 11, 67, numberBottom - 11);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    return Math.max(48, companyY + 6, numberBottom + 5);
  };

  const newPage = () => { doc.addPage(); y = header(); };
  const ensureSpace = (height: number) => {
    if (y + height <= 275) return false;
    newPage();
    return true;
  };
  y = header();

  const supplierTop = y;
  const supplierFields: Array<[string, string]> = [
    ["PROVEEDOR", purchase.supplierName],
    ["NIT / C.C.", supplier?.document ?? ""],
    ["DIRECCION", [supplier?.address, supplier?.city].filter(Boolean).join(" | ")],
    ["CONTACTO", [supplier?.phone, supplier?.email].filter(Boolean).join(" | ")]
  ];
  for (const [label, value] of supplierFields) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    const valueLines = doc.splitTextToSize(value || "Sin registrar", 102) as string[];
    const rowHeight = Math.max(7, valueLines.length * 4 + 3);
    ensureSpace(rowHeight);
    doc.setDrawColor(accent);
    doc.setFillColor(accent);
    doc.rect(left, y, 30, rowHeight, "F");
    doc.rect(left, y, 140, rowHeight);
    doc.setTextColor("#ffffff");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text(label, 23, y + 5, { align: "center" });
    doc.setTextColor("#111827");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    valueLines.forEach((line, index) => doc.text(line, 41, y + 5 + index * 4));
    y += rowHeight;
  }
  const dates: Array<[string, string]> = [
    ["FECHA DE EMISION", date(purchase.issuedAt)],
    ["FECHA DE VENCIMIENTO", purchase.paymentStatus === "paid" ? "No aplica" : date(payable?.dueAt || purchase.dueAt)]
  ];
  dates.forEach(([label, value], index) => {
    const top = supplierTop + index * 14;
    doc.setDrawColor(accent);
    doc.setFillColor(accent);
    doc.rect(150, top, 52, 7, "F");
    doc.rect(150, top, 52, 14);
    doc.setTextColor("#ffffff");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text(label, 176, top + 4.8, { align: "center" });
    doc.setTextColor("#111827");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(value, 176, top + 12, { align: "center" });
  });
  y = Math.max(y, supplierTop + 28) + 6;
  const metadata = [
    `Sucursal: ${purchase.branch || "Principal"} | Moneda: ${purchase.currency} | Compra ${purchase.paymentStatus === "paid" ? "pagada" : "pendiente"}`,
    `Concepto: ${purchase.concept || "Factura de compra"}`
  ];
  for (const value of metadata) {
    const lines = doc.splitTextToSize(value, width) as string[];
    for (const line of lines) {
      ensureSpace(6);
      doc.text(line, left, y);
      y += 4;
    }
    y += 3;
  }
  y += 2;

  const tableFrame = (top: number, height: number) => {
    doc.setDrawColor(accent);
    doc.rect(left, top, width, height);
    columns.slice(1, -1).forEach((x) => doc.line(x, top, x, top + height));
  };
  const tableHeader = () => {
    doc.setFillColor(accent);
    doc.rect(left, y, width, 8, "F");
    doc.setTextColor("#ffffff");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Producto / unidad", 12, y + 5.5);
    doc.text("Costo unit.", 120, y + 5.5, { align: "right" });
    doc.text("Cant.", 131, y + 5.5, { align: "center" });
    doc.text("Descuento", 162, y + 5.5, { align: "right" });
    doc.text("Impuesto", 180, y + 5.5, { align: "right" });
    doc.text("Total", 200, y + 5.5, { align: "right" });
    doc.setTextColor("#111827");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    y += 8;
  };
  ensureSpace(26);
  tableHeader();
  const lines = purchase.lines.length > 0 ? purchase.lines : [{
    productName: purchase.productName, unit: "Sin registrar", quantity: purchase.quantity,
    unitCostMinor: purchase.unitCostMinor, discountMinor: 0, discountPercent: 0,
    taxMinor: 0, taxPercent: 0, totalMinor: purchase.totalMinor
  }];
  for (const line of lines) {
    const description = doc.splitTextToSize(`${line.productName}\n${line.unit}`, 84) as string[];
    const completeRowHeight = Math.max(14, description.length * 4 + 5);
    if (line === lines.at(-1) && completeRowHeight <= 170 && y + completeRowHeight > 232) {
      newPage();
      tableHeader();
    }
    let firstChunk = true;
    for (let offset = 0; offset < description.length;) {
      if (ensureSpace(14)) tableHeader();
      const count = Math.max(1, Math.floor((275 - y - 5) / 4));
      const chunk = description.slice(offset, offset + count);
      const height = Math.max(14, chunk.length * 4 + 5);
      tableFrame(y, height);
      chunk.forEach((value, index) => doc.text(value, 12, y + 5 + index * 4));
      if (firstChunk) {
        doc.text(money(line.unitCostMinor), 120, y + 5, { align: "right", maxWidth: 20 });
        doc.text(String(line.quantity), 131, y + 5, { align: "center" });
        doc.text(purchase.lines.length > 0 ? [money(line.discountMinor), `${line.discountPercent}%`] : "Sin desglose", 162, y + 5, { align: "right", maxWidth: 20 });
        doc.text(purchase.lines.length > 0 ? [money(line.taxMinor), `${line.taxPercent}%`] : "Sin desglose", 180, y + 5, { align: "right", maxWidth: 14 });
        doc.text(money(line.totalMinor), 200, y + 5, { align: "right", maxWidth: 16 });
      }
      y += height;
      offset += chunk.length;
      firstChunk = false;
    }
  }

  if (y > 232) newPage();
  if (y < 232) {
    tableFrame(y, 232 - y);
    y = 232;
  }
  const summaryY = y + 6;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("ESTADO DE LA COMPRA", 12, summaryY + 2);
  doc.setFont("helvetica", "normal");
  doc.text(purchase.paymentStatus === "paid" ? "Pagada" : "Pendiente", 12, summaryY + 9);
  if (payable) {
    doc.text(`Abonos registrados: ${money(payable.paidAmountMinor)}`, 12, summaryY + 17);
    doc.setFont("helvetica", "bold");
    doc.text(`Saldo pendiente: ${money(payable.balanceMinor)}`, 12, summaryY + 24);
  }
  doc.setFont("helvetica", "normal");
  if (purchase.lines.length > 0) {
    const totals: Array<[string, number]> = [
      ["Subtotal", purchase.lines.reduce((sum, line) => sum + line.subtotalMinor, 0)],
      ["Descuentos", purchase.lines.reduce((sum, line) => sum + line.discountMinor, 0)],
      ["Impuestos", purchase.lines.reduce((sum, line) => sum + line.taxMinor, 0)]
    ];
    totals.forEach(([label, amount], index) => {
      doc.text(label, 165, summaryY + index * 7, { align: "right" });
      doc.text(money(amount), 200, summaryY + index * 7, { align: "right" });
    });
  }
  doc.setFillColor(accent);
  doc.rect(128, summaryY + 18, 74, 9, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor("#ffffff");
  doc.text("Total compra", 165, summaryY + 24, { align: "right" });
  doc.text(money(purchase.totalMinor), 200, summaryY + 24, { align: "right" });
  doc.setTextColor("#111827");
  doc.setDrawColor("#484848");
  const signatureY = summaryY + 38;
  doc.line(18, signatureY, 78, signatureY);
  doc.line(126, signatureY, 186, signatureY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("ELABORADO POR", 48, signatureY + 5, { align: "center" });
  doc.text("RECIBIDO / VERIFICADO", 156, signatureY + 5, { align: "center" });

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor("#475569");
    doc.text("Documento de compra registrado en Moneta.", left, 287);
    doc.text(`${page} / ${pages}`, right, 287, { align: "right" });
  }
  return {
    dataUri: doc.output("datauristring"),
    fileName: `compra-${(purchase.invoiceNumber || purchase.id).replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`
  };
}

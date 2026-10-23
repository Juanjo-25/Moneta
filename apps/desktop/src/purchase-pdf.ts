import { jsPDF } from "jspdf";
import { parseLocalDate } from "./lib/dates";
import type { AppSettings, PurchaseRecord, SupplierPayableRecord, SupplierRecord } from "./types";
import type { InvoicePdfResult } from "./invoice-pdf";

type PurchasePdfInput = {
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
  const text = (value: string, x: number, y: number, width: number) => {
    const lines = doc.splitTextToSize(value, width) as string[];
    doc.text(lines, x, y);
    return Math.max(1, lines.length) * 4;
  };
  let y = 18;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  y += text(settings?.company.name || "Moneta", 14, y, 182) + 3;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const companyDetails = [settings?.company.document, settings?.company.address, settings?.company.city, settings?.company.phone, settings?.company.email].filter(Boolean).join(" | ");
  if (companyDetails) y += text(companyDetails, 14, y, 182) + 3;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  y += text(`FACTURA DE COMPRA ${purchase.invoiceNumber}`, 14, y + 4, 182) + 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const metadata = [
    `Proveedor: ${purchase.supplierName}`,
    supplier ? [supplier.document && `NIT / C.C.: ${supplier.document}`, supplier.address, supplier.city].filter(Boolean).join(" | ") : "",
    `Emision: ${date(purchase.issuedAt)} | Vencimiento: ${purchase.paymentStatus === "paid" ? "No aplica" : date(payable?.dueAt || purchase.dueAt)}`,
    `Sucursal: ${purchase.branch || "Principal"} | Moneda: ${purchase.currency} | ${purchase.paymentStatus === "paid" ? "Pagada" : "Pendiente"}`,
    `Concepto: ${purchase.concept || "Factura de compra"}`
  ].filter(Boolean);
  const ensureSpace = (height: number) => {
    if (y + height <= 275) return false;
    doc.addPage();
    y = 18;
    return true;
  };
  for (const value of metadata) {
    const wrapped = doc.splitTextToSize(value, 182) as string[];
    for (const line of wrapped) {
      ensureSpace(6);
      doc.text(line, 14, y);
      y += 4;
    }
    y += 3;
  }
  y += 4;
  const tableHeader = () => {
    doc.setFillColor(accent);
    doc.rect(14, y, 182, 9, "F");
    doc.setTextColor("#ffffff");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Producto / unidad", 16, y + 6);
    doc.text("Cant.", 85, y + 6, { align: "right" });
    doc.text("Costo unit.", 112, y + 6, { align: "right" });
    doc.text("Descuento", 139, y + 6, { align: "right" });
    doc.text("Impuesto", 165, y + 6, { align: "right" });
    doc.text("Total", 194, y + 6, { align: "right" });
    doc.setTextColor("#111827");
    doc.setFont("helvetica", "normal");
    y += 9;
  };
  ensureSpace(24);
  tableHeader();
  const lines = purchase.lines.length > 0 ? purchase.lines : [{
    productName: purchase.productName, unit: "Sin registrar", quantity: purchase.quantity,
    unitCostMinor: purchase.unitCostMinor, discountMinor: 0, discountPercent: 0,
    taxMinor: 0, taxPercent: 0, totalMinor: purchase.totalMinor
  }];
  for (const line of lines) {
    const description = doc.splitTextToSize(`${line.productName}\n${line.unit}`, 58) as string[];
    // Split unusually long descriptions across pages while retaining the amounts once.
    let firstChunk = true;
    for (let offset = 0; offset < description.length;) {
      if (ensureSpace(17)) tableHeader();
      const count = Math.max(1, Math.floor((275 - y - 7) / 4));
      const chunk = description.slice(offset, offset + count);
      const height = Math.max(17, chunk.length * 4 + 7);
      doc.text(chunk, 16, y + 5);
      if (firstChunk) {
        doc.text(String(line.quantity), 85, y + 5, { align: "right" });
        doc.text(money(line.unitCostMinor), 112, y + 5, { align: "right" });
        doc.text(purchase.lines.length > 0 ? [money(line.discountMinor), `${line.discountPercent}%`] : "Sin desglose", 139, y + 5, { align: "right" });
        doc.text(purchase.lines.length > 0 ? [money(line.taxMinor), `${line.taxPercent}%`] : "Sin desglose", 165, y + 5, { align: "right" });
        doc.text(money(line.totalMinor), 194, y + 5, { align: "right" });
      }
      y += height;
      doc.setDrawColor("#e2e8f0");
      doc.line(14, y, 196, y);
      offset += chunk.length;
      firstChunk = false;
    }
  }
  const totals: Array<[string, number]> = [];
  if (purchase.lines.length > 0) {
    totals.push(
      ["Subtotal", purchase.lines.reduce((sum, line) => sum + line.subtotalMinor, 0)],
      ["Descuentos", purchase.lines.reduce((sum, line) => sum + line.discountMinor, 0)],
      ["Impuestos", purchase.lines.reduce((sum, line) => sum + line.taxMinor, 0)]
    );
  }
  totals.push(["Total compra", purchase.totalMinor]);
  if (payable) totals.push(["Abonos registrados", payable.paidAmountMinor], ["Saldo pendiente", payable.balanceMinor]);
  ensureSpace(totals.length * 7 + 10);
  y += 9;
  doc.setFontSize(10);
  for (const [label, amount] of totals) {
    doc.setFont("helvetica", label === "Total compra" ? "bold" : "normal");
    doc.text(label, 114, y);
    doc.text(money(amount), 194, y, { align: "right" });
    y += 7;
  }
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Documento de compra registrado en Moneta.", 14, 287);
    doc.text(`${page} / ${pages}`, 196, 287, { align: "right" });
  }
  return {
    dataUri: doc.output("datauristring"),
    fileName: `compra-${(purchase.invoiceNumber || purchase.id).replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`
  };
}

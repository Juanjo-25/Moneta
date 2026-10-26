import { jsPDF } from "jspdf";
import { formatCurrency } from "./lib/formatters";
import { validateQuotation } from "./lib/quotations";
import type { InvoicePdfResult } from "./invoice-pdf";
import type { AppSettings, QuotationRecord } from "./types";

export function generateQuotationPdf({
  quotation,
  settings
}: {
  quotation: QuotationRecord;
  settings: AppSettings;
}): InvoicePdfResult {
  const error = validateQuotation(quotation);
  if (error) throw new Error(error);
  const doc = new jsPDF({ format: "a4", unit: "mm" });
  const accent = /^#[0-9a-f]{6}$/i.test(settings.invoice.accentColor)
    ? settings.invoice.accentColor
    : "#475569";
  const left = 14;
  const right = 196;
  const width = right - left;
  let y = 0;
  const header = () => {
    doc.setTextColor("#111827");
    let companyX = left;
    if (settings.company.logoDataUri) {
      try {
        const format = /^data:image\/jpe?g/i.test(settings.company.logoDataUri)
          ? "JPEG"
          : settings.company.logoDataUri.startsWith("data:image/webp")
            ? "WEBP"
            : "PNG";
        doc.addImage(settings.company.logoDataUri, format, left, 14, 20, 20);
        companyX += 25;
      } catch {
        /* The document remains printable if a saved logo is invalid. */
      }
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    const nameLines = doc.splitTextToSize(
      settings.company.name || "Empresa",
      120 - (companyX - left)
    ) as string[];
    doc.text(nameLines, companyX, 19);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const contact = [
      settings.company.document && `NIT / C.C.: ${settings.company.document}`,
      settings.company.address,
      settings.company.city,
      [settings.company.phone, settings.company.email]
        .filter(Boolean)
        .join(" | ")
    ]
      .filter(Boolean)
      .join("\n");
    const contactLines = doc.splitTextToSize(
      contact,
      120 - (companyX - left)
    ) as string[];
    const contactY = 20 + nameLines.length * 5;
    doc.text(contactLines, companyX, contactY);
    doc.setTextColor(accent);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("COTIZACIÓN", right, 19, { align: "right" });
    doc.setFontSize(11);
    doc.text(quotation.quotationNumber, right, 27, { align: "right" });
    y = Math.max(40, contactY + contactLines.length * 4 + 5);
    doc.setDrawColor(accent);
    doc.line(left, y - 3, right, y - 3);
    doc.setFont("helvetica", "normal");
    doc.setTextColor("#111827");
    doc.setFontSize(9);
  };
  const newPage = () => {
    doc.addPage();
    header();
  };
  const ensureSpace = (height: number) => {
    if (y + height <= 273) return false;
    newPage();
    return true;
  };
  const paragraph = (text: string, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    const lines = doc.splitTextToSize(text, width) as string[];
    for (const line of lines) {
      ensureSpace(6);
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.text(line, left, y + 4);
      y += 5;
    }
    y += 2;
  };
  header();
  paragraph(`Cliente: ${quotation.customer.name}`, true);
  paragraph(`NIT / C.C.: ${quotation.customer.document}`);
  const address = [
    quotation.customer.address,
    quotation.customer.city,
    quotation.customer.email
  ]
    .filter(Boolean)
    .join(" | ");
  if (address) paragraph(address);
  paragraph(
    `Fecha de elaboración: ${quotation.issuedAt}     Válida hasta: ${quotation.validUntil}`
  );
  if (quotation.seller.trim()) paragraph(`Vendedor: ${quotation.seller}`);
  y += 4;

  const tableHeader = () => {
    doc.setFillColor(accent);
    doc.rect(left, y, width, 8, "F");
    doc.setTextColor("#ffffff");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Producto / unidad", 17, y + 5.5);
    doc.text("Cant.", 102, y + 5.5, { align: "center" });
    doc.text("Precio unit.", 137, y + 5.5, { align: "right" });
    doc.text("Dto. %", 154, y + 5.5, { align: "right" });
    doc.text("IVA %", 171, y + 5.5, { align: "right" });
    doc.text("Total", 193, y + 5.5, { align: "right" });
    doc.setTextColor("#111827");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    y += 8;
  };
  ensureSpace(25);
  tableHeader();
  for (const line of quotation.lines) {
    const description = doc.splitTextToSize(
      `${line.productName}\n${line.unit}`,
      75
    ) as string[];
    const rowHeight = Math.max(14, description.length * 4 + 5);
    if (rowHeight <= 220 && ensureSpace(rowHeight)) tableHeader();
    for (let offset = 0; offset < description.length; ) {
      if (ensureSpace(14)) tableHeader();
      const count = Math.max(1, Math.floor((273 - y - 5) / 4));
      const chunk = description.slice(offset, offset + count);
      const height = Math.max(14, chunk.length * 4 + 5);
      doc.setDrawColor("#d8dee5");
      doc.rect(left, y, width, height);
      [95, 110, 139, 157, 174].forEach((x) => doc.line(x, y, x, y + height));
      chunk.forEach((value, index) => doc.text(value, 17, y + 5 + index * 4));
      if (offset === 0) {
        doc.text(String(line.quantity), 102, y + 5, {
          align: "center",
          maxWidth: 12
        });
        doc.text(formatCurrency(line.unitPriceMinor), 137, y + 5, {
          align: "right",
          maxWidth: 25
        });
        doc.text(`${line.discountPercent}%`, 154, y + 5, { align: "right" });
        doc.text(`${line.taxPercent}%`, 171, y + 5, { align: "right" });
        doc.text(formatCurrency(line.totalMinor), 193, y + 5, {
          align: "right",
          maxWidth: 17
        });
      }
      y += height;
      offset += chunk.length;
    }
  }
  ensureSpace(43);
  y += 7;
  doc.setFontSize(9);
  const totals: Array<[string, number]> = [
    [
      "Subtotal",
      quotation.lines.reduce((sum, line) => sum + line.subtotalMinor, 0)
    ],
    [
      "Descuentos",
      quotation.lines.reduce((sum, line) => sum + line.discountMinor, 0)
    ],
    ["Impuestos", quotation.lines.reduce((sum, line) => sum + line.taxMinor, 0)]
  ];
  for (const [label, amount] of totals) {
    doc.text(label, 159, y, { align: "right" });
    doc.text(formatCurrency(amount), 193, y, { align: "right" });
    y += 7;
  }
  doc.setFillColor(accent);
  doc.rect(119, y - 4, 77, 9, "F");
  doc.setTextColor("#ffffff");
  doc.setFont("helvetica", "bold");
  doc.text("Total cotizado", 159, y + 2, { align: "right" });
  doc.text(formatCurrency(quotation.totalMinor), 193, y + 2, {
    align: "right",
    maxWidth: 31
  });
  y += 17;
  doc.setTextColor("#111827");
  if (quotation.observations.trim()) {
    ensureSpace(16);
    paragraph("Observaciones y condiciones", true);
    paragraph(quotation.observations);
  }
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor("#64748b");
    doc.text(
      "Cotización comercial. No constituye factura ni comprobante de pago.",
      left,
      287
    );
    doc.text(`${page} / ${pages}`, right, 287, { align: "right" });
  }
  return {
    dataUri: doc.output("datauristring"),
    fileName: `cotizacion-${quotation.quotationNumber}.pdf`
  };
}

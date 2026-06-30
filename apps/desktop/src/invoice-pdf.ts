import { jsPDF } from "jspdf";

export type InvoicePaymentStatus = "paid" | "pending";

export type InvoiceCustomer = {
  name: string;
  document: string;
  address: string;
  city: string;
  email: string;
};

export type InvoicePdfInput = {
  customer: InvoiceCustomer;
  invoiceNumber: string;
  issueDate: string;
  item: {
    description: string;
    quantity: number;
    unitPriceMinor: number;
    totalMinor: number;
  };
  paymentStatus: InvoicePaymentStatus;
};

export type InvoicePdfResult = {
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

export function buildInvoiceFileName(invoiceNumber: string): string {
  return `factura-${invoiceNumber}.pdf`;
}

export function buildInvoicePaymentLabel(status: InvoicePaymentStatus): string {
  return status === "paid" ? "Contado" : "Credito";
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

export function generateInvoicePdf(input: InvoicePdfInput): InvoicePdfResult {
  const doc = new jsPDF({ format: "letter", unit: "mm" });
  const paymentLabel = buildInvoicePaymentLabel(input.paymentStatus);
  const subtotal = formatCurrency(input.item.totalMinor);
  const total = formatCurrency(input.item.totalMinor);
  const unitPrice = formatCurrency(input.item.unitPriceMinor);

  doc.setFillColor(15, 118, 110);
  doc.rect(0, 0, 216, 20, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  writeText(doc, "NOMBRE DE LA EMPRESA S.A.S.", 14, 12);
  doc.setFontSize(9);
  writeText(
    doc,
    "NIT: 900.123.456-7 | Calle 00 # 00-00 | contacto@empresa.com",
    14,
    17
  );

  doc.setTextColor(17, 24, 39);
  doc.setFontSize(18);
  writeText(doc, "FACTURA DE VENTA", 142, 33);
  doc.setFontSize(11);
  writeText(doc, `No. ${input.invoiceNumber}`, 142, 40);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  writeText(doc, `Fecha emision: ${input.issueDate}`, 14, 33);
  writeText(doc, `Fecha vencimiento: ${input.issueDate}`, 14, 39);
  writeText(doc, `Forma de pago: ${paymentLabel}`, 14, 45);
  writeText(doc, "Moneda: COP - Peso Colombiano", 14, 51);

  doc.setDrawColor(216, 222, 229);
  doc.line(14, 58, 202, 58);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  writeText(doc, "ADQUIRIENTE", 14, 68);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  writeText(doc, `Razon social: ${fieldValue(input.customer.name)}`, 14, 76);
  writeText(doc, `NIT / C.C.: ${fieldValue(input.customer.document)}`, 14, 83);
  writeText(doc, `Direccion: ${fieldValue(input.customer.address)}`, 14, 90);
  writeText(doc, `Ciudad: ${fieldValue(input.customer.city)}`, 114, 90);
  writeText(doc, `Email: ${fieldValue(input.customer.email)}`, 14, 97);

  doc.setFont("helvetica", "bold");
  doc.setFillColor(238, 242, 247);
  doc.rect(14, 110, 188, 10, "F");
  writeText(doc, "Descripcion", 17, 117);
  writeText(doc, "Cant.", 88, 117);
  writeText(doc, "Vr. Unitario", 108, 117);
  writeText(doc, "IVA %", 145, 117);
  writeText(doc, "IVA $", 162, 117);
  writeText(doc, "Total", 184, 117);

  doc.setFont("helvetica", "normal");
  doc.rect(14, 120, 188, 16);
  writeText(doc, input.item.description, 17, 130, { maxWidth: 66 });
  writeText(doc, String(input.item.quantity), 91, 130);
  writeText(doc, unitPrice, 108, 130);
  writeText(doc, "0%", 146, 130);
  writeText(doc, "$ 0", 162, 130);
  writeText(doc, total, 181, 130);

  doc.setFont("helvetica", "normal");
  writeText(doc, `Subtotal (sin IVA): ${subtotal}`, 138, 150);
  writeText(doc, "Total IVA: $ 0", 138, 158);
  writeText(doc, "Descuentos: $ 0", 138, 166);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  writeText(doc, `TOTAL A PAGAR: ${total}`, 138, 176);

  doc.setFontSize(10);
  writeText(doc, "INFORMACION LEGAL - DIAN", 14, 154);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  writeText(
    doc,
    "Plantilla visual imprimible. No corresponde a una factura electronica DIAN ni incluye CUFE real.",
    14,
    162,
    { maxWidth: 100 }
  );
  writeText(
    doc,
    "Observaciones: factura generada desde Moneta para impresion.",
    14,
    178,
    { maxWidth: 100 }
  );

  doc.line(14, 222, 78, 222);
  doc.setFont("helvetica", "bold");
  writeText(doc, "Firma autorizada", 14, 229);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  writeText(
    doc,
    "NOMBRE DE LA EMPRESA S.A.S. - NIT 900.123.456-7 - Colombia",
    108,
    254,
    { align: "center" }
  );

  return {
    dataUri: doc.output("datauristring"),
    fileName: buildInvoiceFileName(input.invoiceNumber)
  };
}

import { jsPDF } from "jspdf";

export type InvoicePaymentStatus = "paid" | "pending";

export type InvoiceCustomer = {
  name: string;
  document: string;
  address: string;
  city: string;
  email: string;
};

export type InvoiceItem = {
  description: string;
  quantity: number;
  unitPriceMinor: number;
  totalMinor: number;
};

export type InvoiceCompanySettings = {
  name: string;
  document: string;
  address: string;
  city: string;
  email: string;
  phone: string;
  logoDataUri: string;
};

export type InvoiceDesignSettings = {
  accentColor: string;
  title: string;
  legalNote: string;
  observations: string;
};

export type InvoiceSettings = {
  company: InvoiceCompanySettings;
  invoice: InvoiceDesignSettings;
};

export type InvoicePdfInput = {
  customer: InvoiceCustomer;
  invoiceNumber: string;
  issueDate: string;
  item?: InvoiceItem;
  items?: InvoiceItem[];
  paymentStatus: InvoicePaymentStatus;
  settings?: InvoiceSettings | undefined;
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

function parseHexColor(hex: string): [number, number, number] {
  const normalized = /^#[0-9a-f]{6}$/i.test(hex) ? hex.slice(1) : "475569";

  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16)
  ];
}

function getInvoiceSettings(settings?: InvoiceSettings): InvoiceSettings {
  return {
    company: {
      address: settings?.company.address ?? "Calle 00 # 00-00",
      city: settings?.company.city ?? "Colombia",
      document: settings?.company.document ?? "900.123.456-7",
      email: settings?.company.email ?? "contacto@empresa.com",
      logoDataUri: settings?.company.logoDataUri ?? "",
      name: settings?.company.name ?? "NOMBRE DE LA EMPRESA S.A.S.",
      phone: settings?.company.phone ?? ""
    },
    invoice: {
      accentColor: settings?.invoice.accentColor ?? "#475569",
      legalNote:
        settings?.invoice.legalNote ??
        "Plantilla visual imprimible. No corresponde a una factura electronica DIAN ni incluye CUFE real.",
      observations:
        settings?.invoice.observations ??
        "Observaciones: factura generada desde Moneta para impresion.",
      title: settings?.invoice.title ?? "REMISION"
    }
  };
}

function getLogoImageFormat(dataUri: string): "PNG" | "JPEG" | "WEBP" {
  if (dataUri.startsWith("data:image/jpeg") || dataUri.startsWith("data:image/jpg")) {
    return "JPEG";
  }

  if (dataUri.startsWith("data:image/webp")) {
    return "WEBP";
  }

  return "PNG";
}

function buildCompanyDocumentLine(company: InvoiceCompanySettings): string {
  return [
    `NIT / C.C.: ${fieldValue(company.document)}`,
    fieldValue(company.address),
    company.phone.trim() === "" ? "" : `Tel: ${company.phone.trim()}`
  ]
    .filter(Boolean)
    .join(" | ");
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

function fitText(text: string, maxLength: number): string {
  const value = text.trim();

  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

export function generateInvoicePdf(input: InvoicePdfInput): InvoicePdfResult {
  const doc = new jsPDF({ format: "a4", unit: "mm" });
  const settings = getInvoiceSettings(input.settings);
  const [accentRed, accentGreen, accentBlue] = parseHexColor(
    settings.invoice.accentColor
  );
  const paymentLabel = buildInvoicePaymentLabel(input.paymentStatus);
  const items = input.items ?? (input.item ? [input.item] : []);
  const totalMinor = items.reduce((total, item) => total + item.totalMinor, 0);
  const subtotal = formatCurrency(totalMinor);
  const total = formatCurrency(totalMinor);
  const hasLogo = settings.company.logoDataUri.trim() !== "";

  doc.setDrawColor(72, 72, 72);
  doc.setTextColor(17, 24, 39);
  doc.setFont("helvetica", "bold");

  if (hasLogo) {
    try {
      doc.addImage(
        settings.company.logoDataUri,
        getLogoImageFormat(settings.company.logoDataUri),
        18,
        15,
        24,
        24
      );
    } catch {
      doc.setDrawColor(accentRed, accentGreen, accentBlue);
      doc.rect(18, 15, 24, 24);
    }
  } else {
    doc.setDrawColor(accentRed, accentGreen, accentBlue);
    doc.rect(18, 15, 24, 24);
    doc.setFontSize(9);
    doc.setTextColor(accentRed, accentGreen, accentBlue);
    writeText(doc, "Logo", 30, 29, { align: "center" });
  }

  doc.setTextColor(17, 24, 39);
  doc.setFontSize(13);
  writeText(doc, fieldValue(settings.company.name), 105, 18, { align: "center" });
  doc.setFontSize(10);
  writeText(doc, buildCompanyDocumentLine(settings.company), 105, 25, {
    align: "center",
    maxWidth: 84
  });
  writeText(doc, fieldValue(settings.company.email), 105, 37, { align: "center" });

  doc.setFontSize(10);
  writeText(doc, fieldValue(settings.invoice.title), 174, 25, { align: "center" });
  doc.setFontSize(12);
  writeText(doc, `No. ${input.invoiceNumber}`, 174, 33, { align: "center" });

  const pageLeft = 8;
  const pageRight = 202;
  const pageWidth = pageRight - pageLeft;
  const clientTop = 48;
  const leftLabelWidth = 34;
  const rightLabelX = 156;
  const rightWidth = pageRight - rightLabelX;
  const rowHeight = 7;

  doc.setFillColor(accentRed, accentGreen, accentBlue);
  doc.rect(pageLeft, clientTop, leftLabelWidth, rowHeight, "F");
  doc.rect(pageLeft, clientTop + rowHeight, leftLabelWidth, rowHeight, "F");
  doc.rect(pageLeft, clientTop + rowHeight * 2, leftLabelWidth, rowHeight, "F");
  doc.rect(pageLeft, clientTop + rowHeight * 3, leftLabelWidth, rowHeight, "F");
  doc.rect(rightLabelX, clientTop, rightWidth, rowHeight, "F");
  doc.rect(rightLabelX, clientTop + rowHeight * 2, rightWidth, rowHeight, "F");
  doc.rect(pageLeft, clientTop, pageWidth, rowHeight * 4);
  doc.line(pageLeft + leftLabelWidth, clientTop, pageLeft + leftLabelWidth, clientTop + rowHeight * 4);
  doc.line(rightLabelX, clientTop, rightLabelX, clientTop + rowHeight * 4);
  doc.line(pageLeft, clientTop + rowHeight, pageRight, clientTop + rowHeight);
  doc.line(pageLeft, clientTop + rowHeight * 2, pageRight, clientTop + rowHeight * 2);
  doc.line(pageLeft, clientTop + rowHeight * 3, pageRight, clientTop + rowHeight * 3);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  writeText(doc, "SENOR(ES)", 25, clientTop + 4.8, { align: "center" });
  writeText(doc, "DIRECCION", 25, clientTop + 11.8, { align: "center" });
  writeText(doc, "CIUDAD", 25, clientTop + 18.8, { align: "center" });
  writeText(doc, "TELEFONO", 25, clientTop + 25.8, { align: "center" });
  doc.setFontSize(6.3);
  writeText(doc, "FECHA DE EXPEDICION", 179, clientTop + 4.8, {
    align: "center"
  });
  writeText(doc, "FECHA DE VENCIMIENTO", 179, clientTop + 18.8, {
    align: "center"
  });
  doc.setTextColor(17, 24, 39);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  writeText(doc, fitText(fieldValue(input.customer.name), 42), 44, clientTop + 5, {
    maxWidth: 108
  });
  writeText(doc, fitText(fieldValue(input.customer.address), 42), 44, clientTop + 12, {
    maxWidth: 108
  });
  writeText(doc, fitText(fieldValue(input.customer.city), 42), 44, clientTop + 19, {
    maxWidth: 108
  });
  writeText(
    doc,
    `Email: ${fitText(fieldValue(input.customer.email), 30)}`,
    44,
    clientTop + 26,
    { maxWidth: 64 }
  );
  writeText(
    doc,
    `CC/NIT ${fitText(fieldValue(input.customer.document), 22)}`,
    118,
    clientTop + 26,
    { maxWidth: 34 }
  );
  writeText(doc, input.issueDate, 179, clientTop + 12, { align: "center" });
  writeText(doc, input.issueDate, 179, clientTop + 26, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  writeText(doc, `Forma de pago: ${paymentLabel}`, pageRight, 82, { align: "right" });

  const tableTop = 87;
  const tableBottom = 239;
  const columns = [pageLeft, 98, 122, 145, 168, pageRight];

  doc.setFillColor(accentRed, accentGreen, accentBlue);
  doc.rect(pageLeft, tableTop, pageWidth, 8, "F");
  doc.rect(pageLeft, tableTop, pageWidth, tableBottom - tableTop);
  columns.slice(1, -1).forEach((x) => doc.line(x, tableTop, x, tableBottom));

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  writeText(doc, "Item", 58, tableTop + 5, { align: "center" });
  writeText(doc, "Precio", 110, tableTop + 5, { align: "center" });
  writeText(doc, "Cantidad", 133, tableTop + 5, { align: "center" });
  writeText(doc, "Descuento", 156, tableTop + 5, { align: "center" });
  writeText(doc, "Total", 180, tableTop + 5, { align: "center" });

  doc.setTextColor(17, 24, 39);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  items.forEach((item, index) => {
    const textY = tableTop + 15 + index * 6;

    if (textY > tableBottom - 8) {
      return;
    }

    writeText(doc, fitText(item.description.toUpperCase(), 38), 20, textY, {
      maxWidth: 74
    });
    writeText(doc, formatCurrency(item.unitPriceMinor), 120, textY, {
      align: "right"
    });
    writeText(doc, String(item.quantity), 133, textY, { align: "center" });
    writeText(doc, "0.00%", 156, textY, { align: "center" });
    writeText(doc, formatCurrency(item.totalMinor), 190, textY, { align: "right" });
  });

  doc.setFillColor(accentRed, accentGreen, accentBlue);
  doc.rect(pageLeft, tableBottom - 7, 112, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  writeText(doc, fitText(fieldValue(settings.invoice.legalNote), 64), 10, tableBottom - 2, {
    maxWidth: 114
  });

  doc.setTextColor(17, 24, 39);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  writeText(doc, "Subtotal", 164, 245, { align: "right" });
  writeText(doc, subtotal, 190, 245, { align: "right" });
  writeText(doc, "IVA (0.00%)", 164, 252, { align: "right" });
  writeText(doc, "$ 0", 190, 252, { align: "right" });
  doc.setFillColor(accentRed, accentGreen, accentBlue);
  doc.rect(134, 256, 58, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  writeText(doc, "Total", 164, 261, { align: "right" });
  writeText(doc, total, 190, 261, { align: "right" });

  doc.setTextColor(17, 24, 39);
  doc.setDrawColor(72, 72, 72);
  doc.line(18, 281, 68, 281);
  doc.line(80, 281, 132, 281);
  doc.setFontSize(8);
  writeText(doc, "ELABORADO POR", 43, 286, { align: "center" });
  writeText(doc, "ACEPTADA, FIRMA Y/O SELLO Y FECHA", 106, 286, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  writeText(doc, fieldValue(settings.invoice.observations), pageLeft, 292, {
    maxWidth: pageWidth
  });

  return {
    dataUri: doc.output("datauristring"),
    fileName: buildInvoiceFileName(input.invoiceNumber)
  };
}

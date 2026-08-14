import { jsPDF } from "jspdf";
import type {
  AppSettings,
  ReceivableRecord,
  SupplierPayableRecord
} from "./types";

export type CarteraPdfInput = {
  generatedAtLabel?: string | undefined;
  receivables: ReceivableRecord[];
  settings?: AppSettings | undefined;
  supplierPayables: SupplierPayableRecord[];
};

export type CarteraPdfResult = {
  dataUri: string;
  fileName: string;
};

type CompanyPrintSettings = {
  accentColor: string;
  address: string;
  city: string;
  document: string;
  email: string;
  name: string;
  phone: string;
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

function fitText(text: string, maxLength: number): string {
  const value = text.trim();

  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function parseHexColor(hex: string): [number, number, number] {
  const normalized = /^#[0-9a-f]{6}$/i.test(hex) ? hex.slice(1) : "475569";

  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16)
  ];
}

function getCompanySettings(settings?: AppSettings): CompanyPrintSettings {
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

function getGeneratedAtLabel(inputLabel?: string): string {
  if (inputLabel?.trim()) {
    return inputLabel.trim();
  }

  return new Date().toLocaleString("es-CO", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

export function buildCarteraFileName(): string {
  return "cartera-pendiente.pdf";
}

function renderPageHeader(
  doc: jsPDF,
  company: CompanyPrintSettings,
  generatedAtLabel: string,
  pageNumber: number
): number {
  const pageLeft = 14;
  const pageRight = 196;

  doc.setTextColor(17, 24, 39);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  writeText(doc, fieldValue(company.name), 105, 18, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  writeText(
    doc,
    `NIT / C.C.: ${fieldValue(company.document)} | ${fieldValue(company.address)} | ${fieldValue(company.city)}`,
    105,
    25,
    { align: "center", maxWidth: 145 }
  );
  writeText(doc, fieldValue(company.email), 105, 31, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  writeText(doc, "CARTERA PENDIENTE", pageLeft, 46);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  writeText(doc, `Generado: ${generatedAtLabel}`, pageLeft, 52);
  writeText(doc, `Pagina ${pageNumber}`, pageRight, 52, { align: "right" });

  return 62;
}

function renderSummaryCard(
  doc: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number
) {
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.rect(x, y, width, 17, "FD");
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  writeText(doc, label, x + 4, y + 6);
  doc.setTextColor(17, 24, 39);
  doc.setFontSize(10);
  writeText(doc, value, x + 4, y + 14, { maxWidth: width - 8 });
}

function renderSectionTitle(
  doc: jsPDF,
  title: string,
  y: number,
  accent: [number, number, number]
): void {
  const [accentRed, accentGreen, accentBlue] = accent;

  doc.setFillColor(accentRed, accentGreen, accentBlue);
  doc.rect(14, y, 182, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  writeText(doc, title, 18, y + 5.5);
}

function renderReceivableHeader(doc: jsPDF, y: number): void {
  doc.setTextColor(17, 24, 39);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  writeText(doc, "Cliente", 16, y + 5);
  writeText(doc, "Venta", 62, y + 5);
  writeText(doc, "Vence", 92, y + 5);
  writeText(doc, "Original", 126, y + 5, { align: "right" });
  writeText(doc, "Recibido", 158, y + 5, { align: "right" });
  writeText(doc, "Saldo", 194, y + 5, { align: "right" });
}

function renderReceivableRow(
  doc: jsPDF,
  receivable: ReceivableRecord,
  y: number
): void {
  doc.setDrawColor(226, 232, 240);
  doc.line(14, y + 7, 196, y + 7);
  doc.setTextColor(17, 24, 39);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  writeText(doc, fitText(receivable.customerName, 26), 16, y + 5, {
    maxWidth: 44
  });
  writeText(doc, fitText(receivable.saleId, 16), 62, y + 5);
  writeText(doc, receivable.dueAt || "Sin fecha", 92, y + 5);
  writeText(doc, formatCurrency(receivable.originalAmountMinor), 126, y + 5, {
    align: "right"
  });
  writeText(doc, formatCurrency(receivable.paidAmountMinor), 158, y + 5, {
    align: "right"
  });
  writeText(doc, formatCurrency(receivable.balanceMinor), 194, y + 5, {
    align: "right"
  });
}

function renderPayableHeader(doc: jsPDF, y: number): void {
  doc.setTextColor(17, 24, 39);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  writeText(doc, "Proveedor", 16, y + 5);
  writeText(doc, "Factura", 62, y + 5);
  writeText(doc, "Vence", 92, y + 5);
  writeText(doc, "Original", 126, y + 5, { align: "right" });
  writeText(doc, "Abonado", 158, y + 5, { align: "right" });
  writeText(doc, "Saldo", 194, y + 5, { align: "right" });
}

function renderPayableRow(
  doc: jsPDF,
  payable: SupplierPayableRecord,
  y: number
): void {
  doc.setDrawColor(226, 232, 240);
  doc.line(14, y + 7, 196, y + 7);
  doc.setTextColor(17, 24, 39);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  writeText(doc, fitText(payable.supplierName, 26), 16, y + 5, {
    maxWidth: 44
  });
  writeText(doc, fitText(payable.invoiceNumber, 16), 62, y + 5);
  writeText(doc, payable.dueAt || "Sin fecha", 92, y + 5);
  writeText(doc, formatCurrency(payable.originalAmountMinor), 126, y + 5, {
    align: "right"
  });
  writeText(doc, formatCurrency(payable.paidAmountMinor), 158, y + 5, {
    align: "right"
  });
  writeText(doc, formatCurrency(payable.balanceMinor), 194, y + 5, {
    align: "right"
  });
}

export function generateCarteraPdf(input: CarteraPdfInput): CarteraPdfResult {
  const doc = new jsPDF({ format: "a4", unit: "mm" });
  const company = getCompanySettings(input.settings);
  const accent = parseHexColor(company.accentColor);
  const generatedAtLabel = getGeneratedAtLabel(input.generatedAtLabel);
  const sortedReceivables = [...input.receivables].sort((left, right) =>
    left.dueAt.localeCompare(right.dueAt)
  );
  const openPayables = input.supplierPayables
    .filter((payable) => payable.balanceMinor > 0)
    .sort((left, right) => left.dueAt.localeCompare(right.dueAt));
  const receivableBalanceMinor = sortedReceivables.reduce(
    (total, receivable) => total + receivable.balanceMinor,
    0
  );
  const payableBalanceMinor = openPayables.reduce(
    (total, payable) => total + payable.balanceMinor,
    0
  );
  let pageNumber = 1;
  let cursorY = renderPageHeader(doc, company, generatedAtLabel, pageNumber);

  function addPage(): void {
    doc.addPage();
    pageNumber += 1;
    cursorY = renderPageHeader(doc, company, generatedAtLabel, pageNumber);
  }

  function ensureSpace(requiredHeight: number): void {
    if (cursorY + requiredHeight > 276) {
      addPage();
    }
  }

  renderSummaryCard(doc, "Total por cobrar", formatCurrency(receivableBalanceMinor), 14, cursorY, 42);
  renderSummaryCard(doc, "Total por pagar", formatCurrency(payableBalanceMinor), 61, cursorY, 42);
  renderSummaryCard(doc, "Cuentas por cobrar", String(sortedReceivables.length), 108, cursorY, 42);
  renderSummaryCard(doc, "Cuentas por pagar", String(openPayables.length), 155, cursorY, 41);
  cursorY += 28;

  ensureSpace(24);
  renderSectionTitle(doc, "Por cobrar", cursorY, accent);
  cursorY += 10;
  renderReceivableHeader(doc, cursorY);
  cursorY += 8;

  if (sortedReceivables.length === 0) {
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    writeText(doc, "Sin cuentas por cobrar abiertas.", 16, cursorY + 5);
    cursorY += 12;
  } else {
    sortedReceivables.forEach((receivable) => {
      ensureSpace(10);
      renderReceivableRow(doc, receivable, cursorY);
      cursorY += 8;
    });
  }

  cursorY += 8;
  ensureSpace(24);
  renderSectionTitle(doc, "Por pagar", cursorY, accent);
  cursorY += 10;
  renderPayableHeader(doc, cursorY);
  cursorY += 8;

  if (openPayables.length === 0) {
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    writeText(doc, "Sin cuentas por pagar abiertas.", 16, cursorY + 5);
    cursorY += 12;
  } else {
    openPayables.forEach((payable) => {
      ensureSpace(10);
      renderPayableRow(doc, payable, cursorY);
      cursorY += 8;
    });
  }

  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  writeText(
    doc,
    "Documento generado desde Moneta para control interno de cartera.",
    14,
    284,
    { maxWidth: 182 }
  );

  return {
    dataUri: doc.output("datauristring"),
    fileName: buildCarteraFileName()
  };
}

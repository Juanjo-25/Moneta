import { jsPDF } from "jspdf";
import type { AppSettings, ProductRecord } from "./types";

export type InventoryPdfInput = {
  generatedAtLabel?: string | undefined;
  products: ProductRecord[];
  settings?: AppSettings | undefined;
};

export type InventoryPdfResult = {
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

export function buildInventoryFileName(): string {
  return "inventario-productos.pdf";
}

function getProductStatus(product: ProductRecord): string {
  if (!product.active) {
    return "Inactivo";
  }

  if (product.stock <= product.minimumStock) {
    return "Bajo stock";
  }

  return "Disponible";
}

function renderPageHeader(
  doc: jsPDF,
  company: CompanyPrintSettings,
  generatedAtLabel: string,
  pageNumber: number
): number {
  const pageLeft = 12;
  const pageRight = 285;
  const pageCenter = 148.5;

  doc.setTextColor(17, 24, 39);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  writeText(doc, fieldValue(company.name), pageCenter, 15, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  writeText(
    doc,
    `NIT / C.C.: ${fieldValue(company.document)} | ${fieldValue(company.address)} | ${fieldValue(company.city)}`,
    pageCenter,
    21,
    { align: "center", maxWidth: 190 }
  );
  writeText(doc, fieldValue(company.email), pageCenter, 26, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  writeText(doc, "INVENTARIO DE PRODUCTOS", pageLeft, 39);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  writeText(doc, `Generado: ${generatedAtLabel}`, pageLeft, 45);
  writeText(doc, `Pagina ${pageNumber}`, pageRight, 45, { align: "right" });

  return 54;
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
  doc.rect(x, y, width, 16, "FD");
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  writeText(doc, label, x + 4, y + 6);
  doc.setTextColor(17, 24, 39);
  doc.setFontSize(9);
  writeText(doc, value, x + 4, y + 13, { maxWidth: width - 8 });
}

function renderTableHeader(
  doc: jsPDF,
  y: number,
  accent: [number, number, number]
): void {
  const [accentRed, accentGreen, accentBlue] = accent;

  doc.setFillColor(accentRed, accentGreen, accentBlue);
  doc.rect(12, y, 273, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  writeText(doc, "Codigo", 15, y + 5.5);
  writeText(doc, "Producto", 43, y + 5.5);
  writeText(doc, "Unidad", 115, y + 5.5);
  writeText(doc, "Costo", 170, y + 5.5, { align: "right" });
  writeText(doc, "Precio venta", 204, y + 5.5, { align: "right" });
  writeText(doc, "Stock", 225, y + 5.5, { align: "right" });
  writeText(doc, "Minimo", 247, y + 5.5, { align: "right" });
  writeText(doc, "Estado", 259, y + 5.5);
}

function renderProductRow(doc: jsPDF, product: ProductRecord, y: number): void {
  doc.setDrawColor(226, 232, 240);
  doc.line(12, y + 7, 285, y + 7);
  doc.setTextColor(17, 24, 39);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  writeText(doc, fitText(product.sku, 16), 15, y + 5);
  writeText(doc, fitText(product.name, 40), 43, y + 5, { maxWidth: 68 });
  writeText(doc, fitText(product.unit, 12), 115, y + 5);
  writeText(doc, formatCurrency(product.costMinor), 170, y + 5, {
    align: "right"
  });
  writeText(doc, formatCurrency(product.salePriceMinor), 204, y + 5, {
    align: "right"
  });
  writeText(doc, String(product.stock), 225, y + 5, { align: "right" });
  writeText(doc, String(product.minimumStock), 247, y + 5, { align: "right" });
  writeText(doc, getProductStatus(product), 259, y + 5);
}

export function generateInventoryPdf(
  input: InventoryPdfInput
): InventoryPdfResult {
  const doc = new jsPDF({ format: "a4", orientation: "landscape", unit: "mm" });
  const company = getCompanySettings(input.settings);
  const accent = parseHexColor(company.accentColor);
  const generatedAtLabel = getGeneratedAtLabel(input.generatedAtLabel);
  const sortedProducts = [...input.products].sort((left, right) =>
    left.name.localeCompare(right.name, "es")
  );
  const activeProducts = sortedProducts.filter((product) => product.active);
  const lowStockCount = sortedProducts.filter(
    (product) => product.active && product.stock <= product.minimumStock
  ).length;
  const totalStock = sortedProducts.reduce((total, product) => total + product.stock, 0);
  const totalCostMinor = sortedProducts.reduce(
    (total, product) => total + product.stock * product.costMinor,
    0
  );
  const totalSaleValueMinor = sortedProducts.reduce(
    (total, product) => total + product.stock * product.salePriceMinor,
    0
  );
  let pageNumber = 1;
  let cursorY = renderPageHeader(doc, company, generatedAtLabel, pageNumber);

  renderSummaryCard(doc, "Productos", String(sortedProducts.length), 12, cursorY, 48);
  renderSummaryCard(doc, "Activos", String(activeProducts.length), 66, cursorY, 48);
  renderSummaryCard(doc, "Bajo stock", String(lowStockCount), 120, cursorY, 48);
  renderSummaryCard(doc, "Costo inventario", formatCurrency(totalCostMinor), 174, cursorY, 52);
  renderSummaryCard(doc, "Valor venta", formatCurrency(totalSaleValueMinor), 232, cursorY, 53);
  cursorY += 25;

  renderTableHeader(doc, cursorY, accent);
  cursorY += 10;

  if (sortedProducts.length === 0) {
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    writeText(doc, "Sin productos registrados.", 12, cursorY + 8);
  }

  sortedProducts.forEach((product) => {
    if (cursorY > 194) {
      doc.addPage();
      pageNumber += 1;
      cursorY = renderPageHeader(doc, company, generatedAtLabel, pageNumber);
      renderTableHeader(doc, cursorY, accent);
      cursorY += 10;
    }

    renderProductRow(doc, product, cursorY);
    cursorY += 8;
  });

  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  writeText(
    doc,
    "Documento generado desde Moneta para control interno de inventario.",
    12,
    204,
    { maxWidth: 273 }
  );

  return {
    dataUri: doc.output("datauristring"),
    fileName: buildInventoryFileName()
  };
}

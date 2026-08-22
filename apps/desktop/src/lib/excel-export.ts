export type ExcelCellValue = boolean | null | number | string | undefined;

export type ExcelWorksheet = {
  name: string;
  rows: ExcelCellValue[][];
};

export type ExcelWorkbook = {
  fileName: string;
  worksheets: ExcelWorksheet[];
};

export type ExcelWorkbookDownload = {
  fileName: string;
  href: string;
};

const EXCEL_NAMESPACE = "urn:schemas-microsoft-com:office:spreadsheet";
const MAX_WORKSHEET_NAME_LENGTH = 31;
const EXCEL_MIME_TYPE = "application/vnd.ms-excel;charset=utf-8";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sanitizeWorksheetName(name: string, fallbackIndex: number): string {
  const sanitized = name.replace(/[\\/?*[\]:]/g, " ").replace(/\s+/g, " ").trim();
  const fallbackName = `Hoja ${fallbackIndex + 1}`;
  const safeName = sanitized || fallbackName;

  return safeName.slice(0, MAX_WORKSHEET_NAME_LENGTH);
}

function normalizeCellValue(value: ExcelCellValue): {
  type: "Number" | "String";
  value: string;
} {
  if (typeof value === "number" && Number.isFinite(value)) {
    return {
      type: "Number",
      value: String(value)
    };
  }

  if (typeof value === "boolean") {
    return {
      type: "String",
      value: value ? "Si" : "No"
    };
  }

  return {
    type: "String",
    value: value == null ? "" : String(value)
  };
}

export function buildExcelWorkbookXml(workbook: ExcelWorkbook): string {
  const worksheets =
    workbook.worksheets.length > 0
      ? workbook.worksheets
      : [{ name: "Datos", rows: [["Sin datos"]] }];

  const worksheetXml = worksheets
    .map((worksheet, worksheetIndex) => {
      const rows = worksheet.rows.length > 0 ? worksheet.rows : [["Sin datos"]];
      const rowXml = rows
        .map((row) => {
          const cellXml = row
            .map((cell) => {
              const normalized = normalizeCellValue(cell);

              return `<Cell><Data ss:Type="${normalized.type}">${escapeXml(
                normalized.value
              )}</Data></Cell>`;
            })
            .join("");

          return `<Row>${cellXml}</Row>`;
        })
        .join("");

      return `<Worksheet ss:Name="${escapeXml(
        sanitizeWorksheetName(worksheet.name, worksheetIndex)
      )}"><Table>${rowXml}</Table></Worksheet>`;
    })
    .join("");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<?mso-application progid="Excel.Sheet"?>',
    `<Workbook xmlns="${EXCEL_NAMESPACE}" xmlns:ss="${EXCEL_NAMESPACE}">`,
    worksheetXml,
    "</Workbook>"
  ].join("");
}

export function buildExcelWorkbookDownload(workbook: ExcelWorkbook): ExcelWorkbookDownload {
  const fileName = workbook.fileName.endsWith(".xls")
    ? workbook.fileName
    : `${workbook.fileName}.xls`;
  const xml = buildExcelWorkbookXml(workbook);

  return {
    fileName,
    href: `data:${EXCEL_MIME_TYPE},${encodeURIComponent(xml)}`
  };
}

export function downloadExcelWorkbook(workbook: ExcelWorkbook): void {
  const fileName = workbook.fileName.endsWith(".xls")
    ? workbook.fileName
    : `${workbook.fileName}.xls`;
  const xml = buildExcelWorkbookXml(workbook);
  const blob = new Blob([xml], {
    type: EXCEL_MIME_TYPE
  });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = fileName;
  link.rel = "noopener";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

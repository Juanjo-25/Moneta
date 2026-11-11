export type ExcelCellValue = boolean | null | number | string | undefined;

export type ExcelWorksheet = {
  name: string;
  rows: ExcelCellValue[][];
  /** Agrega filtros de Excel a la fila de encabezados. */
  autoFilter?: boolean | undefined;
};

export type ExcelWorkbook = {
  fileName: string;
  worksheets: ExcelWorksheet[];
};

export type ExcelWorkbookDownload = {
  fileName: string;
  href: string;
};

export const EXCEL_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const MAX_WORKSHEET_NAME_LENGTH = 31;
const MIN_COLUMN_WIDTH = 8;
const MAX_COLUMN_WIDTH = 70;
const SPREADSHEET_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const RELATIONSHIP_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const PACKAGE_RELATIONSHIP_NS = "http://schemas.openxmlformats.org/package/2006/relationships";

/** Índices de estilos definidos en `buildStylesXml`. */
const STYLE = {
  default: 0,
  header: 1,
  integer: 2,
  currency: 3,
  decimal: 4,
  wrap: 5,
  label: 6
} as const;

export function normalizeExcelFileName(fileName: string): string {
  const trimmed = fileName.trim() || "moneta-exportacion";

  if (/\.xlsx$/i.test(trimmed)) return trimmed;
  if (/\.xls$/i.test(trimmed)) return `${trimmed}x`;
  return `${trimmed}.xlsx`;
}

function escapeXml(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sanitizeWorksheetNames(worksheets: ExcelWorksheet[]): string[] {
  const used = new Set<string>();

  return worksheets.map((worksheet, index) => {
    const sanitized = worksheet.name.replace(/[\\/?*[\]:]/g, " ").replace(/\s+/g, " ").trim();
    const base = (sanitized || `Hoja ${index + 1}`).slice(0, MAX_WORKSHEET_NAME_LENGTH);
    let name = base;
    let suffix = 2;

    while (used.has(name.toLocaleLowerCase("es"))) {
      const tail = ` (${suffix})`;
      name = `${base.slice(0, MAX_WORKSHEET_NAME_LENGTH - tail.length)}${tail}`;
      suffix += 1;
    }

    used.add(name.toLocaleLowerCase("es"));
    return name;
  });
}

function columnLetter(index: number): string {
  let value = index + 1;
  let letters = "";

  while (value > 0) {
    const remainder = (value - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    value = Math.floor((value - 1) / 26);
  }

  return letters;
}

function cellText(value: ExcelCellValue): string {
  if (typeof value === "boolean") return value ? "Si" : "No";
  if (value == null) return "";
  if (typeof value === "number") {
    return Number.isFinite(value) ? new Intl.NumberFormat("es-CO").format(value) : "";
  }
  return String(value);
}

function isBlank(value: ExcelCellValue): boolean {
  return value == null || value === "";
}

function numberStyle(header: ExcelCellValue, value: number): number {
  if (typeof header === "string" && /\bCOP\b/.test(header)) return STYLE.currency;
  return Number.isInteger(value) ? STYLE.integer : STYLE.decimal;
}

function buildColumnWidths(rows: ExcelCellValue[][]): number[] {
  const widths: number[] = [];

  rows.forEach((row, rowIndex) => {
    row.forEach((cell, columnIndex) => {
      const extra = typeof cell === "number" ? 4 : rowIndex === 0 ? 4 : 2;
      const length = cellText(cell).length + extra;
      widths[columnIndex] = Math.max(widths[columnIndex] ?? MIN_COLUMN_WIDTH, length);
    });
  });

  return widths.map((width) => Math.min(Math.max(width, MIN_COLUMN_WIDTH), MAX_COLUMN_WIDTH));
}

function buildWorksheetXml(worksheet: ExcelWorksheet, sheetIndex: number): string {
  const rows = worksheet.rows.length > 0 ? worksheet.rows : [["Sin datos"]];
  const header = rows[0] ?? [];
  const widths = buildColumnWidths(rows);
  const columnCount = Math.max(1, ...rows.map((row) => row.length));

  const rowXml = rows
    .map((row, rowIndex) => {
      const rowNumber = rowIndex + 1;
      const isHeader = rowIndex === 0;
      const isSectionLabel =
        !isHeader && typeof row[0] === "string" && row[0] !== "" && row.slice(1).every(isBlank);

      const cells = row
        .map((cell, columnIndex) => {
          const reference = `${columnLetter(columnIndex)}${rowNumber}`;

          if (typeof cell === "number" && Number.isFinite(cell)) {
            const style = isHeader ? STYLE.header : numberStyle(header[columnIndex], cell);
            return `<c r="${reference}" s="${style}"><v>${cell}</v></c>`;
          }

          const text = cellText(cell);
          if (text === "" && !isHeader) return "";

          const style = isHeader
            ? STYLE.header
            : isSectionLabel && columnIndex === 0
              ? STYLE.label
              : text.length > MAX_COLUMN_WIDTH - 2
                ? STYLE.wrap
                : STYLE.default;

          return `<c r="${reference}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(
            text
          )}</t></is></c>`;
        })
        .join("");

      const height = isHeader ? ' ht="24" customHeight="1"' : "";
      return `<row r="${rowNumber}"${height}>${cells}</row>`;
    })
    .join("");

  const cols = widths
    .map(
      (width, index) =>
        `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`
    )
    .join("");
  const lastCell = `${columnLetter(columnCount - 1)}${rows.length}`;
  const autoFilter =
    worksheet.autoFilter && rows.length > 1 ? `<autoFilter ref="A1:${lastCell}"/>` : "";

  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    `<worksheet xmlns="${SPREADSHEET_NS}" xmlns:r="${RELATIONSHIP_NS}">`,
    `<sheetViews><sheetView workbookViewId="0"${sheetIndex === 0 ? ' tabSelected="1"' : ""}>`,
    '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>',
    "</sheetView></sheetViews>",
    '<sheetFormatPr defaultRowHeight="15"/>',
    cols ? `<cols>${cols}</cols>` : "",
    `<sheetData>${rowXml}</sheetData>`,
    autoFilter,
    '<pageMargins left="0.5" right="0.5" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>',
    "</worksheet>"
  ].join("");
}

function buildStylesXml(): string {
  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    `<styleSheet xmlns="${SPREADSHEET_NS}">`,
    '<numFmts count="3">',
    '<numFmt numFmtId="164" formatCode="#,##0"/>',
    '<numFmt numFmtId="165" formatCode="&quot;$&quot; #,##0"/>',
    '<numFmt numFmtId="166" formatCode="#,##0.0"/>',
    "</numFmts>",
    '<fonts count="3">',
    '<font><sz val="11"/><color rgb="FF1F2937"/><name val="Calibri"/><family val="2"/></font>',
    '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>',
    '<font><b/><sz val="11"/><color rgb="FF0F766E"/><name val="Calibri"/><family val="2"/></font>',
    "</fonts>",
    '<fills count="3">',
    '<fill><patternFill patternType="none"/></fill>',
    '<fill><patternFill patternType="gray125"/></fill>',
    '<fill><patternFill patternType="solid"><fgColor rgb="FF0F766E"/><bgColor indexed="64"/></patternFill></fill>',
    "</fills>",
    '<borders count="2">',
    "<border><left/><right/><top/><bottom/><diagonal/></border>",
    '<border><left/><right/><top/><bottom style="thin"><color rgb="FFE2E8F0"/></bottom><diagonal/></border>',
    "</borders>",
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>',
    '<cellXfs count="7">',
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"><alignment vertical="top"/></xf>',
    '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>',
    '<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"><alignment vertical="top"/></xf>',
    '<xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"><alignment vertical="top"/></xf>',
    '<xf numFmtId="166" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"><alignment vertical="top"/></xf>',
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>',
    '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>',
    "</cellXfs>",
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>',
    "</styleSheet>"
  ].join("");
}

function buildPackageEntries(workbook: ExcelWorkbook): Array<{ path: string; contents: string }> {
  const worksheets =
    workbook.worksheets.length > 0
      ? workbook.worksheets
      : [{ name: "Datos", rows: [["Sin datos"]] }];
  const names = sanitizeWorksheetNames(worksheets);

  const sheetEntries = worksheets.map((worksheet, index) => ({
    path: `xl/worksheets/sheet${index + 1}.xml`,
    contents: buildWorksheetXml(worksheet, index)
  }));

  const definedNames = worksheets
    .map((worksheet, index) => {
      const rows = worksheet.rows;
      if (!worksheet.autoFilter || rows.length < 2) return "";
      const columnCount = Math.max(1, ...rows.map((row) => row.length));
      const quoted = `'${names[index]!.replace(/'/g, "''")}'`;
      return `<definedName name="_xlnm._FilterDatabase" localSheetId="${index}" hidden="1">${escapeXml(
        `${quoted}!$A$1:$${columnLetter(columnCount - 1)}$${rows.length}`
      )}</definedName>`;
    })
    .join("");

  const workbookXml = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    `<workbook xmlns="${SPREADSHEET_NS}" xmlns:r="${RELATIONSHIP_NS}">`,
    "<bookViews><workbookView/></bookViews>",
    "<sheets>",
    names
      .map(
        (name, index) =>
          `<sheet name="${escapeXml(name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`
      )
      .join(""),
    "</sheets>",
    definedNames ? `<definedNames>${definedNames}</definedNames>` : "",
    "</workbook>"
  ].join("");

  const workbookRels = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    `<Relationships xmlns="${PACKAGE_RELATIONSHIP_NS}">`,
    worksheets
      .map(
        (_, index) =>
          `<Relationship Id="rId${index + 1}" Type="${RELATIONSHIP_NS}/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`
      )
      .join(""),
    `<Relationship Id="rId${worksheets.length + 1}" Type="${RELATIONSHIP_NS}/styles" Target="styles.xml"/>`,
    "</Relationships>"
  ].join("");

  const contentTypes = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
    '<Default Extension="xml" ContentType="application/xml"/>',
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>',
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>',
    worksheets
      .map(
        (_, index) =>
          `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
      )
      .join(""),
    "</Types>"
  ].join("");

  const rootRels = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    `<Relationships xmlns="${PACKAGE_RELATIONSHIP_NS}">`,
    `<Relationship Id="rId1" Type="${RELATIONSHIP_NS}/officeDocument" Target="xl/workbook.xml"/>`,
    "</Relationships>"
  ].join("");

  return [
    { path: "[Content_Types].xml", contents: contentTypes },
    { path: "_rels/.rels", contents: rootRels },
    { path: "xl/workbook.xml", contents: workbookXml },
    { path: "xl/_rels/workbook.xml.rels", contents: workbookRels },
    { path: "xl/styles.xml", contents: buildStylesXml() },
    ...sheetEntries
  ];
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** Empaqueta los archivos en un ZIP sin compresión (método "stored"), válido para .xlsx. */
function buildStoredZip(entries: Array<{ path: string; contents: string }>): Uint8Array {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;
  const dosTime = 0;
  const dosDate = (2026 - 1980) << 9 | (1 << 5) | 1;

  entries.forEach((entry) => {
    const name = encoder.encode(entry.path);
    const data = encoder.encode(entry.contents);
    const checksum = crc32(data);

    const local = new Uint8Array(30 + name.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, dosTime, true);
    localView.setUint16(12, dosDate, true);
    localView.setUint32(14, checksum, true);
    localView.setUint32(18, data.length, true);
    localView.setUint32(22, data.length, true);
    localView.setUint16(26, name.length, true);
    localView.setUint16(28, 0, true);
    local.set(name, 30);

    const central = new Uint8Array(46 + name.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, dosTime, true);
    centralView.setUint16(14, dosDate, true);
    centralView.setUint32(16, checksum, true);
    centralView.setUint32(20, data.length, true);
    centralView.setUint32(24, data.length, true);
    centralView.setUint16(28, name.length, true);
    centralView.setUint32(42, offset, true);
    central.set(name, 46);

    localParts.push(local, data);
    centralParts.push(central);
    offset += local.length + data.length;
  });

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);

  const parts = [...localParts, ...centralParts, end];
  const output = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let position = 0;
  parts.forEach((part) => {
    output.set(part, position);
    position += part.length;
  });
  return output;
}

/** Genera un libro .xlsx con encabezados resaltados, anchos de columna y formato de números. */
export function buildExcelWorkbookBytes(workbook: ExcelWorkbook): Uint8Array {
  return buildStoredZip(buildPackageEntries(workbook));
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

export function buildExcelWorkbookDownload(workbook: ExcelWorkbook): ExcelWorkbookDownload {
  return {
    fileName: normalizeExcelFileName(workbook.fileName),
    href: `data:${EXCEL_MIME_TYPE};base64,${toBase64(buildExcelWorkbookBytes(workbook))}`
  };
}

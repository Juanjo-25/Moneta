import type { ProductRecord } from "../types";

export type ProductImportDraft = Omit<ProductRecord, "active" | "id">;

export type ProductImportResult = {
  errors: string[];
  products: ProductImportDraft[];
};

type ProductImportColumn =
  | "costMinor"
  | "minimumStock"
  | "name"
  | "salePriceMinor"
  | "sku"
  | "stock"
  | "unit";

const headerAliases: Record<ProductImportColumn, string[]> = {
  costMinor: ["costo", "costoinicial", "costounitario", "preciocosto"],
  minimumStock: ["stockminimo", "minimo", "cantidadminima"],
  name: ["producto", "nombre", "nombreproducto"],
  salePriceMinor: [
    "precioventa",
    "precio",
    "preciobase",
    "preciogeneral",
    "preciodeventa",
    "venta"
  ],
  sku: ["codigo", "codigodelproductooservicio", "sku", "referencia"],
  stock: ["cantidad", "cantidadinicial", "stock", "stockinicial", "existencia"],
  unit: ["unidad", "unidaddemedida"]
};

export function parseProductImportCsv(
  content: string,
  existingProducts: ProductRecord[]
): ProductImportResult {
  const delimiter = detectDelimiter(content);
  const rows = parseDelimitedRows(content, delimiter).filter((row) =>
    row.some((cell) => cell.trim() !== "")
  );

  if (rows.length < 2) {
    return {
      errors: ["El archivo debe incluir encabezados y al menos un producto."],
      products: []
    };
  }

  const header = rows[0] ?? [];
  const columnIndexes = mapColumnIndexes(header);
  const missingColumns = getMissingRequiredColumns(columnIndexes);

  if (missingColumns.length > 0) {
    return {
      errors: [
        `Faltan columnas obligatorias: ${missingColumns.join(", ")}.`
      ],
      products: []
    };
  }

  const existingSkus = new Set(
    existingProducts.map((product) => normalizeSku(product.sku))
  );
  const importedSkus = new Set<string>();
  const errors: string[] = [];
  const products: ProductImportDraft[] = [];

  rows.slice(1).forEach((row, index) => {
    const lineNumber = index + 2;
    const name = getCell(row, columnIndexes.name).trim();
    const sku = buildSku({
      importedSku: getCell(row, columnIndexes.sku).trim(),
      lineNumber,
      name
    });
    const unit = getCell(row, columnIndexes.unit).trim() || "Unidad";
    const stock = parseOptionalIntegerCell(getCell(row, columnIndexes.stock));
    const costMinor = parseMoneyCell(getCell(row, columnIndexes.costMinor));
    const salePriceMinor = parseMoneyCell(
      getCell(row, columnIndexes.salePriceMinor)
    );
    const minimumStock = parseOptionalIntegerCell(
      getCell(row, columnIndexes.minimumStock)
    );
    const normalizedSku = normalizeSku(sku);

    if (sku === "") {
      errors.push(`Fila ${lineNumber}: el codigo es obligatorio.`);
    }
    if (name === "") {
      errors.push(`Fila ${lineNumber}: el producto es obligatorio.`);
    }
    if (normalizedSku !== "" && existingSkus.has(normalizedSku)) {
      errors.push(`Fila ${lineNumber}: el codigo ${sku} ya existe.`);
    }
    if (normalizedSku !== "" && importedSkus.has(normalizedSku)) {
      errors.push(`Fila ${lineNumber}: el codigo ${sku} esta repetido.`);
    }
    if (stock === null) {
      errors.push(`Fila ${lineNumber}: la cantidad inicial debe ser cero o mayor.`);
    }
    if (costMinor === null) {
      errors.push(`Fila ${lineNumber}: el costo debe ser cero o mayor.`);
    }
    if (salePriceMinor === null) {
      errors.push(`Fila ${lineNumber}: el precio de venta debe ser cero o mayor.`);
    }
    if (minimumStock === null) {
      errors.push(`Fila ${lineNumber}: el stock minimo debe ser cero o mayor.`);
    }

    if (
      sku === "" ||
      name === "" ||
      stock === null ||
      costMinor === null ||
      salePriceMinor === null ||
      minimumStock === null ||
      existingSkus.has(normalizedSku) ||
      importedSkus.has(normalizedSku)
    ) {
      return;
    }

    importedSkus.add(normalizedSku);
    products.push({
      costMinor,
      minimumStock,
      name,
      salePriceMinor,
      sku,
      stock,
      unit
    });
  });

  return { errors, products };
}

function detectDelimiter(content: string): "," | ";" {
  const firstLine = content.split(/\r?\n/, 1)[0] ?? "";
  const commaCount = countOccurrences(firstLine, ",");
  const semicolonCount = countOccurrences(firstLine, ";");

  return semicolonCount > commaCount ? ";" : ",";
}

function countOccurrences(value: string, character: string): number {
  return value.split(character).length - 1;
}

function parseDelimitedRows(content: string, delimiter: "," | ";"): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];
    const nextCharacter = content[index + 1];

    if (character === '"') {
      if (quoted && nextCharacter === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (!quoted && character === delimiter) {
      row.push(cell);
      cell = "";
      continue;
    }

    if (!quoted && (character === "\n" || character === "\r")) {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";

      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }
      continue;
    }

    cell += character;
  }

  row.push(cell);
  rows.push(row);

  return rows;
}

function mapColumnIndexes(header: string[]): Partial<Record<ProductImportColumn, number>> {
  return Object.keys(headerAliases).reduce<Partial<Record<ProductImportColumn, number>>>(
    (indexes, column) => {
      const typedColumn = column as ProductImportColumn;
      const aliases = headerAliases[typedColumn];
      const index = header.findIndex((cell) =>
        aliases.includes(normalizeHeader(cell))
      );

      if (index >= 0) {
        indexes[typedColumn] = index;
      }

      return indexes;
    },
    {}
  );
}

function getMissingRequiredColumns(
  indexes: Partial<Record<ProductImportColumn, number>>
): string[] {
  const requiredColumns: Array<[ProductImportColumn, string]> = [
    ["name", "producto"],
    ["costMinor", "costo"],
    ["salePriceMinor", "precio venta"]
  ];

  return requiredColumns
    .filter(([column]) => indexes[column] === undefined)
    .map(([, label]) => label);
}

function getCell(
  row: string[],
  index: number | undefined
): string {
  return index === undefined ? "" : row[index] ?? "";
}

function normalizeHeader(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function normalizeSku(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function buildSku(input: {
  importedSku: string;
  lineNumber: number;
  name: string;
}): string {
  if (input.importedSku !== "") {
    return input.importedSku;
  }

  return `SIN-CODIGO-${String(input.lineNumber).padStart(4, "0")}`;
}

function parseOptionalIntegerCell(value: string): number | null {
  if (value.trim() === "") {
    return 0;
  }

  return parseIntegerCell(value);
}

function parseIntegerCell(value: string): number | null {
  const digits = value.replace(/[^0-9]/g, "");

  if (digits === "") {
    return null;
  }

  return Number(digits);
}

function parseMoneyCell(value: string): number | null {
  const normalized = value.trim();

  if (normalized === "") {
    return null;
  }

  if (normalized.includes(",")) {
    const withoutThousands = normalized.replace(/\./g, "");
    const withDotDecimal = withoutThousands.replace(",", ".");
    const amount = Number(withDotDecimal.replace(/[^0-9.-]/g, ""));

    return Number.isFinite(amount) && amount >= 0 ? Math.round(amount) : null;
  }

  if (/\.\d{1,2}$/.test(normalized)) {
    const amount = Number(normalized.replace(/[^0-9.-]/g, ""));

    return Number.isFinite(amount) && amount >= 0 ? Math.round(amount) : null;
  }

  return parseIntegerCell(normalized);
}

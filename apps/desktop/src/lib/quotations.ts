import { parseLocalDate } from "./dates";
import type { QuotationLineRecord, QuotationRecord } from "../types";

export function nextQuotationNumber(quotations: QuotationRecord[]): string {
  const lastNumber = quotations.reduce((last, quotation) => {
    const match = /^COT-(\d+)$/.exec(quotation.quotationNumber);
    return Math.max(last, match ? Number(match[1]) : 0);
  }, 0);
  return `COT-${String(lastNumber + 1).padStart(4, "0")}`;
}

export function calculateQuotationLine(input: {
  quantity: number;
  unitPriceMinor: number;
  discountPercent: number;
  taxPercent: number;
}) {
  const subtotalMinor = input.quantity * input.unitPriceMinor;
  const discountMinor = Math.round(
    (subtotalMinor * input.discountPercent) / 100
  );
  const taxMinor = Math.round(
    ((subtotalMinor - discountMinor) * input.taxPercent) / 100
  );
  return {
    subtotalMinor,
    discountMinor,
    taxMinor,
    totalMinor: subtotalMinor - discountMinor + taxMinor
  };
}

export function validateQuotation(quotation: QuotationRecord): string | null {
  if (!quotation.id.trim() || !/^COT-\d+$/.test(quotation.quotationNumber))
    return "El número de cotización no es válido.";
  if (!quotation.customer.id || !quotation.customer.name.trim())
    return "Selecciona un cliente.";
  if (
    !parseLocalDate(quotation.issuedAt) ||
    !parseLocalDate(quotation.validUntil)
  ) {
    return "Indica fechas válidas de elaboración y validez.";
  }
  if (quotation.validUntil < quotation.issuedAt)
    return "La validez no puede ser anterior a la fecha de elaboración.";
  if (!quotation.lines.length)
    return "Agrega al menos un producto a la cotización.";
  for (const line of quotation.lines) {
    if (
      !line.productId ||
      !line.productName.trim() ||
      !isValidQuotationLine(line)
    ) {
      return "Revisa las cantidades, precios, descuentos e impuestos de los productos.";
    }
  }
  const total = quotation.lines.reduce((sum, line) => sum + line.totalMinor, 0);
  if (!Number.isSafeInteger(total) || total !== quotation.totalMinor)
    return "El total de la cotización no es válido.";
  return null;
}

function isValidQuotationLine(line: QuotationLineRecord): boolean {
  if (
    !Number.isSafeInteger(line.quantity) ||
    line.quantity <= 0 ||
    !Number.isSafeInteger(line.unitPriceMinor) ||
    line.unitPriceMinor <= 0 ||
    !Number.isInteger(line.discountPercent) ||
    line.discountPercent < 0 ||
    line.discountPercent > 100 ||
    !Number.isInteger(line.taxPercent) ||
    line.taxPercent < 0 ||
    line.taxPercent > 100
  )
    return false;
  const expected = calculateQuotationLine(line);
  return (Object.keys(expected) as Array<keyof typeof expected>).every(
    (field) =>
      Number.isSafeInteger(line[field]) && line[field] === expected[field]
  );
}

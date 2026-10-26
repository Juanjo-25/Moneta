import { parseLocalDate, startOfLocalDay } from "../../lib/dates";
import type { CreditNoteRecord, SaleRecord } from "../../types";

export type DailySalesDay = {
  day: number;
  date: Date;
  future: boolean;
  sales: SaleRecord[];
  creditNotes: CreditNoteRecord[];
  grossMinor: number;
  creditsMinor: number;
  valueMinor: number;
};

export function monthValue(date: Date, offset = 0): string {
  const shifted = new Date(date.getFullYear(), date.getMonth() + offset, 1);
  return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, "0")}`;
}

export function monthDate(value: string): Date {
  const [year, month] = value.split("-").map(Number);
  return new Date(year!, month! - 1, 1);
}

export function monthLabel(value: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    month: "long",
    year: "numeric"
  }).format(monthDate(value));
}

export function dayLabel(date: Date): string {
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
}

export function buildDailySales(
  period: string,
  sales: SaleRecord[],
  creditNotes: CreditNoteRecord[],
  today = new Date()
): DailySalesDay[] {
  const month = monthDate(period);
  const length = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0
  ).getDate();
  const rows: DailySalesDay[] = Array.from({ length }, (_, index) => {
    const date = new Date(month.getFullYear(), month.getMonth(), index + 1);
    return {
      day: index + 1,
      date,
      future: date > startOfLocalDay(today),
      sales: [],
      creditNotes: [],
      grossMinor: 0,
      creditsMinor: 0,
      valueMinor: 0
    };
  });
  function findDay(issuedAt: string, occurredAtMs: number) {
    const date = parseLocalDate(issuedAt) ?? new Date(occurredAtMs);
    return date.getFullYear() === month.getFullYear() &&
      date.getMonth() === month.getMonth()
      ? rows[date.getDate() - 1]
      : undefined;
  }
  for (const sale of sales) {
    const row = findDay(sale.issuedAt, sale.occurredAtMs);
    if (row) {
      row.sales.push(sale);
      row.grossMinor += sale.totalMinor;
    }
  }
  for (const note of creditNotes) {
    if (note.status !== "confirmed") continue;
    const row = findDay(note.issuedAt, note.occurredAtMs);
    if (row) {
      row.creditNotes.push(note);
      row.creditsMinor += note.totalMinor;
    }
  }
  for (const row of rows) {
    row.valueMinor = row.grossMinor - row.creditsMinor;
    // Future dates with actual registered documents remain visible.
    row.future = row.future && !row.sales.length && !row.creditNotes.length;
    row.sales.sort(
      (left, right) =>
        right.occurredAtMs - left.occurredAtMs ||
        left.id.localeCompare(right.id)
    );
  }
  return rows;
}

export function chartTicks(values: number[]): number[] {
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const rawStep = (max - min || 4) / 4;
  const power = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / power;
  const step = Math.max(
    1,
    (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) *
      power
  );
  const lower = Math.floor(min / step) * step;
  const upper = Math.max(lower + step, Math.ceil(max / step) * step);
  return Array.from(
    { length: Math.round((upper - lower) / step) + 1 },
    (_, index) => lower + index * step
  );
}

export function compactSalesAmount(value: number): string {
  const amount = Math.abs(value);
  const formatter = new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: 1
  });
  const label =
    amount >= 1_000_000
      ? `${formatter.format(amount / 1_000_000)} M`
      : amount >= 1_000
        ? `${formatter.format(amount / 1_000)} mil`
        : formatter.format(amount);
  return `${value < 0 ? "−" : ""}$${label}`;
}

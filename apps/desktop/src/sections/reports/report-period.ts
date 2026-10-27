import { parseLocalDate } from "../../lib/dates";

export type ReportGrouping = "day" | "month";

export function reportMonth(date = new Date(), offset = 0): string {
  const month = new Date(date.getFullYear(), date.getMonth() + offset, 1);
  return `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
}

export function reportMonthLabel(month: string): string {
  const date = parseLocalDate(`${month}-01`);
  return date
    ? new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric" }).format(date)
    : "Todo el historial";
}

export function shiftReportMonth(month: string, offset: number): string {
  return reportMonth(parseLocalDate(`${month}-01`) ?? new Date(), offset);
}

// Document dates are calendar dates; parsing them as UTC can move them into another month.
export function reportDocumentTime(document: { issuedAt: string; occurredAtMs: number }): number {
  return parseLocalDate(document.issuedAt)?.getTime() ?? document.occurredAtMs;
}

export function isInReportMonth(timestamp: number, month: string): boolean {
  if (!month) return true;
  const start = parseLocalDate(`${month}-01`);
  if (!start || !Number.isFinite(timestamp)) return false;
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
  return timestamp >= start.getTime() && timestamp < end.getTime();
}

export function reportPeriod(timestamp: number, grouping: ReportGrouping) {
  if (!Number.isFinite(timestamp)) {
    return { key: "undated", label: "Sin fecha", timestamp: Number.POSITIVE_INFINITY };
  }
  const date = new Date(timestamp);
  const start = new Date(
    date.getFullYear(), date.getMonth(), grouping === "month" ? 1 : date.getDate()
  );
  return {
    key: String(start.getTime()),
    label: new Intl.DateTimeFormat("es-CO", grouping === "month"
      ? { month: "long", year: "numeric" }
      : { day: "2-digit", month: "2-digit", year: "numeric" }).format(start),
    timestamp: start.getTime()
  };
}

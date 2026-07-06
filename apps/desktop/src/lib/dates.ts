export type DueAlert = "overdue" | "upcoming" | "current" | "none";

export type DueMetadata = {
  alert: DueAlert;
  alertLabel: string;
  bucketLabel: string;
  daysUntilDue: number | null;
};

export function parseLocalDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const parts = value.split("-").map(Number);

  if (parts.length !== 3) {
    return null;
  }

  const [year, month, day] = parts;

  if (
    year === undefined ||
    month === undefined ||
    day === undefined
  ) {
    return null;
  }

  const parsed = new Date(year, month - 1, day);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
}

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getDaysUntilDue(dueAt: string, today = new Date()): number | null {
  const dueDate = parseLocalDate(dueAt);

  if (!dueDate) {
    return null;
  }

  const millisecondsPerDay = 24 * 60 * 60 * 1000;

  return Math.round(
    (startOfLocalDay(dueDate).getTime() - startOfLocalDay(today).getTime()) /
      millisecondsPerDay
  );
}

export function getDueMetadata(dueAt: string, today = new Date()): DueMetadata {
  const daysUntilDue = getDaysUntilDue(dueAt, today);

  if (daysUntilDue === null) {
    return {
      alert: "none",
      alertLabel: "Sin vencimiento",
      bucketLabel: "Sin vencimiento",
      daysUntilDue
    };
  }

  if (daysUntilDue < 0) {
    return {
      alert: "overdue",
      alertLabel: "Vencida",
      bucketLabel: "Vencida",
      daysUntilDue
    };
  }

  const bucketLabel =
    daysUntilDue <= 15
      ? "15 dias"
      : daysUntilDue <= 30
        ? "30 dias"
        : daysUntilDue <= 60
          ? "60 dias"
          : daysUntilDue <= 90
            ? "90 dias"
            : "Mas de 90 dias";

  return {
    alert: daysUntilDue <= 15 ? "upcoming" : "current",
    alertLabel: daysUntilDue <= 15 ? "Proxima" : "Al dia",
    bucketLabel,
    daysUntilDue
  };
}

export function compareDueDates(leftDueAt: string, rightDueAt: string): number {
  const left = parseLocalDate(leftDueAt)?.getTime() ?? Number.POSITIVE_INFINITY;
  const right = parseLocalDate(rightDueAt)?.getTime() ?? Number.POSITIVE_INFINITY;

  return left - right;
}

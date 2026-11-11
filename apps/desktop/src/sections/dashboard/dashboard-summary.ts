import { getDaysUntilDue, parseLocalDate, startOfLocalDay } from "../../lib/dates";
import type {
  CreditNoteRecord,
  CustomerReceiptRecord,
  ProductRecord,
  ReceivableRecord,
  SaleRecord,
  SectionId,
  SupplierPayableRecord
} from "../../types";

export type DashboardMetricTone = "neutral" | "positive" | "negative" | "warning";

export type DashboardMetric = {
  label: string;
  value: string;
  detail: string;
  tone: DashboardMetricTone;
};

export type TodayCashSummary = {
  netSalesMinor: number;
  invoiceCount: number;
  paidMinor: number;
  creditMinor: number;
  receiptsMinor: number;
  lastWeekNetMinor: number;
  lastWeekLabel: string;
};

export type PendingTask = {
  id: "overdue-receivables" | "low-stock" | "supplier-payables";
  count: number;
  title: string;
  body: string;
  actionLabel: string;
  target: SectionId;
  tone: "warning" | "neutral";
};

export type DashboardSummary = {
  metrics: DashboardMetric[];
  todayCash: TodayCashSummary;
  pendingTasks: PendingTask[];
  overdueReceivablesCount: number;
};

type DashboardSummaryInput = {
  products: ProductRecord[];
  lowStockProducts: ProductRecord[];
  sales: SaleRecord[];
  creditNotes: CreditNoteRecord[];
  receivables: ReceivableRecord[];
  customerReceipts: CustomerReceiptRecord[];
  supplierPayables: SupplierPayableRecord[];
  formatCurrency: (minor: number) => string;
  today?: Date;
};

const millisecondsPerDay = 24 * 60 * 60 * 1000;

function getSaleDate(sale: SaleRecord): Date {
  return parseLocalDate(sale.issuedAt) ?? new Date(sale.occurredAtMs);
}

function getCreditNoteDate(creditNote: CreditNoteRecord): Date {
  return parseLocalDate(creditNote.issuedAt) ?? new Date(creditNote.occurredAtMs);
}

function getReceiptDate(receipt: CustomerReceiptRecord): Date {
  return parseLocalDate(receipt.receivedAt) ?? new Date(receipt.receivedAtMs);
}

function isWithin(date: Date, start: Date, endExclusive: Date): boolean {
  const time = date.getTime();

  return time >= start.getTime() && time < endExclusive.getTime();
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function sumNetSales(
  sales: SaleRecord[],
  creditNotes: CreditNoteRecord[],
  start: Date,
  endExclusive: Date
): number {
  const salesTotal = sales.reduce(
    (total, sale) =>
      isWithin(getSaleDate(sale), start, endExclusive) ? total + sale.totalMinor : total,
    0
  );
  const creditTotal = creditNotes.reduce(
    (total, creditNote) =>
      isWithin(getCreditNoteDate(creditNote), start, endExclusive)
        ? total + creditNote.totalMinor
        : total,
    0
  );

  return Math.max(salesTotal - creditTotal, 0);
}

function sumMargin(
  sales: SaleRecord[],
  creditNotes: CreditNoteRecord[],
  start: Date,
  endExclusive: Date
): { marginMinor: number; marginPercent: number | null } {
  const periodSales = sales.filter((sale) => isWithin(getSaleDate(sale), start, endExclusive));
  const periodCreditNotes = creditNotes.filter((creditNote) =>
    isWithin(getCreditNoteDate(creditNote), start, endExclusive)
  );
  const revenueMinor =
    periodSales.reduce((sum, sale) => sum + sale.totalMinor, 0) -
    periodCreditNotes.reduce((sum, creditNote) => sum + creditNote.totalMinor, 0);
  const costMinor =
    periodSales.reduce(
      (sum, sale) => sum + sale.lines.reduce((lineSum, line) => lineSum + line.costMinor, 0),
      0
    ) -
    periodCreditNotes.reduce(
      (sum, creditNote) =>
        sum + creditNote.lines.reduce((lineSum, line) => lineSum + line.costMinor, 0),
      0
    );
  const marginMinor = revenueMinor - costMinor;

  return {
    marginMinor,
    marginPercent: revenueMinor > 0 ? (marginMinor / revenueMinor) * 100 : null
  };
}

const percentFormatter = new Intl.NumberFormat("es-CO", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1
});

function plural(count: number, singular: string, pluralForm: string): string {
  return count === 1 ? singular : pluralForm;
}

export function buildDashboardSummary({
  products,
  lowStockProducts,
  sales,
  creditNotes,
  receivables,
  customerReceipts,
  supplierPayables,
  formatCurrency,
  today = new Date()
}: DashboardSummaryInput): DashboardSummary {
  const todayStart = startOfLocalDay(today);
  const tomorrowStart = addDays(todayStart, 1);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const previousMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const previousMonthLastDay = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
  const previousMonthCutoff = new Date(
    previousMonthStart.getFullYear(),
    previousMonthStart.getMonth(),
    Math.min(today.getDate(), previousMonthLastDay) + 1
  );
  const previousMonthName = new Intl.DateTimeFormat("es-CO", { month: "long" }).format(
    previousMonthStart
  );

  const monthNetMinor = sumNetSales(sales, creditNotes, monthStart, nextMonthStart);
  const monthToDateNetMinor = sumNetSales(sales, creditNotes, monthStart, tomorrowStart);
  const previousMonthNetMinor = sumNetSales(
    sales,
    creditNotes,
    previousMonthStart,
    previousMonthCutoff
  );
  let monthDetail = `Sin ventas a esta fecha de ${previousMonthName}`;
  let monthTone: DashboardMetricTone = "neutral";

  if (previousMonthNetMinor > 0) {
    const change = ((monthToDateNetMinor - previousMonthNetMinor) / previousMonthNetMinor) * 100;
    const arrow = change >= 0 ? "▲" : "▼";

    monthDetail = `${arrow} ${percentFormatter.format(Math.abs(change))}% vs. ${previousMonthName} a esta fecha`;
    monthTone = change >= 0 ? "positive" : "negative";
  }

  const pendingReceivablesMinor = receivables.reduce(
    (total, receivable) => total + receivable.amountMinor,
    0
  );
  const overdueReceivables = receivables
    .filter((receivable) => {
      const days = getDaysUntilDue(receivable.dueAt, today);

      return receivable.amountMinor > 0 && days !== null && days < 0;
    })
    .sort((left, right) => left.dueAt.localeCompare(right.dueAt));
  const overdueReceivablesMinor = overdueReceivables.reduce(
    (total, receivable) => total + receivable.amountMinor,
    0
  );

  const activeProductsCount = products.filter((product) => product.active).length;
  const margin = sumMargin(sales, creditNotes, monthStart, nextMonthStart);

  const metrics: DashboardMetric[] = [
    {
      label: "Ventas del mes",
      value: formatCurrency(monthNetMinor),
      detail: monthDetail,
      tone: monthTone
    },
    {
      label: "Cartera pendiente",
      value: formatCurrency(pendingReceivablesMinor),
      detail:
        overdueReceivablesMinor > 0
          ? `${formatCurrency(overdueReceivablesMinor)} vencida`
          : "Sin facturas vencidas",
      tone: overdueReceivablesMinor > 0 ? "warning" : "neutral"
    },
    {
      label: "Productos activos",
      value: String(activeProductsCount),
      detail:
        lowStockProducts.length > 0
          ? `${lowStockProducts.length} con inventario bajo`
          : "Inventario al día",
      tone: lowStockProducts.length > 0 ? "warning" : "neutral"
    },
    {
      label: "Margen bruto del mes",
      value:
        margin.marginPercent === null
          ? "—"
          : `${percentFormatter.format(margin.marginPercent)}%`,
      detail:
        margin.marginPercent === null
          ? "Sin ventas este mes"
          : `Utilidad ${formatCurrency(margin.marginMinor)}`,
      tone: "neutral"
    }
  ];

  const todaySales = sales.filter((sale) => isWithin(getSaleDate(sale), todayStart, tomorrowStart));
  const lastWeekStart = addDays(todayStart, -7);
  const todayCash: TodayCashSummary = {
    netSalesMinor: sumNetSales(sales, creditNotes, todayStart, tomorrowStart),
    invoiceCount: todaySales.length,
    paidMinor: todaySales.reduce(
      (total, sale) => (sale.paymentStatus === "paid" ? total + sale.totalMinor : total),
      0
    ),
    creditMinor: todaySales.reduce(
      (total, sale) => (sale.paymentStatus === "pending" ? total + sale.totalMinor : total),
      0
    ),
    receiptsMinor: customerReceipts.reduce(
      (total, receipt) =>
        receipt.active && isWithin(getReceiptDate(receipt), todayStart, tomorrowStart)
          ? total + receipt.amountMinor
          : total,
      0
    ),
    lastWeekNetMinor: sumNetSales(
      sales,
      creditNotes,
      lastWeekStart,
      new Date(lastWeekStart.getTime() + millisecondsPerDay)
    ),
    lastWeekLabel: new Intl.DateTimeFormat("es-CO", { weekday: "long" }).format(lastWeekStart)
  };

  const pendingTasks: PendingTask[] = [];

  if (overdueReceivables.length > 0) {
    const oldest = overdueReceivables[0]!;

    pendingTasks.push({
      id: "overdue-receivables",
      count: overdueReceivables.length,
      title: plural(
        overdueReceivables.length,
        "Factura vencida por cobrar",
        "Facturas vencidas por cobrar"
      ),
      body: `${formatCurrency(overdueReceivablesMinor)} · la más antigua, ${oldest.customerName}`,
      actionLabel: "Cobrar",
      target: "receivables",
      tone: "warning"
    });
  }

  if (lowStockProducts.length > 0) {
    const names = lowStockProducts.slice(0, 2).map((product) => product.name);
    const remaining = lowStockProducts.length - names.length;

    pendingTasks.push({
      id: "low-stock",
      count: lowStockProducts.length,
      title: plural(
        lowStockProducts.length,
        "Producto con inventario bajo",
        "Productos con inventario bajo"
      ),
      body: remaining > 0 ? `${names.join(", ")} y ${remaining} más` : names.join(" y "),
      actionLabel: "Revisar",
      target: "products",
      tone: "neutral"
    });
  }

  const upcomingPayables = supplierPayables
    .filter((payable) => {
      const days = getDaysUntilDue(payable.dueAt, today);

      return (
        payable.status !== "paid" &&
        payable.balanceMinor > 0 &&
        days !== null &&
        days <= 7
      );
    })
    .sort((left, right) => left.dueAt.localeCompare(right.dueAt));

  if (upcomingPayables.length > 0) {
    const next = upcomingPayables[0]!;
    const totalMinor = upcomingPayables.reduce((total, payable) => total + payable.balanceMinor, 0);

    pendingTasks.push({
      id: "supplier-payables",
      count: upcomingPayables.length,
      title: plural(
        upcomingPayables.length,
        "Pago a proveedor esta semana",
        "Pagos a proveedores esta semana"
      ),
      body: `${formatCurrency(totalMinor)} · el más próximo, ${next.supplierName}`,
      actionLabel: "Ver pagos",
      target: "receivables",
      tone: "neutral"
    });
  }

  return {
    metrics,
    todayCash,
    pendingTasks,
    overdueReceivablesCount: overdueReceivables.length
  };
}

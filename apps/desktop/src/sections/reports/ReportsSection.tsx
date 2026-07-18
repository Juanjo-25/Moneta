import { useState, type ReactNode } from "react";
import { CompactSummaryGrid } from "../../components/CompactSummaryGrid";
import { DataTable } from "../../components/DataTable";
import { DataTableHeader } from "../../components/DataTableHeader";
import { EmptyState } from "../../components/EmptyState";
import { ReportChartPreviewPanel } from "../../components/ReportChartPreviewPanel";
import { ReportPrimaryInsightPanel } from "../../components/ReportPrimaryInsightPanel";
import { ReportSummaryShell } from "../../components/ReportSummaryShell";
import { SecondaryActionButton } from "../../components/SecondaryActionButton";
import { SubmenuSwitch } from "../../components/SubmenuSwitch";
import { parseLocalDate } from "../../lib/dates";
import type {
  CreditNoteRecord,
  CustomerReceiptRecord,
  PurchaseExpenseCategory,
  PurchaseRecord,
  ReceivableRecord,
  SaleRecord,
  SupplierPayableRecord,
  SupplierPaymentRecord
} from "../../types";

type MarginSummary = {
  costMinor: number;
  marginMinor: number;
  marginPercent: number;
  revenueMinor: number;
  salesCount: number;
};

type ProductMarginRow = {
  costMinor: number;
  marginMinor: number;
  marginPercent: number;
  productId: string;
  productName: string;
  quantity: number;
  revenueMinor: number;
};

type CustomerMarginRow = {
  costMinor: number;
  customerId: string;
  customerName: string;
  marginMinor: number;
  marginPercent: number;
  purchaseCount: number;
  revenueMinor: number;
};

type SaleMarginRow = {
  costMinor: number;
  customerName: string;
  marginMinor: number;
  marginPercent: number;
  occurredAtLabel: string;
  paymentStatus: "paid" | "pending";
  revenueMinor: number;
  saleId: string;
};

type SellerMarginRow = {
  costMinor: number;
  marginMinor: number;
  marginPercent: number;
  revenueMinor: number;
  saleCount: number;
  sellerName: string;
};

type ReportDetailView = "product" | "customer" | "seller" | "sales" | "sale" | null;
type ReportTab = "profitability" | "dso" | "cashflow" | "expenses" | "variance";
type ProfitabilityTab = "overview" | "customer" | "product" | "seller" | "sales";

type DsoSummary = {
  activeReceivablesMinor: number;
  clientCount: number;
  dsoDays: number;
  openInvoiceCount: number;
};

type DsoClientRow = {
  averageOutstandingDays: number;
  customerId: string;
  customerName: string;
  invoiceCount: number;
  participationPercent: number;
  receivableMinor: number;
};

type CashflowEntry = {
  id: string;
  dateLabel: string;
  dateSortMs: number;
  inflowMinor: number;
  outflowMinor: number;
  netMinor: number;
  originLabel: string;
  partyName: string;
  type: "real" | "projected";
  typeLabel: string;
};

type CashflowSummary = {
  projectedInflowMinor: number;
  projectedNetMinor: number;
  projectedOutflowMinor: number;
  realInflowMinor: number;
  realNetMinor: number;
  realOutflowMinor: number;
};

type CashflowPeriodRow = {
  dateLabel: string;
  dateSortMs: number;
  projectedInflowMinor: number;
  projectedNetMinor: number;
  projectedOutflowMinor: number;
  realInflowMinor: number;
  realNetMinor: number;
  realOutflowMinor: number;
};

type UtilityPeriodRow = {
  dateKey: string;
  dateLabel: string;
  dateSortMs: number;
  marginMinor: number;
  marginPercent: number;
  salesCount: number;
  costMinor: number;
  revenueMinor: number;
};

type UtilitySummary = {
  totalMarginMinor: number;
  averageMarginMinor: number;
  bestPeriodLabel: string;
  bestPeriodMarginMinor: number;
  worstPeriodLabel: string;
  worstPeriodMarginMinor: number;
};

type ExpenseEntry = {
  amountMinor: number;
  categoryLabel: string;
  dateLabel: string;
  dateSortMs: number;
  id: string;
  invoiceNumber: string;
  originLabel: string;
  partyName: string;
  statusLabel: "Real" | "Proyectado";
};

type ExpenseSummary = {
  projectedExpenseMinor: number;
  providerCount: number;
  realExpenseMinor: number;
  totalExpenseMinor: number;
};

type ExpenseOriginRow = {
  amountMinor: number;
  count: number;
  originLabel: string;
  participationPercent: number;
};

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatDays(value: number): string {
  return `${value.toFixed(1)} dias`;
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateLabel(date: Date): string {
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

function formatLocalDateLabel(value: string): string {
  const parsed = parseLocalDate(value);

  if (!parsed) {
    return value || "Sin fecha";
  }

  return formatDateLabel(parsed);
}

function formatExpenseCategory(category: PurchaseExpenseCategory): string {
  const labels: Record<PurchaseExpenseCategory, string> = {
    inventory: "Inventario / proveedores",
    services: "Servicios",
    payroll: "Nomina",
    rent: "Arriendo",
    transport: "Transporte",
    taxes: "Impuestos",
    other: "Otros"
  };

  return labels[category];
}

function buildMarginSummary(
  sales: SaleRecord[],
  creditNotes: CreditNoteRecord[]
): MarginSummary {
  const revenueMinor = sales.reduce((sum, sale) => sum + sale.totalMinor, 0);
  const costMinor = sales.reduce(
    (sum, sale) => sum + sale.lines.reduce((lineSum, line) => lineSum + line.costMinor, 0),
    0
  );
  const creditedRevenueMinor = creditNotes.reduce(
    (sum, creditNote) => sum + creditNote.totalMinor,
    0
  );
  const creditedCostMinor = creditNotes.reduce(
    (sum, creditNote) =>
      sum + creditNote.lines.reduce((lineSum, line) => lineSum + line.costMinor, 0),
    0
  );
  const netRevenueMinor = Math.max(revenueMinor - creditedRevenueMinor, 0);
  const netCostMinor = Math.max(costMinor - creditedCostMinor, 0);
  const marginMinor = netRevenueMinor - netCostMinor;

  return {
    costMinor: netCostMinor,
    marginMinor,
    marginPercent: netRevenueMinor > 0 ? (marginMinor / netRevenueMinor) * 100 : 0,
    revenueMinor: netRevenueMinor,
    salesCount: sales.length
  };
}

function buildProductMarginRows(
  sales: SaleRecord[],
  creditNotes: CreditNoteRecord[]
): ProductMarginRow[] {
  const productMap = new Map<string, ProductMarginRow>();

  sales.forEach((sale) => {
    sale.lines.forEach((line) => {
      const currentRow = productMap.get(line.productId) ?? {
        costMinor: 0,
        marginMinor: 0,
        marginPercent: 0,
        productId: line.productId,
        productName: line.productName,
        quantity: 0,
        revenueMinor: 0
      };

      currentRow.quantity += line.quantity;
      currentRow.revenueMinor += line.totalMinor;
      currentRow.costMinor += line.costMinor;
      currentRow.marginMinor += line.marginMinor;
      currentRow.marginPercent =
        currentRow.revenueMinor > 0
          ? (currentRow.marginMinor / currentRow.revenueMinor) * 100
          : 0;

      productMap.set(line.productId, currentRow);
    });
  });

  creditNotes.forEach((creditNote) => {
    creditNote.lines.forEach((line) => {
      const currentRow = productMap.get(line.productId) ?? {
        costMinor: 0,
        marginMinor: 0,
        marginPercent: 0,
        productId: line.productId,
        productName: line.productName,
        quantity: 0,
        revenueMinor: 0
      };

      currentRow.quantity = Math.max(currentRow.quantity - line.quantity, 0);
      currentRow.revenueMinor = Math.max(currentRow.revenueMinor - line.totalMinor, 0);
      currentRow.costMinor = Math.max(currentRow.costMinor - line.costMinor, 0);
      currentRow.marginMinor = currentRow.revenueMinor - currentRow.costMinor;
      currentRow.marginPercent =
        currentRow.revenueMinor > 0
          ? (currentRow.marginMinor / currentRow.revenueMinor) * 100
          : 0;

      productMap.set(line.productId, currentRow);
    });
  });

  return [...productMap.values()]
    .filter((row) => row.revenueMinor > 0 || row.quantity > 0)
    .sort((left, right) => right.marginMinor - left.marginMinor);
}

function buildCustomerMarginRows(
  sales: SaleRecord[],
  creditNotes: CreditNoteRecord[]
): CustomerMarginRow[] {
  const customerMap = new Map<string, CustomerMarginRow>();

  sales.forEach((sale) => {
    const saleCostMinor = sale.lines.reduce((sum, line) => sum + line.costMinor, 0);
    const saleMarginMinor = sale.lines.reduce((sum, line) => sum + line.marginMinor, 0);
    const currentRow = customerMap.get(sale.customerId) ?? {
      costMinor: 0,
      customerId: sale.customerId,
      customerName: sale.customerName,
      marginMinor: 0,
      marginPercent: 0,
      purchaseCount: 0,
      revenueMinor: 0
    };

    currentRow.purchaseCount += 1;
    currentRow.revenueMinor += sale.totalMinor;
    currentRow.costMinor += saleCostMinor;
    currentRow.marginMinor += saleMarginMinor;
    currentRow.marginPercent =
      currentRow.revenueMinor > 0
        ? (currentRow.marginMinor / currentRow.revenueMinor) * 100
        : 0;

    customerMap.set(sale.customerId, currentRow);
  });

  creditNotes.forEach((creditNote) => {
    const creditedCostMinor = creditNote.lines.reduce(
      (sum, line) => sum + line.costMinor,
      0
    );
    const currentRow = customerMap.get(creditNote.customerId) ?? {
      costMinor: 0,
      customerId: creditNote.customerId,
      customerName: creditNote.customerName,
      marginMinor: 0,
      marginPercent: 0,
      purchaseCount: 0,
      revenueMinor: 0
    };

    currentRow.revenueMinor = Math.max(currentRow.revenueMinor - creditNote.totalMinor, 0);
    currentRow.costMinor = Math.max(currentRow.costMinor - creditedCostMinor, 0);
    currentRow.marginMinor = currentRow.revenueMinor - currentRow.costMinor;
    currentRow.marginPercent =
      currentRow.revenueMinor > 0
        ? (currentRow.marginMinor / currentRow.revenueMinor) * 100
        : 0;

    customerMap.set(creditNote.customerId, currentRow);
  });

  return [...customerMap.values()]
    .filter((row) => row.revenueMinor > 0 || row.purchaseCount > 0)
    .sort((left, right) => right.marginMinor - left.marginMinor);
}

function buildSaleMarginRows(
  sales: SaleRecord[],
  creditNotes: CreditNoteRecord[]
): SaleMarginRow[] {
  return sales
    .map((sale) => {
      const saleCreditNotes = creditNotes.filter(
        (creditNote) => creditNote.saleId === sale.id
      );
      const costMinor = sale.lines.reduce((sum, line) => sum + line.costMinor, 0);
      const creditedRevenueMinor = saleCreditNotes.reduce(
        (sum, creditNote) => sum + creditNote.totalMinor,
        0
      );
      const creditedCostMinor = saleCreditNotes.reduce(
        (sum, creditNote) =>
          sum + creditNote.lines.reduce((lineSum, line) => lineSum + line.costMinor, 0),
        0
      );
      const netRevenueMinor = Math.max(sale.totalMinor - creditedRevenueMinor, 0);
      const netCostMinor = Math.max(costMinor - creditedCostMinor, 0);
      const netMarginMinor = netRevenueMinor - netCostMinor;

      return {
        costMinor: netCostMinor,
        customerName: sale.customerName,
        marginMinor: netMarginMinor,
        marginPercent:
          netRevenueMinor > 0 ? (netMarginMinor / netRevenueMinor) * 100 : 0,
        occurredAtLabel: sale.occurredAtLabel,
        paymentStatus: sale.paymentStatus,
        revenueMinor: netRevenueMinor,
        saleId: sale.id
      };
    })
    .sort((left, right) => right.marginMinor - left.marginMinor);
}

function buildSellerMarginRows(
  sales: SaleRecord[],
  creditNotes: CreditNoteRecord[]
): SellerMarginRow[] {
  const salesById = new Map(sales.map((sale) => [sale.id, sale]));
  const sellerMap = new Map<string, SellerMarginRow>();

  sales.forEach((sale) => {
    const sellerName = sale.seller.trim() || "Sin asignar";
    const currentRow = sellerMap.get(sellerName) ?? {
      costMinor: 0,
      marginMinor: 0,
      marginPercent: 0,
      revenueMinor: 0,
      saleCount: 0,
      sellerName
    };

    currentRow.revenueMinor += sale.totalMinor;
    currentRow.costMinor += sale.lines.reduce(
      (lineSum, line) => lineSum + line.costMinor,
      0
    );
    currentRow.saleCount += 1;
    sellerMap.set(sellerName, currentRow);
  });

  creditNotes.forEach((creditNote) => {
    const sale = salesById.get(creditNote.saleId);
    const sellerName = sale?.seller.trim() || "Sin asignar";
    const currentRow = sellerMap.get(sellerName);

    if (!currentRow) {
      return;
    }

    currentRow.revenueMinor = Math.max(
      currentRow.revenueMinor - creditNote.totalMinor,
      0
    );
    currentRow.costMinor = Math.max(
      currentRow.costMinor -
        creditNote.lines.reduce((lineSum, line) => lineSum + line.costMinor, 0),
      0
    );
  });

  return [...sellerMap.values()]
    .map((row) => {
      const marginMinor = row.revenueMinor - row.costMinor;

      return {
        ...row,
        marginMinor,
        marginPercent:
          row.revenueMinor > 0 ? (marginMinor / row.revenueMinor) * 100 : 0
      };
    })
    .sort((left, right) => right.revenueMinor - left.revenueMinor);
}

function buildDsoClientRows(input: {
  receivables: ReceivableRecord[];
  sales: SaleRecord[];
  todayMs?: number;
}): DsoClientRow[] {
  const todayMs = input.todayMs ?? Date.now();
  const saleById = new Map(input.sales.map((sale) => [sale.id, sale]));
  const customerMap = new Map<
    string,
    {
      customerId: string;
      customerName: string;
      invoiceCount: number;
      receivableMinor: number;
      weightedOutstandingDays: number;
    }
  >();

  input.receivables.forEach((receivable) => {
    const sale = saleById.get(receivable.saleId);

    if (!sale) {
      return;
    }

    const outstandingDays = Math.max(
      (todayMs - sale.occurredAtMs) / (24 * 60 * 60 * 1000),
      0
    );
    const currentRow = customerMap.get(receivable.customerId) ?? {
      customerId: receivable.customerId,
      customerName: receivable.customerName,
      invoiceCount: 0,
      receivableMinor: 0,
      weightedOutstandingDays: 0
    };

    currentRow.invoiceCount += 1;
    currentRow.receivableMinor += receivable.amountMinor;
    currentRow.weightedOutstandingDays += outstandingDays * receivable.amountMinor;

    customerMap.set(receivable.customerId, currentRow);
  });

  const totalReceivableMinor = [...customerMap.values()].reduce(
    (sum, row) => sum + row.receivableMinor,
    0
  );

  return [...customerMap.values()]
    .map((row) => ({
      averageOutstandingDays:
        row.receivableMinor > 0 ? row.weightedOutstandingDays / row.receivableMinor : 0,
      customerId: row.customerId,
      customerName: row.customerName,
      invoiceCount: row.invoiceCount,
      participationPercent:
        totalReceivableMinor > 0 ? (row.receivableMinor / totalReceivableMinor) * 100 : 0,
      receivableMinor: row.receivableMinor
    }))
    .sort((left, right) => right.receivableMinor - left.receivableMinor);
}

function buildDsoSummary(input: {
  receivables: ReceivableRecord[];
  sales: SaleRecord[];
  todayMs?: number;
}): DsoSummary {
  const clientRows = buildDsoClientRows(input);
  const activeReceivablesMinor = clientRows.reduce((sum, row) => sum + row.receivableMinor, 0);

  if (activeReceivablesMinor <= 0) {
    return {
      activeReceivablesMinor: 0,
      clientCount: 0,
      dsoDays: 0,
      openInvoiceCount: 0
    };
  }

  const weightedDays = clientRows.reduce(
    (sum, row) => sum + row.averageOutstandingDays * row.receivableMinor,
    0
  );

  return {
    activeReceivablesMinor,
    clientCount: clientRows.length,
    dsoDays: weightedDays / activeReceivablesMinor,
    openInvoiceCount: clientRows.reduce((sum, row) => sum + row.invoiceCount, 0)
  };
}

function buildCashflowEntries(input: {
  creditNotes: CreditNoteRecord[];
  customerReceipts: CustomerReceiptRecord[];
  purchases: PurchaseRecord[];
  receivables: ReceivableRecord[];
  sales: SaleRecord[];
  supplierPayables: SupplierPayableRecord[];
  supplierPayments: SupplierPaymentRecord[];
}): CashflowEntry[] {
  const entries: CashflowEntry[] = [];
  const saleById = new Map(input.sales.map((sale) => [sale.id, sale]));

  input.sales.forEach((sale) => {
    if (sale.paymentStatus === "paid") {
      const occurredAt = new Date(sale.occurredAtMs);
      entries.push({
        dateLabel: formatDateLabel(occurredAt),
        dateSortMs: sale.occurredAtMs,
        id: `cashflow-sale-${sale.id}`,
        inflowMinor: sale.totalMinor,
        netMinor: sale.totalMinor,
        originLabel: "Venta pagada",
        outflowMinor: 0,
        partyName: sale.customerName,
        type: "real",
        typeLabel: "Real"
      });
    }
  });

  input.creditNotes.forEach((creditNote) => {
    const sale = saleById.get(creditNote.saleId);

    if (sale?.paymentStatus !== "paid") {
      return;
    }

    const occurredAt = new Date(creditNote.occurredAtMs);
    entries.push({
      dateLabel: formatDateLabel(occurredAt),
      dateSortMs: creditNote.occurredAtMs,
      id: `cashflow-${creditNote.id}`,
      inflowMinor: 0,
      netMinor: -creditNote.totalMinor,
      originLabel: "Nota credito",
      outflowMinor: creditNote.totalMinor,
      partyName: creditNote.customerName,
      type: "real",
      typeLabel: "Real"
    });
  });

  input.purchases.forEach((purchase) => {
    if (purchase.paymentStatus === "paid") {
      const occurredAt = new Date(purchase.occurredAtMs);
      entries.push({
        dateLabel: formatDateLabel(occurredAt),
        dateSortMs: purchase.occurredAtMs,
        id: `cashflow-purchase-${purchase.id}`,
        inflowMinor: 0,
        netMinor: -purchase.totalMinor,
        originLabel: "Compra pagada",
        outflowMinor: purchase.totalMinor,
        partyName: purchase.supplierName,
        type: "real",
        typeLabel: "Real"
      });
    }
  });

  input.supplierPayments.forEach((payment) => {
    const paidAt = new Date(payment.paidAtMs);
    entries.push({
      dateLabel: formatDateLabel(paidAt),
      dateSortMs: payment.paidAtMs,
      id: payment.id,
      inflowMinor: 0,
      netMinor: -payment.amountMinor,
      originLabel: "Abono proveedor",
      outflowMinor: payment.amountMinor,
      partyName: payment.supplierName,
      type: "real",
      typeLabel: "Real"
    });
  });

  input.customerReceipts.forEach((receipt) => {
    const receivedAt = new Date(receipt.receivedAtMs);
    entries.push({
      dateLabel: formatDateLabel(receivedAt),
      dateSortMs: receipt.receivedAtMs,
      id: receipt.id,
      inflowMinor: receipt.amountMinor,
      netMinor: receipt.amountMinor,
      originLabel: "Recibo de caja",
      outflowMinor: 0,
      partyName: receipt.customerName,
      type: "real",
      typeLabel: "Real"
    });
  });

  input.receivables.forEach((receivable) => {
    const dueAtMs = parseLocalDate(receivable.dueAt)?.getTime() ?? Number.POSITIVE_INFINITY;
    entries.push({
      dateLabel: formatLocalDateLabel(receivable.dueAt),
      dateSortMs: dueAtMs,
      id: `cashflow-receivable-${receivable.id}`,
      inflowMinor: receivable.amountMinor,
      netMinor: receivable.amountMinor,
      originLabel: "Cuenta por cobrar",
      outflowMinor: 0,
      partyName: receivable.customerName,
      type: "projected",
      typeLabel: "Proyectado"
    });
  });

  input.supplierPayables
    .filter((payable) => payable.balanceMinor > 0)
    .forEach((payable) => {
      const dueAtMs = parseLocalDate(payable.dueAt)?.getTime() ?? Number.POSITIVE_INFINITY;
      entries.push({
        dateLabel: formatLocalDateLabel(payable.dueAt),
        dateSortMs: dueAtMs,
        id: `cashflow-payable-${payable.id}`,
        inflowMinor: 0,
        netMinor: -payable.balanceMinor,
        originLabel: "Cuenta por pagar",
        outflowMinor: payable.balanceMinor,
        partyName: payable.supplierName,
        type: "projected",
        typeLabel: "Proyectado"
      });
    });

  return entries.sort((left, right) => left.dateSortMs - right.dateSortMs);
}

function buildCashflowSummary(entries: CashflowEntry[]): CashflowSummary {
  return entries.reduce<CashflowSummary>(
    (summary, entry) => {
      if (entry.type === "real") {
        summary.realInflowMinor += entry.inflowMinor;
        summary.realOutflowMinor += entry.outflowMinor;
        summary.realNetMinor += entry.netMinor;
      } else {
        summary.projectedInflowMinor += entry.inflowMinor;
        summary.projectedOutflowMinor += entry.outflowMinor;
        summary.projectedNetMinor += entry.netMinor;
      }

      return summary;
    },
    {
      projectedInflowMinor: 0,
      projectedNetMinor: 0,
      projectedOutflowMinor: 0,
      realInflowMinor: 0,
      realNetMinor: 0,
      realOutflowMinor: 0
    }
  );
}

function buildCashflowPeriodRows(entries: CashflowEntry[]): CashflowPeriodRow[] {
  const periodMap = new Map<string, CashflowPeriodRow>();

  entries.forEach((entry) => {
    const key = `${entry.dateSortMs}-${entry.dateLabel}`;
    const currentRow = periodMap.get(key) ?? {
      dateLabel: entry.dateLabel,
      dateSortMs: entry.dateSortMs,
      projectedInflowMinor: 0,
      projectedNetMinor: 0,
      projectedOutflowMinor: 0,
      realInflowMinor: 0,
      realNetMinor: 0,
      realOutflowMinor: 0
    };

    if (entry.type === "real") {
      currentRow.realInflowMinor += entry.inflowMinor;
      currentRow.realOutflowMinor += entry.outflowMinor;
      currentRow.realNetMinor += entry.netMinor;
    } else {
      currentRow.projectedInflowMinor += entry.inflowMinor;
      currentRow.projectedOutflowMinor += entry.outflowMinor;
      currentRow.projectedNetMinor += entry.netMinor;
    }

    periodMap.set(key, currentRow);
  });

  return [...periodMap.values()].sort((left, right) => left.dateSortMs - right.dateSortMs);
}

function buildUtilityPeriodRows(
  sales: SaleRecord[],
  creditNotes: CreditNoteRecord[]
): UtilityPeriodRow[] {
  const periodMap = new Map<string, UtilityPeriodRow>();

  sales.forEach((sale) => {
    const occurredAt = new Date(sale.occurredAtMs);
    const dateKey = formatDateKey(occurredAt);
    const dateSortMs = new Date(
      occurredAt.getFullYear(),
      occurredAt.getMonth(),
      occurredAt.getDate()
    ).getTime();
    const costMinor = sale.lines.reduce((sum, line) => sum + line.costMinor, 0);
    const marginMinor = sale.lines.reduce((sum, line) => sum + line.marginMinor, 0);
    const currentRow = periodMap.get(dateKey) ?? {
      costMinor: 0,
      dateKey,
      dateLabel: formatDateLabel(occurredAt),
      dateSortMs,
      marginMinor: 0,
      marginPercent: 0,
      revenueMinor: 0,
      salesCount: 0
    };

    currentRow.salesCount += 1;
    currentRow.revenueMinor += sale.totalMinor;
    currentRow.costMinor += costMinor;
    currentRow.marginMinor += marginMinor;
    currentRow.marginPercent =
      currentRow.revenueMinor > 0
        ? (currentRow.marginMinor / currentRow.revenueMinor) * 100
        : 0;

    periodMap.set(dateKey, currentRow);
  });

  creditNotes.forEach((creditNote) => {
    const occurredAt = new Date(creditNote.occurredAtMs);
    const dateKey = formatDateKey(occurredAt);
    const dateSortMs = new Date(
      occurredAt.getFullYear(),
      occurredAt.getMonth(),
      occurredAt.getDate()
    ).getTime();
    const costMinor = creditNote.lines.reduce((sum, line) => sum + line.costMinor, 0);
    const currentRow = periodMap.get(dateKey) ?? {
      costMinor: 0,
      dateKey,
      dateLabel: formatDateLabel(occurredAt),
      dateSortMs,
      marginMinor: 0,
      marginPercent: 0,
      revenueMinor: 0,
      salesCount: 0
    };

    currentRow.revenueMinor = Math.max(currentRow.revenueMinor - creditNote.totalMinor, 0);
    currentRow.costMinor = Math.max(currentRow.costMinor - costMinor, 0);
    currentRow.marginMinor = currentRow.revenueMinor - currentRow.costMinor;
    currentRow.marginPercent =
      currentRow.revenueMinor > 0
        ? (currentRow.marginMinor / currentRow.revenueMinor) * 100
        : 0;

    periodMap.set(dateKey, currentRow);
  });

  return [...periodMap.values()].sort((left, right) => left.dateSortMs - right.dateSortMs);
}

function buildUtilitySummary(periodRows: UtilityPeriodRow[]): UtilitySummary {
  if (periodRows.length === 0) {
    return {
      averageMarginMinor: 0,
      bestPeriodLabel: "-",
      bestPeriodMarginMinor: 0,
      totalMarginMinor: 0,
      worstPeriodLabel: "-",
      worstPeriodMarginMinor: 0
    };
  }

  const totalMarginMinor = periodRows.reduce((sum, row) => sum + row.marginMinor, 0);
  const bestPeriod = [...periodRows].sort((left, right) => right.marginMinor - left.marginMinor)[0]!;
  const worstPeriod = [...periodRows].sort((left, right) => left.marginMinor - right.marginMinor)[0]!;

  return {
    averageMarginMinor: totalMarginMinor / periodRows.length,
    bestPeriodLabel: bestPeriod.dateLabel,
    bestPeriodMarginMinor: bestPeriod.marginMinor,
    totalMarginMinor,
    worstPeriodLabel: worstPeriod.dateLabel,
    worstPeriodMarginMinor: worstPeriod.marginMinor
  };
}

function buildExpenseEntries(input: {
  purchases: PurchaseRecord[];
  supplierPayables: SupplierPayableRecord[];
  supplierPayments: SupplierPaymentRecord[];
}): ExpenseEntry[] {
  const entries: ExpenseEntry[] = [];
  const purchaseById = new Map(input.purchases.map((purchase) => [purchase.id, purchase]));

  input.purchases.forEach((purchase) => {
    if (purchase.paymentStatus !== "paid") {
      return;
    }

    const occurredAt = new Date(purchase.occurredAtMs);

    entries.push({
      amountMinor: purchase.totalMinor,
      categoryLabel: formatExpenseCategory(purchase.expenseCategory),
      dateLabel: formatDateLabel(occurredAt),
      dateSortMs: purchase.occurredAtMs,
      id: `expense-purchase-${purchase.id}`,
      invoiceNumber: purchase.invoiceNumber,
      originLabel: "Compra pagada",
      partyName: purchase.supplierName,
      statusLabel: "Real"
    });
  });

  input.supplierPayments.forEach((payment) => {
    const paidAt = new Date(payment.paidAtMs);
    const purchase = purchaseById.get(payment.purchaseId);

    entries.push({
      amountMinor: payment.amountMinor,
      categoryLabel: formatExpenseCategory(
        payment.expenseCategory ?? purchase?.expenseCategory ?? "inventory"
      ),
      dateLabel: formatDateLabel(paidAt),
      dateSortMs: payment.paidAtMs,
      id: `expense-payment-${payment.id}`,
      invoiceNumber: purchase?.invoiceNumber ?? payment.purchaseId,
      originLabel: "Abono proveedor",
      partyName: payment.supplierName,
      statusLabel: "Real"
    });
  });

  input.supplierPayables
    .filter((payable) => payable.balanceMinor > 0)
    .forEach((payable) => {
      const dueAtMs = parseLocalDate(payable.dueAt)?.getTime() ?? Number.POSITIVE_INFINITY;

      entries.push({
        amountMinor: payable.balanceMinor,
        categoryLabel: formatExpenseCategory(payable.expenseCategory),
        dateLabel: formatLocalDateLabel(payable.dueAt),
        dateSortMs: dueAtMs,
        id: `expense-payable-${payable.id}`,
        invoiceNumber: payable.invoiceNumber,
        originLabel: "Cuenta por pagar",
        partyName: payable.supplierName,
        statusLabel: "Proyectado"
      });
    });

  return entries.sort((left, right) => left.dateSortMs - right.dateSortMs);
}

function buildExpenseSummary(entries: ExpenseEntry[]): ExpenseSummary {
  const realExpenseMinor = entries
    .filter((entry) => entry.statusLabel === "Real")
    .reduce((sum, entry) => sum + entry.amountMinor, 0);
  const projectedExpenseMinor = entries
    .filter((entry) => entry.statusLabel === "Proyectado")
    .reduce((sum, entry) => sum + entry.amountMinor, 0);

  return {
    projectedExpenseMinor,
    providerCount: new Set(entries.map((entry) => entry.partyName)).size,
    realExpenseMinor,
    totalExpenseMinor: realExpenseMinor + projectedExpenseMinor
  };
}

function buildExpenseOriginRows(entries: ExpenseEntry[]): ExpenseOriginRow[] {
  const originMap = new Map<string, ExpenseOriginRow>();
  const totalExpenseMinor = entries.reduce((sum, entry) => sum + entry.amountMinor, 0);

  entries.forEach((entry) => {
    const currentRow = originMap.get(entry.originLabel) ?? {
      amountMinor: 0,
      count: 0,
      originLabel: entry.originLabel,
      participationPercent: 0
    };

    currentRow.amountMinor += entry.amountMinor;
    currentRow.count += 1;
    currentRow.participationPercent =
      totalExpenseMinor > 0 ? (currentRow.amountMinor / totalExpenseMinor) * 100 : 0;

    originMap.set(entry.originLabel, currentRow);
  });

  return [...originMap.values()].sort((left, right) => right.amountMinor - left.amountMinor);
}

type ReportsSectionProps = {
  creditNotes: CreditNoteRecord[];
  customerReceipts: CustomerReceiptRecord[];
  formatCurrency: (minor: number) => string;
  purchases: PurchaseRecord[];
  receivables: ReceivableRecord[];
  sales: SaleRecord[];
  supplierPayables: SupplierPayableRecord[];
  supplierPayments: SupplierPaymentRecord[];
};

export function ReportsSection({
  creditNotes,
  customerReceipts,
  formatCurrency,
  purchases,
  receivables,
  sales,
  supplierPayables,
  supplierPayments
}: ReportsSectionProps) {
  const [activeReportTab, setActiveReportTab] = useState<ReportTab>("profitability");
  const [activeProfitabilityTab, setActiveProfitabilityTab] =
    useState<ProfitabilityTab>("overview");
  const [detailView, setDetailView] = useState<ReportDetailView>(null);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);

  const summary = buildMarginSummary(sales, creditNotes);
  const productRows = buildProductMarginRows(sales, creditNotes);
  const customerRows = buildCustomerMarginRows(sales, creditNotes);
  const sellerRows = buildSellerMarginRows(sales, creditNotes);
  const saleRows = buildSaleMarginRows(sales, creditNotes);
  const productMaxMargin = productRows[0]?.marginMinor ?? 0;
  const customerMaxMargin = customerRows[0]?.marginMinor ?? 0;
  const sellerMaxRevenue = sellerRows[0]?.revenueMinor ?? 0;
  const saleMaxMargin = saleRows[0]?.marginMinor ?? 0;
  const selectedSale = selectedSaleId
    ? sales.find((sale) => sale.id === selectedSaleId) ?? null
    : null;
  const dsoSummary = buildDsoSummary({ receivables, sales });
  const dsoClientRows = buildDsoClientRows({ receivables, sales });
  const cashflowEntries = buildCashflowEntries({
    creditNotes,
    customerReceipts,
    purchases,
    receivables,
    sales,
    supplierPayables,
    supplierPayments
  });
  const cashflowSummary = buildCashflowSummary(cashflowEntries);
  const cashflowPeriodRows = buildCashflowPeriodRows(cashflowEntries);
  const cashflowMaxNet = Math.max(
    1,
    ...cashflowPeriodRows.flatMap((row) => [
      Math.abs(row.realNetMinor),
      Math.abs(row.projectedNetMinor)
    ])
  );
  const expenseEntries = buildExpenseEntries({
    purchases,
    supplierPayables,
    supplierPayments
  });
  const expenseSummary = buildExpenseSummary(expenseEntries);
  const expenseOriginRows = buildExpenseOriginRows(expenseEntries);
  const expenseMaxAmount = Math.max(1, ...expenseOriginRows.map((row) => row.amountMinor));
  const utilityPeriodRows = buildUtilityPeriodRows(sales, creditNotes);
  const utilitySummary = buildUtilitySummary(utilityPeriodRows);
  const utilityMaxMargin = Math.max(1, ...utilityPeriodRows.map((row) => Math.abs(row.marginMinor)));
  const netMarginMinor = summary.marginMinor;
  const topCustomerRows = customerRows.slice(0, 10);
  const topProductRows = productRows.slice(0, 10);
  const topSellerRows = sellerRows.slice(0, 10);
  const topSaleRows = saleRows.slice(0, 10);

  const reportTabs: Array<{ id: ReportTab; label: string; title: string }> = [
    { id: "profitability", label: "Rentabilidad", title: "Rentabilidad" },
    { id: "dso", label: "DSO", title: "DSO" },
    { id: "cashflow", label: "Flujo de caja", title: "Flujo de caja" },
    { id: "expenses", label: "Egresos", title: "Egresos" },
    { id: "variance", label: "Utilidades", title: "Utilidades" }
  ];

  const profitabilityTabs: Array<{ id: ProfitabilityTab; label: string }> = [
    { id: "overview", label: "Dashboard general" },
    { id: "customer", label: "Clientes" },
    { id: "product", label: "Producto" },
    { id: "seller", label: "Vendedores" },
    { id: "sales", label: "Ventas" }
  ];

  function selectReportTab(tab: ReportTab) {
    setActiveReportTab(tab);
    setDetailView(null);
    setSelectedSaleId(null);
  }

  function selectProfitabilityTab(tab: ProfitabilityTab) {
    setActiveProfitabilityTab(tab);
    setDetailView(null);
    setSelectedSaleId(null);
  }

  function renderProfitabilitySummary() {
    const items = [
      { label: "Ingresos totales", value: formatCurrency(summary.revenueMinor) },
      { label: "Costo de ventas", value: formatCurrency(summary.costMinor) },
      { label: "Margen bruto", value: formatCurrency(summary.marginMinor) },
      { label: "Margen neto", value: formatCurrency(netMarginMinor) },
      { label: "% margen", value: formatPercent(summary.marginPercent) }
    ];

    return <CompactSummaryGrid ariaLabel="Resumen rentabilidad general" items={items} />;
  }

  function renderProfitabilityLayout(content: ReactNode, withSummary = false) {
    return (
      <section className="reports-layout">
        {renderReportTabs()}
        {renderProfitabilityTabs()}
        {withSummary ? <ReportSummaryShell>{renderProfitabilitySummary()}</ReportSummaryShell> : null}
        {content}
      </section>
    );
  }

  function renderReportSupportingContent(content: ReactNode) {
    return (
      <section className="report-supporting-content" aria-label="Contenido secundario del reporte">
        {content}
      </section>
    );
  }

  function renderReportTabs() {
    return (
      <section className="reports-nav-group" aria-label="Navegacion de reportes">
        <SubmenuSwitch
          ariaLabel="Tipos de reportes"
          items={reportTabs.map((tab) => ({ label: tab.label, value: tab.id }))}
          onSelect={selectReportTab}
          selectedValue={activeReportTab}
        />
      </section>
    );
  }

  function renderProfitabilityTabs() {
    return (
      <section className="reports-nav-group reports-nav-group-secondary" aria-label="Subnavegacion de reportes">
        <SubmenuSwitch
          ariaLabel="Tipos de rentabilidad"
          items={profitabilityTabs.map((tab) => ({ label: tab.label, value: tab.id }))}
          onSelect={selectProfitabilityTab}
          selectedValue={activeProfitabilityTab}
        />
      </section>
    );
  }

  if (activeReportTab === "dso") {
    const summaryItems = [
      { label: "DSO global", value: formatDays(dsoSummary.dsoDays) },
      {
        label: "Cartera abierta",
        value: formatCurrency(dsoSummary.activeReceivablesMinor)
      },
      { label: "Clientes con saldo", value: String(dsoSummary.clientCount) },
      { label: "Facturas abiertas", value: String(dsoSummary.openInvoiceCount) }
    ];

    return (
      <section className="reports-layout">
        {renderReportTabs()}
        <ReportSummaryShell>
          <CompactSummaryGrid ariaLabel="Resumen DSO" items={summaryItems} />
        </ReportSummaryShell>

        {dsoClientRows.length === 0 ? (
          <EmptyState
            body="Las ventas pendientes de cobro apareceran aqui para medir dias de recaudo."
            className="section-empty"
            title="Sin cartera pendiente para DSO"
          />
        ) : (
          <ReportPrimaryInsightPanel
            title="DSO"
            description="Top clientes que mas empujan el promedio actual de cobro."
          >
              <DataTable ariaLabel="Impacto DSO por cliente">
              <DataTableHeader
                labels={[
                  "Cliente",
                  "Saldo pendiente",
                  "Participacion",
                  "DSO cliente",
                  "Facturas abiertas"
                ]}
              />
              <tbody>
                {dsoClientRows.map((row) => (
                  <tr key={row.customerId}>
                    <td>{row.customerName}</td>
                    <td>{formatCurrency(row.receivableMinor)}</td>
                    <td>{formatPercent(row.participationPercent)}</td>
                    <td>{formatDays(row.averageOutstandingDays)}</td>
                    <td>{row.invoiceCount}</td>
                  </tr>
                ))}
              </tbody>
              </DataTable>
          </ReportPrimaryInsightPanel>
        )}
      </section>
    );
  }

  if (activeReportTab === "cashflow") {
    const summaryItems = [
      {
        label: "Entradas reales",
        value: formatCurrency(cashflowSummary.realInflowMinor)
      },
      {
        label: "Salidas reales",
        value: formatCurrency(cashflowSummary.realOutflowMinor)
      },
      { label: "Flujo neto real", value: formatCurrency(cashflowSummary.realNetMinor) },
      {
        label: "Flujo neto proyectado",
        value: formatCurrency(cashflowSummary.projectedNetMinor)
      }
    ];

    return (
      <section className="reports-layout">
        {renderReportTabs()}
        <ReportSummaryShell>
          <CompactSummaryGrid ariaLabel="Resumen flujo de caja" items={summaryItems} />
        </ReportSummaryShell>

        {cashflowEntries.length === 0 ? (
          <EmptyState
            body="Registra ventas, compras o cartera pendiente para activar este reporte."
            className="section-empty"
            title="Sin movimientos para flujo de caja"
          />
        ) : (
          <>
            <ReportPrimaryInsightPanel
              title="Flujo de caja"
              description="Comparativo entre movimientos reales y compromisos proyectados por fecha."
            >
                <div className="report-chart report-chart-detail" aria-label="Grafico flujo de caja comparativo">
                {cashflowPeriodRows.map((row) => (
                  <div className="cashflow-chart-row" key={`${row.dateSortMs}-${row.dateLabel}`}>
                    <span>{row.dateLabel}</span>
                    <div className="cashflow-chart-bars">
                      <div className="cashflow-bar-group">
                        <small>Real</small>
                        <div className="report-bar-track">
                          <div
                            className={`report-bar-fill ${row.realNetMinor < 0 ? "report-bar-fill-negative" : ""}`}
                            style={{ width: `${(Math.abs(row.realNetMinor) / cashflowMaxNet) * 100}%` }}
                          />
                        </div>
                        <strong>{formatCurrency(row.realNetMinor)}</strong>
                      </div>
                      <div className="cashflow-bar-group">
                        <small>Proyectado</small>
                        <div className="report-bar-track">
                          <div
                            className={`report-bar-fill ${row.projectedNetMinor < 0 ? "report-bar-fill-negative" : ""}`}
                            style={{
                              width: `${(Math.abs(row.projectedNetMinor) / cashflowMaxNet) * 100}%`
                            }}
                          />
                        </div>
                        <strong>{formatCurrency(row.projectedNetMinor)}</strong>
                      </div>
                    </div>
                  </div>
                ))}
                </div>
            </ReportPrimaryInsightPanel>

            {renderReportSupportingContent(
              <DataTable ariaLabel="Detalle flujo de caja">
                <DataTableHeader
                  labels={["Fecha", "Tipo", "Origen", "Tercero", "Entrada", "Salida", "Neto"]}
                />
                <tbody>
                  {cashflowEntries.map((entry) => (
                    <tr key={entry.id}>
                      <td>{entry.dateLabel}</td>
                      <td>{entry.typeLabel}</td>
                      <td>{entry.originLabel}</td>
                      <td>{entry.partyName}</td>
                      <td>{formatCurrency(entry.inflowMinor)}</td>
                      <td>{formatCurrency(entry.outflowMinor)}</td>
                      <td>{formatCurrency(entry.netMinor)}</td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            )}
          </>
        )}
      </section>
    );
  }

  if (activeReportTab === "expenses") {
    const summaryItems = [
      {
        label: "Egresos reales",
        value: formatCurrency(expenseSummary.realExpenseMinor)
      },
      {
        label: "Egresos proyectados",
        value: formatCurrency(expenseSummary.projectedExpenseMinor)
      },
      {
        label: "Compromisos totales",
        value: formatCurrency(expenseSummary.totalExpenseMinor)
      },
      {
        label: "Proveedores",
        value: String(expenseSummary.providerCount)
      }
    ];

    return (
      <section className="reports-layout">
        {renderReportTabs()}
        <ReportSummaryShell>
          <CompactSummaryGrid ariaLabel="Resumen egresos" items={summaryItems} />
        </ReportSummaryShell>

        {expenseEntries.length === 0 ? (
          <EmptyState
            body="Registra compras pagadas, abonos o cuentas por pagar para detallar los egresos."
            className="section-empty"
            title="Sin egresos para analizar"
          />
        ) : (
          <>
            <ReportPrimaryInsightPanel
              title="Egresos"
              description="Salidas reales y compromisos proyectados agrupados por origen."
            >
              <div className="report-chart report-chart-detail" aria-label="Grafico egresos por origen">
                {expenseOriginRows.map((row) => (
                  <div className="report-bar-row report-bar-row-detail" key={row.originLabel}>
                    <span>{row.originLabel}</span>
                    <div className="report-bar-track">
                      <div
                        className="report-bar-fill report-bar-fill-negative"
                        style={{ width: `${(row.amountMinor / expenseMaxAmount) * 100}%` }}
                      />
                    </div>
                    <strong>{formatCurrency(row.amountMinor)}</strong>
                  </div>
                ))}
              </div>
            </ReportPrimaryInsightPanel>

            {renderReportSupportingContent(
              <>
                <DataTable ariaLabel="Resumen egresos por origen">
                  <DataTableHeader
                    labels={["Origen", "Valor", "Participacion", "Movimientos"]}
                  />
                  <tbody>
                    {expenseOriginRows.map((row) => (
                      <tr key={row.originLabel}>
                        <td>{row.originLabel}</td>
                        <td>{formatCurrency(row.amountMinor)}</td>
                        <td>{formatPercent(row.participationPercent)}</td>
                        <td>{row.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>

                <DataTable ariaLabel="Detalle egresos">
                  <DataTableHeader
                    labels={["Fecha", "Estado", "Origen", "Proveedor", "Factura", "Valor"]}
                  />
                  <tbody>
                    {expenseEntries.map((entry) => (
                      <tr key={entry.id}>
                        <td>{entry.dateLabel}</td>
                        <td>{entry.statusLabel}</td>
                        <td>{entry.originLabel}</td>
                        <td>{entry.partyName}</td>
                        <td>{entry.invoiceNumber}</td>
                        <td>{formatCurrency(entry.amountMinor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
              </>
            )}
          </>
        )}
      </section>
    );
  }

  if (activeReportTab === "variance") {
    const summaryItems = [
      {
        label: "Utilidad total",
        value: formatCurrency(utilitySummary.totalMarginMinor)
      },
      {
        label: "Promedio por periodo",
        value: formatCurrency(utilitySummary.averageMarginMinor)
      },
      {
        label: "Mejor periodo",
        value: `${utilitySummary.bestPeriodLabel} · ${formatCurrency(utilitySummary.bestPeriodMarginMinor)}`
      },
      {
        label: "Peor periodo",
        value: `${utilitySummary.worstPeriodLabel} · ${formatCurrency(utilitySummary.worstPeriodMarginMinor)}`
      }
    ];

    return (
      <section className="reports-layout">
        {renderReportTabs()}
        <ReportSummaryShell>
          <CompactSummaryGrid ariaLabel="Resumen utilidades" items={summaryItems} />
        </ReportSummaryShell>

        {utilityPeriodRows.length === 0 ? (
          <EmptyState
            body="Registra ventas para construir la utilidad por periodo."
            className="section-empty"
            title="Sin utilidades para analizar"
          />
        ) : (
          <>
            <ReportPrimaryInsightPanel
              title="Utilidades"
              description="Utilidad total por dia con ventas, costo y margen consolidado."
            >
                <div className="report-chart report-chart-detail" aria-label="Grafico utilidades por periodo">
                {utilityPeriodRows.map((row) => (
                  <div className="report-bar-row report-bar-row-detail" key={row.dateKey}>
                    <span>{row.dateLabel}</span>
                    <div className="report-bar-track">
                      <div
                        className="report-bar-fill"
                        style={{ width: `${(Math.abs(row.marginMinor) / utilityMaxMargin) * 100}%` }}
                      />
                    </div>
                    <strong>{formatCurrency(row.marginMinor)}</strong>
                  </div>
                ))}
                </div>
            </ReportPrimaryInsightPanel>

            {renderReportSupportingContent(
              <DataTable ariaLabel="Detalle utilidades por periodo">
                <DataTableHeader
                  labels={[
                    "Periodo",
                    "Ventas",
                    "Costo",
                    "Utilidad",
                    "% margen",
                    "Numero de ventas"
                  ]}
                />
                <tbody>
                  {utilityPeriodRows.map((row) => (
                    <tr key={row.dateKey}>
                      <td>{row.dateLabel}</td>
                      <td>{formatCurrency(row.revenueMinor)}</td>
                      <td>{formatCurrency(row.costMinor)}</td>
                      <td>{formatCurrency(row.marginMinor)}</td>
                      <td>{formatPercent(row.marginPercent)}</td>
                      <td>{row.salesCount}</td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            )}
          </>
        )}
      </section>
    );
  }

  if (activeReportTab !== "profitability") {
    const selectedTab = reportTabs.find((tab) => tab.id === activeReportTab) ?? reportTabs[0]!;

    return (
      <section className="reports-layout">
        {renderReportTabs()}
        <EmptyState
          body="Este reporte aparecera aqui cuando terminemos su implementacion."
          className="report-placeholder-panel"
          heading={selectedTab.title}
          title="Proximamente"
        />
      </section>
    );
  }

  if (sales.length === 0) {
    return (
      <section className="reports-layout">
        {renderReportTabs()}
        {renderProfitabilityTabs()}
        <EmptyState
          body="Registra ventas para habilitar los reportes de rentabilidad."
          className="section-empty"
          title="Sin ventas para analizar"
        />
      </section>
    );
  }

  if (detailView === "product") {
    return renderProfitabilityLayout(
      <>
        <ReportPrimaryInsightPanel
          title="Margen por producto"
          description="Utilidad agregada por producto vendida en el periodo analizado."
          onBack={() => setDetailView(null)}
        >
          <div className="report-chart report-chart-detail" aria-label="Grafico detalle margen por producto">
            {productRows.map((row) => (
              <div className="report-bar-row report-bar-row-detail" key={row.productId}>
                <span>{row.productName}</span>
                <div className="report-bar-track">
                  <div
                    className="report-bar-fill"
                    style={{
                      width: `${productMaxMargin > 0 ? (row.marginMinor / productMaxMargin) * 100 : 0}%`
                    }}
                  />
                </div>
                <strong>{formatCurrency(row.marginMinor)}</strong>
              </div>
            ))}
          </div>
        </ReportPrimaryInsightPanel>
        {renderReportSupportingContent(
          <DataTable ariaLabel="Detalle margen por producto">
            <DataTableHeader
              labels={["Producto", "Unidades", "Ventas", "Costo", "Utilidad", "% margen"]}
            />
            <tbody>
              {productRows.map((row) => (
                <tr key={row.productId}>
                  <td>{row.productName}</td>
                  <td>{row.quantity}</td>
                  <td>{formatCurrency(row.revenueMinor)}</td>
                  <td>{formatCurrency(row.costMinor)}</td>
                  <td>{formatCurrency(row.marginMinor)}</td>
                  <td>{formatPercent(row.marginPercent)}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </>,
      true
    );
  }

  if (detailView === "customer") {
    return renderProfitabilityLayout(
      <>
        <ReportPrimaryInsightPanel
          title="Margen por cliente"
          description="Utilidad consolidada por cliente para comparar variacion comercial."
          onBack={() => setDetailView(null)}
        >
          <div className="report-chart report-chart-detail" aria-label="Grafico detalle margen por cliente">
            {customerRows.map((row) => (
              <div className="report-bar-row report-bar-row-detail" key={row.customerId}>
                <span>{row.customerName}</span>
                <div className="report-bar-track">
                  <div
                    className="report-bar-fill"
                    style={{
                      width: `${customerMaxMargin > 0 ? (row.marginMinor / customerMaxMargin) * 100 : 0}%`
                    }}
                  />
                </div>
                <strong>{formatCurrency(row.marginMinor)}</strong>
              </div>
            ))}
          </div>
        </ReportPrimaryInsightPanel>
        {renderReportSupportingContent(
          <DataTable ariaLabel="Detalle margen por cliente">
            <DataTableHeader
              labels={["Cliente", "Ventas", "Costo", "Utilidad", "% margen", "Compras"]}
            />
            <tbody>
              {customerRows.map((row) => (
                <tr key={row.customerId}>
                  <td>{row.customerName}</td>
                  <td>{formatCurrency(row.revenueMinor)}</td>
                  <td>{formatCurrency(row.costMinor)}</td>
                  <td>{formatCurrency(row.marginMinor)}</td>
                  <td>{formatPercent(row.marginPercent)}</td>
                  <td>{row.purchaseCount}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </>,
      true
    );
  }

  if (detailView === "seller") {
    return renderProfitabilityLayout(
      <>
        <ReportPrimaryInsightPanel
          title="Ventas por vendedor"
          description="Ingresos, utilidad y cantidad de ventas agrupadas por vendedor."
          onBack={() => setDetailView(null)}
        >
          <div className="report-chart report-chart-detail" aria-label="Grafico detalle ventas por vendedor">
            {sellerRows.map((row) => (
              <div className="report-bar-row report-bar-row-detail" key={row.sellerName}>
                <span>{row.sellerName}</span>
                <div className="report-bar-track">
                  <div
                    className="report-bar-fill"
                    style={{
                      width: `${sellerMaxRevenue > 0 ? (row.revenueMinor / sellerMaxRevenue) * 100 : 0}%`
                    }}
                  />
                </div>
                <strong>{formatCurrency(row.revenueMinor)}</strong>
              </div>
            ))}
          </div>
        </ReportPrimaryInsightPanel>
        {renderReportSupportingContent(
          <DataTable ariaLabel="Detalle ventas por vendedor">
            <DataTableHeader
              labels={["Vendedor", "Ventas", "Costo", "Utilidad", "% margen", "Cantidad"]}
            />
            <tbody>
              {sellerRows.map((row) => (
                <tr key={row.sellerName}>
                  <td>{row.sellerName}</td>
                  <td>{formatCurrency(row.revenueMinor)}</td>
                  <td>{formatCurrency(row.costMinor)}</td>
                  <td>{formatCurrency(row.marginMinor)}</td>
                  <td>{formatPercent(row.marginPercent)}</td>
                  <td>{row.saleCount}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </>,
      true
    );
  }

  if (detailView === "sales") {
    return renderProfitabilityLayout(
      <>
        <ReportPrimaryInsightPanel
          title="Margen por venta"
          description="Rentabilidad total por venta y acceso al detalle por producto de cada factura."
          onBack={() => setDetailView(null)}
        />
        {renderReportSupportingContent(
          <DataTable ariaLabel="Detalle margen por venta">
            <DataTableHeader
              labels={[
                "Venta",
                "Fecha",
                "Cliente",
                "Estado",
                "Ventas",
                "Costo",
                "Utilidad",
                "% margen",
                "Accion"
              ]}
            />
            <tbody>
              {saleRows.map((row) => (
                <tr key={row.saleId}>
                  <td>{row.saleId}</td>
                  <td>{row.occurredAtLabel}</td>
                  <td>{row.customerName}</td>
                  <td>{row.paymentStatus === "paid" ? "Pagada" : "Pendiente"}</td>
                  <td>{formatCurrency(row.revenueMinor)}</td>
                  <td>{formatCurrency(row.costMinor)}</td>
                  <td>{formatCurrency(row.marginMinor)}</td>
                  <td>{formatPercent(row.marginPercent)}</td>
                  <td>
                    <SecondaryActionButton
                      aria-label={`Ver detalle de venta ${row.saleId}`}
                      onClick={() => {
                        setSelectedSaleId(row.saleId);
                        setDetailView("sale");
                      }}
                      variant="compact"
                    >
                      Ver detalle
                    </SecondaryActionButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </>,
      true
    );
  }

  if (detailView === "sale" && selectedSale) {
    const selectedSaleCostMinor = selectedSale.lines.reduce((sum, line) => sum + line.costMinor, 0);
    const selectedSaleMarginMinor = selectedSale.lines.reduce(
      (sum, line) => sum + line.marginMinor,
      0
    );
    const selectedSaleMarginPercent =
      selectedSale.totalMinor > 0 ? (selectedSaleMarginMinor / selectedSale.totalMinor) * 100 : 0;

    return renderProfitabilityLayout(
      <>
        <ReportPrimaryInsightPanel
          title="Margen por venta"
          description={`${selectedSale.customerName} · ${selectedSale.id} · ${selectedSale.occurredAtLabel}`}
          onBack={() => {
            setDetailView("sales");
            setSelectedSaleId(null);
          }}
        />
        {renderReportSupportingContent(
          <>
            <section className="report-sale-summary-shell" aria-label="Contexto del detalle">
              <CompactSummaryGrid
                ariaLabel="Resumen detalle de venta"
                items={[
                  { label: "Cliente", value: selectedSale.customerName },
                  { label: "Venta total", value: formatCurrency(selectedSale.totalMinor) },
                  { label: "Costo total", value: formatCurrency(selectedSaleCostMinor) },
                  { label: "Margen total", value: formatCurrency(selectedSaleMarginMinor) },
                  { label: "% margen", value: formatPercent(selectedSaleMarginPercent) }
                ]}
              />
            </section>

            <DataTable ariaLabel="Detalle margen por producto de la venta">
              <DataTableHeader
                labels={[
                  "Producto",
                  "Cantidad",
                  "Precio venta",
                  "Ventas",
                  "Costo",
                  "Utilidad",
                  "% margen"
                ]}
              />
              <tbody>
                {selectedSale.lines.map((line) => (
                  <tr key={line.id}>
                    <td>{line.productName}</td>
                    <td>{line.quantity}</td>
                    <td>{formatCurrency(line.unitPriceMinor)}</td>
                    <td>{formatCurrency(line.totalMinor)}</td>
                    <td>{formatCurrency(line.costMinor)}</td>
                    <td>{formatCurrency(line.marginMinor)}</td>
                    <td>{formatPercent(line.marginPercent)}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </>
        )}
      </>,
      true
    );
  }

  if (activeProfitabilityTab === "customer") {
    const rows = topCustomerRows.map((row) => ({
      id: row.customerId,
      label: row.customerName,
      value: formatCurrency(row.marginMinor),
      widthPercent: customerMaxMargin > 0 ? (row.marginMinor / customerMaxMargin) * 100 : 0
    }));

    return renderProfitabilityLayout(
      <ReportChartPreviewPanel
        actionLabel="Abrir detalle de margen por cliente"
        chartLabel="Grafico margen por cliente"
        description="Top clientes ordenados por utilidad real acumulada."
        onOpenDetail={() => setDetailView("customer")}
        rows={rows}
        title="Margen por cliente"
      />
    );
  }

  if (activeProfitabilityTab === "product") {
    const rows = topProductRows.map((row) => ({
      id: row.productId,
      label: row.productName,
      value: formatCurrency(row.marginMinor),
      widthPercent: productMaxMargin > 0 ? (row.marginMinor / productMaxMargin) * 100 : 0
    }));

    return renderProfitabilityLayout(
      <ReportChartPreviewPanel
        actionLabel="Abrir detalle de margen por producto"
        chartLabel="Grafico margen por producto"
        description="Productos ordenados por utilidad y volumen vendido."
        onOpenDetail={() => setDetailView("product")}
        rows={rows}
        title="Margen por producto"
      />
    );
  }

  if (activeProfitabilityTab === "seller") {
    const rows = topSellerRows.map((row) => ({
      id: row.sellerName,
      label: row.sellerName,
      value: formatCurrency(row.revenueMinor),
      widthPercent:
        sellerMaxRevenue > 0 ? (row.revenueMinor / sellerMaxRevenue) * 100 : 0
    }));

    return renderProfitabilityLayout(
      <ReportChartPreviewPanel
        actionLabel="Abrir detalle de ventas por vendedor"
        chartLabel="Grafico ventas por vendedor"
        description="Vendedores ordenados por ventas registradas."
        onOpenDetail={() => setDetailView("seller")}
        rows={rows}
        title="Ventas por vendedor"
      />
    );
  }

  if (activeProfitabilityTab === "sales") {
    const rows = topSaleRows.map((row) => ({
      id: row.saleId,
      label: row.customerName,
      value: formatCurrency(row.marginMinor),
      widthPercent: saleMaxMargin > 0 ? (row.marginMinor / saleMaxMargin) * 100 : 0
    }));

    return renderProfitabilityLayout(
      <ReportChartPreviewPanel
        actionLabel="Abrir detalle de margen por venta"
        chartLabel="Grafico margen por venta"
        description="Rentabilidad por venta completa, con acceso al desglose por linea."
        onOpenDetail={() => setDetailView("sales")}
        rows={rows}
        title="Margen por venta"
      />
    );
  }

  return renderProfitabilityLayout(
    <ReportPrimaryInsightPanel
      title="Estado de perdidas y ganancias"
      description="Vista macro de ingresos, costo de ventas y utilidad final del periodo analizado."
    >
        <div className="report-waterfall" aria-label="Grafico cascada de utilidad">
          <div className="report-waterfall-step">
            <span>Ingresos</span>
            <strong>{formatCurrency(summary.revenueMinor)}</strong>
          </div>
          <div className="report-waterfall-step report-waterfall-step-negative">
            <span>Costo de ventas</span>
            <strong>{formatCurrency(summary.costMinor)}</strong>
          </div>
          <div className="report-waterfall-step">
            <span>Utilidad bruta</span>
            <strong>{formatCurrency(summary.marginMinor)}</strong>
          </div>
          <div className="report-waterfall-step">
            <span>Utilidad neta</span>
            <strong>{formatCurrency(netMarginMinor)}</strong>
          </div>
        </div>
    </ReportPrimaryInsightPanel>,
    true
  );
}

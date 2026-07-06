import { useState } from "react";
import { parseLocalDate } from "../../lib/dates";
import type {
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

type ReportDetailView = "product" | "customer" | "sales" | "sale" | null;
type ReportTab = "profitability" | "dso" | "cashflow" | "variance";
type ProfitabilityTab = "overview" | "customer" | "product" | "sales";

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

function buildMarginSummary(sales: SaleRecord[]): MarginSummary {
  const revenueMinor = sales.reduce((sum, sale) => sum + sale.totalMinor, 0);
  const costMinor = sales.reduce(
    (sum, sale) => sum + sale.lines.reduce((lineSum, line) => lineSum + line.costMinor, 0),
    0
  );
  const marginMinor = revenueMinor - costMinor;

  return {
    costMinor,
    marginMinor,
    marginPercent: revenueMinor > 0 ? (marginMinor / revenueMinor) * 100 : 0,
    revenueMinor,
    salesCount: sales.length
  };
}

function buildProductMarginRows(sales: SaleRecord[]): ProductMarginRow[] {
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

  return [...productMap.values()].sort((left, right) => right.marginMinor - left.marginMinor);
}

function buildCustomerMarginRows(sales: SaleRecord[]): CustomerMarginRow[] {
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

  return [...customerMap.values()].sort((left, right) => right.marginMinor - left.marginMinor);
}

function buildSaleMarginRows(sales: SaleRecord[]): SaleMarginRow[] {
  return sales.map((sale) => {
    const costMinor = sale.lines.reduce((sum, line) => sum + line.costMinor, 0);
    const marginMinor = sale.lines.reduce((sum, line) => sum + line.marginMinor, 0);

    return {
      costMinor,
      customerName: sale.customerName,
      marginMinor,
      marginPercent: sale.totalMinor > 0 ? (marginMinor / sale.totalMinor) * 100 : 0,
      occurredAtLabel: sale.occurredAtLabel,
      paymentStatus: sale.paymentStatus,
      revenueMinor: sale.totalMinor,
      saleId: sale.id
    };
  });
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
  purchases: PurchaseRecord[];
  receivables: ReceivableRecord[];
  sales: SaleRecord[];
  supplierPayables: SupplierPayableRecord[];
  supplierPayments: SupplierPaymentRecord[];
}): CashflowEntry[] {
  const entries: CashflowEntry[] = [];

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

function buildUtilityPeriodRows(sales: SaleRecord[]): UtilityPeriodRow[] {
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

type ReportsSectionProps = {
  formatCurrency: (minor: number) => string;
  purchases: PurchaseRecord[];
  receivables: ReceivableRecord[];
  sales: SaleRecord[];
  supplierPayables: SupplierPayableRecord[];
  supplierPayments: SupplierPaymentRecord[];
};

export function ReportsSection({
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

  const summary = buildMarginSummary(sales);
  const productRows = buildProductMarginRows(sales);
  const customerRows = buildCustomerMarginRows(sales);
  const saleRows = buildSaleMarginRows(sales);
  const productMaxMargin = productRows[0]?.marginMinor ?? 0;
  const customerMaxMargin = customerRows[0]?.marginMinor ?? 0;
  const saleMaxMargin = saleRows[0]?.marginMinor ?? 0;
  const selectedSale = selectedSaleId
    ? sales.find((sale) => sale.id === selectedSaleId) ?? null
    : null;
  const dsoSummary = buildDsoSummary({ receivables, sales });
  const dsoClientRows = buildDsoClientRows({ receivables, sales });
  const cashflowEntries = buildCashflowEntries({
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
  const utilityPeriodRows = buildUtilityPeriodRows(sales);
  const utilitySummary = buildUtilitySummary(utilityPeriodRows);
  const utilityMaxMargin = Math.max(1, ...utilityPeriodRows.map((row) => Math.abs(row.marginMinor)));
  const netMarginMinor = summary.marginMinor;
  const topCustomerRows = customerRows.slice(0, 10);
  const topProductRows = productRows.slice(0, 10);
  const topSaleRows = saleRows.slice(0, 10);

  const reportTabs: Array<{ id: ReportTab; label: string; title: string }> = [
    { id: "profitability", label: "Rentabilidad", title: "Rentabilidad" },
    { id: "dso", label: "DSO", title: "DSO" },
    { id: "cashflow", label: "Flujo de caja", title: "Flujo de caja" },
    { id: "variance", label: "Utilidades", title: "Utilidades" }
  ];

  const profitabilityTabs: Array<{ id: ProfitabilityTab; label: string }> = [
    { id: "overview", label: "Dashboard general" },
    { id: "customer", label: "Clientes" },
    { id: "product", label: "Producto" },
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
    return (
      <div className="cartera-summary" aria-label="Resumen rentabilidad general">
        <div className="summary-card">
          <span>Ingresos totales</span>
          <strong>{formatCurrency(summary.revenueMinor)}</strong>
        </div>
        <div className="summary-card">
          <span>Costo de ventas</span>
          <strong>{formatCurrency(summary.costMinor)}</strong>
        </div>
        <div className="summary-card">
          <span>Margen bruto</span>
          <strong>{formatCurrency(summary.marginMinor)}</strong>
        </div>
        <div className="summary-card">
          <span>Margen neto</span>
          <strong>{formatCurrency(netMarginMinor)}</strong>
        </div>
        <div className="summary-card">
          <span>% margen</span>
          <strong>{formatPercent(summary.marginPercent)}</strong>
        </div>
      </div>
    );
  }

  function renderReportTabs() {
    return (
      <section className="reports-nav-group" aria-label="Navegacion de reportes">
        <div className="reports-submenu" aria-label="Tipos de reportes">
          {reportTabs.map((tab) => (
            <button
              aria-selected={activeReportTab === tab.id}
              className={activeReportTab === tab.id ? "active" : ""}
              key={tab.id}
              onClick={() => selectReportTab(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>
    );
  }

  function renderProfitabilityTabs() {
    return (
      <section className="reports-nav-group reports-nav-group-secondary" aria-label="Subnavegacion de reportes">
        <div className="reports-submenu" aria-label="Tipos de rentabilidad">
          {profitabilityTabs.map((tab) => (
            <button
              aria-selected={activeProfitabilityTab === tab.id}
              className={activeProfitabilityTab === tab.id ? "active" : ""}
              key={tab.id}
              onClick={() => selectProfitabilityTab(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>
    );
  }

  if (activeReportTab === "dso") {
    return (
      <section className="reports-layout">
        {renderReportTabs()}
        <section className="reports-summary-shell" aria-label="Resumen del reporte">
          <div className="cartera-summary" aria-label="Resumen DSO">
            <div className="summary-card">
              <span>DSO global</span>
              <strong>{formatDays(dsoSummary.dsoDays)}</strong>
            </div>
            <div className="summary-card">
              <span>Cartera abierta</span>
              <strong>{formatCurrency(dsoSummary.activeReceivablesMinor)}</strong>
            </div>
            <div className="summary-card">
              <span>Clientes con saldo</span>
              <strong>{String(dsoSummary.clientCount)}</strong>
            </div>
            <div className="summary-card">
              <span>Facturas abiertas</span>
              <strong>{String(dsoSummary.openInvoiceCount)}</strong>
            </div>
          </div>
        </section>

        {dsoClientRows.length === 0 ? (
          <div className="empty-state section-empty">
            <strong>Sin cartera pendiente para DSO</strong>
            <span>Las ventas pendientes de cobro apareceran aqui para medir dias de recaudo.</span>
          </div>
        ) : (
          <section className="report-detail-panel report-detail-panel-primary" aria-label="Insight principal del reporte">
            <div className="report-detail-header">
              <div>
                <h2>DSO</h2>
                <p>Top clientes que mas empujan el promedio actual de cobro.</p>
              </div>
            </div>

            <table className="data-table" aria-label="Impacto DSO por cliente">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Saldo pendiente</th>
                  <th>Participacion</th>
                  <th>DSO cliente</th>
                  <th>Facturas abiertas</th>
                </tr>
              </thead>
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
            </table>
          </section>
        )}
      </section>
    );
  }

  if (activeReportTab === "cashflow") {
    return (
      <section className="reports-layout">
        {renderReportTabs()}
        <section className="reports-summary-shell" aria-label="Resumen del reporte">
          <div className="cartera-summary" aria-label="Resumen flujo de caja">
            <div className="summary-card">
              <span>Entradas reales</span>
              <strong>{formatCurrency(cashflowSummary.realInflowMinor)}</strong>
            </div>
            <div className="summary-card">
              <span>Salidas reales</span>
              <strong>{formatCurrency(cashflowSummary.realOutflowMinor)}</strong>
            </div>
            <div className="summary-card">
              <span>Flujo neto real</span>
              <strong>{formatCurrency(cashflowSummary.realNetMinor)}</strong>
            </div>
            <div className="summary-card">
              <span>Flujo neto proyectado</span>
              <strong>{formatCurrency(cashflowSummary.projectedNetMinor)}</strong>
            </div>
          </div>
        </section>

        {cashflowEntries.length === 0 ? (
          <div className="empty-state section-empty">
            <strong>Sin movimientos para flujo de caja</strong>
            <span>Registra ventas, compras o cartera pendiente para activar este reporte.</span>
          </div>
        ) : (
          <>
            <section className="report-detail-panel report-detail-panel-primary" aria-label="Insight principal del reporte">
              <div className="report-detail-header">
                <div>
                  <h2>Flujo de caja</h2>
                  <p>Comparativo entre movimientos reales y compromisos proyectados por fecha.</p>
                </div>
              </div>

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
            </section>

            <table className="data-table" aria-label="Detalle flujo de caja">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Origen</th>
                  <th>Tercero</th>
                  <th>Entrada</th>
                  <th>Salida</th>
                  <th>Neto</th>
                </tr>
              </thead>
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
            </table>
          </>
        )}
      </section>
    );
  }

  if (activeReportTab === "variance") {
    return (
      <section className="reports-layout">
        {renderReportTabs()}
        <section className="reports-summary-shell" aria-label="Resumen del reporte">
          <div className="cartera-summary" aria-label="Resumen utilidades">
            <div className="summary-card">
              <span>Utilidad total</span>
              <strong>{formatCurrency(utilitySummary.totalMarginMinor)}</strong>
            </div>
            <div className="summary-card">
              <span>Promedio por periodo</span>
              <strong>{formatCurrency(utilitySummary.averageMarginMinor)}</strong>
            </div>
            <div className="summary-card">
              <span>Mejor periodo</span>
              <strong>
                {utilitySummary.bestPeriodLabel} · {formatCurrency(utilitySummary.bestPeriodMarginMinor)}
              </strong>
            </div>
            <div className="summary-card">
              <span>Peor periodo</span>
              <strong>
                {utilitySummary.worstPeriodLabel} · {formatCurrency(utilitySummary.worstPeriodMarginMinor)}
              </strong>
            </div>
          </div>
        </section>

        {utilityPeriodRows.length === 0 ? (
          <div className="empty-state section-empty">
            <strong>Sin utilidades para analizar</strong>
            <span>Registra ventas para construir la utilidad por periodo.</span>
          </div>
        ) : (
          <>
            <section className="report-detail-panel report-detail-panel-primary" aria-label="Insight principal del reporte">
              <div className="report-detail-header">
                <div>
                  <h2>Utilidades</h2>
                  <p>Utilidad total por dia con ventas, costo y margen consolidado.</p>
                </div>
              </div>

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
            </section>

            <table className="data-table" aria-label="Detalle utilidades por periodo">
              <thead>
                <tr>
                  <th>Periodo</th>
                  <th>Ventas</th>
                  <th>Costo</th>
                  <th>Utilidad</th>
                  <th>% margen</th>
                  <th>Numero de ventas</th>
                </tr>
              </thead>
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
            </table>
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
        <section className="report-placeholder-panel">
          <h2>{selectedTab.title}</h2>
          <strong>Proximamente</strong>
          <span>Este reporte aparecera aqui cuando terminemos su implementacion.</span>
        </section>
      </section>
    );
  }

  if (sales.length === 0) {
    return (
      <section className="reports-layout">
        {renderReportTabs()}
        {renderProfitabilityTabs()}
        <div className="empty-state section-empty">
          <strong>Sin ventas para analizar</strong>
          <span>Registra ventas para habilitar los reportes de rentabilidad.</span>
        </div>
      </section>
    );
  }

  if (detailView === "product") {
    return (
      <section className="reports-layout">
        {renderReportTabs()}
        {renderProfitabilityTabs()}
        <section className="reports-summary-shell" aria-label="Resumen del reporte">
          {renderProfitabilitySummary()}
        </section>

        <section className="report-detail-panel">
          <div className="report-detail-header">
            <button className="table-action" onClick={() => setDetailView(null)} type="button">
              Volver a resumen
            </button>
            <div>
              <h2>Margen por producto</h2>
              <p>Utilidad agregada por producto vendida en el periodo analizado.</p>
            </div>
          </div>

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

          <table className="data-table" aria-label="Detalle margen por producto">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Unidades</th>
                <th>Ventas</th>
                <th>Costo</th>
                <th>Utilidad</th>
                <th>% margen</th>
              </tr>
            </thead>
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
          </table>
        </section>
      </section>
    );
  }

  if (detailView === "customer") {
    return (
      <section className="reports-layout">
        {renderReportTabs()}
        {renderProfitabilityTabs()}
        <section className="reports-summary-shell" aria-label="Resumen del reporte">
          {renderProfitabilitySummary()}
        </section>

        <section className="report-detail-panel">
          <div className="report-detail-header">
            <button className="table-action" onClick={() => setDetailView(null)} type="button">
              Volver a resumen
            </button>
            <div>
              <h2>Margen por cliente</h2>
              <p>Utilidad consolidada por cliente para comparar variacion comercial.</p>
            </div>
          </div>

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

          <table className="data-table" aria-label="Detalle margen por cliente">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Ventas</th>
                <th>Costo</th>
                <th>Utilidad</th>
                <th>% margen</th>
                <th>Compras</th>
              </tr>
            </thead>
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
          </table>
        </section>
      </section>
    );
  }

  if (detailView === "sales") {
    return (
      <section className="reports-layout">
        {renderReportTabs()}
        {renderProfitabilityTabs()}
        <section className="reports-summary-shell" aria-label="Resumen del reporte">
          {renderProfitabilitySummary()}
        </section>

        <section className="report-detail-panel">
          <div className="report-detail-header">
            <button className="table-action" onClick={() => setDetailView(null)} type="button">
              Volver a resumen
            </button>
            <div>
              <h2>Margen por venta</h2>
              <p>Rentabilidad total por venta y acceso al detalle por producto de cada factura.</p>
            </div>
          </div>

          <table className="data-table" aria-label="Detalle margen por venta">
            <thead>
              <tr>
                <th>Venta</th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Estado</th>
                <th>Ventas</th>
                <th>Costo</th>
                <th>Utilidad</th>
                <th>% margen</th>
                <th>Accion</th>
              </tr>
            </thead>
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
                    <button
                      aria-label={`Ver detalle de venta ${row.saleId}`}
                      className="table-action"
                      onClick={() => {
                        setSelectedSaleId(row.saleId);
                        setDetailView("sale");
                      }}
                      type="button"
                    >
                      Ver detalle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </section>
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

    return (
      <section className="reports-layout">
        {renderReportTabs()}
        {renderProfitabilityTabs()}
        <section className="reports-summary-shell" aria-label="Resumen del reporte">
          {renderProfitabilitySummary()}
        </section>

        <section className="report-detail-panel">
          <div className="report-detail-header">
            <button
              className="table-action"
              onClick={() => {
                setDetailView("sales");
                setSelectedSaleId(null);
              }}
              type="button"
            >
              Volver a resumen
            </button>
            <div>
              <h2>Margen por venta</h2>
              <p>
                {selectedSale.customerName} · {selectedSale.id} · {selectedSale.occurredAtLabel}
              </p>
            </div>
          </div>

          <div className="report-sale-summary">
            <div className="summary-card">
              <span>Cliente</span>
              <strong>{selectedSale.customerName}</strong>
            </div>
            <div className="summary-card">
              <span>Venta total</span>
              <strong>{formatCurrency(selectedSale.totalMinor)}</strong>
            </div>
            <div className="summary-card">
              <span>Costo total</span>
              <strong>{formatCurrency(selectedSaleCostMinor)}</strong>
            </div>
            <div className="summary-card">
              <span>Margen total</span>
              <strong>{formatCurrency(selectedSaleMarginMinor)}</strong>
            </div>
            <div className="summary-card">
              <span>% margen</span>
              <strong>{formatPercent(selectedSaleMarginPercent)}</strong>
            </div>
          </div>

          <table className="data-table" aria-label="Detalle margen por producto de la venta">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Precio venta</th>
                <th>Ventas</th>
                <th>Costo</th>
                <th>Utilidad</th>
                <th>% margen</th>
              </tr>
            </thead>
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
          </table>
        </section>
      </section>
    );
  }

  if (activeProfitabilityTab === "customer") {
    return (
      <section className="reports-layout">
        {renderReportTabs()}
        {renderProfitabilityTabs()}
        <section className="report-panel report-panel-single">
          <div className="report-panel-header">
            <div>
              <h2>Margen por cliente</h2>
              <p>Top clientes ordenados por utilidad real acumulada.</p>
            </div>
            <button
              className="table-action"
              onClick={() => setDetailView("customer")}
              type="button"
            >
              Ver detalle
            </button>
          </div>
          <button
            aria-label="Abrir detalle de margen por cliente"
            className="report-chart-button"
            onClick={() => setDetailView("customer")}
            type="button"
          >
            <div className="report-chart" aria-label="Grafico margen por cliente">
              {topCustomerRows.map((row) => (
                <div className="report-bar-row" key={row.customerId}>
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
          </button>
        </section>
      </section>
    );
  }

  if (activeProfitabilityTab === "product") {
    return (
      <section className="reports-layout">
        {renderReportTabs()}
        {renderProfitabilityTabs()}
        <section className="report-panel report-panel-single">
          <div className="report-panel-header">
            <div>
              <h2>Margen por producto</h2>
              <p>Productos ordenados por utilidad y volumen vendido.</p>
            </div>
            <button
              className="table-action"
              onClick={() => setDetailView("product")}
              type="button"
            >
              Ver detalle
            </button>
          </div>
          <button
            aria-label="Abrir detalle de margen por producto"
            className="report-chart-button"
            onClick={() => setDetailView("product")}
            type="button"
          >
            <div className="report-chart" aria-label="Grafico margen por producto">
              {topProductRows.map((row) => (
                <div className="report-bar-row" key={row.productId}>
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
          </button>
        </section>
      </section>
    );
  }

  if (activeProfitabilityTab === "sales") {
    return (
      <section className="reports-layout">
        {renderReportTabs()}
        {renderProfitabilityTabs()}
        <section className="report-panel report-panel-single">
          <div className="report-panel-header">
            <div>
              <h2>Margen por venta</h2>
              <p>Rentabilidad por venta completa, con acceso al desglose por linea.</p>
            </div>
            <button
              className="table-action"
              onClick={() => setDetailView("sales")}
              type="button"
            >
              Ver detalle
            </button>
          </div>
          <button
            aria-label="Abrir detalle de margen por venta"
            className="report-chart-button"
            onClick={() => setDetailView("sales")}
            type="button"
          >
            <div className="report-chart" aria-label="Grafico margen por venta">
              {topSaleRows.map((row) => (
                <div className="report-bar-row" key={row.saleId}>
                  <span>{row.customerName}</span>
                  <div className="report-bar-track">
                    <div
                      className="report-bar-fill"
                      style={{
                        width: `${saleMaxMargin > 0 ? (row.marginMinor / saleMaxMargin) * 100 : 0}%`
                      }}
                    />
                  </div>
                  <strong>{formatCurrency(row.marginMinor)}</strong>
                </div>
              ))}
            </div>
          </button>
        </section>
      </section>
    );
  }

  return (
    <section className="reports-layout">
      {renderReportTabs()}
      {renderProfitabilityTabs()}
      <section className="reports-summary-shell" aria-label="Resumen del reporte">
        {renderProfitabilitySummary()}
      </section>

      <section className="report-detail-panel report-detail-panel-primary" aria-label="Insight principal del reporte">
        <div className="report-detail-header">
          <div>
            <h2>Estado de perdidas y ganancias</h2>
            <p>Vista macro de ingresos, costo de ventas y utilidad final del periodo analizado.</p>
          </div>
        </div>

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
      </section>
    </section>
  );
}

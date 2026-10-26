import { useState } from "react";
import { EmptyState } from "../../components/EmptyState";
import { PanelHeader } from "../../components/PanelHeader";
import { SecondaryActionButton } from "../../components/SecondaryActionButton";
import { parseLocalDate } from "../../lib/dates";
import { DailySalesPanel } from "./DailySalesPanel";
import { SalesHistory } from "./SalesHistory";
import type { CreditNoteRecord, ProductRecord, ReceivableRecord, SaleRecord } from "../../types";

type DashboardTrendRow = {
  label: string;
  valueMinor: number;
};

type DashboardRankingRow = {
  id: string;
  label: string;
  meta: string;
  valueMinor: number;
};

type DashboardContentProps = {
  creditNotes: CreditNoteRecord[];
  formatCurrency: (minor: number) => string;
  lowStockProducts: ProductRecord[];
  metrics: Array<{ label: string; value: string }>;
  onOpenProducts: () => void;
  onOpenReports: () => void;
  sales: SaleRecord[];
  receivables: ReceivableRecord[];
};

export function DashboardContent({
  creditNotes,
  formatCurrency,
  lowStockProducts,
  metrics,
  onOpenProducts,
  onOpenReports,
  sales,
  receivables
}: DashboardContentProps) {
  const monthlySalesRows = buildDashboardMonthlySalesRows(sales, creditNotes);
  const productRows = buildDashboardProductRows(sales, creditNotes);
  const customerRows = buildDashboardCustomerRows(sales, creditNotes);

  return (
    <>
      <section
        className="metric-grid dashboard-metric-grid"
        aria-label="Resumen analitico"
      >
        {metrics.map((metric) => (
          <article className="metric-card" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </article>
        ))}
      </section>

      <section
        className="dashboard-primary-analysis"
        aria-label="Analisis principal"
      >
        <DailySalesPanel
          creditNotes={creditNotes}
          sales={sales}
          receivables={receivables}
          formatCurrency={formatCurrency}
          onOpenReports={onOpenReports}
        />
      </section>

      <section
        className="dashboard-chart-grid dashboard-secondary-analysis"
        aria-label="Analisis secundario"
      >
        <div className="panel dashboard-chart-panel dashboard-chart-panel-secondary dashboard-monthly-panel">
          <PanelHeader>
            <div className="dashboard-panel-copy">
              <h2>Ventas por mes</h2>
              <p>Evolución de las ventas durante el año actual.</p>
            </div>
          </PanelHeader>
          <DashboardBarChart formatCurrency={formatCurrency} rows={monthlySalesRows} />
        </div>

        <div className="panel dashboard-chart-panel dashboard-chart-panel-secondary">
          <PanelHeader>
            <div className="dashboard-panel-copy">
              <h2>Productos más vendidos</h2>
              <p>Los cinco productos con mayor valor vendido · Histórico</p>
            </div>
          </PanelHeader>
          <DashboardProductPieChart
            formatCurrency={formatCurrency}
            rows={productRows}
          />
        </div>

        <div className="panel dashboard-chart-panel dashboard-chart-panel-secondary">
          <PanelHeader>
            <div className="dashboard-panel-copy">
              <h2>Top clientes</h2>
              <p>Los cinco clientes con mayor valor comprado · Histórico</p>
            </div>
          </PanelHeader>
          <DashboardRankingList
            emptyBody="Los clientes con ventas se mostraran aqui."
            emptyTitle="Sin ventas por cliente"
            formatCurrency={formatCurrency}
            rows={customerRows}
          />
        </div>
      </section>

      <SalesHistory sales={sales} receivables={receivables} formatCurrency={formatCurrency} />

      <section className="dashboard-operational-grid" aria-label="Alertas operativas">
        <div className="panel dashboard-operational-panel">
          <PanelHeader
            action={
              <SecondaryActionButton onClick={onOpenProducts} variant="compact">
                Revisar
              </SecondaryActionButton>
            }
          >
            <h2>Inventario bajo</h2>
          </PanelHeader>
          {lowStockProducts.length > 0 ? (
            <ul className="alert-list" aria-label="Productos con bajo stock">
              {lowStockProducts.map((product) => (
                <li key={product.id}>
                  <strong>{product.name}</strong>
                  <span>
                    Stock {product.stock} / minimo {product.minimumStock}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              body="Los productos bajo el minimo se mostraran aqui."
              title="Sin alertas"
            />
          )}
        </div>
      </section>
    </>
  );
}

function getSaleDashboardDate(sale: SaleRecord): Date {
  return parseLocalDate(sale.issuedAt) ?? new Date(sale.occurredAtMs);
}

function getCreditNoteDashboardDate(creditNote: CreditNoteRecord): Date {
  return parseLocalDate(creditNote.issuedAt) ?? new Date(creditNote.occurredAtMs);
}

function buildDashboardMonthlySalesRows(
  sales: SaleRecord[],
  creditNotes: CreditNoteRecord[],
  referenceDate = new Date()
): DashboardTrendRow[] {
  const totalsByMonth = new Map<number, number>();
  const formatter = new Intl.DateTimeFormat("es-CO", { month: "short" });

  sales.forEach((sale) => {
    const occurredAt = getSaleDashboardDate(sale);

    if (occurredAt.getFullYear() !== referenceDate.getFullYear()) {
      return;
    }

    totalsByMonth.set(
      occurredAt.getMonth(),
      (totalsByMonth.get(occurredAt.getMonth()) ?? 0) + sale.totalMinor
    );
  });

  creditNotes.forEach((creditNote) => {
    const occurredAt = getCreditNoteDashboardDate(creditNote);

    if (occurredAt.getFullYear() !== referenceDate.getFullYear()) {
      return;
    }

    totalsByMonth.set(
      occurredAt.getMonth(),
      Math.max((totalsByMonth.get(occurredAt.getMonth()) ?? 0) - creditNote.totalMinor, 0)
    );
  });

  return Array.from({ length: 12 }, (_, month) => ({
    label: formatter.format(new Date(referenceDate.getFullYear(), month, 1)),
    valueMinor: totalsByMonth.get(month) ?? 0
  }));
}

function buildDashboardProductRows(
  sales: SaleRecord[],
  creditNotes: CreditNoteRecord[]
): DashboardRankingRow[] {
  const productMap = new Map<
    string,
    { label: string; quantity: number; valueMinor: number }
  >();

  sales.forEach((sale) => {
    sale.lines.forEach((line) => {
      const currentRow = productMap.get(line.productId) ?? {
        label: line.productName,
        quantity: 0,
        valueMinor: 0
      };

      currentRow.quantity += line.quantity;
      currentRow.valueMinor += line.totalMinor;
      productMap.set(line.productId, currentRow);
    });
  });

  creditNotes.forEach((creditNote) => {
    creditNote.lines.forEach((line) => {
      const currentRow = productMap.get(line.productId) ?? {
        label: line.productName,
        quantity: 0,
        valueMinor: 0
      };

      currentRow.quantity = Math.max(currentRow.quantity - line.quantity, 0);
      currentRow.valueMinor = Math.max(currentRow.valueMinor - line.totalMinor, 0);
      productMap.set(line.productId, currentRow);
    });
  });

  return [...productMap.entries()]
    .filter(([, row]) => row.valueMinor > 0 || row.quantity > 0)
    .map(([id, row]) => ({
      id,
      label: row.label,
      meta: `${row.quantity} unidades`,
      valueMinor: row.valueMinor
    }))
    .sort((left, right) => right.valueMinor - left.valueMinor)
    .slice(0, 5);
}

function buildDashboardCustomerRows(
  sales: SaleRecord[],
  creditNotes: CreditNoteRecord[]
): DashboardRankingRow[] {
  const customerMap = new Map<
    string,
    { label: string; purchases: number; valueMinor: number }
  >();

  sales.forEach((sale) => {
    const currentRow = customerMap.get(sale.customerId) ?? {
      label: sale.customerName,
      purchases: 0,
      valueMinor: 0
    };

    currentRow.purchases += 1;
    currentRow.valueMinor += sale.totalMinor;
    customerMap.set(sale.customerId, currentRow);
  });

  creditNotes.forEach((creditNote) => {
    const currentRow = customerMap.get(creditNote.customerId) ?? {
      label: creditNote.customerName,
      purchases: 0,
      valueMinor: 0
    };

    currentRow.valueMinor = Math.max(currentRow.valueMinor - creditNote.totalMinor, 0);
    customerMap.set(creditNote.customerId, currentRow);
  });

  return [...customerMap.entries()]
    .filter(([, row]) => row.valueMinor > 0 || row.purchases > 0)
    .map(([id, row]) => ({
      id,
      label: row.label,
      meta: `${row.purchases} ventas`,
      valueMinor: row.valueMinor
    }))
    .sort((left, right) => right.valueMinor - left.valueMinor)
    .slice(0, 5);
}

function DashboardBarChart({ rows, formatCurrency }: {
  rows: DashboardTrendRow[];
  formatCurrency: (minor: number) => string;
}) {
  const maxValue = Math.max(...rows.map((row) => row.valueMinor), 0);
  const compactCurrency = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    notation: "compact",
    maximumFractionDigits: 1
  });

  if (maxValue === 0) {
    return (
      <EmptyState
        body="El comparativo mensual aparecera con las primeras ventas."
        className="dashboard-empty-state"
        title="Sin ventas registradas"
      />
    );
  }

  return (
    <div className="dashboard-bar-chart" aria-label="Grafico ventas por mes">
      {rows.map((row) => (
        <div className="dashboard-month-bar" key={row.label} title={`${row.label}: ${formatCurrency(row.valueMinor)}`}>
          <span className="dashboard-month-value">{compactCurrency.format(row.valueMinor / 100)}</span>
          <div className="dashboard-month-track">
            <span
              style={{
                height: `${row.valueMinor > 0 ? Math.max((row.valueMinor / maxValue) * 100, 3) : 0}%`
              }}
            />
          </div>
          <small>{row.label}</small>
        </div>
      ))}
    </div>
  );
}

function DashboardRankingList({
  emptyBody,
  emptyTitle,
  formatCurrency,
  rows
}: {
  emptyBody: string;
  emptyTitle: string;
  formatCurrency: (minor: number) => string;
  rows: DashboardRankingRow[];
}) {
  const maxValue = Math.max(...rows.map((row) => row.valueMinor), 0);

  if (rows.length === 0) {
    return (
      <EmptyState body={emptyBody} className="dashboard-empty-state" title={emptyTitle} />
    );
  }

  return (
    <div className="dashboard-ranking-list">
      {rows.map((row, index) => (
        <article className="dashboard-ranking-row" key={row.id}>
          <span className="dashboard-ranking-position" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
          <div className="dashboard-ranking-copy">
            <strong title={row.label}>{row.label}</strong>
            <span>{row.meta}</span>
          </div>
          <strong>{formatCurrency(row.valueMinor)}</strong>
          <div className="dashboard-ranking-track">
            <span style={{ width: `${(row.valueMinor / maxValue) * 100}%` }} />
          </div>
        </article>
      ))}
    </div>
  );
}

const dashboardPieColors = ["#0f766e", "#60a5fa", "#6366f1", "#a855f7", "#f59e0b"];

function getPiePoint(center: number, radius: number, angleDegrees: number) {
  const angleRadians = ((angleDegrees - 90) * Math.PI) / 180;

  return {
    x: center + radius * Math.cos(angleRadians),
    y: center + radius * Math.sin(angleRadians)
  };
}

function getPieSlicePath(
  center: number,
  radius: number,
  startAngle: number,
  endAngle: number
) {
  const start = getPiePoint(center, radius, startAngle);
  const end = getPiePoint(center, radius, endAngle);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${center} ${center}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
    "Z"
  ].join(" ");
}

function DashboardProductPieChart({
  formatCurrency,
  rows
}: {
  formatCurrency: (minor: number) => string;
  rows: DashboardRankingRow[];
}) {
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  if (rows.length === 0) {
    return (
      <EmptyState
        body="Los productos vendidos se mostraran aqui."
        className="dashboard-empty-state"
        title="Sin productos vendidos"
      />
    );
  }

  const totalMinor = rows.reduce((total, row) => total + row.valueMinor, 0);
  const activeProductId = selectedProductId ?? rows[0]!.id;
  const selectedRow =
    rows.find((row) => row.id === activeProductId) ?? rows[0]!;
  let currentAngle = 0;

  return (
    <div
      aria-label="Grafico productos mas vendidos"
      className="dashboard-product-pie"
    >
      <div className="dashboard-pie-visual">
        <svg
          aria-label="Torta productos mas vendidos"
          role="img"
          viewBox="0 0 220 220"
        >
          {rows.length === 1 ? (
            <circle
              className="dashboard-pie-segment active"
              cx="110"
              cy="110"
              fill={dashboardPieColors[0]}
              r="88"
            />
          ) : (
            rows.map((row, index) => {
              const sliceAngle = (row.valueMinor / totalMinor) * 360;
              const startAngle = currentAngle;
              const endAngle = currentAngle + sliceAngle;
              currentAngle = endAngle;

              return (
                <path
                  className={`dashboard-pie-segment${
                    row.id === activeProductId ? " active" : ""
                  }`}
                  d={getPieSlicePath(110, 88, startAngle, endAngle)}
                  fill={dashboardPieColors[index % dashboardPieColors.length]}
                  key={row.id}
                  onClick={() => setSelectedProductId(row.id)}
                />
              );
            })
          )}
        </svg>
      </div>

      <div className="dashboard-pie-detail">
        <span>Producto seleccionado</span>
        <strong title={selectedRow.label}>{selectedRow.label}</strong>
        <small>{selectedRow.meta}</small>
        <b>{formatCurrency(selectedRow.valueMinor)}</b>
      </div>

      <div className="dashboard-pie-legend">
        {rows.map((row, index) => {
          const percentage =
            totalMinor > 0 ? Math.round((row.valueMinor / totalMinor) * 100) : 0;

          return (
            <button
              aria-label={`Seleccionar ${row.label}`}
              aria-pressed={row.id === activeProductId}
              className={row.id === activeProductId ? "active" : ""}
              key={row.id}
              onClick={() => setSelectedProductId(row.id)}
              type="button"
            >
              <span
                aria-hidden="true"
                className="dashboard-pie-swatch"
                style={{
                  backgroundColor:
                    dashboardPieColors[index % dashboardPieColors.length]
                }}
              />
              <span title={row.label}>{row.label}</span>
              <strong>{percentage}%</strong>
            </button>
          );
        })}
      </div>
    </div>
  );
}

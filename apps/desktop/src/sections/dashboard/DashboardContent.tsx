import { useState } from "react";
import { EmptyState } from "../../components/EmptyState";
import { PanelHeader } from "../../components/PanelHeader";
import { SecondaryActionButton } from "../../components/SecondaryActionButton";
import type { ProductRecord, SaleRecord } from "../../types";

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

type DashboardPeriodOption = {
  label: string;
  value: string;
};

type DashboardTrendSeries = {
  color: "primary" | "secondary";
  label: string;
  rows: DashboardTrendRow[];
};

type DashboardContentProps = {
  formatCurrency: (minor: number) => string;
  lowStockProducts: ProductRecord[];
  metrics: Array<{ label: string; value: string }>;
  onOpenProducts: () => void;
  onOpenReports: () => void;
  sales: SaleRecord[];
};

export function DashboardContent({
  formatCurrency,
  lowStockProducts,
  metrics,
  onOpenProducts,
  onOpenReports,
  sales
}: DashboardContentProps) {
  const dailyPeriodOptions = buildDashboardPeriodOptions(sales);
  const [periodOne, setPeriodOne] = useState(dailyPeriodOptions[0]!.value);
  const [periodTwo, setPeriodTwo] = useState(
    dailyPeriodOptions[1]?.value ?? dailyPeriodOptions[0]!.value
  );
  const periodOneLabel = formatDashboardPeriodLabel(periodOne);
  const periodTwoLabel = formatDashboardPeriodLabel(periodTwo);
  const dailySalesSeries: DashboardTrendSeries[] = [
    {
      color: "primary",
      label: "Periodo 1",
      rows: buildDashboardDailySalesRows(
        sales,
        parseDashboardPeriodValue(periodOne)
      )
    },
    {
      color: "secondary",
      label: "Periodo 2",
      rows: buildDashboardDailySalesRows(
        sales,
        parseDashboardPeriodValue(periodTwo)
      )
    }
  ];
  const monthlySalesRows = buildDashboardMonthlySalesRows(sales);
  const productRows = buildDashboardProductRows(sales);
  const customerRows = buildDashboardCustomerRows(sales);

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
        <div className="panel dashboard-chart-panel dashboard-hero-panel">
          <PanelHeader
            action={
              <SecondaryActionButton onClick={onOpenReports} variant="compact">
                Ver todo
              </SecondaryActionButton>
            }
          >
            <div className="dashboard-hero-copy">
              <span>Tendencia principal</span>
              <h2>Ventas diarias</h2>
            </div>
          </PanelHeader>
          <div className="dashboard-period-controls">
            <label className="field" htmlFor="dashboard-period-one">
              <span>Periodo 1</span>
              <select
                aria-label="Periodo 1 ventas diarias"
                id="dashboard-period-one"
                onChange={(event) => setPeriodOne(event.target.value)}
                value={periodOne}
              >
                {dailyPeriodOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field" htmlFor="dashboard-period-two">
              <span>Periodo 2</span>
              <select
                aria-label="Periodo 2 ventas diarias"
                id="dashboard-period-two"
                onChange={(event) => setPeriodTwo(event.target.value)}
                value={periodTwo}
              >
                {dailyPeriodOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <DashboardAreaChart
            formatCurrency={formatCurrency}
            periodOneLabel={periodOneLabel}
            periodTwoLabel={periodTwoLabel}
            series={dailySalesSeries}
          />
        </div>
      </section>

      <section
        className="dashboard-chart-grid dashboard-secondary-analysis"
        aria-label="Analisis secundario"
      >
        <div className="panel dashboard-chart-panel">
          <PanelHeader>
            <h2>Ventas por mes</h2>
          </PanelHeader>
          <DashboardBarChart rows={monthlySalesRows} />
        </div>

        <div className="panel dashboard-chart-panel">
          <PanelHeader>
            <h2>Productos mas vendidos</h2>
          </PanelHeader>
          <DashboardProductPieChart
            formatCurrency={formatCurrency}
            rows={productRows}
          />
        </div>

        <div className="panel dashboard-chart-panel">
          <PanelHeader>
            <h2>Top clientes</h2>
          </PanelHeader>
          <DashboardRankingList
            emptyBody="Los clientes con ventas se mostraran aqui."
            emptyTitle="Sin ventas por cliente"
            formatCurrency={formatCurrency}
            rows={customerRows}
          />
        </div>
      </section>

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

function isSameLocalMonth(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth()
  );
}

function buildDashboardDailySalesRows(
  sales: SaleRecord[],
  referenceDate = new Date()
): DashboardTrendRow[] {
  const totalsByDay = new Map<number, number>();

  sales.forEach((sale) => {
    const occurredAt = new Date(sale.occurredAtMs);

    if (!isSameLocalMonth(occurredAt, referenceDate)) {
      return;
    }

    totalsByDay.set(
      occurredAt.getDate(),
      (totalsByDay.get(occurredAt.getDate()) ?? 0) + sale.totalMinor
    );
  });

  return Array.from({ length: 31 }, (_, index) => {
    const day = index + 1;

    return {
      label: String(day),
      valueMinor: totalsByDay.get(day) ?? 0
    };
  });
}

function formatDashboardPeriodValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

function formatDashboardPeriodLabel(value: string): string {
  const [year, month] = value.split("-").map(Number);

  if (!year || !month) {
    return value;
  }

  return new Intl.DateTimeFormat("es-CO", {
    month: "long",
    year: "numeric"
  }).format(new Date(year, month - 1, 1));
}

function parseDashboardPeriodValue(value: string): Date {
  const [year, month] = value.split("-").map(Number);

  if (!year || !month) {
    return new Date();
  }

  return new Date(year, month - 1, 1);
}

function shiftMonth(date: Date, offset: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
}

function buildDashboardPeriodOptions(
  sales: SaleRecord[],
  referenceDate = new Date()
): DashboardPeriodOption[] {
  const periodValues = new Set<string>([
    formatDashboardPeriodValue(referenceDate),
    formatDashboardPeriodValue(shiftMonth(referenceDate, -1))
  ]);

  sales.forEach((sale) => {
    periodValues.add(formatDashboardPeriodValue(new Date(sale.occurredAtMs)));
  });

  return [...periodValues]
    .sort((left, right) => right.localeCompare(left))
    .map((value) => ({
      label: formatDashboardPeriodLabel(value),
      value
    }));
}

function buildDashboardMonthlySalesRows(
  sales: SaleRecord[],
  referenceDate = new Date()
): DashboardTrendRow[] {
  const totalsByMonth = new Map<number, number>();
  const formatter = new Intl.DateTimeFormat("es-CO", { month: "short" });

  sales.forEach((sale) => {
    const occurredAt = new Date(sale.occurredAtMs);

    if (occurredAt.getFullYear() !== referenceDate.getFullYear()) {
      return;
    }

    totalsByMonth.set(
      occurredAt.getMonth(),
      (totalsByMonth.get(occurredAt.getMonth()) ?? 0) + sale.totalMinor
    );
  });

  return Array.from({ length: 12 }, (_, month) => ({
    label: formatter.format(new Date(referenceDate.getFullYear(), month, 1)),
    valueMinor: totalsByMonth.get(month) ?? 0
  }));
}

function buildDashboardProductRows(sales: SaleRecord[]): DashboardRankingRow[] {
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

  return [...productMap.entries()]
    .map(([id, row]) => ({
      id,
      label: row.label,
      meta: `${row.quantity} unidades`,
      valueMinor: row.valueMinor
    }))
    .sort((left, right) => right.valueMinor - left.valueMinor)
    .slice(0, 5);
}

function buildDashboardCustomerRows(sales: SaleRecord[]): DashboardRankingRow[] {
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

  return [...customerMap.entries()]
    .map(([id, row]) => ({
      id,
      label: row.label,
      meta: `${row.purchases} ventas`,
      valueMinor: row.valueMinor
    }))
    .sort((left, right) => right.valueMinor - left.valueMinor)
    .slice(0, 5);
}

function DashboardAreaChart({
  formatCurrency,
  periodOneLabel,
  periodTwoLabel,
  series
}: {
  formatCurrency: (minor: number) => string;
  periodOneLabel: string;
  periodTwoLabel: string;
  series: DashboardTrendSeries[];
}) {
  const maxValue = Math.max(
    ...series.flatMap((trendSeries) =>
      trendSeries.rows.map((row) => row.valueMinor)
    ),
    0
  );
  const width = 760;
  const height = 260;
  const padding = {
    bottom: 42,
    left: 84,
    right: 24,
    top: 24
  };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const yAxisTicks = [maxValue, Math.round(maxValue / 2), 0];
  const xAxisTicks = [
    { label: "Dia 1", index: 0 },
    { label: "Dia 16", index: 15 },
    { label: "Dia 31", index: 30 }
  ];
  const chartSeries = series.map((trendSeries) => {
    const points = trendSeries.rows.map((row, index) => {
      const x =
        trendSeries.rows.length === 1
          ? padding.left + chartWidth / 2
          : padding.left + (index / (trendSeries.rows.length - 1)) * chartWidth;
      const y =
        maxValue === 0
          ? padding.top + chartHeight
          : padding.top + chartHeight - (row.valueMinor / maxValue) * chartHeight;

      return { ...row, x, y };
    });
    const linePoints = points.map((point) => `${point.x},${point.y}`).join(" ");
    const areaPoints =
      points.length > 0
        ? `${padding.left},${height - padding.bottom} ${linePoints} ${width - padding.right},${height - padding.bottom}`
        : "";

    return {
      ...trendSeries,
      areaPoints,
      linePoints,
      points
    };
  });

  if (maxValue === 0) {
    return (
      <EmptyState
        body="Las ventas diarias apareceran cuando registres movimientos."
        className="dashboard-empty-state"
        title="Sin ventas registradas"
      />
    );
  }

  return (
    <div className="dashboard-line-chart" aria-label="Grafico ventas diarias">
      <div className="dashboard-series-legend">
        <span className="dashboard-series-label dashboard-series-label-primary">
          Periodo 1
          <small>{periodOneLabel}</small>
        </span>
        <span className="dashboard-series-label dashboard-series-label-secondary">
          Periodo 2
          <small>{periodTwoLabel}</small>
        </span>
      </div>
      <svg role="img" viewBox={`0 0 ${width} ${height}`}>
        <title>Ventas diarias</title>
        <line
          className="dashboard-chart-axis"
          x1={padding.left}
          x2={width - padding.right}
          y1={height - padding.bottom}
          y2={height - padding.bottom}
        />
        <line
          className="dashboard-chart-axis"
          x1={padding.left}
          x2={padding.left}
          y1={padding.top}
          y2={height - padding.bottom}
        />
        {yAxisTicks.map((tick) => {
          const y =
            maxValue === 0
              ? height - padding.bottom
              : padding.top + chartHeight - (tick / maxValue) * chartHeight;

          return (
            <g key={`y-${tick}`}>
              <line
                className="dashboard-chart-gridline"
                x1={padding.left}
                x2={width - padding.right}
                y1={y}
                y2={y}
              />
              <text
                className="dashboard-axis-tick"
                textAnchor="end"
                x={padding.left - 10}
                y={y + 4}
              >
                {formatCurrency(tick)}
              </text>
            </g>
          );
        })}
        {xAxisTicks.map((tick) => {
          const x = padding.left + (tick.index / 30) * chartWidth;

          return (
            <text
              className="dashboard-axis-tick"
              key={`x-${tick.label}`}
              textAnchor="middle"
              x={x}
              y={height - 14}
            >
              {tick.label}
            </text>
          );
        })}
        <text
          className="dashboard-axis-label"
          textAnchor="middle"
          transform={`translate(16 ${padding.top + chartHeight / 2}) rotate(-90)`}
        >
          Precios
        </text>
        <text
          className="dashboard-axis-label"
          textAnchor="middle"
          x={padding.left + chartWidth / 2}
          y={height - 2}
        >
          Dias
        </text>
        {chartSeries.map((trendSeries) => (
          <g key={`area-${trendSeries.label}`}>
            <polygon
              className={`dashboard-area-fill dashboard-area-fill-${trendSeries.color}`}
              points={trendSeries.areaPoints}
            />
          </g>
        ))}
        {chartSeries.map((trendSeries) => (
          <g key={`line-${trendSeries.label}`}>
            <polyline
              className={`dashboard-line-stroke dashboard-line-stroke-${trendSeries.color}`}
              points={trendSeries.linePoints}
            />
            {trendSeries.points
              .filter((point) => point.valueMinor > 0)
              .map((point) => (
                <circle
                  className={`dashboard-line-point dashboard-line-point-${trendSeries.color}`}
                  cx={point.x}
                  cy={point.y}
                  key={`${trendSeries.label}-${point.label}`}
                  r="4"
                />
              ))}
          </g>
        ))}
      </svg>
    </div>
  );
}

function DashboardBarChart({ rows }: { rows: DashboardTrendRow[] }) {
  const maxValue = Math.max(...rows.map((row) => row.valueMinor), 0);

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
        <div className="dashboard-month-bar" key={row.label}>
          <div className="dashboard-month-track">
            <span
              style={{
                height: `${Math.max((row.valueMinor / maxValue) * 100, 3)}%`
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
      {rows.map((row) => (
        <article className="dashboard-ranking-row" key={row.id}>
          <div>
            <strong>{row.label}</strong>
            <span>{row.meta}</span>
          </div>
          <div className="dashboard-ranking-track">
            <span style={{ width: `${(row.valueMinor / maxValue) * 100}%` }} />
          </div>
          <strong>{formatCurrency(row.valueMinor)}</strong>
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
        <strong>Seleccionado: {selectedRow.label}</strong>
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
              <span>{row.label}</span>
              <strong>{percentage}%</strong>
            </button>
          );
        })}
      </div>
    </div>
  );
}

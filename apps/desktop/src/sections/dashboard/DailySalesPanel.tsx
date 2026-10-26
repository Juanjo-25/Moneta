import {
  useId,
  useMemo,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent
} from "react";
import { PanelHeader } from "../../components/PanelHeader";
import { SecondaryActionButton } from "../../components/SecondaryActionButton";
import { SaleDetails } from "../../components/SaleDetails";
import {
  buildDailySales,
  chartTicks,
  compactSalesAmount,
  dayLabel,
  monthLabel,
  monthValue,
  type DailySalesDay
} from "./daily-sales";
import type {
  CreditNoteRecord,
  ReceivableRecord,
  SaleRecord
} from "../../types";

type Props = {
  sales: SaleRecord[];
  creditNotes: CreditNoteRecord[];
  receivables: ReceivableRecord[];
  formatCurrency: (value: number) => string;
  onOpenReports: () => void;
};

const colors = ["#0f766e", "#2563eb", "#7c3aed"];
const width = 960;
const height = 310;
const padding = { left: 76, right: 20, top: 22, bottom: 42 };
const plotWidth = width - padding.left - padding.right;
const plotHeight = height - padding.top - padding.bottom;

type Series = {
  id: number;
  period: string;
  label: string;
  color: string;
  rows: DailySalesDay[];
  total: number;
  count: number;
};

function statusLabel(
  row: DailySalesDay | undefined,
  formatCurrency: Props["formatCurrency"]
) {
  if (!row) return "Día inexistente en este mes";
  if (row.future) return "Día futuro";
  if (!row.sales.length && !row.creditNotes.length) return "Sin ventas";
  return formatCurrency(row.valueMinor);
}

export function DailySalesPanel({
  sales,
  creditNotes,
  receivables,
  formatCurrency,
  onOpenReports
}: Props) {
  const [periods, setPeriods] = useState(() =>
    [-2, -1, 0].map((offset) => monthValue(new Date(), offset))
  );
  const [hidden, setHidden] = useState<number[]>([]);
  const [range, setRange] = useState({ start: 1, end: 31 });
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [keyboard, setKeyboard] = useState(false);
  const hintId = useId();
  const tooltipId = useId();
  const series: Series[] = useMemo(
    () =>
      periods.map((period, index) => {
        const rows = buildDailySales(period, sales, creditNotes);
        return {
          id: index,
          period,
          label: monthLabel(period),
          color: colors[index]!,
          rows,
          total: rows.reduce((sum, row) => sum + row.valueMinor, 0),
          count: rows.reduce((sum, row) => sum + row.sales.length, 0)
        };
      }),
    [periods, sales, creditNotes]
  );
  const visible = series.filter((item) => !hidden.includes(item.id));
  const maxDay = Math.max(...series.map((item) => item.rows.length));
  const start = Math.min(range.start, maxDay);
  const end = Math.max(start, Math.min(range.end, maxDay));
  const activeDay = hoveredDay ?? selectedDay;
  const ticks = chartTicks(
    visible.flatMap((item) =>
      item.rows
        .filter((row) => row.day >= start && row.day <= end && !row.future)
        .map((row) => row.valueMinor)
    )
  );
  const lower = ticks[0]!;
  const upper = ticks.at(-1)!;
  const x = (day: number) =>
    padding.left +
    (end === start ? 0.5 : (day - start) / (end - start)) * plotWidth;
  const y = (value: number) =>
    padding.top + ((upper - value) / (upper - lower)) * plotHeight;
  const xTicks = [
    ...new Set([
      start,
      ...Array.from({ length: maxDay }, (_, index) => index + 1).filter(
        (day) =>
          day > start &&
          day < end &&
          (day - start) % Math.max(1, Math.ceil((end - start) / 7)) === 0
      ),
      end
    ])
  ];
  const fullTicks = chartTicks(
    visible.flatMap((item) =>
      item.rows.filter((row) => !row.future).map((row) => row.valueMinor)
    )
  );
  const miniX = (day: number) => ((day - 1) / (maxDay - 1)) * width;
  const miniY = (value: number) =>
    8 +
    ((fullTicks.at(-1)! - value) / (fullTicks.at(-1)! - fullTicks[0]!)) * 46;

  function changeMonth(index: number, value: string) {
    if (!/^(?:19|[2-9]\d)\d{2}-(?:0[1-9]|1[0-2])$/.test(value)) return;
    setPeriods((current) =>
      current.map((period, slot) => (slot === index ? value : period))
    );
    setRange({ start: 1, end: 31 });
    setSelectedDay(null);
    setHoveredDay(null);
  }

  function eventDay(
    event: PointerEvent<SVGSVGElement> | MouseEvent<SVGSVGElement>
  ) {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (!bounds.width) return null;
    const position = ((event.clientX - bounds.left) / bounds.width) * width;
    if (position < padding.left - 8 || position > width - padding.right + 8)
      return null;
    return Math.max(
      start,
      Math.min(
        end,
        Math.round(
          start + ((position - padding.left) / plotWidth) * (end - start)
        )
      )
    );
  }

  function explore(event: KeyboardEvent<HTMLDivElement>) {
    const current = hoveredDay ?? selectedDay ?? start;
    if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      setKeyboard(true);
      setHoveredDay(
        event.key === "Home"
          ? start
          : event.key === "End"
            ? end
            : Math.max(
                start,
                Math.min(end, current + (event.key === "ArrowRight" ? 1 : -1))
              )
      );
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setSelectedDay(current);
    } else if (event.key === "Escape") {
      setHoveredDay(null);
      setSelectedDay(null);
    }
  }

  function changeRange(next: { start: number; end: number }) {
    setRange(next);
    setHoveredDay(null);
    setSelectedDay(null);
  }

  return (
    <div className="panel dashboard-chart-panel dashboard-hero-panel daily-sales-panel">
      <PanelHeader
        action={
          <SecondaryActionButton onClick={onOpenReports} variant="compact">
            Ver reportes
          </SecondaryActionButton>
        }
      >
        <div className="dashboard-hero-copy">
          <span>Compara tus meses</span>
          <h2>Ventas diarias</h2>
          <p>
            Recorre la gráfica para consultar un día. Haz clic para ver sus
            ventas.
          </p>
        </div>
      </PanelHeader>
      <div className="dashboard-hero-body">
        <section
          className="daily-sales-periods"
          aria-label="Controles del analisis principal"
        >
          {series.map((item) => (
            <article
              className="daily-sales-period"
              key={item.id}
              style={{ "--series-color": item.color } as CSSProperties}
            >
              <label className="field" htmlFor={`daily-period-${item.id}`}>
                <span>Periodo {item.id + 1}</span>
                <input
                  id={`daily-period-${item.id}`}
                  aria-label={`Periodo ${item.id + 1} ventas diarias`}
                  type="month"
                  min="1900-01"
                  max="9999-12"
                  value={item.period}
                  onChange={(event) => changeMonth(item.id, event.target.value)}
                />
              </label>
              <span className="daily-sales-total-label">
                Total neto del mes
              </span>
              <strong>{formatCurrency(item.total)}</strong>
              <small>
                {item.count}{" "}
                {item.count === 1 ? "venta registrada" : "ventas registradas"}
              </small>
            </article>
          ))}
        </section>
        <div className="daily-sales-chart" aria-label="Grafico ventas diarias">
          <div className="daily-sales-legend" aria-label="Meses visibles">
            {series.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={!hidden.includes(item.id)}
                disabled={visible.length === 1 && !hidden.includes(item.id)}
                onClick={() =>
                  setHidden((current) =>
                    current.includes(item.id)
                      ? current.filter((id) => id !== item.id)
                      : [...current, item.id]
                  )
                }
                style={{ "--series-color": item.color } as CSSProperties}
              >
                <span aria-hidden="true" />
                {item.label}
                <small>{hidden.includes(item.id) ? "Oculto" : "Visible"}</small>
              </button>
            ))}
          </div>
          <p className="daily-sales-hint" id={hintId}>
            Ventas netas = ventas menos notas crédito confirmadas.{" "}
            <span>También puedes usar ← → y Enter para consultar un día.</span>
          </p>
          {series.every((item) =>
            item.rows.every(
              (row) => !row.sales.length && !row.creditNotes.length
            )
          ) && (
            <p className="daily-sales-hint">
              Sin ventas en los meses seleccionados. Puedes elegir otros
              periodos.
            </p>
          )}
          <div className="daily-sales-exploration">
            <div
              className="daily-sales-plot"
              role="group"
              aria-label="Explorar ventas diarias"
              aria-describedby={`${hintId}${activeDay !== null ? ` ${tooltipId}` : ""}`}
              tabIndex={0}
              onKeyDown={explore}
              onFocus={(event) => {
                if (event.target === event.currentTarget) {
                  setKeyboard(true);
                  setHoveredDay(selectedDay ?? start);
                }
              }}
              onBlur={() => {
                setKeyboard(false);
                setHoveredDay(null);
              }}
              onPointerLeave={() => setHoveredDay(null)}
            >
              <svg
                role="img"
                aria-label="Ventas diarias"
                viewBox={`0 0 ${width} ${height}`}
                preserveAspectRatio="none"
                onPointerMove={(event) => {
                  setKeyboard(false);
                  setHoveredDay(eventDay(event));
                }}
                onClick={(event) => {
                  const day = eventDay(event);
                  if (day !== null) {
                    setSelectedDay(day);
                    setHoveredDay(day);
                  }
                }}
              >
                <title>Ventas diarias</title>
                <desc>
                  Comparación de ventas netas por día de los meses
                  seleccionados.
                </desc>
                {ticks.map((tick) => (
                  <g key={tick}>
                    <line
                      className={
                        tick === 0
                          ? "daily-sales-zero"
                          : "dashboard-chart-gridline"
                      }
                      x1={padding.left}
                      x2={width - padding.right}
                      y1={y(tick)}
                      y2={y(tick)}
                    />
                    <text
                      className="dashboard-axis-tick"
                      textAnchor="end"
                      x={padding.left - 12}
                      y={y(tick) + 4}
                    >
                      {compactSalesAmount(tick)}
                    </text>
                  </g>
                ))}
                {xTicks.map((day) => (
                  <text
                    className="dashboard-axis-tick"
                    textAnchor="middle"
                    key={day}
                    x={x(day)}
                    y={height - 19}
                  >{`Día ${day}`}</text>
                ))}
                <text
                  className="dashboard-axis-label"
                  textAnchor="middle"
                  x={padding.left + plotWidth / 2}
                  y={height - 2}
                >
                  Días del mes
                </text>
                {visible.map((item) => {
                  const points = item.rows.filter(
                    (row) => row.day >= start && row.day <= end && !row.future
                  );
                  // Separate paths at gaps instead of drawing through unregistered future dates.
                  const paths: DailySalesDay[][] = [];
                  for (const row of points) {
                    if (paths.at(-1)?.at(-1)?.day !== row.day - 1)
                      paths.push([]);
                    paths.at(-1)!.push(row);
                  }
                  return (
                    <g key={item.id} style={{ color: item.color }}>
                      {paths.map((path, index) => (
                        <g key={index}>
                          <polygon
                            fill="currentColor"
                            fillOpacity="0.075"
                            points={`${x(path[0]!.day)},${y(0)} ${path.map((row) => `${x(row.day)},${y(row.valueMinor)}`).join(" ")} ${x(path.at(-1)!.day)},${y(0)}`}
                          />
                          <polyline
                            className="daily-sales-line"
                            stroke="currentColor"
                            strokeDasharray={item.id === 1 ? "6 3" : undefined}
                            points={path
                              .map(
                                (row) => `${x(row.day)},${y(row.valueMinor)}`
                              )
                              .join(" ")}
                          />
                        </g>
                      ))}
                      {points
                        .filter(
                          (row) => row.sales.length || row.creditNotes.length
                        )
                        .map((row) => (
                          <circle
                            key={row.day}
                            cx={x(row.day)}
                            cy={y(row.valueMinor)}
                            r={activeDay === row.day ? 5 : 3}
                            fill="currentColor"
                            stroke="white"
                            strokeWidth="1.5"
                          />
                        ))}
                    </g>
                  );
                })}
                {activeDay !== null &&
                  activeDay >= start &&
                  activeDay <= end && (
                    <g className="daily-sales-guide">
                      <line
                        x1={x(activeDay)}
                        x2={x(activeDay)}
                        y1={padding.top}
                        y2={height - padding.bottom}
                      />
                      {visible.map((item) => {
                        const row = item.rows[activeDay - 1];
                        return row && !row.future ? (
                          <circle
                            key={item.id}
                            cx={x(activeDay)}
                            cy={y(row.valueMinor)}
                            r="5"
                            fill={item.color}
                            stroke="white"
                            strokeWidth="2"
                          />
                        ) : null;
                      })}
                    </g>
                  )}
              </svg>
            </div>
            <aside
              className="daily-sales-inspector"
              aria-label="Consulta del día"
            >
              {activeDay !== null ? (
                <div
                  className="daily-sales-tooltip"
                  role="tooltip"
                  id={tooltipId}
                  aria-live={keyboard ? "polite" : "off"}
                >
                  <strong>Día {activeDay}</strong>
                  {visible.map((item) => {
                    const row = item.rows[activeDay - 1];
                    return (
                      <div
                        className="daily-sales-tooltip-row"
                        key={item.id}
                        style={
                          { "--series-color": item.color } as CSSProperties
                        }
                      >
                        <span aria-hidden="true" />
                        <div>
                          <small>{row ? dayLabel(row.date) : item.label}</small>
                          <b>{statusLabel(row, formatCurrency)}</b>
                          {row &&
                            !row.future &&
                            (row.sales.length > 0 ||
                              row.creditNotes.length > 0) && (
                              <small>
                                {row.sales.length}{" "}
                                {row.sales.length === 1 ? "venta" : "ventas"}
                                {row.creditNotes.length
                                  ? ` · ${row.creditNotes.length} ${row.creditNotes.length === 1 ? "nota crédito" : "notas crédito"}`
                                  : ""}
                              </small>
                            )}
                        </div>
                      </div>
                    );
                  })}
                  <small>
                    {selectedDay === activeDay
                      ? "Día seleccionado · detalle debajo"
                      : "Haz clic para ver las ventas"}
                  </small>
                </div>
              ) : (
                <div className="daily-sales-inspector-empty">
                  <strong>Consulta un día</strong>
                  <p>
                    Pasa por la gráfica para ver las ventas de los tres meses
                    aquí, sin cubrir las líneas.
                  </p>
                  <small>Haz clic en un día para abrir sus ventas.</small>
                </div>
              )}
            </aside>
          </div>
          <div className="daily-sales-range" aria-label="Ampliar tramo de días">
            <div className="daily-sales-range-heading">
              <div>
                <strong>
                  Del día {start} al {end}
                </strong>
                <span>Arrastra los extremos para ampliar un tramo.</span>
              </div>
              <SecondaryActionButton
                variant="compact"
                disabled={start === 1 && end === maxDay}
                onClick={() => changeRange({ start: 1, end: maxDay })}
              >
                Ver mes completo
              </SecondaryActionButton>
            </div>
            <div className="daily-sales-navigator">
              <svg
                aria-hidden="true"
                viewBox={`0 0 ${width} 62`}
                preserveAspectRatio="none"
              >
                {visible.map((item) => {
                  const points = item.rows.filter((row) => !row.future);
                  const path = points
                    .map(
                      (row, index) =>
                        `${index && points[index - 1]!.day === row.day - 1 ? "L" : "M"}${miniX(row.day)},${miniY(row.valueMinor)}`
                    )
                    .join(" ");
                  return (
                    <path
                      key={item.id}
                      d={path}
                      fill="none"
                      stroke={item.color}
                      strokeWidth="2"
                      opacity="0.6"
                    />
                  );
                })}
                <rect
                  x={miniX(start)}
                  y="0"
                  width={Math.max(2, miniX(end) - miniX(start))}
                  height="62"
                  className="daily-sales-range-selection"
                />
              </svg>
              <input
                className="daily-sales-range-start"
                type="range"
                min="1"
                max={maxDay}
                value={start}
                aria-label="Desde día"
                aria-valuetext={`Día ${start}`}
                onChange={(event) =>
                  changeRange({
                    start: Math.min(Number(event.target.value), end - 1),
                    end
                  })
                }
              />
              <input
                className="daily-sales-range-end"
                type="range"
                min="1"
                max={maxDay}
                value={end}
                aria-label="Hasta día"
                aria-valuetext={`Día ${end}`}
                onChange={(event) =>
                  changeRange({
                    start,
                    end: Math.max(start + 1, Number(event.target.value))
                  })
                }
              />
            </div>
          </div>
        </div>
        {selectedDay !== null && (
          <section
            className="daily-sales-details"
            aria-label={`Ventas del día ${selectedDay}`}
          >
            <div className="daily-sales-detail-heading">
              <div>
                <h3>Ventas del día {selectedDay}</h3>
                <p>Detalle de los meses visibles en la gráfica.</p>
              </div>
              <SecondaryActionButton
                variant="compact"
                onClick={() => {
                  setSelectedDay(null);
                  setHoveredDay(null);
                }}
              >
                Cerrar detalle
              </SecondaryActionButton>
            </div>
            <div className="daily-sales-detail-grid">
              {visible.map((item) => (
                <DayDetails
                  key={`${item.id}-${item.period}-${selectedDay}`}
                  series={item}
                  day={selectedDay}
                  formatCurrency={formatCurrency}
                  receivables={receivables}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function DayDetails({
  series,
  day,
  formatCurrency,
  receivables
}: {
  series: Series;
  day: number;
  formatCurrency: Props["formatCurrency"];
  receivables: ReceivableRecord[];
}) {
  const row = series.rows[day - 1];
  return (
    <article
      className="daily-sales-day-detail"
      style={{ "--series-color": series.color } as CSSProperties}
    >
      <h4>{row ? dayLabel(row.date) : series.label}</h4>
      <strong>{statusLabel(row, formatCurrency)}</strong>
      {row && !row.future && (
        <>
          {row.creditNotes.length > 0 && (
            <p>
              Ventas: {formatCurrency(row.grossMinor)} · Notas crédito:{" "}
              {formatCurrency(row.creditsMinor)}
            </p>
          )}
          {row.sales.map((sale) => (
            <details key={sale.id} className="daily-sales-sale">
              <summary>
                <span>
                  <b>{sale.invoiceNumber || "Sin número"}</b>
                  <small>{sale.customerName}</small>
                </span>
                <strong>{formatCurrency(sale.totalMinor)}</strong>
              </summary>
              <SaleDetails
                sale={sale}
                receivables={receivables}
                formatCurrency={formatCurrency}
              />
            </details>
          ))}
          {row.creditNotes.map((note) => (
            <div className="daily-sales-credit" key={note.id}>
              <strong>{note.number}</strong>
              <span>{note.reason}</span>
              <b>−{formatCurrency(note.totalMinor)}</b>
            </div>
          ))}
        </>
      )}
    </article>
  );
}

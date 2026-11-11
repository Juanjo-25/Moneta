import { Fragment, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import {
  buildInventorySuggestions,
  DEFAULT_INVENTORY_SUGGESTION_SETTINGS,
  type InventorySuggestion,
  type InventorySuggestionSettings,
  type SuggestionStatus
} from "@moneta/domain";
import { CompactSummaryGrid } from "../../components/CompactSummaryGrid";
import { DataTable } from "../../components/DataTable";
import { DataTableHeader } from "../../components/DataTableHeader";
import { EmptyState } from "../../components/EmptyState";
import { ReportSummaryShell } from "../../components/ReportSummaryShell";
import { SecondaryActionButton } from "../../components/SecondaryActionButton";
import { StatusBadge } from "../../components/StatusBadge";
import {
  buildExcelWorkbookDownload,
  buildExcelWorkbookXml,
  type ExcelWorkbookDownload
} from "../../lib/excel-export";
import { createSearchMatcher } from "../../lib/search";
import { saveNativeExcelExport } from "../../lib/tauri";
import type { CreditNoteRecord, ProductRecord, PurchaseRecord, SaleRecord } from "../../types";
import { reportDocumentTime } from "./report-period";

const SETTINGS_STORAGE_KEY = "moneta.inventory-suggestions.settings";
const WINDOW_OPTIONS = [60, 90, 180] as const;

type StatusFilter = "all" | SuggestionStatus;

type SuggestionRow = InventorySuggestion & { supplierName: string };

const STATUS_LABELS: Record<SuggestionStatus, string> = {
  review: "Revisar pronto",
  ok: "Bien",
  excess: "Exceso de stock",
  "no-sales": "Sin ventas"
};

const STATUS_ORDER: Record<SuggestionStatus, number> = {
  review: 0,
  excess: 1,
  ok: 2,
  "no-sales": 3
};

const STATUS_FILTERS = ["all", "review", "excess", "ok", "no-sales"] as const;

const CONFIDENCE_LABELS = { high: "Alta", medium: "Media", low: "Baja" } as const;
const TREND_LABELS = { up: "Subiendo", down: "Bajando", stable: "Estable" } as const;

function readStoredSettings(): InventorySuggestionSettings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_INVENTORY_SUGGESTION_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<InventorySuggestionSettings>;
    return { ...DEFAULT_INVENTORY_SUGGESTION_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_INVENTORY_SUGGESTION_SETTINGS;
  }
}

function storeSettings(settings: InventorySuggestionSettings) {
  try {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Preferencia opcional: si no se puede guardar, el reporte sigue funcionando.
  }
}

function formatQuantity(value: number): string {
  return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 }).format(value);
}

function formatCoverage(days: number | null): string {
  if (days === null) return "—";
  if (days >= 365) return "Más de 1 año";
  return `${Math.floor(days)} días`;
}

export function describeSuggestion(
  row: InventorySuggestion,
  settings: InventorySuggestionSettings
): string {
  if (row.status === "no-sales") {
    return row.stock > 0
      ? `No registra ventas en los últimos ${settings.windowDays} días y tiene ${row.stock} en stock. Puede ser inventario quieto.`
      : `No registra ventas en los últimos ${settings.windowDays} días.`;
  }

  const demand = `Vendes ~${formatQuantity(row.averageWeeklyDemand)} por semana`;
  const coverage =
    row.coverageDays === null ? "" : `; con ${row.stock} en stock te alcanza para ~${Math.floor(row.coverageDays)} días`;
  const lead = ` y tu proveedor tarda ~${settings.leadTimeDays} días`;

  if (row.status === "review") {
    return `${demand}${coverage}${lead}. Podrías quedarte corto antes del próximo pedido; considera comprar ~${row.suggestedOrderQuantity}.`;
  }
  if (row.status === "excess") {
    return `${demand}${coverage}. Tienes unas ${row.excessUnits} unidades por encima de lo que sueles necesitar.`;
  }
  return `${demand}${coverage}. El stock actual está dentro del rango sugerido.`;
}

function statusTone(status: SuggestionStatus) {
  if (status === "review") return "warning" as const;
  if (status === "ok") return "ok" as const;
  return "inactive" as const;
}

/** Proveedor de la compra más reciente de cada producto. */
function buildSupplierByProduct(purchases: PurchaseRecord[]): Map<string, string> {
  const latest = new Map<string, { name: string; time: number }>();
  purchases.forEach((purchase) => {
    const time = reportDocumentTime(purchase);
    purchase.lines.forEach((line) => {
      const current = latest.get(line.productId);
      if (!current || time > current.time) {
        latest.set(line.productId, { name: purchase.supplierName, time });
      }
    });
  });
  return new Map([...latest.entries()].map(([productId, value]) => [productId, value.name]));
}

type StockPosition = "below" | "within" | "above";

function getStockPosition(row: InventorySuggestion): StockPosition {
  if (row.stock < row.suggestedMin) return "below";
  if (row.stock > row.suggestedMax) return "above";
  return "within";
}

const STOCK_POSITION_LABELS: Record<StockPosition, string> = {
  below: "por debajo del mínimo sugerido",
  within: "dentro del rango sugerido",
  above: "por encima del máximo sugerido"
};

function StockRangeBar({ row }: { row: InventorySuggestion }) {
  if (row.status === "no-sales") {
    return (
      <div className="stock-range">
        <strong>{row.stock}</strong>
        <small>Sin rango: no hay ventas</small>
      </div>
    );
  }

  const scale = Math.max(row.suggestedMax * 1.25, row.stock, 1);
  const toPercent = (value: number) => `${Math.min((value / scale) * 100, 100)}%`;
  const position = getStockPosition(row);

  return (
    <div className="stock-range">
      <div className="stock-range-values">
        <strong>{row.stock}</strong>
        <small>
          rango <span>{`${row.suggestedMin} – ${row.suggestedMax}`}</span>
        </small>
      </div>
      <div
        aria-label={`Stock ${row.stock}, ${STOCK_POSITION_LABELS[position]} (${row.suggestedMin} a ${row.suggestedMax})`}
        className={`stock-range-track stock-range-${position}`}
        role="img"
      >
        <span
          className="stock-range-band"
          style={{
            left: toPercent(row.suggestedMin),
            width: `calc(${toPercent(row.suggestedMax)} - ${toPercent(row.suggestedMin)})`
          }}
        />
        <span className="stock-range-fill" style={{ width: toPercent(row.stock) }} />
        <span className="stock-range-marker" style={{ left: toPercent(row.stock) }} />
      </div>
    </div>
  );
}

type InventorySuggestionsReportProps = {
  creditNotes: CreditNoteRecord[];
  formatCurrency: (minor: number) => string;
  navigation: ReactNode;
  nowMs?: number;
  onUpdateProduct?: ((product: ProductRecord) => Promise<boolean>) | undefined;
  products: ProductRecord[];
  purchases: PurchaseRecord[];
  sales: SaleRecord[];
};

export function InventorySuggestionsReport({
  creditNotes,
  formatCurrency,
  navigation,
  nowMs,
  onUpdateProduct,
  products,
  purchases,
  sales
}: InventorySuggestionsReportProps) {
  const [settings, setSettings] = useState<InventorySuggestionSettings>(readStoredSettings);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const searchInputId = useId();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [preparedDownload, setPreparedDownload] = useState<ExcelWorkbookDownload | null>(null);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const exportVersion = useRef(0);

  const supplierByProduct = useMemo(() => buildSupplierByProduct(purchases), [purchases]);

  const rows: SuggestionRow[] = useMemo(() => {
    const demand = sales.flatMap((sale) => {
      const occurredAtMs = reportDocumentTime(sale);
      return sale.lines.map((line) => ({
        productId: line.productId,
        quantity: line.quantity,
        occurredAtMs,
        revenueMinor: line.totalMinor
      }));
    });
    const returns = creditNotes
      .filter((note) => note.adjustmentType === "return")
      .flatMap((note) => {
        const occurredAtMs = reportDocumentTime(note);
        return note.lines.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
          occurredAtMs,
          revenueMinor: line.totalMinor
        }));
      });

    return buildInventorySuggestions({
      products,
      sales: demand,
      returns,
      nowMs: nowMs ?? Date.now(),
      settings
    })
      .map((row) => ({ ...row, supplierName: supplierByProduct.get(row.productId) ?? "Sin proveedor" }))
      .sort(
        (left, right) =>
          STATUS_ORDER[left.status] - STATUS_ORDER[right.status] ||
          (left.coverageDays ?? Infinity) - (right.coverageDays ?? Infinity) ||
          right.revenueMinor - left.revenueMinor
      );
  }, [creditNotes, nowMs, products, sales, settings, supplierByProduct]);

  const suppliers = [...new Set(rows.map((row) => row.supplierName))].sort((a, b) =>
    a.localeCompare(b, "es")
  );
  const matchesSearch = createSearchMatcher(searchQuery);
  const scopedRows = rows.filter(
    (row) =>
      (!supplierFilter || row.supplierName === supplierFilter) &&
      matchesSearch([row.name, row.sku, row.supplierName])
  );
  const visibleRows = scopedRows.filter(
    (row) => statusFilter === "all" || row.status === statusFilter
  );
  const statusCounts = STATUS_FILTERS.reduce<Record<StatusFilter, number>>(
    (counts, value) => ({
      ...counts,
      [value]:
        value === "all"
          ? scopedRows.length
          : scopedRows.filter((row) => row.status === value).length
    }),
    { all: 0, review: 0, excess: 0, ok: 0, "no-sales": 0 }
  );

  function toggleExpanded(productId: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  }

  const reviewRows = rows.filter((row) => row.status === "review");
  const excessRows = rows.filter((row) => row.status === "excess" || row.status === "no-sales");
  const summaryItems = [
    { label: "Revisar pronto", value: String(reviewRows.length) },
    {
      label: "Compra sugerida estimada",
      value: formatCurrency(reviewRows.reduce((sum, row) => sum + row.suggestedOrderCostMinor, 0))
    },
    { label: "Con exceso o sin ventas", value: String(excessRows.length) },
    { label: "Productos analizados", value: String(rows.length) }
  ];

  function resetExport() {
    exportVersion.current += 1;
    setPreparedDownload(null);
    setMessage(null);
  }

  // Un archivo ya preparado deja de ser válido si cambian los filtros que definen sus filas.
  const exportFilterKey = `${statusFilter}|${supplierFilter}|${searchQuery}`;
  const lastExportFilterKey = useRef(exportFilterKey);
  useEffect(() => {
    if (lastExportFilterKey.current === exportFilterKey) return;
    lastExportFilterKey.current = exportFilterKey;
    resetExport();
  }, [exportFilterKey]);

  function updateSetting(key: keyof InventorySuggestionSettings, value: number) {
    if (!Number.isFinite(value) || value < 0) return;
    const next = { ...settings, [key]: Math.min(365, Math.round(value)) };
    setSettings(next);
    storeSettings(next);
    resetExport();
  }

  async function applyAsMinimum(row: SuggestionRow) {
    const product = products.find((item) => item.id === row.productId);
    if (!product || !onUpdateProduct) return;
    setApplyingId(row.productId);
    const saved = await onUpdateProduct({ ...product, minimumStock: row.suggestedMin });
    setApplyingId(null);
    setMessage(
      saved
        ? { kind: "success", text: `Stock mínimo de ${row.name} actualizado a ${row.suggestedMin}.` }
        : { kind: "error", text: `No se pudo actualizar ${row.name}.` }
    );
  }

  async function exportToExcel() {
    exportVersion.current += 1;
    const version = exportVersion.current;
    const costByProduct = new Map(products.map((product) => [product.id, product.costMinor]));
    const generatedAt = new Intl.DateTimeFormat("es-CO", {
      dateStyle: "long",
      timeStyle: "short"
    }).format(new Date(nowMs ?? Date.now()));
    const workbook = {
      fileName: "moneta-sugerencias-inventario.xls",
      worksheets: [
        {
          name: "Parametros",
          rows: [
            ["Parametro", "Valor"],
            ["Generado", generatedAt],
            ["Ventana de analisis (dias)", settings.windowDays],
            ["Tiempo de entrega proveedor (dias)", settings.leadTimeDays],
            ["Frecuencia de compra (dias)", settings.reviewPeriodDays],
            [],
            ["Filtros aplicados", ""],
            ["Prioridad", statusFilter === "all" ? "Todas" : STATUS_LABELS[statusFilter]],
            ["Proveedor", supplierFilter || "Todos"],
            ["Busqueda", searchQuery.trim() || "Sin busqueda"],
            ["Productos exportados", `${visibleRows.length} de ${rows.length}`],
            [],
            ["Como leer las clases", ""],
            ["Clase ABC", "Importancia por ventas: A son los productos que mas venden en dinero, C los que menos."],
            ["Clase XYZ", "Regularidad de la demanda: X se vende de forma estable, Y varia, Z es irregular o esporadica."],
            [],
            ["Nota", "Sugerencias informativas basadas en el historial de ventas. Los productos sin ventas no tienen rango sugerido."]
          ]
        },
        {
          name: "Sugerencias",
          rows: [
            [
              "SKU",
              "Producto",
              "Unidad",
              "Proveedor",
              "Prioridad",
              "Stock actual",
              "Venta semanal promedio",
              "Cobertura dias",
              "Minimo sugerido",
              "Maximo sugerido",
              "Comprar sugerido",
              "Costo unitario COP",
              "Costo estimado COP",
              "Unidades en exceso",
              "Minimo actual",
              "Tendencia",
              "Confianza",
              "Clase ABC",
              "Clase XYZ",
              "Explicacion"
            ],
            ...visibleRows.map((row) => {
              const hasRange = row.status !== "no-sales";

              return [
                row.sku,
                row.name,
                row.unit,
                row.supplierName,
                STATUS_LABELS[row.status],
                row.stock,
                Math.round(row.averageWeeklyDemand * 10) / 10,
                row.coverageDays === null ? "" : Math.floor(row.coverageDays),
                hasRange ? row.suggestedMin : "",
                hasRange ? row.suggestedMax : "",
                hasRange ? row.suggestedOrderQuantity : "",
                costByProduct.get(row.productId) ?? "",
                hasRange ? row.suggestedOrderCostMinor : "",
                hasRange ? row.excessUnits : "",
                row.currentMinimumStock,
                TREND_LABELS[row.trend],
                CONFIDENCE_LABELS[row.confidence],
                row.abcClass,
                row.xyzClass,
                describeSuggestion(row, settings)
              ];
            })
          ]
        }
      ]
    };
    const fallback = buildExcelWorkbookDownload(workbook);

    try {
      const native = await saveNativeExcelExport({
        contents: buildExcelWorkbookXml(workbook),
        fileName: fallback.fileName
      });
      if (version !== exportVersion.current) return;
      if (native) {
        setPreparedDownload(null);
        setMessage({ kind: "success", text: `Exportacion guardada en Descargas: ${native.fileName}` });
        return;
      }
      setPreparedDownload(fallback);
      setMessage({ kind: "success", text: "Archivo listo para descargar." });
    } catch {
      if (version !== exportVersion.current) return;
      setPreparedDownload(fallback);
      setMessage({ kind: "error", text: "No se pudo guardar en Descargas. Usa el enlace de descarga." });
    }
  }

  return (
    <section className="reports-layout">
      <section className="reports-nav-group" aria-label="Navegacion de reportes">
        <section className="reports-period-panel" aria-label="Parametros de sugerencias">
          <div className="reports-period-heading">
            <div>
              <span className="reports-eyebrow">Sugerencias de inventario</span>
              <h2>¿Cuánto mantener en stock?</h2>
              <p>
                Recomendaciones basadas en tus ventas de los últimos {settings.windowDays} días.
                Son orientativas: no cambian tu inventario ni tus mínimos, tú decides.
              </p>
            </div>
            <section className="reports-export-toolbar" aria-label="Exportacion de reportes">
              <SecondaryActionButton onClick={() => void exportToExcel()}>
                Exportar a Excel
              </SecondaryActionButton>
              {preparedDownload ? (
                <a
                  className="secondary-action"
                  download={preparedDownload.fileName}
                  href={preparedDownload.href}
                >
                  Descargar archivo Excel
                </a>
              ) : null}
              {message ? (
                <span role="status" className={`reports-export-status reports-export-status-${message.kind}`}>
                  {message.text}
                </span>
              ) : null}
            </section>
          </div>
          <div className="reports-period-controls">
            <div className="reports-month-picker">
              <span className="inventory-suggestions-label">Analizar</span>
              <div className="reports-quick-periods" role="group" aria-label="Ventana de analisis">
                {WINDOW_OPTIONS.map((days) => (
                  <button
                    key={days}
                    type="button"
                    aria-pressed={settings.windowDays === days}
                    onClick={() => updateSetting("windowDays", days)}
                  >
                    {days} días
                  </button>
                ))}
              </div>
            </div>
            <div className="reports-month-picker">
              <label htmlFor="inventory-lead-time">Entrega del proveedor (días)</label>
              <div className="reports-month-input inventory-suggestions-number">
                <input
                  id="inventory-lead-time"
                  type="number"
                  min={0}
                  max={365}
                  value={settings.leadTimeDays}
                  onChange={(event) => updateSetting("leadTimeDays", Number(event.target.value))}
                />
              </div>
            </div>
            <div className="reports-month-picker">
              <label htmlFor="inventory-review-period">Compras cada (días)</label>
              <div className="reports-month-input inventory-suggestions-number">
                <input
                  id="inventory-review-period"
                  type="number"
                  min={1}
                  max={365}
                  value={settings.reviewPeriodDays}
                  onChange={(event) => updateSetting("reviewPeriodDays", Number(event.target.value))}
                />
              </div>
            </div>
            <div className="reports-month-picker">
              <label htmlFor="inventory-supplier-filter">Proveedor</label>
              <div className="reports-month-input">
                <select
                  id="inventory-supplier-filter"
                  className="inventory-suggestions-select"
                  value={supplierFilter}
                  onChange={(event) => setSupplierFilter(event.target.value)}
                >
                  <option value="">Todos</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier} value={supplier}>
                      {supplier}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </section>
        {navigation}
      </section>

      <ReportSummaryShell>
        <CompactSummaryGrid ariaLabel="Resumen sugerencias de inventario" items={summaryItems} />
      </ReportSummaryShell>

      {rows.length === 0 ? (
        <EmptyState
          body="Crea productos y registra ventas para recibir sugerencias de stock."
          className="section-empty"
          title="Sin productos para analizar"
        />
      ) : (
        <section className="report-supporting-content" aria-label="Detalle sugerencias de inventario">
          <div className="inventory-suggestions-toolbar">
            <div className="reports-quick-periods" role="group" aria-label="Filtrar por prioridad">
              {STATUS_FILTERS.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={statusFilter === value}
                  onClick={() => setStatusFilter(value)}
                >
                  {value === "all" ? "Todos" : STATUS_LABELS[value]}
                  <span className="inventory-suggestions-count">{statusCounts[value]}</span>
                </button>
              ))}
            </div>
            <div className="field inventory-suggestions-search">
              <label htmlFor={searchInputId}>Buscar producto</label>
              <div className="document-search-input">
                <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
                  <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.8" />
                  <path d="m16 16 4.5 4.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
                </svg>
                <input
                  autoComplete="off"
                  id={searchInputId}
                  placeholder="Nombre, código o proveedor"
                  ref={searchInputRef}
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      event.preventDefault();
                      setSearchQuery("");
                    }
                  }}
                />
              </div>
            </div>
            <span className="inventory-suggestions-results" role="status" aria-live="polite">
              {visibleRows.length} de {rows.length} productos
            </span>
          </div>

          <DataTable ariaLabel="Sugerencias de inventario" className="inventory-suggestions-table">
            <DataTableHeader
              labels={["Producto", "Prioridad", "Stock y rango sugerido", "Cobertura", "Comprar", ""]}
            />
            <tbody>
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="inventory-suggestions-empty">
                    Ningún producto coincide con la búsqueda o los filtros.{" "}
                    {searchQuery ? (
                      <button
                        className="inventory-suggestions-link"
                        type="button"
                        onClick={() => {
                          setSearchQuery("");
                          searchInputRef.current?.focus();
                        }}
                      >
                        Limpiar búsqueda
                      </button>
                    ) : null}
                  </td>
                </tr>
              ) : null}
              {visibleRows.map((row) => {
                const expanded = expandedIds.has(row.productId);
                const detailId = `inventory-suggestion-detail-${row.productId}`;
                const canApplyMinimum =
                  Boolean(onUpdateProduct) &&
                  row.status !== "no-sales" &&
                  row.suggestedMin !== row.currentMinimumStock;

                return (
                  <Fragment key={row.productId}>
                    <tr className={expanded ? "inventory-suggestion-row expanded" : "inventory-suggestion-row"}>
                      <td>
                        <strong>{row.name}</strong>
                        <br />
                        <small>
                          {row.sku} · {row.supplierName}
                        </small>
                      </td>
                      <td>
                        <StatusBadge tone={statusTone(row.status)}>{STATUS_LABELS[row.status]}</StatusBadge>
                      </td>
                      <td>
                        <StockRangeBar row={row} />
                      </td>
                      <td>{formatCoverage(row.coverageDays)}</td>
                      <td>
                        {row.suggestedOrderQuantity > 0 ? (
                          <>
                            <strong>{row.suggestedOrderQuantity}</strong>
                            <br />
                            <small>{formatCurrency(row.suggestedOrderCostMinor)}</small>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="inventory-suggestion-toggle-cell">
                        <button
                          aria-controls={detailId}
                          aria-expanded={expanded}
                          aria-label={`${expanded ? "Ocultar" : "Ver"} detalle de ${row.name}`}
                          className="inventory-suggestion-toggle"
                          type="button"
                          onClick={() => toggleExpanded(row.productId)}
                        >
                          {expanded ? "Ocultar" : "Detalle"}
                          <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" width="14" height="14">
                            <path d="m6 9 6 6 6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                    {expanded ? (
                      <tr className="inventory-suggestion-detail" id={detailId}>
                        <td colSpan={6}>
                          <div className="inventory-suggestion-detail-body">
                            <p>{describeSuggestion(row, settings)}</p>
                            <dl className="inventory-suggestion-facts">
                              <div>
                                <dt>Tendencia</dt>
                                <dd>{TREND_LABELS[row.trend]}</dd>
                              </div>
                              <div>
                                <dt>Confianza</dt>
                                <dd>
                                  {CONFIDENCE_LABELS[row.confidence]}
                                  <small>
                                    {row.historyDays} días de historia, {row.saleDays} con ventas
                                  </small>
                                </dd>
                              </div>
                              <div>
                                <dt>Venta semanal</dt>
                                <dd>~{formatQuantity(row.averageWeeklyDemand)}</dd>
                              </div>
                              <div>
                                <dt>Mínimo actual</dt>
                                <dd>{row.currentMinimumStock}</dd>
                              </div>
                              <div>
                                <dt>Clase</dt>
                                <dd>
                                  {row.abcClass}
                                  {row.xyzClass}
                                </dd>
                              </div>
                            </dl>
                            {canApplyMinimum ? (
                              <button
                                type="button"
                                className="secondary-action"
                                disabled={applyingId === row.productId}
                                onClick={() => void applyAsMinimum(row)}
                              >
                                Usar {row.suggestedMin} como mínimo
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </DataTable>
        </section>
      )}
    </section>
  );
}

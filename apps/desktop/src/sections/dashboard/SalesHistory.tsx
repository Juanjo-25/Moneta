import { useState } from "react";
import { SaleDetails } from "../../components/SaleDetails";
import { EmptyState } from "../../components/EmptyState";
import { PanelHeader } from "../../components/PanelHeader";
import { SecondaryActionButton } from "../../components/SecondaryActionButton";
import { parseLocalDate } from "../../lib/dates";
import type { ReceivableRecord, SaleRecord } from "../../types";

function previousMonth() {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function SalesHistory({ sales, receivables, formatCurrency }: {
  sales: SaleRecord[];
  receivables?: ReceivableRecord[] | undefined;
  formatCurrency: (minor: number) => string;
}) {
  const [month, setMonth] = useState(previousMonth);
  const [menuOpen, setMenuOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [year, monthNumber] = month.split("-").map(Number);
  const monthLabel = new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric" })
    .format(new Date(year!, monthNumber! - 1, 1));
  const saleDate = (sale: SaleRecord) => parseLocalDate(sale.issuedAt) ?? new Date(sale.occurredAtMs);
  const monthSales = sales.filter((sale) => {
    const date = saleDate(sale);
    return date.getFullYear() === year && date.getMonth() + 1 === monthNumber;
  }).sort((a, b) => saleDate(b).getTime() - saleDate(a).getTime() || b.occurredAtMs - a.occurredAtMs);

  return (
    <section className="panel sales-history" aria-label="Historial de ventas">
      <PanelHeader><h2>Historial de ventas</h2></PanelHeader>
      <p>Elige un mes y abre sus ventas para consultarlas una por una.</p>
      <div className="sales-history-controls">
        <label className="field" htmlFor="sales-history-month">
          <span>Mes de las ventas</span>
          <input id="sales-history-month" type="month" value={month} onChange={(event) => {
            if (!/^\d{4}-\d{2}$/.test(event.target.value)) return;
            setMonth(event.target.value);
            setExpanded(false);
            setMenuOpen(false);
          }} />
        </label>
        <SecondaryActionButton onClick={() => { setMonth(previousMonth()); setExpanded(false); setMenuOpen(false); }}>
          Mes pasado
        </SecondaryActionButton>
      </div>
      <div className="sales-history-month">
        <div><strong>{monthLabel}</strong><span>{monthSales.length} {monthSales.length === 1 ? "venta" : "ventas"}</span></div>
        <div><span>Total facturado</span><strong>{formatCurrency(monthSales.reduce((sum, sale) => sum + sale.totalMinor, 0))}</strong></div>
        <div className="sale-actions-menu" onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setMenuOpen(false);
        }} onKeyDown={(event) => {
          if (event.key === "Escape") {
            setMenuOpen(false);
            event.currentTarget.querySelector<HTMLButtonElement>("button")?.focus();
          }
        }}>
          <button className="sale-actions-trigger" type="button" aria-label={`Acciones de ${monthLabel}`} aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>⋯</button>
          {menuOpen && <div className="sale-actions-list" role="menu">
            <button type="button" role="menuitem" onClick={() => { setExpanded(!expanded); setMenuOpen(false); }}>
              {expanded ? "Ocultar ventas" : "Ver ventas"}
            </button>
          </div>}
        </div>
      </div>
      {expanded && <div key={month} className="sales-history-list" aria-label={`Ventas de ${monthLabel}`}>
        {monthSales.length === 0 ? <EmptyState title="Sin ventas en este mes" body="Selecciona otro mes para consultar sus ventas." /> : monthSales.map((sale) => (
          <details key={sale.id} className="sales-history-sale">
            <summary>
              <span><strong>{sale.invoiceNumber || "Sin número"}</strong><small>{saleDate(sale).toLocaleDateString("es-CO")}</small></span>
              <span>{sale.customerName}</span>
              <span>{sale.paymentStatus === "paid" ? "Pagada" : "Pendiente"}</span>
              <strong>{formatCurrency(sale.totalMinor)}</strong>
            </summary>
            <div className="sales-history-detail">
              <SaleDetails sale={sale} receivables={receivables} formatCurrency={formatCurrency} />
            </div>
          </details>
        ))}
      </div>}
    </section>
  );
}

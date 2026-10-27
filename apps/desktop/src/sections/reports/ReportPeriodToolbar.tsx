import type { ReactNode } from "react";
import {
  reportMonth,
  reportMonthLabel,
  shiftReportMonth,
  type ReportGrouping
} from "./report-period";

type ReportPeriodToolbarProps = {
  children: ReactNode;
  description: string;
  grouping: ReportGrouping;
  month: string;
  onGroupingChange: (grouping: ReportGrouping) => void;
  onMonthChange: (month: string) => void;
  showGrouping: boolean;
};

export function ReportPeriodToolbar({
  children, description, grouping, month, onGroupingChange, onMonthChange, showGrouping
}: ReportPeriodToolbarProps) {
  const currentMonth = reportMonth();
  const previousMonth = shiftReportMonth(currentMonth, -1);

  return (
    <section className="reports-period-panel" aria-label="Período del reporte">
      <div className="reports-period-heading">
        <div>
          <span className="reports-eyebrow">Análisis del negocio</span>
          <h2 aria-live="polite">{reportMonthLabel(month)}</h2>
          <p>{description}</p>
        </div>
        {children}
      </div>
      <div className="reports-period-controls">
        <div className="reports-month-picker">
          <label htmlFor="report-month">Consultar mes</label>
          <div className="reports-month-input">
            <button type="button" aria-label="Mes anterior" disabled={!month}
              onClick={() => onMonthChange(shiftReportMonth(month, -1))}>‹</button>
            <input id="report-month" type="month" value={month}
              onChange={(event) => onMonthChange(event.target.value)} />
            <button type="button" aria-label="Mes siguiente" disabled={!month}
              onClick={() => onMonthChange(shiftReportMonth(month, 1))}>›</button>
          </div>
        </div>
        <div className="reports-quick-periods" role="group" aria-label="Accesos de período">
          {[
            { value: "", label: "Todo el historial" },
            { value: currentMonth, label: "Este mes" },
            { value: previousMonth, label: "Mes pasado" }
          ].map((period) => (
            <button key={period.value} type="button" aria-pressed={month === period.value}
              onClick={() => onMonthChange(period.value)}>{period.label}</button>
          ))}
        </div>
        {showGrouping ? (
          <fieldset className="reports-grouping">
            <legend>Agrupar por</legend>
            <div>
              {(["day", "month"] as const).map((value) => (
                <label key={value}>
                  <input type="radio" name="report-grouping" value={value}
                    checked={grouping === value} onChange={() => onGroupingChange(value)} />
                  <span>{value === "day" ? "Día" : "Mes"}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}
      </div>
    </section>
  );
}

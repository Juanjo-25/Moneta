import type { ReactNode } from "react";
import { PanelHeader } from "./PanelHeader";

type ReportPrimaryInsightPanelProps = {
  children: ReactNode;
  description: ReactNode;
  onBack?: (() => void) | undefined;
  title: string;
};

export function ReportPrimaryInsightPanel({
  children,
  description,
  onBack,
  title
}: ReportPrimaryInsightPanelProps) {
  return (
    <section
      className="report-detail-panel report-detail-panel-primary"
      aria-label="Insight principal del reporte"
    >
      <PanelHeader
        action={
          onBack ? (
            <button className="table-action" onClick={onBack} type="button">
              Volver a resumen
            </button>
          ) : null
        }
        className="report-detail-header"
      >
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </PanelHeader>

      {children}
    </section>
  );
}

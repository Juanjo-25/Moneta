import type { ReactNode } from "react";
import { PanelHeader } from "./PanelHeader";
import { SecondaryActionButton } from "./SecondaryActionButton";

type ReportPrimaryInsightPanelProps = {
  children?: ReactNode;
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
            <SecondaryActionButton onClick={onBack} variant="compact">
              Volver a resumen
            </SecondaryActionButton>
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

import { PanelHeader } from "./PanelHeader";
import { ReportChartButton } from "./ReportChartButton";
import { SecondaryActionButton } from "./SecondaryActionButton";

type ReportChartPreviewRow = {
  id: string;
  label: string;
  value: string;
  widthPercent: number;
};

type ReportChartPreviewPanelProps = {
  actionLabel: string;
  chartLabel: string;
  description: string;
  onOpenDetail: () => void;
  rows: ReportChartPreviewRow[];
  title: string;
};

export function ReportChartPreviewPanel({
  actionLabel,
  chartLabel,
  description,
  onOpenDetail,
  rows,
  title
}: ReportChartPreviewPanelProps) {
  return (
    <section className="report-panel report-panel-single">
      <PanelHeader
        action={
          <SecondaryActionButton onClick={onOpenDetail} variant="compact">
            Ver detalle
          </SecondaryActionButton>
        }
        className="report-panel-header"
      >
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </PanelHeader>
      <ReportChartButton
        ariaLabel={actionLabel}
        onClick={onOpenDetail}
      >
        <div className="report-chart" aria-label={chartLabel}>
          {rows.map((row) => (
            <div className="report-bar-row" key={row.id}>
              <span>{row.label}</span>
              <div className="report-bar-track">
                <div className="report-bar-fill" style={{ width: `${row.widthPercent}%` }} />
              </div>
              <strong>{row.value}</strong>
            </div>
          ))}
        </div>
      </ReportChartButton>
    </section>
  );
}

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
      <div className="report-panel-header">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <button className="table-action" onClick={onOpenDetail} type="button">
          Ver detalle
        </button>
      </div>
      <button
        aria-label={actionLabel}
        className="report-chart-button"
        onClick={onOpenDetail}
        type="button"
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
      </button>
    </section>
  );
}

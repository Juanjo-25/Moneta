import type { ReactNode } from "react";

type ReportSummaryShellProps = {
  children: ReactNode;
};

export function ReportSummaryShell({ children }: ReportSummaryShellProps) {
  return (
    <section className="reports-summary-shell" aria-label="Resumen del reporte">
      {children}
    </section>
  );
}

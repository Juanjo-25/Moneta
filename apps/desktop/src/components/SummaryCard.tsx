import type { ReactNode } from "react";

type SummaryCardProps = {
  children?: ReactNode;
  label?: string | undefined;
  value?: ReactNode;
};

export function SummaryCard({ children, label, value }: SummaryCardProps) {
  if (children) {
    return <div className="summary-card">{children}</div>;
  }

  return (
    <div className="summary-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

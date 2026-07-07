import type { ReactNode } from "react";

type SummaryCardProps = {
  children?: ReactNode;
  className?: string | undefined;
  compact?: boolean | undefined;
  label?: string | undefined;
  value?: ReactNode;
};

export function SummaryCard({
  children,
  className,
  compact = false,
  label,
  value
}: SummaryCardProps) {
  const classNames = ["summary-card", compact ? "summary-card-compact" : "", className]
    .filter(Boolean)
    .join(" ");

  if (children) {
    return <div className={classNames}>{children}</div>;
  }

  return (
    <div className={classNames}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

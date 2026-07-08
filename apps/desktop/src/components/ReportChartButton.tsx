import type { ButtonHTMLAttributes, ReactNode } from "react";

type ReportChartButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  ariaLabel: string;
  children: ReactNode;
};

export function ReportChartButton({
  ariaLabel,
  children,
  className,
  type = "button",
  ...buttonProps
}: ReportChartButtonProps) {
  const classNames = ["report-chart-button", className].filter(Boolean).join(" ");

  return (
    <button
      {...buttonProps}
      aria-label={ariaLabel}
      className={classNames}
      type={type}
    >
      {children}
    </button>
  );
}

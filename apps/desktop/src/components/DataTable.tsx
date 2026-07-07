import type { ReactNode } from "react";

type DataTableProps = {
  ariaLabel: string;
  children: ReactNode;
  className?: string | undefined;
};

export function DataTable({ ariaLabel, children, className }: DataTableProps) {
  const classNames = ["data-table", className].filter(Boolean).join(" ");

  return (
    <table aria-label={ariaLabel} className={classNames}>
      {children}
    </table>
  );
}

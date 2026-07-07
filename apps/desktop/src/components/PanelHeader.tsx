import type { ReactNode } from "react";

type PanelHeaderProps = {
  action?: ReactNode;
  children: ReactNode;
  className?: string | undefined;
};

export function PanelHeader({
  action,
  children,
  className
}: PanelHeaderProps) {
  const classNames = ["panel-header", className].filter(Boolean).join(" ");

  return (
    <div className={classNames}>
      {children}
      {action}
    </div>
  );
}

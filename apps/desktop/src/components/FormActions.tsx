import type { ReactNode } from "react";

type FormActionsProps = {
  children: ReactNode;
  className?: string | undefined;
};

export function FormActions({ children, className }: FormActionsProps) {
  const classNames = ["form-actions", className].filter(Boolean).join(" ");

  return <div className={classNames}>{children}</div>;
}

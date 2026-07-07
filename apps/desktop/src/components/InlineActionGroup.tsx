import type { ReactNode } from "react";

type InlineActionGroupProps = {
  children: ReactNode;
  className?: string | undefined;
};

export function InlineActionGroup({ children, className }: InlineActionGroupProps) {
  const classNames = ["inline-action-group", className].filter(Boolean).join(" ");

  return <div className={classNames}>{children}</div>;
}

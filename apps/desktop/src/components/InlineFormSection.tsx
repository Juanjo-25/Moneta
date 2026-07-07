import type { ReactNode } from "react";

type InlineFormSectionProps = {
  children: ReactNode;
  className?: string | undefined;
};

export function InlineFormSection({ children, className }: InlineFormSectionProps) {
  const classNames = ["inline-form-section", className].filter(Boolean).join(" ");

  return <div className={classNames}>{children}</div>;
}

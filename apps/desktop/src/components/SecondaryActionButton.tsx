import type { ButtonHTMLAttributes, ReactNode } from "react";

type SecondaryActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "default" | "compact" | undefined;
};

export function SecondaryActionButton({
  children,
  className,
  type = "button",
  variant = "default",
  ...buttonProps
}: SecondaryActionButtonProps) {
  const classNames = [
    "secondary-action",
    variant === "compact" ? "secondary-action-compact" : "",
    className
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button {...buttonProps} className={classNames} type={type}>
      {children}
    </button>
  );
}

import type { ButtonHTMLAttributes, ReactNode } from "react";

type PrimaryActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

export function PrimaryActionButton({
  children,
  className,
  type = "button",
  ...buttonProps
}: PrimaryActionButtonProps) {
  const classNames = ["primary-action", className].filter(Boolean).join(" ");

  return (
    <button {...buttonProps} className={classNames} type={type}>
      {children}
    </button>
  );
}

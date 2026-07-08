import type { ButtonHTMLAttributes } from "react";

type SubmenuSwitchItem<T extends string> = {
  label: string;
  value: T;
};

type SubmenuSwitchProps<T extends string> = {
  ariaLabel: string;
  className?: string | undefined;
  items: SubmenuSwitchItem<T>[];
  onSelect: (value: T) => void;
  selectedValue: T;
};

export function SubmenuSwitch<T extends string>({
  ariaLabel,
  className,
  items,
  onSelect,
  selectedValue
}: SubmenuSwitchProps<T>) {
  const classNames = ["reports-submenu", className].filter(Boolean).join(" ");

  return (
    <div aria-label={ariaLabel} className={classNames} role="tablist">
      {items.map((item) => (
        <SubmenuSwitchButton
          key={item.value}
          active={item.value === selectedValue}
          label={item.label}
          onClick={() => onSelect(item.value)}
        />
      ))}
    </div>
  );
}

type SubmenuSwitchButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active: boolean;
  label: string;
};

function SubmenuSwitchButton({
  active,
  label,
  className,
  type = "button",
  ...buttonProps
}: SubmenuSwitchButtonProps) {
  const classNames = ["submenu-switch-button", active ? "active" : "", className]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      {...buttonProps}
      aria-selected={active}
      className={classNames}
      role="tab"
      type={type}
    >
      {label}
    </button>
  );
}

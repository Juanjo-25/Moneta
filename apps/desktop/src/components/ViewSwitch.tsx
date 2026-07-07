import type { ButtonHTMLAttributes } from "react";

type ViewSwitchOption<T extends string> = {
  label: string;
  value: T;
};

type ViewSwitchProps<T extends string> = {
  ariaLabel: string;
  className?: string | undefined;
  onSelect: (value: T) => void;
  options: ViewSwitchOption<T>[];
  selectedValue: T;
};

export function ViewSwitch<T extends string>({
  ariaLabel,
  className,
  onSelect,
  options,
  selectedValue
}: ViewSwitchProps<T>) {
  const classNames = ["view-switch", className].filter(Boolean).join(" ");

  return (
    <div
      className={classNames}
      aria-label={ariaLabel}
      role="radiogroup"
    >
      {options.map((option) => (
        <ViewSwitchButton
          key={option.value}
          active={option.value === selectedValue}
          label={option.label}
          onClick={() => onSelect(option.value)}
        />
      ))}
    </div>
  );
}

type ViewSwitchButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active: boolean;
  label: string;
};

function ViewSwitchButton({ active, label, ...buttonProps }: ViewSwitchButtonProps) {
  const classNames = ["view-switch-button", active ? "active" : ""].filter(Boolean).join(" ");

  return (
    <button
      {...buttonProps}
      aria-checked={active}
      className={classNames}
      role="radio"
      type="button"
    >
      {label}
    </button>
  );
}

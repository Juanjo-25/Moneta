import type { ButtonHTMLAttributes } from "react";

type ViewSwitchOption = {
  label: string;
  value: string;
};

type ViewSwitchProps = {
  ariaLabel: string;
  className?: string | undefined;
  onSelect: (value: string) => void;
  options: ViewSwitchOption[];
  selectedValue: string;
};

export function ViewSwitch({
  ariaLabel,
  className,
  onSelect,
  options,
  selectedValue
}: ViewSwitchProps) {
  const classNames = ["view-switch", className].filter(Boolean).join(" ");

  return (
    <div className={classNames} aria-label={ariaLabel} role="group">
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
      aria-selected={active}
      className={classNames}
      type="button"
    >
      {label}
    </button>
  );
}
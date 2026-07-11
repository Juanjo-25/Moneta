import type { HTMLAttributes, HTMLInputTypeAttribute } from "react";

type TextFieldProps = {
  error?: string | undefined;
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
  label: string;
  onChange: (value: string) => void;
  placeholder?: string | undefined;
  readOnly?: boolean | undefined;
  type?: HTMLInputTypeAttribute;
  value: string;
};

export function TextField({
  error,
  inputMode,
  label,
  onChange,
  placeholder,
  readOnly = false,
  type = "text",
  value
}: TextFieldProps) {
  const id = label.toLowerCase().replace(/\s+/g, "-");

  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <input
        aria-invalid={Boolean(error)}
        id={id}
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        type={type}
        value={value}
      />
      {error ? <small>{error}</small> : null}
    </label>
  );
}

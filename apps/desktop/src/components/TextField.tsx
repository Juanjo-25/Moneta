import type { HTMLAttributes, HTMLInputTypeAttribute } from "react";

type TextFieldProps = {
  error?: string | undefined;
  hint?: string | undefined;
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
  label: string;
  onChange: (value: string) => void;
  readOnly?: boolean | undefined;
  type?: HTMLInputTypeAttribute;
  value: string;
};

export function TextField({
  error,
  hint,
  inputMode,
  label,
  onChange,
  readOnly = false,
  type = "text",
  value
}: TextFieldProps) {
  const id = label.toLowerCase().replace(/\s+/g, "-");
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="field">
      <label htmlFor={id}>
        <span>{label}</span>
      </label>
      <input
        aria-describedby={describedBy}
        aria-invalid={Boolean(error)}
        id={id}
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        readOnly={readOnly}
        type={type}
        value={value}
      />
      {hint ? (
        <small className="field-hint" id={hintId}>
          {hint}
        </small>
      ) : null}
      {error ? (
        <small className="field-error" id={errorId}>
          {error}
        </small>
      ) : null}
    </div>
  );
}

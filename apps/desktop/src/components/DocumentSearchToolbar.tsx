import { useId, useRef } from "react";
import { SecondaryActionButton } from "./SecondaryActionButton";

type DocumentSearchToolbarProps = {
  kind: "sales" | "purchases";
  onChange: (value: string) => void;
  resultCount: number;
  totalCount: number;
  value: string;
};

export function DocumentSearchToolbar({
  kind, onChange, resultCount, totalCount, value
}: DocumentSearchToolbarProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const isSales = kind === "sales";
  const noun = isSales ? "ventas" : "compras";

  return (
    <section className="document-search-toolbar" aria-label={`Buscador de ${noun}`}>
      <div className="document-search-heading">
        <div>
          <h2>{isSales ? "Ventas registradas" : "Compras registradas"}</h2>
          <p>{isSales
            ? "Encuentra una venta por factura, cliente, documento, vendedor o producto."
            : "Encuentra una compra por factura, proveedor, documento o producto."}</p>
        </div>
        <span className="document-search-count" role="status" aria-live="polite" aria-atomic="true">
          {resultCount} de {totalCount} {noun}
        </span>
      </div>
      <div className="document-search-controls">
        <div className="field document-search-field">
          <label htmlFor={id}>Buscar {noun}</label>
          <div className="document-search-input">
            <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
              <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.8" />
              <path d="m16 16 4.5 4.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
            </svg>
            <input id={id} ref={inputRef} type="search" autoComplete="off"
              value={value} placeholder={isSales ? "Ej. FV-001, Gómez, arroz…" : "Ej. FC-001, proveedor, arroz…"}
              onChange={(event) => onChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  onChange("");
                }
              }} />
          </div>
        </div>
        {value ? (
          <SecondaryActionButton onClick={() => { onChange(""); inputRef.current?.focus(); }}>
            Limpiar búsqueda
          </SecondaryActionButton>
        ) : null}
      </div>
    </section>
  );
}

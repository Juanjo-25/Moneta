import { useEffect, useId, useRef, useState } from "react";
import type { ReceivableRecord } from "../../types";

type ReceivablePickerProps = {
  error?: string | undefined;
  formatCurrency: (minor: number) => string;
  onSelect: (id: string) => void;
  receivables: ReceivableRecord[];
  value: string;
};

export function ReceivablePicker({
  error,
  formatCurrency,
  onSelect,
  receivables,
  value
}: ReceivablePickerProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const selected = receivables.find((receivable) => receivable.id === value);
  const query = search.trim().toLocaleLowerCase("es");
  const groups = new Map<string, { name: string; accounts: ReceivableRecord[] }>();

  for (const receivable of receivables) {
    const invoiceNumber = receivable.invoiceNumber?.trim() || receivable.saleId;
    if (receivable.balanceMinor <= 0 || !invoiceNumber.toLocaleLowerCase("es").includes(query)) {
      continue;
    }
    const group = groups.get(receivable.customerId) ?? {
      name: receivable.customerName,
      accounts: []
    };
    group.accounts.push(receivable);
    groups.set(receivable.customerId, group);
  }

  const sortedGroups = [...groups.entries()].sort(([, left], [, right]) =>
    left.name.localeCompare(right.name, "es")
  );
  for (const [, group] of sortedGroups) {
    group.accounts.sort((left, right) =>
      (left.invoiceNumber?.trim() || left.saleId).localeCompare(
        right.invoiceNumber?.trim() || right.saleId,
        "es",
        { numeric: true }
      )
    );
  }
  const options = sortedGroups.flatMap(([, group]) => group.accounts);
  const active = options[activeIndex];
  const activeId = active ? `${id}-option-${active.id}` : undefined;

  useEffect(() => {
    if (open && activeId) {
      document.getElementById(activeId)?.scrollIntoView?.({ block: "nearest" });
    }
  }, [open, activeId]);

  function close() {
    setOpen(false);
    setSearch("");
    setActiveIndex(-1);
  }

  function select(receivable: ReceivableRecord) {
    onSelect(receivable.id);
    close();
    inputRef.current?.focus();
  }

  return (
    <div
      className="field searchable-select receivable-picker"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) close();
      }}
    >
      <label htmlFor={id}>Cuenta por cobrar</label>
      <div className="searchable-select-control">
        <input
          aria-activedescendant={open ? activeId : undefined}
          aria-autocomplete="list"
          aria-controls={`${id}-options`}
          aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`}
          aria-expanded={open}
          aria-invalid={Boolean(error)}
          autoComplete="off"
          id={id}
          onChange={(event) => {
            setSearch(event.target.value);
            setOpen(true);
            setActiveIndex(-1);
            if (value) onSelect("");
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              setOpen(true);
              setActiveIndex((current) => {
                if (!options.length) return -1;
                return event.key === "ArrowDown"
                  ? Math.min(current + 1, options.length - 1)
                  : current <= 0 ? options.length - 1 : current - 1;
              });
            } else if (event.key === "Enter" && open) {
              event.preventDefault();
              if (active) select(active);
            } else if (event.key === "Escape") {
              event.preventDefault();
              close();
            }
          }}
          placeholder="Buscar por número de factura"
          ref={inputRef}
          role="combobox"
          type="text"
          value={open ? search : selected
            ? `${selected.invoiceNumber?.trim() || selected.saleId} · ${selected.customerName}`
            : ""}
        />
        <button
          aria-label={open ? "Cerrar cuentas por cobrar" : "Abrir cuentas por cobrar"}
          className="searchable-select-toggle"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            if (open) close();
            else {
              inputRef.current?.focus();
              setOpen(true);
            }
          }}
          tabIndex={-1}
          type="button"
        >
          ▾
        </button>
        {open ? (
          <div
            aria-label="Cuentas por cobrar por cliente"
            className="searchable-select-menu receivable-picker-menu"
            id={`${id}-options`}
            role="listbox"
          >
            {sortedGroups.map(([customerId, group]) => (
              <div aria-label={group.name} key={customerId} role="group">
                <div className="receivable-picker-customer" aria-hidden="true">
                  {group.name}
                </div>
                {group.accounts.map((receivable) => (
                  <button
                    aria-selected={value === receivable.id}
                    className={`searchable-select-option${active?.id === receivable.id ? " receivable-picker-active" : ""}`}
                    id={`${id}-option-${receivable.id}`}
                    key={receivable.id}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => select(receivable)}
                    role="option"
                    tabIndex={-1}
                    type="button"
                  >
                    <strong>Factura {receivable.invoiceNumber?.trim() || receivable.saleId}</strong>
                    <span>Saldo {formatCurrency(receivable.balanceMinor)} · Vence {receivable.dueAt || "Sin vencimiento"}</span>
                  </button>
                ))}
              </div>
            ))}
            {!options.length ? (
              <div className="searchable-select-empty" role="status">
                {receivables.some((receivable) => receivable.balanceMinor > 0)
                  ? "No hay facturas que coincidan con la búsqueda."
                  : "No hay cuentas por cobrar pendientes."}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      <small className="receivable-picker-hint" id={`${id}-hint`}>Busca el número completo o una parte. Facturas agrupadas por cliente.</small>
      {error ? <small className="field-error" id={`${id}-error`}>{error}</small> : null}
    </div>
  );
}

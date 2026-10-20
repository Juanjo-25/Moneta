import { useEffect, useId, useRef, useState } from "react";
import type { ProductRecord } from "../../types";

type ProductPickerProps = {
  error?: string | undefined;
  formatCurrency: (amount: number) => string;
  onSelect: (product: ProductRecord | null) => void;
  products: ProductRecord[];
  value: string;
};

export function ProductPicker({ error, formatCurrency, onSelect, products, value }: ProductPickerProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const selected = products.find((product) => product.id === value);
  const activeProducts = products.filter((product) => product.active);
  const terms = normalizeSearch(search).split(/\s+/).filter(Boolean);
  const results = activeProducts.filter((product) => {
    const text = normalizeSearch(`${product.name} ${product.sku}`);
    return terms.every((term) => text.includes(term));
  });
  const activeProduct = results[activeIndex];
  const activeId = activeProduct ? `${id}-option-${activeProduct.id}` : undefined;

  useEffect(() => {
    if (open && activeId) {
      document.getElementById(activeId)?.scrollIntoView?.({ block: "nearest" });
    }
  }, [open, activeId]);

  function select(product: ProductRecord | null) {
    onSelect(product);
    setSearch("");
    setActiveIndex(-1);
    setOpen(false);
  }

  return (
    <div
      className="field searchable-select sales-product-picker"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
          setActiveIndex(-1);
        }
      }}
    >
      <label htmlFor={id}>Buscar producto</label>
      <div className="searchable-select-control sales-product-search">
        <svg aria-hidden="true" className="sales-product-search-icon" fill="none" viewBox="0 0 24 24">
          <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.8" />
          <path d="m16 16 4.5 4.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        </svg>
        <input
          aria-activedescendant={open ? activeId : undefined}
          aria-autocomplete="list"
          aria-controls={`${id}-options`}
          aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`}
          aria-expanded={open}
          aria-invalid={Boolean(error)}
          aria-label="Producto buscable"
          autoComplete="off"
          id={id}
          onChange={(event) => {
            setSearch(event.target.value);
            setOpen(true);
            setActiveIndex(-1);
            if (selected) onSelect(null);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              setOpen(true);
              setActiveIndex((current) => {
                if (!results.length) return -1;
                return event.key === "ArrowDown"
                  ? Math.min(current + 1, results.length - 1)
                  : current <= 0 ? results.length - 1 : current - 1;
              });
            } else if (event.key === "Enter" && open) {
              event.preventDefault();
              if (activeProduct) select(activeProduct);
              else if (results.length === 1) select(results[0]!);
            } else if (event.key === "Escape") {
              event.preventDefault();
              setOpen(false);
              setActiveIndex(-1);
            }
          }}
          placeholder="Buscar producto por nombre o código"
          ref={inputRef}
          role="combobox"
          title={selected?.name}
          type="text"
          value={selected?.name ?? search}
        />
        {selected || search ? (
          <button
            aria-label="Limpiar búsqueda de productos"
            className="sales-product-clear"
            onClick={() => {
              select(null);
              inputRef.current?.focus();
              setOpen(true);
            }}
            onMouseDown={(event) => event.preventDefault()}
            type="button"
          >
            ×
          </button>
        ) : null}
        <button
          aria-label={open ? "Cerrar productos" : "Abrir productos"}
          className="searchable-select-toggle"
          onClick={() => {
            const nextOpen = !open;
            inputRef.current?.focus();
            setOpen(nextOpen);
            setActiveIndex(-1);
          }}
          onMouseDown={(event) => event.preventDefault()}
          tabIndex={-1}
          type="button"
        >
          ▾
        </button>
        {open ? (
          <div className="searchable-select-menu sales-product-menu">
            <div className="sales-product-results-heading">
              <strong>{terms.length ? "Resultados de búsqueda" : "Productos disponibles"}</strong>
              <span>{results.length} {results.length === 1 ? "producto" : "productos"}</span>
            </div>
            <div aria-label="Productos disponibles" id={`${id}-options`} role="listbox">
              {results.map((product, index) => (
                <button
                  aria-label={product.name}
                  aria-selected={selected?.id === product.id}
                  className={`searchable-select-option sales-product-option${activeIndex === index ? " sales-product-option-active" : ""}`}
                  id={`${id}-option-${product.id}`}
                  key={product.id}
                  onClick={() => select(product)}
                  onMouseDown={(event) => event.preventDefault()}
                  role="option"
                  tabIndex={-1}
                  type="button"
                >
                  <div className="sales-product-option-info">
                    <strong>{product.name}</strong>
                    <span>Código: {product.sku || "Sin código"} · Stock: {product.stock} · {product.unit}</span>
                  </div>
                  <span className="sales-product-option-price">{formatCurrency(product.salePriceMinor)}</span>
                </button>
              ))}
            </div>
            {!results.length ? (
              <div className="sales-product-empty" role="status">
                <strong>{activeProducts.length ? "Sin productos coincidentes" : "No hay productos disponibles"}</strong>
                <span>{activeProducts.length ? "Prueba con otra palabra del nombre o con el código." : "Crea un producto en el inventario para agregarlo a la factura."}</span>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      <select
        aria-label="Producto"
        className="native-select-compat"
        onChange={(event) => select(activeProducts.find((product) => product.id === event.target.value) ?? null)}
        tabIndex={-1}
        value={value}
      >
        <option value="">Selecciona un producto</option>
        {activeProducts.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
      </select>
      {selected ? (
        <div className="sales-product-selected" aria-label="Producto seleccionado">
          <strong>{selected.name}</strong>
          <span>Código: {selected.sku || "Sin código"} · Stock disponible: {selected.stock} · {selected.unit}</span>
        </div>
      ) : null}
      <small className="sales-product-hint" id={`${id}-hint`}>
        {activeProducts.length} {activeProducts.length === 1 ? "producto disponible" : "productos disponibles"} · Busca por nombre o código. Usa ↑ ↓ y Enter para seleccionar.
      </small>
      {error ? <small id={`${id}-error`} role="alert">{error}</small> : null}
    </div>
  );
}

function normalizeSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").trim();
}

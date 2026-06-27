# Products Inventory Basic Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the first working product and basic inventory workflow to the Moneta desktop app.

**Architecture:** This slice keeps product state local to the React app session and does not add SQLite persistence. The UI owns a `ProductRecord` view model for now, while existing domain rules remain available for later persistence and inventory movement work. Dashboard metrics derive from the same local product state so the UI has one source of truth.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, Tauri shell, pnpm workspaces.

---

## Scope Check

This plan implements the approved first product slice only: create products, render a table, track initial stock, show low-stock alerts, and update dashboard metrics. SQLite persistence, editing/deleting products, purchases, sales, barcode scanning, import/export, and Tauri database commands are outside this plan.

## File Structure

- `apps/desktop/src/App.tsx`: Extend the current app shell with local product state, product form behavior, product table rendering, low-stock dashboard panel, and metrics derived from product data.
- `apps/desktop/src/App.css`: Add form, table, validation, and product status styles that fit the current desktop shell.
- `apps/desktop/src/App.test.tsx`: Extend UI tests to cover product creation, invalid submission, table rendering, dashboard metric updates, and low-stock alerts.
- `apps/desktop/package.json`, `pnpm-lock.yaml`: No dependency changes expected. Only modify if verification proves a missing test/runtime dependency.

## Task 1: Product Creation Test Coverage

**Files:**
- Modify: `apps/desktop/src/App.test.tsx`

- [ ] **Step 1: Add failing tests for product creation and dashboard metrics**

Append these tests inside the existing `describe("App navigation", () => { ... })` block in `apps/desktop/src/App.test.tsx`:

```tsx
it("creates a product and updates the dashboard product metrics", async () => {
  const user = userEvent.setup();

  render(<App />);

  await user.click(screen.getByRole("button", { name: "Productos" }));
  await user.type(screen.getByLabelText("Codigo"), "ARZ-001");
  await user.type(screen.getByLabelText("Producto"), "Arroz libra");
  await user.type(screen.getByLabelText("Unidad"), "unidad");
  await user.type(screen.getByLabelText("Costo"), "3200");
  await user.type(screen.getByLabelText("Precio venta"), "4500");
  await user.type(screen.getByLabelText("Stock minimo"), "5");
  await user.type(screen.getByLabelText("Stock inicial"), "4");
  await user.click(screen.getByRole("button", { name: "Guardar producto" }));

  expect(screen.getByRole("cell", { name: "ARZ-001" })).toBeTruthy();
  expect(screen.getByRole("cell", { name: "Arroz libra" })).toBeTruthy();
  expect(screen.getByRole("cell", { name: "Bajo stock" })).toBeTruthy();

  await user.click(screen.getByRole("button", { name: "Dashboard" }));

  expect(screen.getByText("Productos activos")).toBeTruthy();
  expect(screen.getByText("Alertas de inventario")).toBeTruthy();
  expect(screen.getAllByText("1")).toHaveLength(2);
  expect(screen.getByText("Arroz libra")).toBeTruthy();
});

it("rejects invalid product submissions without adding a row", async () => {
  const user = userEvent.setup();

  render(<App />);

  await user.click(screen.getByRole("button", { name: "Productos" }));
  await user.click(screen.getByRole("button", { name: "Guardar producto" }));

  expect(screen.getByText("El codigo es obligatorio.")).toBeTruthy();
  expect(screen.getByText("El nombre es obligatorio.")).toBeTruthy();
  expect(screen.queryByRole("table", { name: "Productos registrados" })).toBeNull();
  expect(screen.getByText("Sin productos registrados")).toBeTruthy();
});
```

- [ ] **Step 2: Run product UI tests to verify failure**

Run:

```bash
CI=true pnpm --config.confirmModulesPurge=false --filter @moneta/desktop test -- App.test.tsx
```

Expected: FAIL because product form labels, `Guardar producto`, product table, validation messages, and dynamic dashboard metrics do not exist yet.

## Task 2: Product State, Form, and Table

**Files:**
- Modify: `apps/desktop/src/App.tsx`
- Modify: `apps/desktop/src/App.css`

- [ ] **Step 1: Add product state model and helpers in `App.tsx`**

In `apps/desktop/src/App.tsx`, add these types after `SectionConfig`:

```tsx
type ProductRecord = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  costMinor: number;
  salePriceMinor: number;
  minimumStock: number;
  stock: number;
  active: boolean;
};

type ProductFormState = {
  sku: string;
  name: string;
  unit: string;
  cost: string;
  salePrice: string;
  minimumStock: string;
  initialStock: string;
};

type ProductFormErrors = Partial<Record<keyof ProductFormState, string>>;

const emptyProductForm: ProductFormState = {
  sku: "",
  name: "",
  unit: "",
  cost: "",
  salePrice: "",
  minimumStock: "",
  initialStock: ""
};
```

Add these helpers below the `metrics` constant:

```tsx
function parseNonNegativeInteger(value: string): number | null {
  if (value.trim() === "") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function formatCurrency(minor: number): string {
  return new Intl.NumberFormat("es-CO", {
    currency: "COP",
    maximumFractionDigits: 0,
    style: "currency"
  }).format(minor);
}

function isLowStock(product: ProductRecord): boolean {
  return product.stock <= product.minimumStock;
}
```

- [ ] **Step 2: Replace static metrics with derived product metrics**

Remove the existing static `metrics` constant:

```tsx
const metrics = [
  { label: "Productos activos", value: "0" },
  { label: "Ventas de hoy", value: "$0" },
  { label: "Cartera pendiente", value: "$0" },
  { label: "Alertas de inventario", value: "0" }
];
```

Inside `App`, add product state before `activeSection`:

```tsx
const [products, setProducts] = useState<ProductRecord[]>([]);
```

Add derived metrics inside `App` after `activeSection`:

```tsx
const lowStockProducts = products.filter(isLowStock);
const metrics = [
  { label: "Productos activos", value: String(products.filter((product) => product.active).length) },
  { label: "Ventas de hoy", value: "$0" },
  { label: "Cartera pendiente", value: "$0" },
  { label: "Alertas de inventario", value: String(lowStockProducts.length) }
];
```

Update `DashboardContent` props and call:

```tsx
<DashboardContent
  lowStockProducts={lowStockProducts}
  metrics={metrics}
  onOpenProducts={() => openSection("products")}
  onOpenReports={() => openSection("reports")}
/>
```

Change `DashboardContentProps` to:

```tsx
type DashboardContentProps = {
  lowStockProducts: ProductRecord[];
  metrics: Array<{ label: string; value: string }>;
  onOpenProducts: () => void;
  onOpenReports: () => void;
};
```

Change the `DashboardContent` signature to:

```tsx
function DashboardContent({
  lowStockProducts,
  metrics,
  onOpenProducts,
  onOpenReports
}: DashboardContentProps) {
```

- [ ] **Step 3: Implement low-stock dashboard rendering**

In `DashboardContent`, replace the second panel empty state:

```tsx
<div className="empty-state">
  <strong>Sin alertas</strong>
  <span>Los productos bajo el minimo se mostraran aqui.</span>
</div>
```

With:

```tsx
{lowStockProducts.length > 0 ? (
  <ul className="alert-list" aria-label="Productos con bajo stock">
    {lowStockProducts.map((product) => (
      <li key={product.id}>
        <strong>{product.name}</strong>
        <span>
          Stock {product.stock} / minimo {product.minimumStock}
        </span>
      </li>
    ))}
  </ul>
) : (
  <div className="empty-state">
    <strong>Sin alertas</strong>
    <span>Los productos bajo el minimo se mostraran aqui.</span>
  </div>
)}
```

- [ ] **Step 4: Add product creation handler**

Inside `App`, after `openSection`, add:

```tsx
function createProduct(product: ProductRecord) {
  setProducts((currentProducts) => [...currentProducts, product]);
}
```

Update the non-dashboard `SectionContent` call:

```tsx
<SectionContent
  onCreateProduct={createProduct}
  products={products}
  section={activeSection}
/>
```

Change `SectionContentProps`:

```tsx
type SectionContentProps = {
  onCreateProduct: (product: ProductRecord) => void;
  products: ProductRecord[];
  section: SectionConfig;
};
```

Change `SectionContent` signature:

```tsx
function SectionContent({
  onCreateProduct,
  products,
  section
}: SectionContentProps) {
```

At the top of `SectionContent`, branch product content:

```tsx
if (section.id === "products") {
  return <ProductsSection onCreateProduct={onCreateProduct} products={products} />;
}
```

- [ ] **Step 5: Add `ProductsSection` component**

Add this component below `SectionContent`:

```tsx
type ProductsSectionProps = {
  onCreateProduct: (product: ProductRecord) => void;
  products: ProductRecord[];
};

function ProductsSection({ onCreateProduct, products }: ProductsSectionProps) {
  const [form, setForm] = useState<ProductFormState>(emptyProductForm);
  const [errors, setErrors] = useState<ProductFormErrors>({});

  function updateField(field: keyof ProductFormState, value: string) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
    setErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
  }

  function submitProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: ProductFormErrors = {};
    const cost = parseNonNegativeInteger(form.cost);
    const salePrice = parseNonNegativeInteger(form.salePrice);
    const minimumStock = parseNonNegativeInteger(form.minimumStock);
    const initialStock = parseNonNegativeInteger(form.initialStock);

    if (form.sku.trim() === "") nextErrors.sku = "El codigo es obligatorio.";
    if (form.name.trim() === "") nextErrors.name = "El nombre es obligatorio.";
    if (form.unit.trim() === "") nextErrors.unit = "La unidad es obligatoria.";
    if (cost === null) nextErrors.cost = "El costo debe ser cero o mayor.";
    if (salePrice === null) nextErrors.salePrice = "El precio de venta debe ser cero o mayor.";
    if (minimumStock === null) nextErrors.minimumStock = "El stock minimo debe ser cero o mayor.";
    if (initialStock === null) nextErrors.initialStock = "El stock inicial debe ser cero o mayor.";

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    onCreateProduct({
      active: true,
      costMinor: cost!,
      id: `product-${Date.now()}`,
      minimumStock: minimumStock!,
      name: form.name.trim(),
      salePriceMinor: salePrice!,
      sku: form.sku.trim(),
      stock: initialStock!,
      unit: form.unit.trim()
    });
    setForm(emptyProductForm);
  }

  return (
    <section className="products-layout">
      <form className="product-form" onSubmit={submitProduct}>
        <div className="form-grid">
          <TextField error={errors.sku} label="Codigo" onChange={(value) => updateField("sku", value)} value={form.sku} />
          <TextField error={errors.name} label="Producto" onChange={(value) => updateField("name", value)} value={form.name} />
          <TextField error={errors.unit} label="Unidad" onChange={(value) => updateField("unit", value)} value={form.unit} />
          <TextField error={errors.cost} inputMode="numeric" label="Costo" onChange={(value) => updateField("cost", value)} value={form.cost} />
          <TextField error={errors.salePrice} inputMode="numeric" label="Precio venta" onChange={(value) => updateField("salePrice", value)} value={form.salePrice} />
          <TextField error={errors.minimumStock} inputMode="numeric" label="Stock minimo" onChange={(value) => updateField("minimumStock", value)} value={form.minimumStock} />
          <TextField error={errors.initialStock} inputMode="numeric" label="Stock inicial" onChange={(value) => updateField("initialStock", value)} value={form.initialStock} />
        </div>
        <div className="form-actions">
          <button type="submit">Guardar producto</button>
        </div>
      </form>

      {products.length > 0 ? (
        <ProductTable products={products} />
      ) : (
        <div className="empty-state section-empty">
          <strong>Sin productos registrados</strong>
          <span>Crea productos para empezar a controlar inventario.</span>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 6: Add `TextField` and `ProductTable` components**

Add these components below `ProductsSection`:

```tsx
type TextFieldProps = {
  error?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  label: string;
  onChange: (value: string) => void;
  value: string;
};

function TextField({ error, inputMode, label, onChange, value }: TextFieldProps) {
  const id = label.toLowerCase().replace(/\s+/g, "-");

  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <input
        aria-invalid={Boolean(error)}
        id={id}
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
      {error ? <small>{error}</small> : null}
    </label>
  );
}

type ProductTableProps = {
  products: ProductRecord[];
};

function ProductTable({ products }: ProductTableProps) {
  return (
    <table className="data-table" aria-label="Productos registrados">
      <thead>
        <tr>
          <th>Codigo</th>
          <th>Producto</th>
          <th>Unidad</th>
          <th>Costo</th>
          <th>Precio venta</th>
          <th>Stock</th>
          <th>Minimo</th>
          <th>Estado</th>
        </tr>
      </thead>
      <tbody>
        {products.map((product) => (
          <tr key={product.id}>
            <td>{product.sku}</td>
            <td>{product.name}</td>
            <td>{product.unit}</td>
            <td>{formatCurrency(product.costMinor)}</td>
            <td>{formatCurrency(product.salePriceMinor)}</td>
            <td>{product.stock}</td>
            <td>{product.minimumStock}</td>
            <td>
              <span className={isLowStock(product) ? "status warning" : "status ok"}>
                {isLowStock(product) ? "Bajo stock" : "Disponible"}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 7: Add product UI styles**

Append to `apps/desktop/src/App.css`:

```css
.products-layout {
  display: grid;
  gap: 18px;
}

.product-form,
.section-panel {
  border: 1px solid #d8dee5;
  border-radius: 8px;
  background: white;
  padding: 18px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.field {
  display: grid;
  gap: 6px;
}

.field span {
  color: #334155;
  font-size: 13px;
  font-weight: 700;
}

.field input {
  min-width: 0;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 10px 11px;
  color: #111827;
  font: inherit;
}

.field input[aria-invalid="true"] {
  border-color: #dc2626;
}

.field small {
  color: #b91c1c;
  font-size: 12px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.form-actions button,
.section-toolbar button {
  border-radius: 8px;
  background: #0f766e;
  color: white;
  padding: 10px 14px;
  font-weight: 700;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid #d8dee5;
  border-radius: 8px;
  background: white;
  overflow: hidden;
}

.data-table th,
.data-table td {
  border-bottom: 1px solid #e5eaf0;
  padding: 11px 12px;
  text-align: left;
  white-space: nowrap;
}

.data-table th {
  background: #f8fafc;
  color: #475569;
  font-size: 13px;
}

.status {
  display: inline-flex;
  border-radius: 999px;
  padding: 4px 8px;
  font-size: 12px;
  font-weight: 700;
}

.status.ok {
  background: #dcfce7;
  color: #166534;
}

.status.warning {
  background: #fef3c7;
  color: #92400e;
}

.alert-list {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.alert-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid #fde68a;
  border-radius: 8px;
  background: #fffbeb;
  padding: 10px 12px;
}

.alert-list span {
  color: #92400e;
  font-size: 13px;
}
```

If duplicate `.section-panel` definitions now exist, keep one definition that includes the same border, radius, background, and padding.

- [ ] **Step 8: Run product UI tests**

Run:

```bash
CI=true pnpm --config.confirmModulesPurge=false --filter @moneta/desktop test -- App.test.tsx
```

Expected: PASS with existing navigation tests plus new product tests.

- [ ] **Step 9: Commit**

```bash
git add apps/desktop/src/App.tsx apps/desktop/src/App.css apps/desktop/src/App.test.tsx apps/desktop/package.json apps/desktop/tsconfig.json apps/desktop/vitest.config.ts pnpm-lock.yaml
git commit -m "feat: add product inventory workflow"
```

## Task 3: Full Verification and Native Check

**Files:**
- Modify only if verification reveals concrete issues from Task 2.

- [ ] **Step 1: Run full workspace verification**

Run:

```bash
CI=true pnpm --config.confirmModulesPurge=false test
CI=true pnpm --config.confirmModulesPurge=false typecheck
CI=true pnpm --config.confirmModulesPurge=false build
cargo check
```

Run `cargo check` from:

```bash
cd /Users/juanjo/Documents/Moneta/apps/desktop/src-tauri
```

Expected: all commands pass.

- [ ] **Step 2: Verify in local browser**

Run:

```bash
CI=true pnpm --config.confirmModulesPurge=false dev:desktop
```

Open `http://localhost:5173/` and verify:

- `Productos` opens the products section.
- A valid product can be created.
- The product appears in the table.
- Low-stock product appears in Dashboard `Inventario bajo`.
- Dashboard `Productos activos` and `Alertas de inventario` show `1`.
- No console errors.
- No horizontal overflow at 1280px width.

- [ ] **Step 3: Stop local dev server**

Stop the Vite process with `Ctrl+C`.

- [ ] **Step 4: Commit fixes only if needed**

If verification required changes, commit them:

```bash
git add apps/desktop
git commit -m "fix: stabilize product inventory workflow"
```

If no fixes were needed, do not create an empty commit.

## Self-Review

- Spec coverage: The plan covers product creation, table rendering, initial stock, low-stock state, dashboard metrics, validation messages, and local app-session state. SQLite, editing/deleting, purchases, sales, import/export, and barcode scanning remain excluded as specified.
- Red flag scan: The plan uses exact files, commands, expected outcomes, code snippets, and commit points. It avoids unresolved markers and broad instructions without implementation detail.
- Type consistency: `ProductRecord`, `ProductFormState`, `ProductFormErrors`, `ProductsSection`, `ProductTable`, `TextField`, `products`, `lowStockProducts`, `metrics`, `isLowStock`, and `formatCurrency` are named consistently across tasks.

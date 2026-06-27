# Product Price Format and Unit Stock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add live COP formatting to product prices and make `Unidad` the single opening quantity field that becomes initial stock in the Moneta desktop app.

**Architecture:** This slice stays inside the desktop React app and keeps all persisted values as plain integers in local UI state. The visible form gains lightweight formatting helpers for money inputs, while the product record is simplified so quantity lives only in `stock`.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, pnpm workspaces.

---

## Scope Check

This plan only covers the `Productos` desktop form and product table behavior. It does not add database persistence, cents, currency symbols inside inputs, purchases, sales, or descriptive packaging units.

## File Structure

- Modify: `apps/desktop/src/App.test.tsx` to add failing tests for live money formatting, `Unidad`-as-stock behavior, and removal of `Stock inicial`.
- Modify: `apps/desktop/src/App.tsx` to add numeric formatting helpers, simplify product data shape, remove the separate `Stock inicial` field, and update the table columns.
- Modify: `apps/desktop/src/App.css` only if implementation needs a tiny style adjustment for the money inputs after tests are green. No CSS changes are expected for correctness.

## Task 1: Lock the New Form Behavior with Tests

**Files:**
- Modify: `apps/desktop/src/App.test.tsx`

- [ ] **Step 1: Update the existing creation test and add a failing formatting test**

Replace the current product creation test block and append the new formatting test in `apps/desktop/src/App.test.tsx`:

```tsx
  it("creates a product with unidad as initial stock and updates dashboard metrics", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Productos" }));
    await user.type(screen.getByLabelText("Codigo"), "ARZ-001");
    await user.type(screen.getByLabelText("Producto"), "Arroz libra");
    await user.type(screen.getByLabelText("Unidad"), "4");
    await user.type(screen.getByLabelText("Costo"), "3200");
    await user.type(screen.getByLabelText("Precio venta"), "4500");
    await user.type(screen.getByLabelText("Stock minimo"), "5");
    await user.click(screen.getByRole("button", { name: "Guardar producto" }));

    expect(screen.queryByLabelText("Stock inicial")).toBeNull();
    expect(screen.getByRole("cell", { name: "ARZ-001" })).toBeTruthy();
    expect(screen.getByRole("cell", { name: "Arroz libra" })).toBeTruthy();
    expect(screen.getByRole("cell", { name: "$ 3.200" })).toBeTruthy();
    expect(screen.getByRole("cell", { name: "$ 4.500" })).toBeTruthy();
    expect(screen.getByRole("cell", { name: "4" })).toBeTruthy();
    expect(screen.getByRole("cell", { name: "Bajo stock" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Dashboard" }));

    expect(screen.getByText("Productos activos")).toBeTruthy();
    expect(screen.getByText("Alertas de inventario")).toBeTruthy();
    expect(screen.getAllByText("1")).toHaveLength(2);
    expect(screen.getByText("Arroz libra")).toBeTruthy();
  });

  it("formats cost and sale price as colombian pesos while typing", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Productos" }));

    const costInput = screen.getByLabelText("Costo") as HTMLInputElement;
    const salePriceInput = screen.getByLabelText("Precio venta") as HTMLInputElement;

    await user.type(costInput, "3200");
    await user.type(salePriceInput, "45000");

    expect(costInput.value).toBe("3.200");
    expect(salePriceInput.value).toBe("45.000");
  });
```

- [ ] **Step 2: Tighten the invalid-submission test around the removed field**

In the invalid submission test, add this assertion after opening `Productos`:

```tsx
    expect(screen.queryByLabelText("Stock inicial")).toBeNull();
```

Keep the existing assertions for validation and missing table.

- [ ] **Step 3: Run the focused test file to verify failure**

Run:

```bash
CI=true pnpm --config.confirmModulesPurge=false --filter @moneta/desktop test -- App.test.tsx
```

Expected: FAIL because `Stock inicial` still exists, `Unidad` still behaves as text, and the money inputs do not format live.

## Task 2: Implement Live Money Formatting and Unit-As-Stock

**Files:**
- Modify: `apps/desktop/src/App.tsx`

- [ ] **Step 1: Simplify the product record and form state**

Update the type definitions near the top of `apps/desktop/src/App.tsx`:

```tsx
type ProductRecord = {
  id: string;
  sku: string;
  name: string;
  costMinor: number;
  salePriceMinor: number;
  minimumStock: number;
  stock: number;
  active: boolean;
};

type ProductFormState = {
  sku: string;
  name: string;
  quantity: string;
  cost: string;
  salePrice: string;
  minimumStock: string;
};

const emptyProductForm: ProductFormState = {
  sku: "",
  name: "",
  quantity: "",
  cost: "",
  salePrice: "",
  minimumStock: ""
};
```

- [ ] **Step 2: Add helpers for stripping and formatting numeric input**

Replace the current integer parsing helper block with:

```tsx
function stripNonDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function parseNonNegativeInteger(value: string): number | null {
  const digits = stripNonDigits(value);

  if (digits === "") {
    return null;
  }

  const parsed = Number(digits);

  if (!Number.isInteger(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function formatIntegerInput(value: string): string {
  const digits = stripNonDigits(value);

  if (digits === "") {
    return "";
  }

  return new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: 0
  }).format(Number(digits));
}
```

Leave `formatCurrency` and `isLowStock` in place.

- [ ] **Step 3: Split plain-field and money-field updates**

Inside `ProductsSection`, replace the current `updateField` helper with:

```tsx
  function updateField(field: "sku" | "name" | "quantity" | "minimumStock", value: string) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
    setErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
  }

  function updateMoneyField(field: "cost" | "salePrice", value: string) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: formatIntegerInput(value)
    }));
    setErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
  }
```

- [ ] **Step 4: Remove `Stock inicial` from validation and use `Unidad` as stock**

Update `submitProduct` inside `ProductsSection` to this shape:

```tsx
  function submitProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: ProductFormErrors = {};
    const quantity = parseNonNegativeInteger(form.quantity);
    const cost = parseNonNegativeInteger(form.cost);
    const salePrice = parseNonNegativeInteger(form.salePrice);
    const minimumStock = parseNonNegativeInteger(form.minimumStock);

    if (form.sku.trim() === "") {
      nextErrors.sku = "El codigo es obligatorio.";
    }
    if (form.name.trim() === "") {
      nextErrors.name = "El nombre es obligatorio.";
    }
    if (quantity === null) {
      nextErrors.quantity = "La unidad debe ser cero o mayor.";
    }
    if (cost === null) {
      nextErrors.cost = "El costo debe ser cero o mayor.";
    }
    if (salePrice === null) {
      nextErrors.salePrice = "El precio de venta debe ser cero o mayor.";
    }
    if (minimumStock === null) {
      nextErrors.minimumStock = "El stock minimo debe ser cero o mayor.";
    }

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
      stock: quantity!
    });
    setForm(emptyProductForm);
  }
```

- [ ] **Step 5: Update the form fields and remove the old input**

In the form JSX inside `ProductsSection`, replace the `Unidad` and money inputs plus remove the `Stock inicial` field:

```tsx
          <TextField
            error={errors.quantity}
            inputMode="numeric"
            label="Unidad"
            onChange={(value) => updateField("quantity", value)}
            value={form.quantity}
          />
          <TextField
            error={errors.cost}
            inputMode="numeric"
            label="Costo"
            onChange={(value) => updateMoneyField("cost", value)}
            value={form.cost}
          />
          <TextField
            error={errors.salePrice}
            inputMode="numeric"
            label="Precio venta"
            onChange={(value) => updateMoneyField("salePrice", value)}
            value={form.salePrice}
          />
```

Remove this old field completely:

```tsx
          <TextField
            error={errors.initialStock}
            inputMode="numeric"
            label="Stock inicial"
            onChange={(value) => updateField("initialStock", value)}
            value={form.initialStock}
          />
```

- [ ] **Step 6: Remove the duplicate `Unidad` column from the table**

Update `ProductTable` to this header and row shape:

```tsx
function ProductTable({ products }: ProductTableProps) {
  return (
    <table className="data-table" aria-label="Productos registrados">
      <thead>
        <tr>
          <th>Codigo</th>
          <th>Producto</th>
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

- [ ] **Step 7: Run the focused desktop tests to verify green**

Run:

```bash
CI=true pnpm --config.confirmModulesPurge=false --filter @moneta/desktop test -- App.test.tsx
```

Expected: PASS with the new formatting and `Unidad`-as-stock behavior.

## Task 3: Verify Workspace Integrity

**Files:**
- Modify: none expected

- [ ] **Step 1: Run the full test suite**

Run:

```bash
CI=true pnpm --config.confirmModulesPurge=false test
```

Expected: PASS across `packages/domain`, `packages/application`, and `apps/desktop`.

- [ ] **Step 2: Run workspace typecheck**

Run:

```bash
CI=true pnpm --config.confirmModulesPurge=false typecheck
```

Expected: PASS with no TypeScript errors.

- [ ] **Step 3: Run workspace build**

Run:

```bash
CI=true pnpm --config.confirmModulesPurge=false build
```

Expected: PASS with a successful Vite build for `apps/desktop`.

- [ ] **Step 4: Commit the implementation**

```bash
git add apps/desktop/src/App.tsx apps/desktop/src/App.test.tsx
git commit -m "feat: format product prices and use unit as stock"
```

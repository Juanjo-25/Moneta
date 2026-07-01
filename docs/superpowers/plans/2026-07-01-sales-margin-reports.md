# Sales Margin Reports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add editable sale-line pricing with historical margin snapshots, then build the first `Reportes` dashboard for margin by sale, product, and customer.

**Architecture:** Keep this slice local to the current desktop React app. Extend the existing sale-line draft and persisted sale-line records with price and cost snapshots, route all downstream sale display and invoice behavior through those stored values, then add a focused `ReportsSection` plus local aggregation helpers for product, customer, and sale margin analytics.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, app-level CSS.

---

## File Structure

- Modify `apps/desktop/src/App.tsx`
  - Extend sale draft and persisted sale-line types with historical margin fields.
  - Add editable sale-price input and validation in `SalesSection`.
  - Persist cost and margin snapshots when sales are registered.
  - Route the `reports` section to a new `ReportsSection`.
  - Add local report aggregation helpers and report-view components.
- Modify `apps/desktop/src/App.test.tsx`
  - Add failing tests for editable sale-line pricing, stored snapshots, and report aggregates.
- Modify `apps/desktop/src/App.css`
  - Add compact layout styles for price entry in `Ventas` and the `Reportes` dashboard.
- Use `docs/superpowers/specs/2026-07-01-sales-margin-reports-design.md` as the source of truth.

---

### Task 1: Add editable sale-line price input and draft-line totals

**Files:**
- Modify: `apps/desktop/src/App.tsx`
- Test: `apps/desktop/src/App.test.tsx`

- [ ] **Step 1: Write failing tests for editable sale-line pricing**

Add these tests after the existing multi-product sale tests in `apps/desktop/src/App.test.tsx`:

```tsx
  it("preloads the product sale price and allows overriding it before adding a line", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre o razon social"), "Ana Perez");
    await user.type(screen.getByLabelText("NIT o C.C."), "123456789");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );

    const unitPriceInput = screen.getByLabelText("Precio venta unitario") as HTMLInputElement;
    expect(unitPriceInput.value).toBe("4.500");

    await user.clear(unitPriceInput);
    await user.type(unitPriceInput, "3850");
    expect(unitPriceInput.value).toBe("3.850");

    await user.type(screen.getByLabelText("Cantidad"), "2");
    await user.click(screen.getByRole("button", { name: "Agregar producto" }));

    const linesTable = screen.getByRole("table", { name: "Productos de la venta" });
    expect(within(linesTable).getByText(/\$\s*3\.850/)).toBeTruthy();
    expect(within(linesTable).getByText(/\$\s*7\.700/)).toBeTruthy();
  });

  it("rejects empty or zero sale-line unit prices", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );

    const unitPriceInput = screen.getByLabelText("Precio venta unitario");
    await user.clear(unitPriceInput);
    await user.type(screen.getByLabelText("Cantidad"), "1");
    await user.click(screen.getByRole("button", { name: "Agregar producto" }));

    expect(
      screen.getByText("El precio de venta debe ser un entero mayor a cero.")
    ).toBeTruthy();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
CI=true pnpm --config.confirmModulesPurge=false --filter @moneta/desktop test -- App.test.tsx
```

Expected: FAIL because `Precio venta unitario` does not exist and draft-line totals still use `selectedProduct.salePriceMinor`.

- [ ] **Step 3: Extend the sales form and draft-line validation**

In `apps/desktop/src/App.tsx`, update `SalesFormState`, `SalesFormErrors`, and `emptySalesForm`:

```ts
type SalesFormState = {
  customerId: string;
  dueAt: string;
  productId: string;
  quantity: string;
  unitPrice: string;
  paymentStatus: "paid" | "pending";
};

type SalesFormErrors = {
  customerId?: string | undefined;
  dueAt?: string | undefined;
  productId?: string | undefined;
  quantity?: string | undefined;
  unitPrice?: string | undefined;
  submit?: string | undefined;
};

const emptySalesForm: SalesFormState = {
  customerId: "",
  dueAt: "",
  productId: "",
  quantity: "",
  unitPrice: "",
  paymentStatus: "paid"
};
```

Update `validateDraftLine()` to parse both quantity and unit price:

```ts
  function validateDraftLine(): {
    errors: SalesFormErrors;
    parsedQuantity: number | null;
    parsedUnitPrice: number | null;
  } {
    const nextErrors: SalesFormErrors = {};
    const parsedQuantity = parseNonNegativeInteger(form.quantity);
    const parsedUnitPrice = parseNonNegativeInteger(form.unitPrice);

    if (!selectedProduct) {
      nextErrors.productId = "Debes seleccionar un producto.";
    }
    if (parsedQuantity === null || parsedQuantity <= 0) {
      nextErrors.quantity = "La cantidad debe ser un entero mayor a cero.";
    }
    if (parsedUnitPrice === null || parsedUnitPrice <= 0) {
      nextErrors.unitPrice = "El precio de venta debe ser un entero mayor a cero.";
    }

    return { errors: nextErrors, parsedQuantity, parsedUnitPrice };
  }
```

- [ ] **Step 4: Load suggested price and use it in draft totals**

Add this effect inside `SalesSection`:

```ts
  useEffect(() => {
    if (!selectedProduct) {
      return;
    }

    setForm((currentForm) =>
      currentForm.productId === selectedProduct.id &&
      currentForm.unitPrice.trim() === ""
        ? {
            ...currentForm,
            unitPrice: formatIntegerInput(String(selectedProduct.salePriceMinor))
          }
        : currentForm
    );
  }, [selectedProduct]);
```

Update the draft total calculation:

```ts
  const unitPriceMinor = parseNonNegativeInteger(form.unitPrice) ?? 0;
  const draftLineTotalMinor = unitPriceMinor * quantity;
```

Update `addSaleLine()` to persist the entered unit price:

```ts
    if (
      Object.keys(validation.errors).length > 0 ||
      !selectedProduct ||
      validation.parsedQuantity === null ||
      validation.parsedQuantity <= 0 ||
      validation.parsedUnitPrice === null ||
      validation.parsedUnitPrice <= 0
    ) {
      return;
    }

    setSaleLines((currentLines) => [
      ...currentLines,
      {
        id: `sale-line-${Date.now()}`,
        product: selectedProduct,
        quantity: validation.parsedQuantity,
        totalMinor: validation.parsedQuantity * validation.parsedUnitPrice,
        unitPriceMinor: validation.parsedUnitPrice
      }
    ]);
```

Reset the line-entry fields after add:

```ts
    setForm((currentForm) => ({
      ...currentForm,
      productId: "",
      quantity: "",
      unitPrice: ""
    }));
```

- [ ] **Step 5: Add the editable unit-price field to the sales form**

In the sales form grid, render a new `TextField` between `Cantidad` and `Agregar producto`:

```tsx
          <TextField
            error={errors.unitPrice}
            inputMode="numeric"
            label="Precio venta unitario"
            onChange={(value) => {
              updateField("unitPrice", formatIntegerInput(value));
            }}
            value={form.unitPrice}
          />
```

Update the draft summary band to show the entered price:

```tsx
        <div className="summary-card">
          <span>
            Precio unitario {unitPriceMinor > 0 ? formatCurrency(unitPriceMinor) : formatCurrency(0)}
          </span>
          <span>Productos agregados {saleLines.length}</span>
          <strong>Total {formatCurrency(totalMinor)}</strong>
        </div>
```

- [ ] **Step 6: Run tests to verify the task passes**

Run:

```bash
CI=true pnpm --config.confirmModulesPurge=false --filter @moneta/desktop test -- App.test.tsx
```

Expected: PASS for the two new price-entry tests and no regression in existing sales tests.

---

### Task 2: Persist historical cost and margin snapshots on every sale line

**Files:**
- Modify: `apps/desktop/src/App.tsx`
- Test: `apps/desktop/src/App.test.tsx`

- [ ] **Step 1: Write failing tests for stored sale-line snapshots**

Add these tests near the sale-registration coverage in `apps/desktop/src/App.test.tsx`:

```tsx
  it("stores the edited unit sale price in the registered sale row", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre o razon social"), "Cliente Precio");
    await user.type(screen.getByLabelText("NIT o C.C."), "111");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );
    await user.clear(screen.getByLabelText("Precio venta unitario"));
    await user.type(screen.getByLabelText("Precio venta unitario"), "3850");
    await user.type(screen.getByLabelText("Cantidad"), "2");
    await user.click(screen.getByRole("button", { name: "Registrar venta" }));

    const salesTable = screen.getByRole("table", { name: "Ventas registradas" });
    expect(within(salesTable).getByText(/\$\s*7\.700/)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Generar factura PDF" }));
    expect(generateInvoicePdfMock).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            totalMinor: 7700,
            unitPriceMinor: 3850
          })
        ]
      })
    );
  });

  it("keeps two sales of the same product at different prices as different recorded totals", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);

    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre o razon social"), "Cliente Uno");
    await user.type(screen.getByLabelText("NIT o C.C."), "111");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );
    await user.type(screen.getByLabelText("Cantidad"), "1");
    await user.click(screen.getByRole("button", { name: "Registrar venta" }));

    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre o razon social"), "Cliente Dos");
    await user.type(screen.getByLabelText("NIT o C.C."), "222");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );
    await user.clear(screen.getByLabelText("Precio venta unitario"));
    await user.type(screen.getByLabelText("Precio venta unitario"), "3850");
    await user.type(screen.getByLabelText("Cantidad"), "1");
    await user.click(screen.getByRole("button", { name: "Registrar venta" }));

    const salesTable = screen.getByRole("table", { name: "Ventas registradas" });
    expect(within(salesTable).getByText(/\$\s*4\.500/)).toBeTruthy();
    expect(within(salesTable).getByText(/\$\s*3\.850/)).toBeTruthy();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
CI=true pnpm --config.confirmModulesPurge=false --filter @moneta/desktop test -- App.test.tsx
```

Expected: FAIL because the inline registration path still rebuilds line totals from the product default price and does not persist cost snapshots.

- [ ] **Step 3: Extend persisted line and sale types with snapshot fields**

In `apps/desktop/src/App.tsx`, update the sale-line types:

```ts
type SaleLineRecord = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPriceMinor: number;
  unitCostMinorAtSale: number;
  totalMinor: number;
  costMinor: number;
  marginMinor: number;
  marginPercent: number;
};

type SaleDraftLine = {
  id: string;
  product: ProductRecord;
  quantity: number;
  unitPriceMinor: number;
  unitCostMinorAtSale: number;
  totalMinor: number;
  costMinor: number;
  marginMinor: number;
  marginPercent: number;
};
```

Add a focused helper near the other local helpers:

```ts
function buildSaleLineSnapshot(input: {
  product: ProductRecord;
  quantity: number;
  unitPriceMinor: number;
}): SaleDraftLine {
  const totalMinor = input.quantity * input.unitPriceMinor;
  const costMinor = input.quantity * input.product.costMinor;
  const marginMinor = totalMinor - costMinor;
  const marginPercent = totalMinor > 0 ? (marginMinor / totalMinor) * 100 : 0;

  return {
    costMinor,
    id: `sale-line-${Date.now()}`,
    marginMinor,
    marginPercent,
    product: input.product,
    quantity: input.quantity,
    totalMinor,
    unitCostMinorAtSale: input.product.costMinor,
    unitPriceMinor: input.unitPriceMinor
  };
}
```

- [ ] **Step 4: Use snapshots for draft lines and final sale registration**

Replace the inline objects in `addSaleLine()` and `linesToRegister` with `buildSaleLineSnapshot(...)`.

Update the `registerSaleInSession` input contract:

```ts
  function registerSaleInSession(input: {
    customer: CustomerRecord;
    dueAt?: string | undefined;
    lines: Array<{
      product: ProductRecord;
      quantity: number;
      unitCostMinorAtSale: number;
      unitPriceMinor: number;
      totalMinor: number;
      costMinor: number;
      marginMinor: number;
      marginPercent: number;
    }>;
    paymentStatus: "paid" | "pending";
  }): string | null {
```

When building `saleLines` and the sale row, use the incoming snapshot values:

```ts
    const saleLines: SaleLineRecord[] = input.lines.map((line, index) => ({
      costMinor: line.costMinor,
      id: `sale-line-${saleId}-${index + 1}`,
      marginMinor: line.marginMinor,
      marginPercent: line.marginPercent,
      productId: line.product.id,
      productName: line.product.name,
      quantity: line.quantity,
      totalMinor: line.totalMinor,
      unitCostMinorAtSale: line.unitCostMinorAtSale,
      unitPriceMinor: line.unitPriceMinor
    }));

    const totalMinor = saleLines.reduce((sum, line) => sum + line.totalMinor, 0);
```

Update both paid and pending registration calls in `submitSale()`:

```ts
    const registerInput = {
      customer: selectedCustomer,
      lines: linesToRegister.map((line) => ({
        costMinor: line.costMinor,
        marginMinor: line.marginMinor,
        marginPercent: line.marginPercent,
        product: line.product,
        quantity: line.quantity,
        totalMinor: line.totalMinor,
        unitCostMinorAtSale: line.unitCostMinorAtSale,
        unitPriceMinor: line.unitPriceMinor
      }))
    };
```

- [ ] **Step 5: Keep sale display and invoice generation on stored values**

In the `Ventas registradas` table, leave totals sourced from `sale.totalMinor`.

In `generateInvoiceForSale`, keep using `sale.lines` as the primary source:

```ts
        items: sale.lines.map((line) => ({
          description: line.productName,
          quantity: line.quantity,
          totalMinor: line.totalMinor,
          unitPriceMinor: line.unitPriceMinor
        })),
```

Do not recalculate prices from `products`.

- [ ] **Step 6: Run tests to verify the task passes**

Run:

```bash
CI=true pnpm --config.confirmModulesPurge=false --filter @moneta/desktop test -- App.test.tsx
```

Expected: PASS for the new stored-price tests and no regression in invoice-generation tests.

---

### Task 3: Add report aggregation helpers and route the `Reportes` section

**Files:**
- Modify: `apps/desktop/src/App.tsx`
- Test: `apps/desktop/src/App.test.tsx`

- [ ] **Step 1: Write failing tests for `Reportes` margin aggregates**

Add these tests in `apps/desktop/src/App.test.tsx` after the sale tests:

```tsx
  it("shows margin summary and per-product aggregates in reportes", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre o razon social"), "Ana Perez");
    await user.type(screen.getByLabelText("NIT o C.C."), "123");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );
    await user.type(screen.getByLabelText("Cantidad"), "2");
    await user.click(screen.getByRole("button", { name: "Registrar venta" }));

    await user.click(screen.getByRole("button", { name: "Reportes" }));

    expect(screen.getByText("Utilidad bruta")).toBeTruthy();
    expect(screen.getByText(/\$\s*2\.600/)).toBeTruthy();

    const productTable = screen.getByRole("table", { name: "Margen por producto" });
    expect(within(productTable).getByText("Arroz libra")).toBeTruthy();
    expect(within(productTable).getByText(/\$\s*9\.000/)).toBeTruthy();
    expect(within(productTable).getByText(/\$\s*6\.400/)).toBeTruthy();
    expect(within(productTable).getByText(/\$\s*2\.600/)).toBeTruthy();
  });

  it("shows separate margin rows by client and sale when the same product is sold at different prices", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);

    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre o razon social"), "Cliente Uno");
    await user.type(screen.getByLabelText("NIT o C.C."), "111");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );
    await user.type(screen.getByLabelText("Cantidad"), "1");
    await user.click(screen.getByRole("button", { name: "Registrar venta" }));

    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre o razon social"), "Cliente Dos");
    await user.type(screen.getByLabelText("NIT o C.C."), "222");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );
    await user.clear(screen.getByLabelText("Precio venta unitario"));
    await user.type(screen.getByLabelText("Precio venta unitario"), "3850");
    await user.type(screen.getByLabelText("Cantidad"), "1");
    await user.click(screen.getByRole("button", { name: "Registrar venta" }));

    await user.click(screen.getByRole("button", { name: "Reportes" }));

    const customerTable = screen.getByRole("table", { name: "Margen por cliente" });
    expect(within(customerTable).getByText("Cliente Uno")).toBeTruthy();
    expect(within(customerTable).getByText("Cliente Dos")).toBeTruthy();

    const salesTable = screen.getByRole("table", { name: "Margen por venta" });
    expect(within(salesTable).getByText(/\$\s*4\.500/)).toBeTruthy();
    expect(within(salesTable).getByText(/\$\s*3\.850/)).toBeTruthy();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
CI=true pnpm --config.confirmModulesPurge=false --filter @moneta/desktop test -- App.test.tsx
```

Expected: FAIL because `Reportes` still falls through to the generic empty state.

- [ ] **Step 3: Add report row types and local aggregation helpers**

In `apps/desktop/src/App.tsx`, add these types near the other local helper types:

```ts
type MarginSummary = {
  costMinor: number;
  marginMinor: number;
  marginPercent: number;
  salesCount: number;
  revenueMinor: number;
};

type ProductMarginRow = {
  productId: string;
  productName: string;
  quantity: number;
  revenueMinor: number;
  costMinor: number;
  marginMinor: number;
  marginPercent: number;
};

type CustomerMarginRow = {
  customerId: string;
  customerName: string;
  purchaseCount: number;
  revenueMinor: number;
  costMinor: number;
  marginMinor: number;
  marginPercent: number;
};

type SaleMarginRow = {
  saleId: string;
  customerName: string;
  occurredAtLabel: string;
  paymentStatus: "paid" | "pending";
  revenueMinor: number;
  costMinor: number;
  marginMinor: number;
  marginPercent: number;
};
```

Add helpers:

```ts
function buildMarginSummary(sales: SaleRecord[]): MarginSummary {
  const revenueMinor = sales.reduce((sum, sale) => sum + sale.totalMinor, 0);
  const costMinor = sales.reduce(
    (sum, sale) => sum + sale.lines.reduce((lineSum, line) => lineSum + line.costMinor, 0),
    0
  );
  const marginMinor = revenueMinor - costMinor;

  return {
    costMinor,
    marginMinor,
    marginPercent: revenueMinor > 0 ? (marginMinor / revenueMinor) * 100 : 0,
    revenueMinor,
    salesCount: sales.length
  };
}

function buildProductMarginRows(sales: SaleRecord[]): ProductMarginRow[] {
  const productMap = new Map<string, ProductMarginRow>();

  sales.forEach((sale) => {
    sale.lines.forEach((line) => {
      const currentRow = productMap.get(line.productId) ?? {
        costMinor: 0,
        marginMinor: 0,
        marginPercent: 0,
        productId: line.productId,
        productName: line.productName,
        quantity: 0,
        revenueMinor: 0
      };

      currentRow.quantity += line.quantity;
      currentRow.revenueMinor += line.totalMinor;
      currentRow.costMinor += line.costMinor;
      currentRow.marginMinor += line.marginMinor;
      currentRow.marginPercent =
        currentRow.revenueMinor > 0
          ? (currentRow.marginMinor / currentRow.revenueMinor) * 100
          : 0;

      productMap.set(line.productId, currentRow);
    });
  });

  return [...productMap.values()].sort((left, right) => right.marginMinor - left.marginMinor);
}

function buildCustomerMarginRows(sales: SaleRecord[]): CustomerMarginRow[] {
  const customerMap = new Map<string, CustomerMarginRow>();

  sales.forEach((sale) => {
    const saleCostMinor = sale.lines.reduce((sum, line) => sum + line.costMinor, 0);
    const saleMarginMinor = sale.lines.reduce((sum, line) => sum + line.marginMinor, 0);
    const currentRow = customerMap.get(sale.customerId) ?? {
      costMinor: 0,
      customerId: sale.customerId,
      customerName: sale.customerName,
      marginMinor: 0,
      marginPercent: 0,
      purchaseCount: 0,
      revenueMinor: 0
    };

    currentRow.purchaseCount += 1;
    currentRow.revenueMinor += sale.totalMinor;
    currentRow.costMinor += saleCostMinor;
    currentRow.marginMinor += saleMarginMinor;
    currentRow.marginPercent =
      currentRow.revenueMinor > 0
        ? (currentRow.marginMinor / currentRow.revenueMinor) * 100
        : 0;

    customerMap.set(sale.customerId, currentRow);
  });

  return [...customerMap.values()].sort((left, right) => right.marginMinor - left.marginMinor);
}

function buildSaleMarginRows(sales: SaleRecord[]): SaleMarginRow[] {
  return sales.map((sale) => {
    const costMinor = sale.lines.reduce((sum, line) => sum + line.costMinor, 0);
    const marginMinor = sale.lines.reduce((sum, line) => sum + line.marginMinor, 0);

    return {
      costMinor,
      customerName: sale.customerName,
      marginMinor,
      marginPercent: sale.totalMinor > 0 ? (marginMinor / sale.totalMinor) * 100 : 0,
      occurredAtLabel: sale.occurredAtLabel,
      paymentStatus: sale.paymentStatus,
      revenueMinor: sale.totalMinor,
      saleId: sale.id
    };
  });
}
```

Implementation requirement: sort product and customer rows by `marginMinor` descending, and sale rows by most recent insertion order already present in `sales`.

- [ ] **Step 4: Add a dedicated `ReportsSection` and route it from `SectionContent`**

Update `SectionContentProps` and `SectionContent` to keep passing `sales`, then add:

```tsx
  if (section.id === "reports") {
    return <ReportsSection sales={sales} />;
  }
```

Add `ReportsSection` below the existing sections:

```tsx
type ReportsSectionProps = {
  sales: SaleRecord[];
};

function ReportsSection({ sales }: ReportsSectionProps) {
  if (sales.length === 0) {
    return (
      <section className="section-panel">
        <div className="empty-state section-empty">
          <strong>Sin ventas para analizar</strong>
          <span>Registra ventas para habilitar los reportes de margen.</span>
        </div>
      </section>
    );
  }

  const summary = buildMarginSummary(sales);
  const productRows = buildProductMarginRows(sales);
  const customerRows = buildCustomerMarginRows(sales);
  const saleRows = buildSaleMarginRows(sales);

  return (
    <section className="reports-layout">
      <div className="cartera-summary" aria-label="Resumen margen comercial">
        <div className="summary-card">
          <span>Ventas analizadas</span>
          <strong>{formatCurrency(summary.revenueMinor)}</strong>
        </div>
        <div className="summary-card">
          <span>Costo de ventas</span>
          <strong>{formatCurrency(summary.costMinor)}</strong>
        </div>
        <div className="summary-card">
          <span>Utilidad bruta</span>
          <strong>{formatCurrency(summary.marginMinor)}</strong>
        </div>
        <div className="summary-card">
          <span>% margen bruto</span>
          <strong>{formatPercent(summary.marginPercent)}</strong>
        </div>
        <div className="summary-card">
          <span>Numero de ventas</span>
          <strong>{String(summary.salesCount)}</strong>
        </div>
      </div>

      <div className="reports-grid">
        <section className="report-panel">
          <h2>Margen por producto</h2>
          <div className="report-chart" aria-label="Grafico margen por producto">
            {productRows.slice(0, 5).map((row) => (
              <div className="report-bar-row" key={row.productId}>
                <span>{row.productName}</span>
                <div className="report-bar-track">
                  <div
                    className="report-bar-fill"
                    style={{
                      width: `${productRows[0] && productRows[0].marginMinor > 0
                        ? (row.marginMinor / productRows[0].marginMinor) * 100
                        : 0}%`
                    }}
                  />
                </div>
                <strong>{formatCurrency(row.marginMinor)}</strong>
              </div>
            ))}
          </div>
          <table className="data-table" aria-label="Margen por producto">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Unidades</th>
                <th>Ventas</th>
                <th>Costo</th>
                <th>Utilidad</th>
                <th>% margen</th>
              </tr>
            </thead>
            <tbody>
              {productRows.map((row) => (
                <tr key={row.productId}>
                  <td>{row.productName}</td>
                  <td>{row.quantity}</td>
                  <td>{formatCurrency(row.revenueMinor)}</td>
                  <td>{formatCurrency(row.costMinor)}</td>
                  <td>{formatCurrency(row.marginMinor)}</td>
                  <td>{formatPercent(row.marginPercent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="report-panel">
          <h2>Margen por cliente</h2>
          <div className="report-chart" aria-label="Grafico margen por cliente">
            {customerRows.slice(0, 5).map((row) => (
              <div className="report-bar-row" key={row.customerId}>
                <span>{row.customerName}</span>
                <div className="report-bar-track">
                  <div
                    className="report-bar-fill"
                    style={{
                      width: `${customerRows[0] && customerRows[0].marginMinor > 0
                        ? (row.marginMinor / customerRows[0].marginMinor) * 100
                        : 0}%`
                    }}
                  />
                </div>
                <strong>{formatCurrency(row.marginMinor)}</strong>
              </div>
            ))}
          </div>
          <table className="data-table" aria-label="Margen por cliente">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Ventas</th>
                <th>Costo</th>
                <th>Utilidad</th>
                <th>% margen</th>
                <th>Compras</th>
              </tr>
            </thead>
            <tbody>
              {customerRows.map((row) => (
                <tr key={row.customerId}>
                  <td>{row.customerName}</td>
                  <td>{formatCurrency(row.revenueMinor)}</td>
                  <td>{formatCurrency(row.costMinor)}</td>
                  <td>{formatCurrency(row.marginMinor)}</td>
                  <td>{formatPercent(row.marginPercent)}</td>
                  <td>{row.purchaseCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <section className="report-panel">
        <h2>Margen por venta</h2>
        <table className="data-table" aria-label="Margen por venta">
          <thead>
            <tr>
              <th>Venta</th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Estado</th>
              <th>Ventas</th>
              <th>Costo</th>
              <th>Utilidad</th>
              <th>% margen</th>
            </tr>
          </thead>
          <tbody>
            {saleRows.map((row) => (
              <tr key={row.saleId}>
                <td>{row.saleId}</td>
                <td>{row.occurredAtLabel}</td>
                <td>{row.customerName}</td>
                <td>{row.paymentStatus === "paid" ? "Pagada" : "Pendiente"}</td>
                <td>{formatCurrency(row.revenueMinor)}</td>
                <td>{formatCurrency(row.costMinor)}</td>
                <td>{formatCurrency(row.marginMinor)}</td>
                <td>{formatPercent(row.marginPercent)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </section>
  );
}
```

- [ ] **Step 5: Render the minimum report UI needed by the tests**

Add a local percent formatter near the existing currency helper:

```ts
function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}
```

Keep the report surface dense and deterministic:

- Use `cartera-summary` for the KPI band so the cards align with the current desktop shell.
- Use `data-table` for all three report tables.
- Use `productRows[0]?.marginMinor` and `customerRows[0]?.marginMinor` as the comparative bar denominator, clamped to `0` width if the maximum margin is not positive.
- Keep sale-row order the same as the underlying `sales` array so the newest session rows remain first.

- [ ] **Step 6: Run tests to verify the task passes**

Run:

```bash
CI=true pnpm --config.confirmModulesPurge=false --filter @moneta/desktop test -- App.test.tsx
```

Expected: PASS for the new report tests and no regression in existing desktop behavior.

---

### Task 4: Add compact styles for sales price entry and the `Reportes` dashboard

**Files:**
- Modify: `apps/desktop/src/App.css`
- Test: `apps/desktop/src/App.test.tsx`

- [ ] **Step 1: Keep the report tests in place as the guardrail**

Do not add new tests here. Use the tests from Tasks 1-3 as the behavioral guardrail while refining layout.

- [ ] **Step 2: Add report and sales-grid styles**

Append these styles in `apps/desktop/src/App.css` near the existing section-specific blocks:

```css
.reports-layout {
  display: grid;
  gap: 18px;
}

.reports-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.report-panel {
  display: grid;
  gap: 14px;
  border: 1px solid #d8dee5;
  border-radius: 8px;
  background: #ffffff;
  padding: 18px;
}

.report-panel h2 {
  margin: 0;
  font-size: 18px;
}

.report-chart {
  display: grid;
  gap: 8px;
}

.report-bar-row {
  display: grid;
  grid-template-columns: 160px 1fr auto;
  gap: 12px;
  align-items: center;
}

.report-bar-track {
  height: 10px;
  border-radius: 999px;
  background: #e2e8f0;
  overflow: hidden;
}

.report-bar-fill {
  height: 100%;
  background: #0f766e;
}
```

Update the existing sales grid to make room for the new line-price field:

```css
.sales-grid {
  display: grid;
  grid-template-columns:
    minmax(0, 1.2fr)
    auto
    minmax(0, 1.1fr)
    minmax(0, 0.7fr)
    minmax(0, 0.8fr)
    auto;
  gap: 14px;
  align-items: end;
}
```

- [ ] **Step 3: Render simple comparative bars inside product and customer report panels**

In `ReportsSection`, above each table, render these lightweight bar lists using the grouped rows:

```tsx
      <div className="report-chart" aria-label="Grafico margen por producto">
        {productRows.slice(0, 5).map((row) => (
          <div className="report-bar-row" key={row.productId}>
            <span>{row.productName}</span>
            <div className="report-bar-track">
              <div
                className="report-bar-fill"
                style={{ width: `${maxMargin > 0 ? (row.marginMinor / maxMargin) * 100 : 0}%` }}
              />
            </div>
            <strong>{formatCurrency(row.marginMinor)}</strong>
          </div>
        ))}
      </div>

      <div className="report-chart" aria-label="Grafico margen por cliente">
        {customerRows.slice(0, 5).map((row) => (
          <div className="report-bar-row" key={row.customerId}>
            <span>{row.customerName}</span>
            <div className="report-bar-track">
              <div
                className="report-bar-fill"
                style={{
                  width: `${customerRows[0] && customerRows[0].marginMinor > 0
                    ? (row.marginMinor / customerRows[0].marginMinor) * 100
                    : 0}%`
                }}
              />
            </div>
            <strong>{formatCurrency(row.marginMinor)}</strong>
          </div>
        ))}
      </div>
```

- [ ] **Step 4: Run full desktop verification**

Run:

```bash
CI=true pnpm --config.confirmModulesPurge=false --filter @moneta/desktop test -- App.test.tsx
CI=true pnpm --config.confirmModulesPurge=false --filter @moneta/desktop typecheck
CI=true pnpm --config.confirmModulesPurge=false --filter @moneta/desktop build
```

Expected: PASS on tests, typecheck, and build with the new report surface.

---

### Task 5: Run workspace verification

**Files:**
- Modify: none
- Test: workspace verification only

- [ ] **Step 1: Run the full workspace test suite**

Run:

```bash
CI=true pnpm --config.confirmModulesPurge=false test
```

Expected: PASS for workspace tests, including `apps/desktop`.

- [ ] **Step 2: Run workspace typecheck**

Run:

```bash
CI=true pnpm --config.confirmModulesPurge=false typecheck
```

Expected: PASS for `packages/domain`, `packages/application`, and `apps/desktop`.

- [ ] **Step 3: Run workspace build**

Run:

```bash
CI=true pnpm --config.confirmModulesPurge=false build
```

Expected: PASS for the full workspace build. Non-blocking Vite chunk-size warnings are acceptable if the build succeeds.

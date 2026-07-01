# Purchases and Supplier Payables Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add purchase invoice registration in `Compras` and supplier accounts payable with abonos in `Proveedores`.

**Architecture:** Keep this slice local to `apps/desktop/src/App.tsx`, matching the current in-memory product, sales, receivables, and invoice PDF flows. Add small local helper types/functions for supplier payables and reuse existing inventory movement semantics by updating product stock when a purchase is confirmed.

**Tech Stack:** React 19, Vite, Vitest, Testing Library, TypeScript.

---

## File Structure

- Modify `apps/desktop/src/App.tsx`: add supplier, purchase, payable, and payable payment state; render `Compras`; render `Proveedores`; update product stock on purchases.
- Modify `apps/desktop/src/App.test.tsx`: add focused UI tests for paid purchases, pending purchases, supplier creation, payables, partial/full abonos, and validation.
- Modify `apps/desktop/src/App.css`: add layout styles for purchase forms, supplier payable tables, and inline abono controls.

## Task 1: Purchase Form and Paid Purchase Stock Movement

**Files:**
- Modify: `apps/desktop/src/App.test.tsx`
- Modify: `apps/desktop/src/App.tsx`
- Modify: `apps/desktop/src/App.css`

- [ ] **Step 1: Write failing paid purchase test**

Add this helper near `createProductFixture` in `apps/desktop/src/App.test.tsx`:

```ts
async function createSupplierFixture(user: UserEvent, name = "Distribuidora Norte") {
  await user.click(screen.getByRole("button", { name: "Compras" }));
  await user.click(screen.getByRole("button", { name: "Nuevo proveedor" }));
  await user.type(screen.getByLabelText("Nombre proveedor"), name);
  await user.click(screen.getByRole("button", { name: "Guardar proveedor" }));
}
```

Add this test inside `describe("App navigation", () => { ... })`:

```ts
  it("registers a paid purchase, increases stock, and lists the invoice", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await createSupplierFixture(user);
    await user.type(screen.getByLabelText("Numero factura"), "FC-1001");
    await user.type(screen.getByLabelText("Fecha emision"), "2026-06-30");
    await user.type(screen.getByLabelText("Fecha vencimiento"), "2026-07-15");
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );
    await user.type(screen.getByLabelText("Cantidad compra"), "6");
    await user.type(screen.getByLabelText("Costo unitario"), "3100");
    await user.click(screen.getByLabelText("Pagada"));
    await user.click(screen.getByRole("button", { name: "Registrar compra" }));

    const purchasesTable = screen.getByRole("table", { name: "Compras registradas" });
    expect(within(purchasesTable).getByText("Distribuidora Norte")).toBeTruthy();
    expect(within(purchasesTable).getByText("FC-1001")).toBeTruthy();
    expect(within(purchasesTable).getByText("Arroz libra")).toBeTruthy();
    expect(within(purchasesTable).getByText("Pagada")).toBeTruthy();
    expect(within(purchasesTable).getByText(/\$\s*18\.600/)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Productos" }));
    const productsTable = screen.getByRole("table", { name: "Productos registrados" });
    expect(within(productsTable).getByRole("cell", { name: "10" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Proveedores" }));
    expect(screen.getByText("Sin cuentas por pagar")).toBeTruthy();
  });
```

- [ ] **Step 2: Run test to verify RED**

Run:

```bash
CI=true pnpm --config.confirmModulesPurge=false --filter @moneta/desktop test -- App.test.tsx
```

Expected: FAIL because `Compras` still shows an empty state and has no supplier/purchase form.

- [ ] **Step 3: Add purchase and supplier local types/state**

In `apps/desktop/src/App.tsx`, add these types near the existing record types:

```ts
type SupplierRecord = {
  id: string;
  name: string;
};

type PurchasePaymentStatus = "paid" | "pending";

type PurchaseRecord = {
  id: string;
  supplierId: string;
  supplierName: string;
  invoiceNumber: string;
  issuedAt: string;
  dueAt: string;
  productId: string;
  productName: string;
  quantity: number;
  unitCostMinor: number;
  totalMinor: number;
  paymentStatus: PurchasePaymentStatus;
  occurredAtLabel: string;
};

type PurchaseFormState = {
  supplierId: string;
  invoiceNumber: string;
  issuedAt: string;
  dueAt: string;
  productId: string;
  quantity: string;
  unitCost: string;
  paymentStatus: PurchasePaymentStatus;
};

type PurchaseFormErrors = Partial<
  Record<keyof PurchaseFormState | "submit", string>
>;

type SupplierFormState = {
  name: string;
};

type SupplierFormErrors = Partial<Record<keyof SupplierFormState, string>>;
```

Add defaults near the existing empty form constants:

```ts
const emptyPurchaseForm: PurchaseFormState = {
  dueAt: "",
  invoiceNumber: "",
  issuedAt: "",
  paymentStatus: "paid",
  productId: "",
  quantity: "",
  supplierId: "",
  unitCost: ""
};

const emptySupplierForm: SupplierFormState = {
  name: ""
};
```

Inside `App`, add:

```ts
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
```

Add:

```ts
  function createSupplier(input: SupplierFormState): SupplierRecord {
    const supplier = {
      id: `supplier-${Date.now()}`,
      name: input.name.trim()
    };

    setSuppliers((currentSuppliers) => [...currentSuppliers, supplier]);

    return supplier;
  }
```

- [ ] **Step 4: Add purchase registration function**

Inside `App`, add:

```ts
  function registerPurchaseInSession(input: {
    supplier: SupplierRecord;
    product: ProductRecord;
    invoiceNumber: string;
    issuedAt: string;
    dueAt: string;
    quantity: number;
    unitCostMinor: number;
    paymentStatus: PurchasePaymentStatus;
  }) {
    const occurredAt = new Date();
    const purchaseId = `purchase-${Date.now()}`;
    const totalMinor = input.quantity * input.unitCostMinor;

    setProducts((currentProducts) =>
      currentProducts.map((product) =>
        product.id === input.product.id
          ? { ...product, stock: product.stock + input.quantity }
          : product
      )
    );

    setPurchases((currentPurchases) => [
      {
        dueAt: input.dueAt,
        id: purchaseId,
        invoiceNumber: input.invoiceNumber,
        issuedAt: input.issuedAt,
        occurredAtLabel: formatOccurredAtLabel(occurredAt),
        paymentStatus: input.paymentStatus,
        productId: input.product.id,
        productName: input.product.name,
        quantity: input.quantity,
        supplierId: input.supplier.id,
        supplierName: input.supplier.name,
        totalMinor,
        unitCostMinor: input.unitCostMinor
      },
      ...currentPurchases
    ]);
  }
```

- [ ] **Step 5: Route purchases section**

Extend `SectionContentProps` with:

```ts
  onCreateSupplier: (input: SupplierFormState) => SupplierRecord;
  onRegisterPurchase: (input: {
    supplier: SupplierRecord;
    product: ProductRecord;
    invoiceNumber: string;
    issuedAt: string;
    dueAt: string;
    quantity: number;
    unitCostMinor: number;
    paymentStatus: PurchasePaymentStatus;
  }) => void;
  purchases: PurchaseRecord[];
  suppliers: SupplierRecord[];
```

Pass those props from `App` into `SectionContent`.

In `SectionContent`, before `sales`, add:

```tsx
  if (section.id === "purchases") {
    return (
      <PurchasesSection
        onCreateSupplier={onCreateSupplier}
        onRegisterPurchase={onRegisterPurchase}
        products={products}
        purchases={purchases}
        suppliers={suppliers}
      />
    );
  }
```

- [ ] **Step 6: Add `PurchasesSection` component**

Add a component in `apps/desktop/src/App.tsx` near `SalesSection`:

```tsx
type PurchasesSectionProps = {
  onCreateSupplier: (input: SupplierFormState) => SupplierRecord;
  onRegisterPurchase: (input: {
    supplier: SupplierRecord;
    product: ProductRecord;
    invoiceNumber: string;
    issuedAt: string;
    dueAt: string;
    quantity: number;
    unitCostMinor: number;
    paymentStatus: PurchasePaymentStatus;
  }) => void;
  products: ProductRecord[];
  purchases: PurchaseRecord[];
  suppliers: SupplierRecord[];
};

function PurchasesSection({
  onCreateSupplier,
  onRegisterPurchase,
  products,
  purchases,
  suppliers
}: PurchasesSectionProps) {
  const [form, setForm] = useState<PurchaseFormState>(emptyPurchaseForm);
  const [errors, setErrors] = useState<PurchaseFormErrors>({});
  const [supplierFormVisible, setSupplierFormVisible] = useState(false);
  const [supplierForm, setSupplierForm] =
    useState<SupplierFormState>(emptySupplierForm);
  const [supplierErrors, setSupplierErrors] = useState<SupplierFormErrors>({});

  const selectedSupplier =
    suppliers.find((supplier) => supplier.id === form.supplierId) ?? null;
  const selectedProduct =
    products.find((product) => product.id === form.productId) ?? null;
  const quantity = parseNonNegativeInteger(form.quantity) ?? 0;
  const unitCost = parseNonNegativeInteger(form.unitCost) ?? 0;
  const totalMinor = quantity * unitCost;

  function updateField(field: keyof PurchaseFormState, value: string) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
    setErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
  }

  function updateMoneyField(value: string) {
    setForm((currentForm) => ({
      ...currentForm,
      unitCost: formatIntegerInput(value)
    }));
    setErrors((currentErrors) => ({ ...currentErrors, unitCost: undefined }));
  }

  function submitSupplier() {
    const nextErrors: SupplierFormErrors = {};

    if (supplierForm.name.trim() === "") {
      nextErrors.name = "El nombre del proveedor es obligatorio.";
    }

    setSupplierErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const supplier = onCreateSupplier(supplierForm);

    setForm((currentForm) => ({ ...currentForm, supplierId: supplier.id }));
    setSupplierForm(emptySupplierForm);
    setSupplierErrors({});
    setSupplierFormVisible(false);
  }

  function submitPurchase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: PurchaseFormErrors = {};
    const parsedQuantity = parseNonNegativeInteger(form.quantity);
    const parsedUnitCost = parseNonNegativeInteger(form.unitCost);

    if (!selectedSupplier) {
      nextErrors.supplierId = "Debes seleccionar un proveedor.";
    }
    if (form.invoiceNumber.trim() === "") {
      nextErrors.invoiceNumber = "El numero de factura es obligatorio.";
    }
    if (form.issuedAt.trim() === "") {
      nextErrors.issuedAt = "La fecha de emision es obligatoria.";
    }
    if (!selectedProduct) {
      nextErrors.productId = "Debes seleccionar un producto.";
    }
    if (parsedQuantity === null || parsedQuantity <= 0) {
      nextErrors.quantity = "La cantidad debe ser un entero mayor a cero.";
    }
    if (parsedUnitCost === null) {
      nextErrors.unitCost = "El costo unitario debe ser cero o mayor.";
    }

    setErrors(nextErrors);

    if (
      Object.keys(nextErrors).length > 0 ||
      !selectedSupplier ||
      !selectedProduct ||
      parsedQuantity === null ||
      parsedQuantity <= 0 ||
      parsedUnitCost === null
    ) {
      return;
    }

    onRegisterPurchase({
      dueAt: form.dueAt.trim(),
      invoiceNumber: form.invoiceNumber.trim(),
      issuedAt: form.issuedAt.trim(),
      paymentStatus: form.paymentStatus,
      product: selectedProduct,
      quantity: parsedQuantity,
      supplier: selectedSupplier,
      unitCostMinor: parsedUnitCost
    });
    setErrors({});
    setForm(emptyPurchaseForm);
  }

  return (
    <section className="purchases-layout">
      <form className="purchase-form" onSubmit={submitPurchase}>
        <div className="purchase-grid">
          <label className="field" htmlFor="proveedor-compra">
            <span>Proveedor</span>
            <select
              aria-invalid={Boolean(errors.supplierId)}
              id="proveedor-compra"
              onChange={(event) => updateField("supplierId", event.target.value)}
              value={form.supplierId}
            >
              <option value="">Selecciona un proveedor</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
            {errors.supplierId ? <small>{errors.supplierId}</small> : null}
          </label>

          <div className="inline-action-group">
            <button
              type="button"
              onClick={() => setSupplierFormVisible((visible) => !visible)}
            >
              Nuevo proveedor
            </button>
          </div>

          <TextField
            error={errors.invoiceNumber}
            label="Numero factura"
            onChange={(value) => updateField("invoiceNumber", value)}
            value={form.invoiceNumber}
          />
          <TextField
            error={errors.issuedAt}
            label="Fecha emision"
            onChange={(value) => updateField("issuedAt", value)}
            value={form.issuedAt}
          />
          <TextField
            error={errors.dueAt}
            label="Fecha vencimiento"
            onChange={(value) => updateField("dueAt", value)}
            value={form.dueAt}
          />
          <label className="field" htmlFor="producto-compra">
            <span>Producto</span>
            <select
              aria-invalid={Boolean(errors.productId)}
              id="producto-compra"
              onChange={(event) => updateField("productId", event.target.value)}
              value={form.productId}
            >
              <option value="">Selecciona un producto</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
            {errors.productId ? <small>{errors.productId}</small> : null}
          </label>
          <TextField
            error={errors.quantity}
            inputMode="numeric"
            label="Cantidad compra"
            onChange={(value) => updateField("quantity", value)}
            value={form.quantity}
          />
          <TextField
            error={errors.unitCost}
            inputMode="numeric"
            label="Costo unitario"
            onChange={updateMoneyField}
            value={form.unitCost}
          />
        </div>

        {supplierFormVisible ? (
          <div className="inline-supplier-form">
            <TextField
              error={supplierErrors.name}
              label="Nombre proveedor"
              onChange={(value) => {
                setSupplierForm({ name: value });
                setSupplierErrors({});
              }}
              value={supplierForm.name}
            />
            <button type="button" onClick={submitSupplier}>
              Guardar proveedor
            </button>
          </div>
        ) : null}

        <div
          aria-label="Estado de factura compra"
          className="payment-status-group"
          role="radiogroup"
        >
          <label htmlFor="compra-pagada">
            <input
              checked={form.paymentStatus === "paid"}
              id="compra-pagada"
              name="purchase-payment-status"
              onChange={() => updateField("paymentStatus", "paid")}
              type="radio"
            />
            Pagada
          </label>
          <label htmlFor="compra-pendiente">
            <input
              checked={form.paymentStatus === "pending"}
              id="compra-pendiente"
              name="purchase-payment-status"
              onChange={() => updateField("paymentStatus", "pending")}
              type="radio"
            />
            Pendiente
          </label>
        </div>

        <div className="summary-card">
          <span>Costo unitario {formatCurrency(unitCost)}</span>
          <strong>Total factura {formatCurrency(totalMinor)}</strong>
        </div>

        <div className="form-actions">
          <button type="submit">Registrar compra</button>
        </div>
      </form>

      {purchases.length > 0 ? (
        <table className="data-table" aria-label="Compras registradas">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Proveedor</th>
              <th>Factura</th>
              <th>Producto</th>
              <th>Cantidad</th>
              <th>Estado</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {purchases.map((purchase) => (
              <tr key={purchase.id}>
                <td>{purchase.occurredAtLabel}</td>
                <td>{purchase.supplierName}</td>
                <td>{purchase.invoiceNumber}</td>
                <td>{purchase.productName}</td>
                <td>{purchase.quantity}</td>
                <td>{purchase.paymentStatus === "paid" ? "Pagada" : "Pendiente"}</td>
                <td>{formatCurrency(purchase.totalMinor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="empty-state section-empty">
          <strong>Sin compras registradas</strong>
          <span>Las compras confirmadas aumentaran el inventario.</span>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 7: Add purchase styles**

In `apps/desktop/src/App.css`, add:

```css
.purchases-layout {
  display: grid;
  gap: 18px;
}

.purchase-form {
  border: 1px solid #d8dee5;
  border-radius: 8px;
  background: white;
  padding: 18px;
}

.purchase-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) auto repeat(3, minmax(0, 1fr));
  gap: 14px;
  align-items: end;
}

.inline-supplier-form {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 14px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e2e8f0;
}

.inline-supplier-form button {
  align-self: end;
  min-height: 42px;
  border-radius: 8px;
  background: #eef2f7;
  color: #334155;
  padding: 0 14px;
  font-weight: 700;
}
```

- [ ] **Step 8: Run test to verify GREEN**

Run:

```bash
CI=true pnpm --config.confirmModulesPurge=false --filter @moneta/desktop test -- App.test.tsx
```

Expected: PASS for the paid purchase test and existing tests.

- [ ] **Step 9: Commit paid purchase slice**

Run:

```bash
git add apps/desktop/src/App.tsx apps/desktop/src/App.test.tsx apps/desktop/src/App.css
git commit -m "feat: register paid purchase invoices"
```

Expected: commit succeeds.

## Task 2: Pending Purchase Creates Supplier Payable

**Files:**
- Modify: `apps/desktop/src/App.test.tsx`
- Modify: `apps/desktop/src/App.tsx`

- [ ] **Step 1: Write failing pending purchase payable test**

Add this test:

```ts
  it("registers a pending purchase and creates a supplier payable", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await createSupplierFixture(user, "Proveedor Central");
    await user.type(screen.getByLabelText("Numero factura"), "FC-2001");
    await user.type(screen.getByLabelText("Fecha emision"), "2026-06-30");
    await user.type(screen.getByLabelText("Fecha vencimiento"), "2026-07-30");
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );
    await user.type(screen.getByLabelText("Cantidad compra"), "5");
    await user.type(screen.getByLabelText("Costo unitario"), "3000");
    await user.click(screen.getByLabelText("Pendiente"));
    await user.click(screen.getByRole("button", { name: "Registrar compra" }));

    await user.click(screen.getByRole("button", { name: "Proveedores" }));

    const payablesTable = screen.getByRole("table", { name: "Cuentas por pagar" });
    expect(within(payablesTable).getByText("Proveedor Central")).toBeTruthy();
    expect(within(payablesTable).getByText("FC-2001")).toBeTruthy();
    expect(within(payablesTable).getByText("Pendiente")).toBeTruthy();
    expect(within(payablesTable).getAllByText(/\$\s*15\.000/).length).toBeGreaterThan(0);
  });
```

- [ ] **Step 2: Run test to verify RED**

Run:

```bash
CI=true pnpm --config.confirmModulesPurge=false --filter @moneta/desktop test -- App.test.tsx
```

Expected: FAIL because pending purchases do not create payables and `Proveedores` is still empty.

- [ ] **Step 3: Add payable types/state/helpers**

In `apps/desktop/src/App.tsx`, add:

```ts
type SupplierPayableStatus = "pending" | "partial" | "paid";

type SupplierPayableRecord = {
  id: string;
  supplierId: string;
  supplierName: string;
  purchaseId: string;
  invoiceNumber: string;
  originalAmountMinor: number;
  paidAmountMinor: number;
  balanceMinor: number;
  dueAt: string;
  status: SupplierPayableStatus;
};

function getSupplierPayableStatus(input: {
  originalAmountMinor: number;
  paidAmountMinor: number;
}): SupplierPayableStatus {
  const balance = input.originalAmountMinor - input.paidAmountMinor;

  if (balance <= 0) {
    return "paid";
  }

  return input.paidAmountMinor > 0 ? "partial" : "pending";
}
```

Inside `App`, add:

```ts
  const [supplierPayables, setSupplierPayables] = useState<SupplierPayableRecord[]>([]);
```

- [ ] **Step 4: Create payable from pending purchase**

In `registerPurchaseInSession`, after `setPurchases`, add:

```ts
    if (input.paymentStatus === "pending") {
      setSupplierPayables((currentPayables) => [
        {
          balanceMinor: totalMinor,
          dueAt: input.dueAt,
          id: `payable-${purchaseId}`,
          invoiceNumber: input.invoiceNumber,
          originalAmountMinor: totalMinor,
          paidAmountMinor: 0,
          purchaseId,
          status: "pending",
          supplierId: input.supplier.id,
          supplierName: input.supplier.name
        },
        ...currentPayables
      ]);
    }
```

Extend `SectionContentProps` and `SectionContent` call sites with:

```ts
  supplierPayables: SupplierPayableRecord[];
```

Route suppliers:

```tsx
  if (section.id === "suppliers") {
    return <SuppliersSection supplierPayables={supplierPayables} />;
  }
```

- [ ] **Step 5: Add `SuppliersSection` payable table**

Add:

```tsx
type SuppliersSectionProps = {
  supplierPayables: SupplierPayableRecord[];
};

function formatPayableStatus(status: SupplierPayableStatus): string {
  if (status === "paid") {
    return "Pagada";
  }

  return status === "partial" ? "Abonada" : "Pendiente";
}

function SuppliersSection({ supplierPayables }: SuppliersSectionProps) {
  if (supplierPayables.length === 0) {
    return (
      <section className="section-panel">
        <div className="empty-state section-empty">
          <strong>Sin cuentas por pagar</strong>
          <span>Las facturas pendientes de proveedor apareceran aqui.</span>
        </div>
      </section>
    );
  }

  return (
    <section className="section-panel">
      <table className="data-table" aria-label="Cuentas por pagar">
        <thead>
          <tr>
            <th>Proveedor</th>
            <th>Factura</th>
            <th>Vence</th>
            <th>Original</th>
            <th>Abonado</th>
            <th>Saldo</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {supplierPayables.map((payable) => (
            <tr key={payable.id}>
              <td>{payable.supplierName}</td>
              <td>{payable.invoiceNumber}</td>
              <td>{payable.dueAt || "Sin vencimiento"}</td>
              <td>{formatCurrency(payable.originalAmountMinor)}</td>
              <td>{formatCurrency(payable.paidAmountMinor)}</td>
              <td>{formatCurrency(payable.balanceMinor)}</td>
              <td>{formatPayableStatus(payable.status)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
```

- [ ] **Step 6: Run tests to verify GREEN**

Run:

```bash
CI=true pnpm --config.confirmModulesPurge=false --filter @moneta/desktop test -- App.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit pending purchase payables**

Run:

```bash
git add apps/desktop/src/App.tsx apps/desktop/src/App.test.tsx
git commit -m "feat: create supplier payables for pending purchases"
```

Expected: commit succeeds.

## Task 3: Supplier Payable Abonos

**Files:**
- Modify: `apps/desktop/src/App.test.tsx`
- Modify: `apps/desktop/src/App.tsx`
- Modify: `apps/desktop/src/App.css`

- [ ] **Step 1: Write failing partial and full abono tests**

Add this helper:

```ts
async function createPendingPurchaseFixture(user: UserEvent) {
  await createProductFixture(user);
  await createSupplierFixture(user, "Proveedor Central");
  await user.type(screen.getByLabelText("Numero factura"), "FC-3001");
  await user.type(screen.getByLabelText("Fecha emision"), "2026-06-30");
  await user.type(screen.getByLabelText("Fecha vencimiento"), "2026-07-30");
  await user.selectOptions(
    screen.getByLabelText("Producto"),
    screen.getByRole("option", { name: "Arroz libra" })
  );
  await user.type(screen.getByLabelText("Cantidad compra"), "5");
  await user.type(screen.getByLabelText("Costo unitario"), "3000");
  await user.click(screen.getByLabelText("Pendiente"));
  await user.click(screen.getByRole("button", { name: "Registrar compra" }));
  await user.click(screen.getByRole("button", { name: "Proveedores" }));
}
```

Add tests:

```ts
  it("registers a partial supplier payment and marks payable as abonada", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createPendingPurchaseFixture(user);
    await user.click(screen.getByRole("button", { name: "Registrar abono" }));
    await user.type(screen.getByLabelText("Valor abono"), "5000");
    await user.click(screen.getByRole("button", { name: "Guardar abono" }));

    const payablesTable = screen.getByRole("table", { name: "Cuentas por pagar" });
    expect(within(payablesTable).getByText("Abonada")).toBeTruthy();
    expect(within(payablesTable).getByText(/\$\s*5\.000/)).toBeTruthy();
    expect(within(payablesTable).getByText(/\$\s*10\.000/)).toBeTruthy();
  });

  it("registers a full supplier payment and marks payable as pagada", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createPendingPurchaseFixture(user);
    await user.click(screen.getByRole("button", { name: "Registrar abono" }));
    await user.type(screen.getByLabelText("Valor abono"), "15000");
    await user.click(screen.getByRole("button", { name: "Guardar abono" }));

    const payablesTable = screen.getByRole("table", { name: "Cuentas por pagar" });
    expect(within(payablesTable).getByText("Pagada")).toBeTruthy();
    expect(within(payablesTable).getAllByText(/\$\s*15\.000/).length).toBeGreaterThan(1);
    expect(within(payablesTable).getByText(/\$\s*0/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Registrar abono" })).toBeNull();
  });
```

- [ ] **Step 2: Run tests to verify RED**

Run:

```bash
CI=true pnpm --config.confirmModulesPurge=false --filter @moneta/desktop test -- App.test.tsx
```

Expected: FAIL because no abono UI exists.

- [ ] **Step 3: Add payment form state and handler**

Add types:

```ts
type SupplierPaymentFormState = {
  payableId: string;
  amount: string;
};

type SupplierPaymentFormErrors = {
  amount?: string | undefined;
};
```

In `App`, add:

```ts
  function registerSupplierPayment(input: { payableId: string; amountMinor: number }) {
    setSupplierPayables((currentPayables) =>
      currentPayables.map((payable) => {
        if (payable.id !== input.payableId) {
          return payable;
        }

        const paidAmountMinor = payable.paidAmountMinor + input.amountMinor;
        const balanceMinor = Math.max(payable.originalAmountMinor - paidAmountMinor, 0);

        return {
          ...payable,
          balanceMinor,
          paidAmountMinor,
          status: getSupplierPayableStatus({
            originalAmountMinor: payable.originalAmountMinor,
            paidAmountMinor
          })
        };
      })
    );
  }
```

Pass `onRegisterSupplierPayment={registerSupplierPayment}` into `SuppliersSection`.

- [ ] **Step 4: Extend SuppliersSection with abono UI**

Update props:

```ts
type SuppliersSectionProps = {
  onRegisterSupplierPayment: (input: {
    payableId: string;
    amountMinor: number;
  }) => void;
  supplierPayables: SupplierPayableRecord[];
};
```

Inside `SuppliersSection`, add:

```tsx
  const [paymentForm, setPaymentForm] = useState<SupplierPaymentFormState>({
    amount: "",
    payableId: ""
  });
  const [paymentErrors, setPaymentErrors] = useState<SupplierPaymentFormErrors>({});
  const selectedPayable =
    supplierPayables.find((payable) => payable.id === paymentForm.payableId) ?? null;

  function submitPayment() {
    const amount = parseNonNegativeInteger(paymentForm.amount);

    if (!selectedPayable || amount === null || amount <= 0) {
      setPaymentErrors({ amount: "El abono debe ser mayor a cero." });
      return;
    }

    if (amount > selectedPayable.balanceMinor) {
      setPaymentErrors({ amount: "El abono no puede superar el saldo pendiente." });
      return;
    }

    onRegisterSupplierPayment({
      amountMinor: amount,
      payableId: selectedPayable.id
    });
    setPaymentForm({ amount: "", payableId: "" });
    setPaymentErrors({});
  }
```

Add an `Accion` header and per-row cell:

```tsx
<th>Accion</th>
```

```tsx
<td>
  {payable.balanceMinor > 0 ? (
    <button
      className="table-action"
      onClick={() =>
        setPaymentForm({ amount: "", payableId: payable.id })
      }
      type="button"
    >
      Registrar abono
    </button>
  ) : null}
</td>
```

Below the table, render:

```tsx
      {selectedPayable ? (
        <div className="payable-payment-form">
          <strong>Abono a factura {selectedPayable.invoiceNumber}</strong>
          <TextField
            error={paymentErrors.amount}
            inputMode="numeric"
            label="Valor abono"
            onChange={(value) => {
              setPaymentForm((currentForm) => ({
                ...currentForm,
                amount: formatIntegerInput(value)
              }));
              setPaymentErrors({});
            }}
            value={paymentForm.amount}
          />
          <button type="button" onClick={submitPayment}>
            Guardar abono
          </button>
        </div>
      ) : null}
```

- [ ] **Step 5: Add abono styles**

In `apps/desktop/src/App.css`, add:

```css
.payable-payment-form {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 220px) auto;
  gap: 14px;
  align-items: end;
  margin-top: 16px;
  border-top: 1px solid #e2e8f0;
  padding-top: 16px;
}

.payable-payment-form button {
  min-height: 42px;
  border-radius: 8px;
  background: #0f766e;
  color: white;
  padding: 0 14px;
  font-weight: 700;
}
```

- [ ] **Step 6: Run tests to verify GREEN**

Run:

```bash
CI=true pnpm --config.confirmModulesPurge=false --filter @moneta/desktop test -- App.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit abonos**

Run:

```bash
git add apps/desktop/src/App.tsx apps/desktop/src/App.test.tsx apps/desktop/src/App.css
git commit -m "feat: register supplier payable payments"
```

Expected: commit succeeds.

## Task 4: Validation Coverage

**Files:**
- Modify: `apps/desktop/src/App.test.tsx`
- Modify: `apps/desktop/src/App.tsx`

- [ ] **Step 1: Write failing validation tests**

Add:

```ts
  it("validates missing purchase invoice fields and empty supplier name", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Compras" }));
    await user.click(screen.getByRole("button", { name: "Nuevo proveedor" }));
    await user.click(screen.getByRole("button", { name: "Guardar proveedor" }));

    expect(screen.getByText("El nombre del proveedor es obligatorio.")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Registrar compra" }));

    expect(screen.getByText("Debes seleccionar un proveedor.")).toBeTruthy();
    expect(screen.getByText("El numero de factura es obligatorio.")).toBeTruthy();
    expect(screen.getByText("La fecha de emision es obligatoria.")).toBeTruthy();
    expect(screen.getByText("Debes seleccionar un producto.")).toBeTruthy();
    expect(screen.getByText("La cantidad debe ser un entero mayor a cero.")).toBeTruthy();
    expect(screen.getByText("El costo unitario debe ser cero o mayor.")).toBeTruthy();
    expect(screen.queryByRole("table", { name: "Compras registradas" })).toBeNull();
  });

  it("rejects supplier payment greater than payable balance", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createPendingPurchaseFixture(user);
    await user.click(screen.getByRole("button", { name: "Registrar abono" }));
    await user.type(screen.getByLabelText("Valor abono"), "16000");
    await user.click(screen.getByRole("button", { name: "Guardar abono" }));

    expect(screen.getByText("El abono no puede superar el saldo pendiente.")).toBeTruthy();
    const payablesTable = screen.getByRole("table", { name: "Cuentas por pagar" });
    expect(within(payablesTable).getByText("Pendiente")).toBeTruthy();
    expect(within(payablesTable).getAllByText(/\$\s*15\.000/).length).toBeGreaterThan(0);
  });
```

- [ ] **Step 2: Run tests to verify RED**

Run:

```bash
CI=true pnpm --config.confirmModulesPurge=false --filter @moneta/desktop test -- App.test.tsx
```

Expected: FAIL for any missing validation not already implemented.

- [ ] **Step 3: Complete validation gaps**

If the missing field validation fails because `unitCost` empty is parsed as `null`, keep the `parsedUnitCost === null` branch. If the abono over-balance validation fails, keep the explicit `amount > selectedPayable.balanceMinor` branch from Task 3. Do not add any new rules beyond the spec.

- [ ] **Step 4: Run tests to verify GREEN**

Run:

```bash
CI=true pnpm --config.confirmModulesPurge=false --filter @moneta/desktop test -- App.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit validation coverage**

Run:

```bash
git add apps/desktop/src/App.tsx apps/desktop/src/App.test.tsx
git commit -m "test: cover purchase payable validation"
```

Expected: commit succeeds.

## Task 5: Final Verification

**Files:**
- Verify all changed files.

- [ ] **Step 1: Run full test suite**

Run:

```bash
CI=true pnpm --config.confirmModulesPurge=false test
```

Expected: all tests pass.

- [ ] **Step 2: Run typecheck**

Run:

```bash
CI=true pnpm --config.confirmModulesPurge=false typecheck
```

Expected: typecheck passes.

- [ ] **Step 3: Run production build**

Run:

```bash
CI=true pnpm --config.confirmModulesPurge=false build
```

Expected: build passes. The existing Vite chunk-size warning from the PDF dependency may still appear and is not a failure.

- [ ] **Step 4: Review git status**

Run:

```bash
git status --short --branch
```

Expected: no uncommitted changes remain except intentional user-owned changes that predated execution.

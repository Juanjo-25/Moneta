# Sales Paid or Pending Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a desktop sales flow for one product per sale with required customer selection, inline customer creation, and different behavior for paid versus pending sales.

**Architecture:** This slice keeps all customer, sales, and receivable state local to the desktop app session. The `Pagada` path reuses the existing `registerSale` application use case through local in-memory adapters, while the `Pendiente` path stores a local sale row plus a local receivable row without touching inventory.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, workspace packages `@moneta/application` and `@moneta/domain`.

---

## Scope Check

This plan only implements one-product sales, required customer selection, inline customer creation, local receivable state, and local sales history. It does not implement multi-line sales, later payment of pending sales, stock reservation for pending sales, or SQLite persistence.

## File Structure

- Modify: `apps/desktop/src/App.test.tsx` to lock the paid, pending, and inline-customer behavior with UI tests.
- Modify: `apps/desktop/src/App.tsx` to add local customer, sales, and receivable state; paid-sale adapters over the application use case; and the `Ventas` / `Cartera` UI.
- Modify: `apps/desktop/src/App.css` to style the sales form, inline customer form, summary panel, and sales/receivables tables.

## Task 1: Add Failing Desktop Tests for Sales and Receivables

**Files:**
- Modify: `apps/desktop/src/App.test.tsx`

- [ ] **Step 1: Add `within` and a product fixture helper**

Update the imports and add this helper near the top of `apps/desktop/src/App.test.tsx`:

```tsx
import { render, screen, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
```

```tsx
async function createProductFixture(user: UserEvent) {
  await user.click(screen.getByRole("button", { name: "Productos" }));
  await user.type(screen.getByLabelText("Codigo"), "ARZ-001");
  await user.type(screen.getByLabelText("Producto"), "Arroz libra");
  await user.type(screen.getByLabelText("Unidad"), "4");
  await user.type(screen.getByLabelText("Costo"), "3200");
  await user.type(screen.getByLabelText("Precio venta"), "4500");
  await user.type(screen.getByLabelText("Stock minimo"), "1");
  await user.click(screen.getByRole("button", { name: "Guardar producto" }));
}
```

- [ ] **Step 2: Add a failing test for a paid sale with inline customer creation**

Append this test inside `describe("App navigation", () => { ... })`:

```tsx
  it("registers a paid sale, decreases stock, and lists it in ventas", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre cliente"), "Ana Perez");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );
    await user.type(screen.getByLabelText("Cantidad"), "2");
    await user.click(screen.getByLabelText("Pagada"));
    await user.click(screen.getByRole("button", { name: "Registrar venta" }));

    const salesTable = screen.getByRole("table", { name: "Ventas registradas" });
    expect(within(salesTable).getByText("Ana Perez")).toBeTruthy();
    expect(within(salesTable).getByText("Arroz libra")).toBeTruthy();
    expect(within(salesTable).getByText("Pagada")).toBeTruthy();
    expect(within(salesTable).getByText(/\$\s*9\.000/)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Productos" }));

    const productsTable = screen.getByRole("table", { name: "Productos registrados" });
    expect(within(productsTable).getByRole("cell", { name: "2" })).toBeTruthy();
  });
```

- [ ] **Step 3: Add a failing test for a pending sale without stock movement**

Append this test below the paid-sale test:

```tsx
  it("registers a pending sale without decreasing stock and exposes receivable data", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre cliente"), "Carlos Ruiz");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );
    await user.type(screen.getByLabelText("Cantidad"), "3");
    await user.click(screen.getByLabelText("Pendiente"));
    await user.click(screen.getByRole("button", { name: "Registrar venta" }));

    const salesTable = screen.getByRole("table", { name: "Ventas registradas" });
    expect(within(salesTable).getByText("Pendiente")).toBeTruthy();
    expect(within(salesTable).getByText(/\$\s*13\.500/)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Productos" }));

    const productsTable = screen.getByRole("table", { name: "Productos registrados" });
    expect(within(productsTable).getByRole("cell", { name: "4" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Cartera" }));

    const receivablesTable = screen.getByRole("table", { name: "Cartera pendiente" });
    expect(within(receivablesTable).getByText("Carlos Ruiz")).toBeTruthy();
    expect(within(receivablesTable).getByText(/\$\s*13\.500/)).toBeTruthy();
  });
```

- [ ] **Step 4: Add a failing validation test for sales and inline customer creation**

Append this test below the pending-sale test:

```tsx
  it("validates missing customer, product, quantity, and empty inline customer name", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));

    expect(screen.getByText("El nombre del cliente es obligatorio.")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Registrar venta" }));

    expect(screen.getByText("Debes seleccionar un cliente.")).toBeTruthy();
    expect(screen.getByText("Debes seleccionar un producto.")).toBeTruthy();
    expect(screen.getByText("La cantidad debe ser un entero mayor a cero.")).toBeTruthy();
  });
```

- [ ] **Step 5: Add a failing test for insufficient stock on a paid sale**

Append this test below the validation test:

```tsx
  it("rejects a paid sale when stock is insufficient", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre cliente"), "Luisa Mora");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );
    await user.type(screen.getByLabelText("Cantidad"), "5");
    await user.click(screen.getByLabelText("Pagada"));
    await user.click(screen.getByRole("button", { name: "Registrar venta" }));

    expect(screen.getByText("No hay inventario suficiente para completar el movimiento.")).toBeTruthy();
  });
```

- [ ] **Step 6: Run the desktop test file to verify red**

Run:

```bash
CI=true pnpm --config.confirmModulesPurge=false --filter @moneta/desktop test -- App.test.tsx
```

Expected: FAIL because `Ventas` and `Cartera` still render empty states and there is no inline customer creation flow.

- [ ] **Step 7: Commit the failing tests**

```bash
git add apps/desktop/src/App.test.tsx
git commit -m "test: define paid and pending sales ui behavior"
```

## Task 2: Add Local Sales, Customers, and Receivables State

**Files:**
- Modify: `apps/desktop/src/App.tsx`

- [ ] **Step 1: Import the application and domain helpers used by the paid path**

Replace the first import block in `apps/desktop/src/App.tsx` with:

```tsx
import { registerSale, type InventoryRepository, type SaleRepository } from "@moneta/application";
import {
  Product,
  createMoney,
  type DomainError,
  type InventoryMovement,
  type Receivable,
  type Result,
  type SaleDraft
} from "@moneta/domain";
import {
  useMemo,
  useState,
  type FormEvent,
  type HTMLAttributes
} from "react";
```

- [ ] **Step 2: Add local customer, sales, and receivable models**

Insert these types below `ProductRecord`:

```tsx
type CustomerRecord = {
  id: string;
  name: string;
};

type SaleRecord = {
  id: string;
  customerId: string;
  customerName: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPriceMinor: number;
  totalMinor: number;
  paymentStatus: "paid" | "pending";
  occurredAtLabel: string;
};

type ReceivableRecord = {
  id: string;
  customerId: string;
  customerName: string;
  saleId: string;
  amountMinor: number;
  status: "pending";
};

type SalesFormState = {
  customerId: string;
  productId: string;
  quantity: string;
  paymentStatus: "paid" | "pending";
};

type SalesFormErrors = {
  customerId?: string;
  productId?: string;
  quantity?: string;
  submit?: string;
};

type CustomerFormState = {
  name: string;
};
```

Add the default sales form below `emptyProductForm`:

```tsx
const emptySalesForm: SalesFormState = {
  customerId: "",
  productId: "",
  quantity: "",
  paymentStatus: "paid"
};
```

- [ ] **Step 3: Add local adapter helpers for the paid-sale use case**

Insert these helpers below `formatCurrency`:

```tsx
function toDomainProduct(product: ProductRecord): Product {
  return Product.create({
    id: product.id,
    sku: product.sku,
    name: product.name,
    unit: "unidad",
    minimumStock: product.minimumStock,
    salePriceMinor: product.salePriceMinor,
    costMinor: product.costMinor,
    active: product.active
  });
}

function formatOccurredAtLabel(date: Date): string {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

function createInventoryRepository(product: ProductRecord): InventoryRepository {
  let currentStock = product.stock;

  return {
    async findProductStock(productId) {
      if (productId !== product.id) {
        return null;
      }

      return {
        product: toDomainProduct(product),
        stock: currentStock
      };
    },
    async recordMovement(movement: InventoryMovement) {
      currentStock -= movement.quantity;
    },
    getStock(productId) {
      return productId === product.id ? currentStock : 0;
    }
  };
}

function createSaleRepository() {
  let saved: { sale: SaleDraft; receivable: Receivable | null } | null = null;

  const repository: SaleRepository = {
    async saveSale(sale, receivable) {
      saved = { sale, receivable };
    }
  };

  return {
    repository,
    getSavedSale() {
      return saved;
    }
  };
}
```

- [ ] **Step 4: Add app-level customer, sales, and receivable state**

Inside `App`, add these state declarations above `activeSectionId`:

```tsx
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [receivables, setReceivables] = useState<ReceivableRecord[]>([]);
```

Add these handlers below `createProduct`:

```tsx
  function createCustomer(name: string): CustomerRecord {
    const customer = {
      id: `customer-${customers.length + 1}`,
      name: name.trim()
    };

    setCustomers((currentCustomers) => [...currentCustomers, customer]);

    return customer;
  }

  async function registerPaidSaleInSession(input: {
    customer: CustomerRecord;
    product: ProductRecord;
    quantity: number;
  }): Promise<Result<void, DomainError>> {
    const occurredAt = new Date();
    const inventory = createInventoryRepository(input.product);
    const salesRepository = createSaleRepository();

    const result = await registerSale({
      inventory,
      sales: salesRepository.repository
    })({
      id: `sale-${sales.length + 1}`,
      customerId: input.customer.id,
      occurredAt,
      paymentStatus: "paid",
      lines: [
        {
          productId: input.product.id,
          quantity: input.quantity,
          unitPrice: createMoney(input.product.salePriceMinor)
        }
      ]
    });

    if (!result.ok) {
      return result;
    }

    const saved = salesRepository.getSavedSale();

    if (!saved) {
      return {
        ok: false,
        error: {
          code: "INACTIVE_PRODUCT",
          message: "No se pudo registrar la venta."
        }
      };
    }

    setProducts((currentProducts) =>
      currentProducts.map((product) =>
        product.id === input.product.id
          ? { ...product, stock: inventory.getStock(product.id) }
          : product
      )
    );
    setSales((currentSales) => [
      {
        id: saved.sale.id,
        customerId: input.customer.id,
        customerName: input.customer.name,
        productId: input.product.id,
        productName: input.product.name,
        quantity: input.quantity,
        unitPriceMinor: input.product.salePriceMinor,
        totalMinor: saved.sale.total.amountMinor,
        paymentStatus: "paid",
        occurredAtLabel: formatOccurredAtLabel(occurredAt)
      },
      ...currentSales
    ]);

    return { ok: true, value: undefined };
  }

  function registerPendingSaleInSession(input: {
    customer: CustomerRecord;
    product: ProductRecord;
    quantity: number;
  }) {
    const occurredAt = new Date();
    const saleId = `sale-${sales.length + 1}`;
    const totalMinor = input.product.salePriceMinor * input.quantity;

    setSales((currentSales) => [
      {
        id: saleId,
        customerId: input.customer.id,
        customerName: input.customer.name,
        productId: input.product.id,
        productName: input.product.name,
        quantity: input.quantity,
        unitPriceMinor: input.product.salePriceMinor,
        totalMinor,
        paymentStatus: "pending",
        occurredAtLabel: formatOccurredAtLabel(occurredAt)
      },
      ...currentSales
    ]);
    setReceivables((currentReceivables) => [
      {
        id: `receivable-${saleId}`,
        customerId: input.customer.id,
        customerName: input.customer.name,
        saleId,
        amountMinor: totalMinor,
        status: "pending"
      },
      ...currentReceivables
    ]);
  }
```

- [ ] **Step 5: Pass the new state and handlers into section routing**

Replace the `SectionContent` call with:

```tsx
          <SectionContent
            customers={customers}
            onCreateCustomer={createCustomer}
            onCreateProduct={createProduct}
            onRegisterPaidSale={registerPaidSaleInSession}
            onRegisterPendingSale={registerPendingSaleInSession}
            products={products}
            receivables={receivables}
            sales={sales}
            section={activeSection}
          />
```

Update `SectionContentProps` to:

```tsx
type SectionContentProps = {
  customers: CustomerRecord[];
  onCreateCustomer: (name: string) => CustomerRecord;
  onCreateProduct: (product: ProductRecord) => void;
  onRegisterPaidSale: (input: {
    customer: CustomerRecord;
    product: ProductRecord;
    quantity: number;
  }) => Promise<Result<void, DomainError>>;
  onRegisterPendingSale: (input: {
    customer: CustomerRecord;
    product: ProductRecord;
    quantity: number;
  }) => void;
  products: ProductRecord[];
  receivables: ReceivableRecord[];
  sales: SaleRecord[];
  section: SectionConfig;
};
```

Update the `SectionContent` function signature to:

```tsx
function SectionContent({
  customers,
  onCreateCustomer,
  onCreateProduct,
  onRegisterPaidSale,
  onRegisterPendingSale,
  products,
  receivables,
  sales,
  section
}: SectionContentProps) {
```

- [ ] **Step 6: Commit the app state and adapter groundwork**

```bash
git add apps/desktop/src/App.tsx
git commit -m "feat: add local sales session state"
```

## Task 3: Render Ventas and Cartera UI

**Files:**
- Modify: `apps/desktop/src/App.tsx`
- Modify: `apps/desktop/src/App.css`

- [ ] **Step 1: Route `Ventas` and `Cartera` to dedicated section components**

Update `SectionContent` to branch like this before the fallback empty state:

```tsx
  if (section.id === "products") {
    return <ProductsSection onCreateProduct={onCreateProduct} products={products} />;
  }

  if (section.id === "sales") {
    return (
      <SalesSection
        customers={customers}
        onCreateCustomer={onCreateCustomer}
        onRegisterPaidSale={onRegisterPaidSale}
        onRegisterPendingSale={onRegisterPendingSale}
        products={products}
        sales={sales}
      />
    );
  }

  if (section.id === "receivables") {
    return <ReceivablesSection receivables={receivables} />;
  }
```

- [ ] **Step 2: Add the `SalesSection` component**

Append this component below `ProductsSection`:

```tsx
type SalesSectionProps = {
  customers: CustomerRecord[];
  onCreateCustomer: (name: string) => CustomerRecord;
  onRegisterPaidSale: (input: {
    customer: CustomerRecord;
    product: ProductRecord;
    quantity: number;
  }) => Promise<Result<void, DomainError>>;
  onRegisterPendingSale: (input: {
    customer: CustomerRecord;
    product: ProductRecord;
    quantity: number;
  }) => void;
  products: ProductRecord[];
  sales: SaleRecord[];
};

function SalesSection({
  customers,
  onCreateCustomer,
  onRegisterPaidSale,
  onRegisterPendingSale,
  products,
  sales
}: SalesSectionProps) {
  const [form, setForm] = useState<SalesFormState>(emptySalesForm);
  const [errors, setErrors] = useState<SalesFormErrors>({});
  const [customerFormVisible, setCustomerFormVisible] = useState(false);
  const [customerForm, setCustomerForm] = useState<CustomerFormState>({ name: "" });
  const [customerError, setCustomerError] = useState<string | null>(null);

  const selectedCustomer =
    customers.find((customer) => customer.id === form.customerId) ?? null;
  const selectedProduct =
    products.find((product) => product.id === form.productId) ?? null;
  const quantity = parseNonNegativeInteger(form.quantity) ?? 0;
  const totalMinor = selectedProduct ? selectedProduct.salePriceMinor * quantity : 0;

  async function submitSale(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: SalesFormErrors = {};
    const parsedQuantity = parseNonNegativeInteger(form.quantity);

    if (!selectedCustomer) {
      nextErrors.customerId = "Debes seleccionar un cliente.";
    }
    if (!selectedProduct) {
      nextErrors.productId = "Debes seleccionar un producto.";
    }
    if (parsedQuantity === null || parsedQuantity <= 0) {
      nextErrors.quantity = "La cantidad debe ser un entero mayor a cero.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0 || !selectedCustomer || !selectedProduct) {
      return;
    }

    if (form.paymentStatus === "paid") {
      const result = await onRegisterPaidSale({
        customer: selectedCustomer,
        product: selectedProduct,
        quantity: parsedQuantity!
      });

      if (!result.ok) {
        setErrors({ submit: result.error.message });
        return;
      }
    } else {
      onRegisterPendingSale({
        customer: selectedCustomer,
        product: selectedProduct,
        quantity: parsedQuantity!
      });
    }

    setErrors({});
    setForm(emptySalesForm);
  }

  function submitCustomer() {
    if (customerForm.name.trim() === "") {
      setCustomerError("El nombre del cliente es obligatorio.");
      return;
    }

    const customer = onCreateCustomer(customerForm.name);

    setForm((currentForm) => ({ ...currentForm, customerId: customer.id }));
    setCustomerForm({ name: "" });
    setCustomerError(null);
    setCustomerFormVisible(false);
  }

  return (
    <section className="sales-layout">
      <form className="sales-form" onSubmit={submitSale}>
        <div className="sales-grid">
          <label className="field">
            <span>Cliente</span>
            <select
              aria-invalid={Boolean(errors.customerId)}
              onChange={(event) =>
                setForm((currentForm) => ({
                  ...currentForm,
                  customerId: event.target.value
                }))
              }
              value={form.customerId}
            >
              <option value="">Selecciona un cliente</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
            {errors.customerId ? <small>{errors.customerId}</small> : null}
          </label>

          <div className="inline-action-group">
            <button
              type="button"
              onClick={() => setCustomerFormVisible((visible) => !visible)}
            >
              Nuevo cliente
            </button>
          </div>

          <label className="field">
            <span>Producto</span>
            <select
              aria-invalid={Boolean(errors.productId)}
              onChange={(event) =>
                setForm((currentForm) => ({
                  ...currentForm,
                  productId: event.target.value
                }))
              }
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
            label="Cantidad"
            onChange={(value) =>
              setForm((currentForm) => ({ ...currentForm, quantity: value }))
            }
            value={form.quantity}
          />
        </div>

        {customerFormVisible ? (
          <div className="inline-customer-form">
            <TextField
              error={customerError ?? undefined}
              label="Nombre cliente"
              onChange={(value) => {
                setCustomerForm({ name: value });
                setCustomerError(null);
              }}
              value={customerForm.name}
            />
            <button type="button" onClick={submitCustomer}>
              Guardar cliente
            </button>
          </div>
        ) : null}

        <div className="payment-status-group" role="radiogroup" aria-label="Estado de pago">
          <label>
            <input
              checked={form.paymentStatus === "paid"}
              name="payment-status"
              onChange={() =>
                setForm((currentForm) => ({ ...currentForm, paymentStatus: "paid" }))
              }
              type="radio"
            />
            Pagada
          </label>
          <label>
            <input
              checked={form.paymentStatus === "pending"}
              name="payment-status"
              onChange={() =>
                setForm((currentForm) => ({ ...currentForm, paymentStatus: "pending" }))
              }
              type="radio"
            />
            Pendiente
          </label>
        </div>

        <div className="summary-card">
          <span>Precio unitario {selectedProduct ? formatCurrency(selectedProduct.salePriceMinor) : "$0"}</span>
          <strong>Total {formatCurrency(totalMinor)}</strong>
        </div>

        {errors.submit ? <p className="form-error">{errors.submit}</p> : null}

        <div className="form-actions">
          <button type="submit">Registrar venta</button>
        </div>
      </form>

      {sales.length > 0 ? (
        <table className="data-table" aria-label="Ventas registradas">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Producto</th>
              <th>Cantidad</th>
              <th>Estado</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((sale) => (
              <tr key={sale.id}>
                <td>{sale.occurredAtLabel}</td>
                <td>{sale.customerName}</td>
                <td>{sale.productName}</td>
                <td>{sale.quantity}</td>
                <td>{sale.paymentStatus === "paid" ? "Pagada" : "Pendiente"}</td>
                <td>{formatCurrency(sale.totalMinor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="empty-state section-empty">
          <strong>Sin ventas registradas</strong>
          <span>Registra ventas para actualizar inventario y cartera.</span>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 3: Add the `ReceivablesSection` component**

Append this component below `SalesSection`:

```tsx
type ReceivablesSectionProps = {
  receivables: ReceivableRecord[];
};

function ReceivablesSection({ receivables }: ReceivablesSectionProps) {
  if (receivables.length === 0) {
    return (
      <section className="section-panel">
        <div className="empty-state section-empty">
          <strong>Sin cartera pendiente</strong>
          <span>Las ventas pendientes de pago apareceran aqui.</span>
        </div>
      </section>
    );
  }

  return (
    <section className="section-panel">
      <table className="data-table" aria-label="Cartera pendiente">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Venta</th>
            <th>Saldo</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {receivables.map((receivable) => (
            <tr key={receivable.id}>
              <td>{receivable.customerName}</td>
              <td>{receivable.saleId}</td>
              <td>{formatCurrency(receivable.amountMinor)}</td>
              <td>Pendiente</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
```

- [ ] **Step 4: Add the required styles for sales and receivables**

Append this block to `apps/desktop/src/App.css`:

```css
.sales-layout {
  display: grid;
  gap: 18px;
}

.sales-form {
  border: 1px solid #d8dee5;
  border-radius: 8px;
  background: white;
  padding: 18px;
}

.sales-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  align-items: end;
}

.field select {
  min-width: 0;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 10px 11px;
  color: #111827;
  background: white;
  font: inherit;
}

.field select[aria-invalid="true"] {
  border-color: #dc2626;
}

.inline-action-group {
  display: flex;
  align-items: flex-end;
}

.inline-action-group button {
  border-radius: 8px;
  background: #eef2f7;
  color: #334155;
  padding: 10px 12px;
}

.inline-customer-form {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  margin-top: 16px;
}

.inline-customer-form button {
  align-self: end;
  border-radius: 8px;
  background: #0f766e;
  color: #ffffff;
  padding: 10px 14px;
  font-weight: 700;
}

.payment-status-group {
  display: flex;
  gap: 18px;
  margin-top: 18px;
}

.payment-status-group label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #334155;
  font-size: 14px;
}

.summary-card {
  display: grid;
  gap: 8px;
  margin-top: 18px;
  border: 1px solid #d8dee5;
  border-radius: 8px;
  background: #f8fafc;
  padding: 14px;
}

.summary-card span {
  color: #475569;
  font-size: 14px;
}

.summary-card strong {
  color: #0f172a;
  font-size: 20px;
}

.form-error {
  margin: 14px 0 0;
  color: #b91c1c;
  font-size: 13px;
}
```

- [ ] **Step 5: Run the desktop test file to verify green**

Run:

```bash
CI=true pnpm --config.confirmModulesPurge=false --filter @moneta/desktop test -- App.test.tsx
```

Expected: PASS with the new `Ventas` and `Cartera` behavior.

- [ ] **Step 6: Commit the UI implementation**

```bash
git add apps/desktop/src/App.tsx apps/desktop/src/App.css apps/desktop/src/App.test.tsx
git commit -m "feat: add paid and pending sales flow"
```

## Task 4: Verify the Workspace End to End

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

- [ ] **Step 4: Commit any verification-driven fixes**

If verification required follow-up edits, commit them with:

```bash
git add apps/desktop/src/App.tsx apps/desktop/src/App.css apps/desktop/src/App.test.tsx
git commit -m "fix: align sales flow verification"
```

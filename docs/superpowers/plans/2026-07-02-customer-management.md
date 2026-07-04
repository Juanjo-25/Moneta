# Customer Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full `Clientes` workspace with create, edit, deactivate/reactivate, duplicate-document validation, active-only sales selection, and a customer file with sales and cartera history.

**Architecture:** Keep this slice in the current desktop React session, matching the existing in-memory Moneta app. Add shared customer validation/helpers inside `apps/desktop/src/App.tsx`, pass customer management callbacks through `SectionContent`, and add a focused `CustomersSection` rather than introducing persistence or a new route.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, Vite, current CSS module in `apps/desktop/src/App.css`.

---

## File Structure

- Modify `apps/desktop/src/App.tsx`
  - Add `active` to `CustomerRecord`.
  - Add customer helper functions: document normalization, duplicate validation, customer summaries.
  - Update `createCustomer` to validate through a shared path and create active customers.
  - Add `updateCustomer` and `setCustomerActive`.
  - Add `CustomersSection`.
  - Update `SalesSection` to receive active customers and reject inactive selected customers on submit.
- Modify `apps/desktop/src/App.test.tsx`
  - Add focused tests for the customer workspace and regression tests for sales snapshots and duplicate inline creation.
- Modify `apps/desktop/src/App.css`
  - Add layout and state styles for the customer workspace.

Use this command after each task:

```bash
CI=true pnpm --config.confirmModulesPurge=false --filter @moneta/desktop test -- --run
```

Expected passing output after implementation steps:

```text
Test Files  1 passed
Tests       all passing
```

## Task 1: Shared Customer Validation

**Files:**
- Modify: `apps/desktop/src/App.tsx`
- Test: `apps/desktop/src/App.test.tsx`

- [ ] **Step 1: Write failing duplicate-document tests**

Add these tests near the existing inline customer tests in `apps/desktop/src/App.test.tsx`:

```tsx
  it("blocks duplicate customer documents from inline sales creation", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre o razon social"), "Ana Perez");
    await user.type(screen.getByLabelText("NIT o C.C."), "123456789");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre o razon social"), "Ana Perez Sucursal");
    await user.type(screen.getByLabelText("NIT o C.C."), " 123456789 ");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));

    expect(screen.getByText("Ya existe un cliente con este NIT o C.C.")).toBeTruthy();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
CI=true pnpm --config.confirmModulesPurge=false --filter @moneta/desktop test -- --run -t "blocks duplicate customer documents"
```

Expected: FAIL because duplicate customer documents are currently accepted.

- [ ] **Step 3: Add helper types and validation**

In `apps/desktop/src/App.tsx`, update the customer type and add helpers near `emptyCustomerForm`:

```ts
type CustomerRecord = {
  id: string;
  name: string;
  document: string;
  address: string;
  city: string;
  email: string;
  active: boolean;
};

type CustomerValidationOptions = {
  customers: CustomerRecord[];
  currentCustomerId?: string | undefined;
};

function normalizeCustomerDocument(document: string): string {
  return document.trim().toLocaleLowerCase();
}

function validateCustomerForm(
  input: CustomerFormState,
  options: CustomerValidationOptions
): CustomerFormErrors {
  const errors: CustomerFormErrors = {};
  const normalizedDocument = normalizeCustomerDocument(input.document);

  if (input.name.trim() === "") {
    errors.name = "El nombre del cliente es obligatorio.";
  }

  if (normalizedDocument === "") {
    errors.document = "El documento del cliente es obligatorio.";
  } else {
    const duplicate = options.customers.some(
      (customer) =>
        customer.id !== options.currentCustomerId &&
        normalizeCustomerDocument(customer.document) === normalizedDocument
    );

    if (duplicate) {
      errors.document = "Ya existe un cliente con este NIT o C.C.";
    }
  }

  return errors;
}
```

- [ ] **Step 4: Route inline customer creation through shared validation**

Change `SalesSectionProps` and `SalesSection` to receive `onValidateCustomer`:

```ts
type SalesSectionProps = {
  customers: CustomerRecord[];
  onCreateCustomer: (input: CustomerFormState) => CustomerRecord;
  onValidateCustomer: (
    input: CustomerFormState,
    currentCustomerId?: string | undefined
  ) => CustomerFormErrors;
  // keep existing sale callbacks and props
};
```

Use it inside `submitCustomer`:

```ts
  function submitCustomer() {
    const nextErrors = onValidateCustomer(customerForm);

    setCustomerErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const customer = onCreateCustomer(customerForm);

    setForm((currentForm) => ({ ...currentForm, customerId: customer.id }));
    setCustomerForm(emptyCustomerForm);
    setCustomerErrors({});
    setCustomerFormVisible(false);
  }
```

Add callbacks in `App`:

```ts
  function validateCustomer(
    input: CustomerFormState,
    currentCustomerId?: string | undefined
  ): CustomerFormErrors {
    return validateCustomerForm(input, { customers, currentCustomerId });
  }

  function createCustomer(input: CustomerFormState): CustomerRecord {
    const customer = {
      active: true,
      address: input.address.trim(),
      city: input.city.trim(),
      document: input.document.trim(),
      email: input.email.trim(),
      id: `customer-${Date.now()}`,
      name: input.name.trim()
    };

    setCustomers((currentCustomers) => [...currentCustomers, customer]);

    return customer;
  }
```

Pass `onValidateCustomer={validateCustomer}` into `SalesSection`.

- [ ] **Step 5: Run test to verify it passes**

Run:

```bash
CI=true pnpm --config.confirmModulesPurge=false --filter @moneta/desktop test -- --run -t "blocks duplicate customer documents"
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/src/App.tsx apps/desktop/src/App.test.tsx
git commit -m "feat: validate customer documents"
```

## Task 2: Customer Directory Create and Search

**Files:**
- Modify: `apps/desktop/src/App.tsx`
- Modify: `apps/desktop/src/App.css`
- Test: `apps/desktop/src/App.test.tsx`

- [ ] **Step 1: Write failing customer section tests**

Add these tests near the customer tests:

```tsx
  it("creates a customer from Clientes and lists it with active status", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Clientes" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre o razon social"), "Comercial Andes");
    await user.type(screen.getByLabelText("NIT o C.C."), "900123456");
    await user.type(screen.getByLabelText("Direccion"), "Carrera 45 # 10-20");
    await user.type(screen.getByLabelText("Ciudad"), "Medellin");
    await user.type(screen.getByLabelText("Email"), "compras@andes.test");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));

    const customersTable = screen.getByRole("table", { name: "Clientes registrados" });
    expect(within(customersTable).getByText("Comercial Andes")).toBeTruthy();
    expect(within(customersTable).getByText("900123456")).toBeTruthy();
    expect(within(customersTable).getByText("Activo")).toBeTruthy();
  });

  it("searches customers by name and document", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Clientes" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre o razon social"), "Comercial Andes");
    await user.type(screen.getByLabelText("NIT o C.C."), "900123456");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre o razon social"), "Tienda Sur");
    await user.type(screen.getByLabelText("NIT o C.C."), "111222333");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));

    await user.type(screen.getByLabelText("Buscar clientes"), "900123456");

    const customersTable = screen.getByRole("table", { name: "Clientes registrados" });
    expect(within(customersTable).getByText("Comercial Andes")).toBeTruthy();
    expect(within(customersTable).queryByText("Tienda Sur")).toBeNull();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
CI=true pnpm --config.confirmModulesPurge=false --filter @moneta/desktop test -- --run -t "customer from Clientes|searches customers"
```

Expected: FAIL because `Clientes` still shows an empty state.

- [ ] **Step 3: Add customer section props and route**

In `SectionContentProps`, add:

```ts
  onValidateCustomer: (
    input: CustomerFormState,
    currentCustomerId?: string | undefined
  ) => CustomerFormErrors;
```

Pass the prop from `App` to `SectionContent` and from `SectionContent` to both `SalesSection` and the new `CustomersSection`.

Add this branch before the fallback empty state:

```tsx
  if (section.id === "customers") {
    return (
      <CustomersSection
        customers={customers}
        onCreateCustomer={onCreateCustomer}
        onValidateCustomer={onValidateCustomer}
        receivables={receivables}
        sales={sales}
      />
    );
  }
```

- [ ] **Step 4: Add first CustomersSection implementation**

Add below `SectionContent`:

```tsx
type CustomersSectionProps = {
  customers: CustomerRecord[];
  onCreateCustomer: (input: CustomerFormState) => CustomerRecord;
  onValidateCustomer: (
    input: CustomerFormState,
    currentCustomerId?: string | undefined
  ) => CustomerFormErrors;
  receivables: ReceivableRecord[];
  sales: SaleRecord[];
};

function CustomersSection({
  customers,
  onCreateCustomer,
  onValidateCustomer
}: CustomersSectionProps) {
  const [formVisible, setFormVisible] = useState(false);
  const [form, setForm] = useState<CustomerFormState>(emptyCustomerForm);
  const [errors, setErrors] = useState<CustomerFormErrors>({});
  const [search, setSearch] = useState("");

  const normalizedSearch = search.trim().toLocaleLowerCase();
  const filteredCustomers = customers.filter((customer) => {
    if (normalizedSearch === "") {
      return true;
    }

    return [customer.name, customer.document, customer.address, customer.city, customer.email]
      .some((value) => value.toLocaleLowerCase().includes(normalizedSearch));
  });

  function updateField(field: keyof CustomerFormState, value: string) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
    setErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
  }

  function submitCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = onValidateCustomer(form);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    onCreateCustomer(form);
    setForm(emptyCustomerForm);
    setErrors({});
    setFormVisible(false);
  }

  return (
    <section className="customers-layout">
      <div className="customers-toolbar">
        <label className="field" htmlFor="buscar-clientes">
          <span>Buscar clientes</span>
          <input
            id="buscar-clientes"
            onChange={(event) => setSearch(event.target.value)}
            value={search}
          />
        </label>
        <button type="button" onClick={() => setFormVisible((visible) => !visible)}>
          Nuevo cliente
        </button>
      </div>

      {formVisible ? (
        <form className="customer-form" onSubmit={submitCustomer}>
          <TextField error={errors.name} label="Nombre o razon social" onChange={(value) => updateField("name", value)} value={form.name} />
          <TextField error={errors.document} label="NIT o C.C." onChange={(value) => updateField("document", value)} value={form.document} />
          <TextField error={errors.address} label="Direccion" onChange={(value) => updateField("address", value)} value={form.address} />
          <TextField error={errors.city} label="Ciudad" onChange={(value) => updateField("city", value)} value={form.city} />
          <TextField error={errors.email} label="Email" onChange={(value) => updateField("email", value)} value={form.email} />
          <div className="form-actions">
            <button type="submit">Guardar cliente</button>
          </div>
        </form>
      ) : null}

      {filteredCustomers.length > 0 ? (
        <table className="data-table" aria-label="Clientes registrados">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Documento</th>
              <th>Estado</th>
              <th>Total vendido</th>
              <th>Cartera</th>
              <th>Ultima venta</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.map((customer) => (
              <tr key={customer.id}>
                <td>{customer.name}</td>
                <td>{customer.document}</td>
                <td>{customer.active ? "Activo" : "Inactivo"}</td>
                <td>{formatCurrency(0)}</td>
                <td>{formatCurrency(0)}</td>
                <td>Sin ventas</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="empty-state section-empty">
          <strong>{customers.length === 0 ? "Sin clientes registrados" : "Sin resultados"}</strong>
          <span>{customers.length === 0 ? "Crea clientes para ventas y cartera." : "Ajusta la busqueda para ver mas clientes."}</span>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 5: Add basic styles**

Add to `apps/desktop/src/App.css`:

```css
.customers-layout {
  display: grid;
  gap: 18px;
}

.customers-toolbar {
  display: grid;
  grid-template-columns: minmax(240px, 1fr) auto;
  gap: 14px;
  align-items: end;
}

.customers-toolbar button {
  min-height: 42px;
  border-radius: 8px;
  background: #0f766e;
  color: #ffffff;
  padding: 0 16px;
  font-weight: 800;
}

.customer-form {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run:

```bash
CI=true pnpm --config.confirmModulesPurge=false --filter @moneta/desktop test -- --run -t "customer from Clientes|searches customers"
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/desktop/src/App.tsx apps/desktop/src/App.css apps/desktop/src/App.test.tsx
git commit -m "feat: add customer directory"
```

## Task 3: Edit Customer and Preserve Sale Snapshots

**Files:**
- Modify: `apps/desktop/src/App.tsx`
- Test: `apps/desktop/src/App.test.tsx`

- [ ] **Step 1: Write failing edit and snapshot tests**

Add:

```tsx
  it("edits current customer data from the customer file", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Clientes" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre o razon social"), "Ana Perez");
    await user.type(screen.getByLabelText("NIT o C.C."), "123456789");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.click(screen.getByRole("button", { name: "Ver cliente Ana Perez" }));
    await user.click(screen.getByRole("button", { name: "Editar cliente" }));
    await user.clear(screen.getByLabelText("Nombre o razon social"));
    await user.type(screen.getByLabelText("Nombre o razon social"), "Ana Perez SAS");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    const customersTable = screen.getByRole("table", { name: "Clientes registrados" });
    expect(within(customersTable).getByText("Ana Perez SAS")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Ana Perez SAS" })).toBeTruthy();
  });

  it("keeps old invoice customer data after editing the current customer", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre o razon social"), "Ana Perez");
    await user.type(screen.getByLabelText("NIT o C.C."), "123456789");
    await user.type(screen.getByLabelText("Direccion"), "Calle 1");
    await user.type(screen.getByLabelText("Ciudad"), "Medellin");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.selectOptions(screen.getByLabelText("Producto"), screen.getByRole("option", { name: "Arroz libra" }));
    await user.type(screen.getByLabelText("Cantidad"), "1");
    await user.click(screen.getByRole("button", { name: "Registrar venta" }));
    await user.click(screen.getByRole("button", { name: "Clientes" }));
    await user.click(screen.getByRole("button", { name: "Ver cliente Ana Perez" }));
    await user.click(screen.getByRole("button", { name: "Editar cliente" }));
    await user.clear(screen.getByLabelText("Nombre o razon social"));
    await user.type(screen.getByLabelText("Nombre o razon social"), "Ana Perez SAS");
    await user.clear(screen.getByLabelText("Direccion"));
    await user.type(screen.getByLabelText("Direccion"), "Calle 99");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Generar factura PDF" }));

    await waitFor(() =>
      expect(generateInvoicePdfMock).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: expect.objectContaining({
            address: "Calle 1",
            name: "Ana Perez"
          })
        })
      )
    );
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
CI=true pnpm --config.confirmModulesPurge=false --filter @moneta/desktop test -- --run -t "edits current customer|keeps old invoice"
```

Expected: FAIL because customer detail actions do not exist.

- [ ] **Step 3: Add updateCustomer in App**

Add:

```ts
  function updateCustomer(customerId: string, input: CustomerFormState) {
    setCustomers((currentCustomers) =>
      currentCustomers.map((customer) =>
        customer.id === customerId
          ? {
              ...customer,
              address: input.address.trim(),
              city: input.city.trim(),
              document: input.document.trim(),
              email: input.email.trim(),
              name: input.name.trim()
            }
          : customer
      )
    );
  }
```

Pass `onUpdateCustomer={updateCustomer}` to `CustomersSection`.

- [ ] **Step 4: Add selected customer detail and edit form**

Extend `CustomersSectionProps`:

```ts
  onUpdateCustomer: (customerId: string, input: CustomerFormState) => void;
```

Inside `CustomersSection`, add:

```ts
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const selectedCustomer =
    customers.find((customer) => customer.id === selectedCustomerId) ??
    filteredCustomers[0] ??
    null;

  function startEditing(customer: CustomerRecord) {
    setEditingCustomerId(customer.id);
    setForm({
      address: customer.address,
      city: customer.city,
      document: customer.document,
      email: customer.email,
      name: customer.name
    });
    setFormVisible(false);
    setErrors({});
  }

  function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingCustomerId) {
      return;
    }

    const nextErrors = onValidateCustomer(form, editingCustomerId);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    onUpdateCustomer(editingCustomerId, form);
    setEditingCustomerId(null);
    setForm(emptyCustomerForm);
    setErrors({});
  }
```

Add an action column to customer rows:

```tsx
<th>Accion</th>
```

```tsx
<td>
  <button
    className="table-action"
    type="button"
    onClick={() => setSelectedCustomerId(customer.id)}
  >
    Ver cliente {customer.name}
  </button>
</td>
```

Render below the table:

```tsx
{selectedCustomer ? (
  <section className="customer-file" aria-label="Ficha de cliente">
    <header>
      <div>
        <h2>{selectedCustomer.name}</h2>
        <p>{selectedCustomer.document}</p>
      </div>
      <button type="button" onClick={() => startEditing(selectedCustomer)}>
        Editar cliente
      </button>
    </header>
    {editingCustomerId === selectedCustomer.id ? (
      <form className="customer-form" onSubmit={submitEdit}>
        <TextField error={errors.name} label="Nombre o razon social" onChange={(value) => updateField("name", value)} value={form.name} />
        <TextField error={errors.document} label="NIT o C.C." onChange={(value) => updateField("document", value)} value={form.document} />
        <TextField error={errors.address} label="Direccion" onChange={(value) => updateField("address", value)} value={form.address} />
        <TextField error={errors.city} label="Ciudad" onChange={(value) => updateField("city", value)} value={form.city} />
        <TextField error={errors.email} label="Email" onChange={(value) => updateField("email", value)} value={form.email} />
        <div className="form-actions">
          <button type="submit">Guardar cambios</button>
        </div>
      </form>
    ) : null}
  </section>
) : null}
```

- [ ] **Step 5: Run tests to verify they pass**

Run:

```bash
CI=true pnpm --config.confirmModulesPurge=false --filter @moneta/desktop test -- --run -t "edits current customer|keeps old invoice"
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/src/App.tsx apps/desktop/src/App.test.tsx
git commit -m "feat: edit customer records"
```

## Task 4: Deactivate, Reactivate, and Active-Only Sales

**Files:**
- Modify: `apps/desktop/src/App.tsx`
- Test: `apps/desktop/src/App.test.tsx`

- [ ] **Step 1: Write failing active-status tests**

Add:

```tsx
  it("deactivates a customer and hides it from new sales", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Clientes" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre o razon social"), "Ana Perez");
    await user.type(screen.getByLabelText("NIT o C.C."), "123456789");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.click(screen.getByRole("button", { name: "Ver cliente Ana Perez" }));
    await user.click(screen.getByRole("button", { name: "Desactivar cliente" }));

    expect(screen.getByText("Inactivo")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Ventas" }));
    expect(screen.queryByRole("option", { name: "Ana Perez - 123456789" })).toBeNull();
  });

  it("reactivates a customer and shows it for new sales again", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Clientes" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre o razon social"), "Ana Perez");
    await user.type(screen.getByLabelText("NIT o C.C."), "123456789");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.click(screen.getByRole("button", { name: "Ver cliente Ana Perez" }));
    await user.click(screen.getByRole("button", { name: "Desactivar cliente" }));
    await user.click(screen.getByRole("button", { name: "Reactivar cliente" }));
    await user.click(screen.getByRole("button", { name: "Ventas" }));

    expect(screen.getByRole("option", { name: "Ana Perez - 123456789" })).toBeTruthy();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
CI=true pnpm --config.confirmModulesPurge=false --filter @moneta/desktop test -- --run -t "deactivates a customer|reactivates a customer"
```

Expected: FAIL because active actions do not exist.

- [ ] **Step 3: Add active update callback**

In `App`:

```ts
  function setCustomerActive(customerId: string, active: boolean) {
    setCustomers((currentCustomers) =>
      currentCustomers.map((customer) =>
        customer.id === customerId ? { ...customer, active } : customer
      )
    );
  }
```

Pass `onSetCustomerActive={setCustomerActive}` to `CustomersSection`.

- [ ] **Step 4: Add active controls and active-only sales selector**

Extend `CustomersSectionProps`:

```ts
  onSetCustomerActive: (customerId: string, active: boolean) => void;
```

In the customer file header, add:

```tsx
<span className={selectedCustomer.active ? "status-pill active" : "status-pill inactive"}>
  {selectedCustomer.active ? "Activo" : "Inactivo"}
</span>
<button
  type="button"
  onClick={() => onSetCustomerActive(selectedCustomer.id, !selectedCustomer.active)}
>
  {selectedCustomer.active ? "Desactivar cliente" : "Reactivar cliente"}
</button>
```

In `SalesSection`, compute:

```ts
  const activeCustomers = customers.filter((customer) => customer.active);
```

Use `activeCustomers.map` in the customer selector.

Add submit guard before registering a sale:

```ts
    if (selectedCustomer && !selectedCustomer.active) {
      nextErrors.customerId =
        "El cliente seleccionado esta inactivo. Reactivalo para registrar nuevas ventas.";
    }
```

- [ ] **Step 5: Run tests to verify they pass**

Run:

```bash
CI=true pnpm --config.confirmModulesPurge=false --filter @moneta/desktop test -- --run -t "deactivates a customer|reactivates a customer"
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/src/App.tsx apps/desktop/src/App.test.tsx
git commit -m "feat: manage customer active status"
```

## Task 5: Customer File Metrics, Sales History, and Receivables

**Files:**
- Modify: `apps/desktop/src/App.tsx`
- Modify: `apps/desktop/src/App.css`
- Test: `apps/desktop/src/App.test.tsx`

- [ ] **Step 1: Write failing customer file history test**

Add:

```tsx
  it("shows customer file metrics, sales history, and pending receivables", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre o razon social"), "Carlos Ruiz");
    await user.type(screen.getByLabelText("NIT o C.C."), "987654321");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.selectOptions(screen.getByLabelText("Producto"), screen.getByRole("option", { name: "Arroz libra" }));
    await user.type(screen.getByLabelText("Cantidad"), "2");
    await user.click(screen.getByLabelText("Pendiente"));
    await user.type(screen.getByLabelText("Fecha vencimiento venta"), "2026-07-15");
    await user.click(screen.getByRole("button", { name: "Registrar venta" }));
    await user.click(screen.getByRole("button", { name: "Clientes" }));
    await user.click(screen.getByRole("button", { name: "Ver cliente Carlos Ruiz" }));

    expect(screen.getByText("Total vendido")).toBeTruthy();
    expect(screen.getByText(/\$\s*9\.000/)).toBeTruthy();
    expect(screen.getByText("Ventas")).toBeTruthy();
    expect(screen.getByText("1")).toBeTruthy();

    const salesHistory = screen.getByRole("table", { name: "Historial de ventas del cliente" });
    expect(within(salesHistory).getByText("Arroz libra")).toBeTruthy();
    expect(within(salesHistory).getByText("Pendiente")).toBeTruthy();

    const customerReceivables = screen.getByRole("table", { name: "Cartera pendiente del cliente" });
    expect(within(customerReceivables).getByText("2026-07-15")).toBeTruthy();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
CI=true pnpm --config.confirmModulesPurge=false --filter @moneta/desktop test -- --run -t "customer file metrics"
```

Expected: FAIL because metrics and history tables are not implemented.

- [ ] **Step 3: Add customer summary helpers**

Add near report helper functions:

```ts
type CustomerSummary = {
  lastSaleLabel: string;
  pendingReceivableMinor: number;
  saleCount: number;
  totalSoldMinor: number;
};

function buildCustomerSummary(input: {
  customer: CustomerRecord;
  receivables: ReceivableRecord[];
  sales: SaleRecord[];
}): CustomerSummary {
  const customerSales = input.sales.filter(
    (sale) => sale.customerId === input.customer.id
  );
  const customerReceivables = input.receivables.filter(
    (receivable) => receivable.customerId === input.customer.id
  );
  const lastSale = [...customerSales].sort(
    (left, right) => right.occurredAtMs - left.occurredAtMs
  )[0];

  return {
    lastSaleLabel: lastSale?.occurredAtLabel ?? "Sin ventas",
    pendingReceivableMinor: customerReceivables.reduce(
      (total, receivable) => total + receivable.amountMinor,
      0
    ),
    saleCount: customerSales.length,
    totalSoldMinor: customerSales.reduce((total, sale) => total + sale.totalMinor, 0)
  };
}
```

- [ ] **Step 4: Render metrics and detail tables**

Inside `CustomersSection`, compute:

```ts
  const selectedCustomerSales = selectedCustomer
    ? sales.filter((sale) => sale.customerId === selectedCustomer.id)
    : [];
  const selectedCustomerReceivables = selectedCustomer
    ? receivables.filter((receivable) => receivable.customerId === selectedCustomer.id)
    : [];
  const selectedCustomerSummary = selectedCustomer
    ? buildCustomerSummary({ customer: selectedCustomer, receivables, sales })
    : null;
```

Use `buildCustomerSummary` in each customer row for total sold, cartera, and last sale.

Add inside `.customer-file`:

```tsx
{selectedCustomerSummary ? (
  <div className="customer-summary" aria-label="Resumen del cliente">
    <div className="summary-card">
      <span>Total vendido</span>
      <strong>{formatCurrency(selectedCustomerSummary.totalSoldMinor)}</strong>
    </div>
    <div className="summary-card">
      <span>Ventas</span>
      <strong>{selectedCustomerSummary.saleCount}</strong>
    </div>
    <div className="summary-card">
      <span>Cartera pendiente</span>
      <strong>{formatCurrency(selectedCustomerSummary.pendingReceivableMinor)}</strong>
    </div>
    <div className="summary-card">
      <span>Ultima venta</span>
      <strong>{selectedCustomerSummary.lastSaleLabel}</strong>
    </div>
  </div>
) : null}

{selectedCustomerSales.length > 0 ? (
  <table className="data-table" aria-label="Historial de ventas del cliente">
    <thead>
      <tr>
        <th>Fecha</th>
        <th>Producto</th>
        <th>Estado</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      {selectedCustomerSales.map((sale) => (
        <tr key={sale.id}>
          <td>{sale.occurredAtLabel}</td>
          <td>{sale.productName}</td>
          <td>{sale.paymentStatus === "paid" ? "Pagada" : "Pendiente"}</td>
          <td>{formatCurrency(sale.totalMinor)}</td>
        </tr>
      ))}
    </tbody>
  </table>
) : (
  <div className="empty-state section-empty">
    <strong>Sin ventas del cliente</strong>
    <span>Las ventas apareceran cuando se registren movimientos.</span>
  </div>
)}

{selectedCustomerReceivables.length > 0 ? (
  <table className="data-table" aria-label="Cartera pendiente del cliente">
    <thead>
      <tr>
        <th>Venta</th>
        <th>Vencimiento</th>
        <th>Saldo</th>
      </tr>
    </thead>
    <tbody>
      {selectedCustomerReceivables.map((receivable) => (
        <tr key={receivable.id}>
          <td>{receivable.saleId}</td>
          <td>{receivable.dueAt || "Sin vencimiento"}</td>
          <td>{formatCurrency(receivable.amountMinor)}</td>
        </tr>
      ))}
    </tbody>
  </table>
) : null}
```

- [ ] **Step 5: Add customer file styles**

Add:

```css
.customer-file {
  display: grid;
  gap: 16px;
  border: 1px solid #d8dee5;
  border-radius: 8px;
  background: #ffffff;
  padding: 16px;
}

.customer-file header {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: start;
}

.customer-file h2 {
  margin: 0;
  color: #0f172a;
  font-size: 22px;
}

.customer-file p {
  margin: 4px 0 0;
  color: #64748b;
}

.customer-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.status-pill {
  display: inline-flex;
  width: fit-content;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 800;
}

.status-pill.active {
  background: #dcfce7;
  color: #166534;
}

.status-pill.inactive {
  background: #fee2e2;
  color: #991b1b;
}
```

- [ ] **Step 6: Run test to verify it passes**

Run:

```bash
CI=true pnpm --config.confirmModulesPurge=false --filter @moneta/desktop test -- --run -t "customer file metrics"
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/desktop/src/App.tsx apps/desktop/src/App.css apps/desktop/src/App.test.tsx
git commit -m "feat: show customer file history"
```

## Task 6: Final Verification

**Files:**
- Modify only if verification finds defects in files already touched.

- [ ] **Step 1: Run full desktop tests**

Run:

```bash
CI=true pnpm --config.confirmModulesPurge=false --filter @moneta/desktop test -- --run
```

Expected: PASS.

- [ ] **Step 2: Run repository typecheck if available**

Run:

```bash
CI=true pnpm --config.confirmModulesPurge=false typecheck
```

Expected: PASS, or report the exact missing script/error if the repo does not expose a root `typecheck` script.

- [ ] **Step 3: Inspect git status**

Run:

```bash
git status --short
```

Expected: clean working tree after the task commits, or only intentional uncommitted changes if the user asked to keep them unstaged.

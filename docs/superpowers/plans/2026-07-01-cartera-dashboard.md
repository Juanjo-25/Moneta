# Cartera Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved `Cartera` dashboard with `Por cobrar` and `Por pagar` views, due-date alerts, 15/30/60/90 day buckets, and pending-sale due dates.

**Architecture:** Keep this slice local to the current desktop React session, matching the existing app. Add due-date fields to receivables and sales flow, centralize due-date classification helpers in `App.tsx`, then replace the current customer-only `ReceivablesSection` with a dashboard that reads both `receivables` and `supplierPayables`.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, app-level CSS.

---

## File Structure

- Modify `apps/desktop/src/App.tsx`
  - Add `dueAt` to receivables and pending-sale registration.
  - Add date parsing, alert, bucket, and sorting helpers.
  - Add `CarteraDashboardSection` with `Por cobrar` and `Por pagar` views.
  - Move supplier payable payment UI into the cartera dashboard while keeping `Proveedores` behavior working.
- Modify `apps/desktop/src/App.test.tsx`
  - Add tests for pending-sale due date validation, receivable due date display, dashboard views, alerts, sorting, totals, and supplier abonos from cartera.
- Modify `apps/desktop/src/App.css`
  - Add compact styles for dashboard summary, tabs, alert list, and status badges.
- Use existing `docs/superpowers/specs/2026-07-01-cartera-dashboard-design.md` as the source of truth.

---

### Task 1: Add pending-sale due date data and validation

**Files:**
- Modify: `apps/desktop/src/App.tsx`
- Test: `apps/desktop/src/App.test.tsx`

- [ ] **Step 1: Write failing tests for pending-sale due date**

Add these tests near the existing pending-sale tests in `apps/desktop/src/App.test.tsx`:

```tsx
  it("requires a due date for pending sales", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre o razon social"), "Carlos Ruiz");
    await user.type(screen.getByLabelText("NIT o C.C."), "987654321");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );
    await user.type(screen.getByLabelText("Cantidad"), "1");
    await user.click(screen.getByLabelText("Pendiente"));
    await user.click(screen.getByRole("button", { name: "Registrar venta" }));

    expect(
      screen.getByText("La fecha de vencimiento es obligatoria para ventas pendientes.")
    ).toBeTruthy();
    expect(screen.queryByRole("table", { name: "Ventas registradas" })).toBeNull();
  });

  it("stores the due date for a pending sale receivable", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre o razon social"), "Carlos Ruiz");
    await user.type(screen.getByLabelText("NIT o C.C."), "987654321");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );
    await user.type(screen.getByLabelText("Cantidad"), "2");
    await user.click(screen.getByLabelText("Pendiente"));
    await user.type(screen.getByLabelText("Fecha vencimiento venta"), "2026-07-15");
    await user.click(screen.getByRole("button", { name: "Registrar venta" }));
    await user.click(screen.getByRole("button", { name: "Cartera" }));

    const receivablesTable = screen.getByRole("table", { name: "Cartera por cobrar" });
    expect(within(receivablesTable).getByText("Carlos Ruiz")).toBeTruthy();
    expect(within(receivablesTable).getByText("2026-07-15")).toBeTruthy();
    expect(within(receivablesTable).getByText(/\$\s*9\.000/)).toBeTruthy();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
CI=true pnpm --config.confirmModulesPurge=false --filter @moneta/desktop test -- App.test.tsx
```

Expected: FAIL because `Fecha vencimiento venta` does not exist and receivables do not store `dueAt`.

- [ ] **Step 3: Add due date to sale and receivable types**

In `apps/desktop/src/App.tsx`, update these types:

```ts
type ReceivableRecord = {
  id: string;
  customerId: string;
  customerName: string;
  saleId: string;
  amountMinor: number;
  dueAt: string;
  status: "pending";
};

type SalesFormState = {
  customerId: string;
  productId: string;
  quantity: string;
  paymentStatus: "paid" | "pending";
  dueAt: string;
};

type SalesFormErrors = {
  customerId?: string | undefined;
  dueAt?: string | undefined;
  productId?: string | undefined;
  quantity?: string | undefined;
  submit?: string | undefined;
};
```

Update `emptySalesForm`:

```ts
const emptySalesForm: SalesFormState = {
  customerId: "",
  dueAt: "",
  productId: "",
  quantity: "",
  paymentStatus: "paid"
};
```

- [ ] **Step 4: Pass due date through pending sale registration**

Update `registerSaleInSession` input type and receivable creation:

```ts
  function registerSaleInSession(input: {
    customer: CustomerRecord;
    dueAt?: string | undefined;
    lines: Array<{
      product: ProductRecord;
      quantity: number;
    }>;
    paymentStatus: "paid" | "pending";
  }): string | null {
```

Inside the receivable creation block:

```ts
    if (input.paymentStatus === "pending") {
      setReceivables((currentReceivables) => [
        {
          amountMinor: totalMinor,
          customerId: input.customer.id,
          customerName: input.customer.name,
          dueAt: input.dueAt ?? "",
          id: `receivable-${saleId}`,
          saleId,
          status: "pending"
        },
        ...currentReceivables
      ]);
    }
```

Update `registerPendingSaleInSession` signature:

```ts
  function registerPendingSaleInSession(input: {
    customer: CustomerRecord;
    dueAt: string;
    lines: Array<{
      product: ProductRecord;
      quantity: number;
    }>;
  }): string | null {
    return registerSaleInSession({
      customer: input.customer,
      dueAt: input.dueAt,
      lines: input.lines,
      paymentStatus: "pending"
    });
  }
```

Update `SalesSectionProps.onRegisterPendingSale`:

```ts
  onRegisterPendingSale: (input: {
    customer: CustomerRecord;
    dueAt: string;
    lines: Array<{
      product: ProductRecord;
      quantity: number;
    }>;
  }) => string | null;
```

- [ ] **Step 5: Add due date field and validation in `SalesSection`**

In `submitSale`, after validating selected customer and draft lines, add:

```ts
    if (form.paymentStatus === "pending" && form.dueAt.trim() === "") {
      nextErrors.dueAt =
        "La fecha de vencimiento es obligatoria para ventas pendientes.";
    }
```

When calling pending sale registration, pass `dueAt`:

```ts
      error = onRegisterPendingSale({
        customer: selectedCustomer,
        dueAt: form.dueAt.trim(),
        lines: linesToRegister.map((line) => ({
          product: line.product,
          quantity: line.quantity
        }))
      });
```

Add this field near the sale payment status controls:

```tsx
        {form.paymentStatus === "pending" ? (
          <TextField
            error={errors.dueAt}
            label="Fecha vencimiento venta"
            onChange={(value) => updateField("dueAt", value)}
            type="date"
            value={form.dueAt}
          />
        ) : null}
```

- [ ] **Step 6: Run tests to verify the task passes**

Run:

```bash
CI=true pnpm --config.confirmModulesPurge=false --filter @moneta/desktop test -- App.test.tsx
```

Expected: PASS for the two new due-date tests and no regression in existing desktop tests.

- [ ] **Step 7: Commit**

```bash
git add apps/desktop/src/App.tsx apps/desktop/src/App.test.tsx
git commit -m "feat: require due dates for pending sales"
```

---

### Task 2: Add due-date helpers for alerts, buckets, and sorting

**Files:**
- Modify: `apps/desktop/src/App.tsx`
- Test: `apps/desktop/src/App.test.tsx`

- [ ] **Step 1: Write failing tests for alert labels and sorting**

Add this test near the cartera tests in `apps/desktop/src/App.test.tsx`:

```tsx
  it("sorts cartera rows by due date and labels overdue and upcoming invoices", async () => {
    vi.setSystemTime(new Date("2026-07-01T12:00:00-05:00"));
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre o razon social"), "Cliente Tarde");
    await user.type(screen.getByLabelText("NIT o C.C."), "123");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.selectOptions(screen.getByLabelText("Producto"), screen.getByRole("option", { name: "Arroz libra" }));
    await user.type(screen.getByLabelText("Cantidad"), "1");
    await user.click(screen.getByLabelText("Pendiente"));
    await user.type(screen.getByLabelText("Fecha vencimiento venta"), "2026-07-20");
    await user.click(screen.getByRole("button", { name: "Registrar venta" }));

    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre o razon social"), "Cliente Vencido");
    await user.type(screen.getByLabelText("NIT o C.C."), "456");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.selectOptions(screen.getByLabelText("Producto"), screen.getByRole("option", { name: "Arroz libra" }));
    await user.type(screen.getByLabelText("Cantidad"), "1");
    await user.click(screen.getByLabelText("Pendiente"));
    await user.type(screen.getByLabelText("Fecha vencimiento venta"), "2026-06-25");
    await user.click(screen.getByRole("button", { name: "Registrar venta" }));

    await user.click(screen.getByRole("button", { name: "Cartera" }));

    const rows = within(screen.getByRole("table", { name: "Cartera por cobrar" })).getAllByRole("row");
    expect(rows[1]).toHaveTextContent("Cliente Vencido");
    expect(rows[1]).toHaveTextContent("Vencida");
    expect(rows[2]).toHaveTextContent("Cliente Tarde");
    expect(rows[2]).toHaveTextContent("30 dias");
  });
```

Ensure the test file has fake timers enabled if not already present:

```tsx
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-01T12:00:00-05:00"));
});

afterEach(() => {
  vi.useRealTimers();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
CI=true pnpm --config.confirmModulesPurge=false --filter @moneta/desktop test -- App.test.tsx
```

Expected: FAIL because range and alert labels do not exist yet.

- [ ] **Step 3: Add helper types and functions**

In `apps/desktop/src/App.tsx`, add these helpers near `formatOccurredAtLabel`:

```ts
type DueAlert = "overdue" | "upcoming" | "current" | "none";

type DueMetadata = {
  alert: DueAlert;
  alertLabel: string;
  bucketLabel: string;
  daysUntilDue: number | null;
};

function parseLocalDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getDaysUntilDue(dueAt: string, today = new Date()): number | null {
  const dueDate = parseLocalDate(dueAt);

  if (!dueDate) {
    return null;
  }

  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.round(
    (startOfLocalDay(dueDate).getTime() - startOfLocalDay(today).getTime()) /
      millisecondsPerDay
  );
}

function getDueMetadata(dueAt: string, today = new Date()): DueMetadata {
  const daysUntilDue = getDaysUntilDue(dueAt, today);

  if (daysUntilDue === null) {
    return {
      alert: "none",
      alertLabel: "Sin vencimiento",
      bucketLabel: "Sin vencimiento",
      daysUntilDue
    };
  }

  if (daysUntilDue < 0) {
    return {
      alert: "overdue",
      alertLabel: "Vencida",
      bucketLabel: "Vencida",
      daysUntilDue
    };
  }

  const bucketLabel =
    daysUntilDue <= 15
      ? "15 dias"
      : daysUntilDue <= 30
        ? "30 dias"
        : daysUntilDue <= 60
          ? "60 dias"
          : daysUntilDue <= 90
            ? "90 dias"
            : "Mas de 90 dias";

  return {
    alert: daysUntilDue <= 15 ? "upcoming" : "current",
    alertLabel: daysUntilDue <= 15 ? "Proxima" : "Al dia",
    bucketLabel,
    daysUntilDue
  };
}

function compareDueDates(leftDueAt: string, rightDueAt: string): number {
  const left = parseLocalDate(leftDueAt)?.getTime() ?? Number.POSITIVE_INFINITY;
  const right = parseLocalDate(rightDueAt)?.getTime() ?? Number.POSITIVE_INFINITY;

  return left - right;
}
```

- [ ] **Step 4: Use helpers in the current receivables table**

Temporarily update `ReceivablesSection` so it sorts and shows range/alert. This keeps Task 2 focused before the full dashboard replacement:

```tsx
function ReceivablesSection({ receivables }: ReceivablesSectionProps) {
  const sortedReceivables = [...receivables].sort((left, right) =>
    compareDueDates(left.dueAt, right.dueAt)
  );

  if (sortedReceivables.length === 0) {
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
      <table className="data-table" aria-label="Cartera por cobrar">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Venta</th>
            <th>Vence</th>
            <th>Saldo</th>
            <th>Rango</th>
            <th>Alerta</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {sortedReceivables.map((receivable) => {
            const dueMetadata = getDueMetadata(receivable.dueAt);

            return (
              <tr key={receivable.id}>
                <td>{receivable.customerName}</td>
                <td>{receivable.saleId}</td>
                <td>{receivable.dueAt || "Sin vencimiento"}</td>
                <td>{formatCurrency(receivable.amountMinor)}</td>
                <td>{dueMetadata.bucketLabel}</td>
                <td>{dueMetadata.alertLabel}</td>
                <td>Pendiente</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
```

- [ ] **Step 5: Run tests to verify helper behavior passes**

Run:

```bash
CI=true pnpm --config.confirmModulesPurge=false --filter @moneta/desktop test -- App.test.tsx
```

Expected: PASS for due-date sorting and labels.

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/src/App.tsx apps/desktop/src/App.test.tsx
git commit -m "feat: classify cartera due dates"
```

---

### Task 3: Replace `Cartera` with the two-view dashboard

**Files:**
- Modify: `apps/desktop/src/App.tsx`
- Test: `apps/desktop/src/App.test.tsx`

- [ ] **Step 1: Write failing dashboard tests**

Add this test in `apps/desktop/src/App.test.tsx`:

```tsx
  it("shows cartera summary totals and switches between por cobrar and por pagar", async () => {
    vi.setSystemTime(new Date("2026-07-01T12:00:00-05:00"));
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
    await user.type(screen.getByLabelText("Fecha vencimiento venta"), "2026-07-10");
    await user.click(screen.getByRole("button", { name: "Registrar venta" }));

    await createPendingPurchaseFixture(user);

    await user.click(screen.getByRole("button", { name: "Cartera" }));

    expect(screen.getByText("Total por cobrar")).toBeTruthy();
    expect(screen.getByText("Total por pagar")).toBeTruthy();
    expect(screen.getByText("Facturas vencidas")).toBeTruthy();
    expect(screen.getByText("Proximas a vencer")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Por cobrar" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Por pagar" })).toBeTruthy();
    expect(screen.getByRole("table", { name: "Cartera por cobrar" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Por pagar" }));

    const payablesTable = screen.getByRole("table", { name: "Cartera por pagar" });
    expect(within(payablesTable).getByText("Proveedor Central")).toBeTruthy();
    expect(within(payablesTable).getByText("FC-2001")).toBeTruthy();
    expect(within(payablesTable).getByText(/\$\s*15\.000/)).toBeTruthy();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
CI=true pnpm --config.confirmModulesPurge=false --filter @moneta/desktop test -- App.test.tsx
```

Expected: FAIL because the dashboard summary and `Por pagar` tab do not exist.

- [ ] **Step 3: Route `Cartera` to a dashboard component**

Update `SectionContentProps` to include supplier payment behavior:

```ts
type SectionContentProps = {
  customers: CustomerRecord[];
  onCreateCustomer: (input: CustomerFormState) => CustomerRecord;
  onCreateProduct: (product: ProductRecord) => void;
  onCreateSupplier: (input: SupplierFormState) => SupplierRecord;
  onRegisterPurchase: (input: {
    supplier: SupplierRecord;
    invoiceNumber: string;
    issuedAt: string;
    dueAt: string;
    lines: Array<{
      product: ProductRecord;
      quantity: number;
      unitCostMinor: number;
    }>;
    paymentStatus: PurchasePaymentStatus;
  }) => void;
  onRegisterPaidSale: SalesSectionProps["onRegisterPaidSale"];
  onRegisterPendingSale: SalesSectionProps["onRegisterPendingSale"];
  onRegisterSupplierPayment: (input: {
    payableId: string;
    amountMinor: number;
  }) => void;
  onCloseProductForm: () => void;
  productFormVisible: boolean;
  products: ProductRecord[];
  purchases: PurchaseRecord[];
  receivables: ReceivableRecord[];
  sales: SaleRecord[];
  section: SectionConfig;
  supplierPayables: SupplierPayableRecord[];
  suppliers: SupplierRecord[];
};
```

Replace the `receivables` branch in `SectionContent`:

```tsx
  if (section.id === "receivables") {
    return (
      <CarteraDashboardSection
        onRegisterSupplierPayment={onRegisterSupplierPayment}
        receivables={receivables}
        supplierPayables={supplierPayables}
      />
    );
  }
```

- [ ] **Step 4: Add normalized row helpers**

Add these types before the dashboard component:

```ts
type CarteraView = "receivables" | "payables";

type CarteraAlertItem = {
  id: string;
  partyName: string;
  reference: string;
  dueAt: string;
  balanceMinor: number;
  directionLabel: string;
  metadata: DueMetadata;
};

function getOpenPayables(payables: SupplierPayableRecord[]): SupplierPayableRecord[] {
  return payables.filter((payable) => payable.balanceMinor > 0);
}
```

- [ ] **Step 5: Implement `CarteraDashboardSection`**

Add this component near the current `ReceivablesSection`:

```tsx
type CarteraDashboardSectionProps = {
  onRegisterSupplierPayment: (input: {
    payableId: string;
    amountMinor: number;
  }) => void;
  receivables: ReceivableRecord[];
  supplierPayables: SupplierPayableRecord[];
};

function CarteraDashboardSection({
  onRegisterSupplierPayment,
  receivables,
  supplierPayables
}: CarteraDashboardSectionProps) {
  const [activeView, setActiveView] = useState<CarteraView>("receivables");
  const openPayables = getOpenPayables(supplierPayables);
  const sortedReceivables = [...receivables].sort((left, right) =>
    compareDueDates(left.dueAt, right.dueAt)
  );
  const sortedPayables = [...openPayables].sort((left, right) =>
    compareDueDates(left.dueAt, right.dueAt)
  );
  const receivablesTotal = receivables.reduce(
    (total, receivable) => total + receivable.amountMinor,
    0
  );
  const payablesTotal = openPayables.reduce(
    (total, payable) => total + payable.balanceMinor,
    0
  );
  const alertItems: CarteraAlertItem[] = [
    ...receivables.map((receivable) => ({
      balanceMinor: receivable.amountMinor,
      directionLabel: "Por cobrar",
      dueAt: receivable.dueAt,
      id: receivable.id,
      metadata: getDueMetadata(receivable.dueAt),
      partyName: receivable.customerName,
      reference: receivable.saleId
    })),
    ...openPayables.map((payable) => ({
      balanceMinor: payable.balanceMinor,
      directionLabel: "Por pagar",
      dueAt: payable.dueAt,
      id: payable.id,
      metadata: getDueMetadata(payable.dueAt),
      partyName: payable.supplierName,
      reference: payable.invoiceNumber
    }))
  ]
    .filter(
      (item) =>
        item.metadata.alert === "overdue" || item.metadata.alert === "upcoming"
    )
    .sort((left, right) => compareDueDates(left.dueAt, right.dueAt));
  const overdueCount = alertItems.filter(
    (item) => item.metadata.alert === "overdue"
  ).length;
  const upcomingCount = alertItems.filter(
    (item) => item.metadata.alert === "upcoming"
  ).length;

  return (
    <section className="section-panel cartera-dashboard">
      <div className="cartera-summary" aria-label="Resumen de cartera">
        <div className="summary-card">
          <span>Total por cobrar</span>
          <strong>{formatCurrency(receivablesTotal)}</strong>
        </div>
        <div className="summary-card">
          <span>Total por pagar</span>
          <strong>{formatCurrency(payablesTotal)}</strong>
        </div>
        <div className="summary-card">
          <span>Facturas vencidas</span>
          <strong>{overdueCount}</strong>
        </div>
        <div className="summary-card">
          <span>Proximas a vencer</span>
          <strong>{upcomingCount}</strong>
        </div>
      </div>

      <CarteraAlerts items={alertItems} />

      <div className="view-switch" role="tablist" aria-label="Vistas de cartera">
        <button
          aria-selected={activeView === "receivables"}
          className={activeView === "receivables" ? "active" : ""}
          onClick={() => setActiveView("receivables")}
          role="tab"
          type="button"
        >
          Por cobrar
        </button>
        <button
          aria-selected={activeView === "payables"}
          className={activeView === "payables" ? "active" : ""}
          onClick={() => setActiveView("payables")}
          role="tab"
          type="button"
        >
          Por pagar
        </button>
      </div>

      {activeView === "receivables" ? (
        <ReceivablesTable receivables={sortedReceivables} />
      ) : (
        <PayablesTable
          onRegisterSupplierPayment={onRegisterSupplierPayment}
          supplierPayables={sortedPayables}
        />
      )}
    </section>
  );
}
```

- [ ] **Step 6: Add alert, receivable, and payable table components**

Add these components:

```tsx
function CarteraAlerts({ items }: { items: CarteraAlertItem[] }) {
  if (items.length === 0) {
    return (
      <div className="cartera-alerts" aria-label="Alertas de cartera">
        <strong>Sin alertas de cartera</strong>
        <span>No hay facturas vencidas ni proximas a vencer.</span>
      </div>
    );
  }

  return (
    <div className="cartera-alerts" aria-label="Alertas de cartera">
      <strong>Alertas automaticas</strong>
      <ul>
        {items.map((item) => (
          <li key={`${item.directionLabel}-${item.id}`}>
            <span>{item.metadata.alertLabel}</span>
            <strong>{item.partyName}</strong>
            <span>{item.directionLabel}</span>
            <span>{item.reference}</span>
            <span>{item.dueAt || "Sin vencimiento"}</span>
            <span>{formatCurrency(item.balanceMinor)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReceivablesTable({ receivables }: { receivables: ReceivableRecord[] }) {
  if (receivables.length === 0) {
    return (
      <div className="empty-state section-empty">
        <strong>Sin cartera por cobrar</strong>
        <span>Las ventas pendientes de pago apareceran aqui.</span>
      </div>
    );
  }

  return (
    <table className="data-table" aria-label="Cartera por cobrar">
      <thead>
        <tr>
          <th>Cliente</th>
          <th>Venta</th>
          <th>Vence</th>
          <th>Saldo</th>
          <th>Rango</th>
          <th>Alerta</th>
          <th>Estado</th>
        </tr>
      </thead>
      <tbody>
        {receivables.map((receivable) => {
          const dueMetadata = getDueMetadata(receivable.dueAt);

          return (
            <tr key={receivable.id}>
              <td>{receivable.customerName}</td>
              <td>{receivable.saleId}</td>
              <td>{receivable.dueAt || "Sin vencimiento"}</td>
              <td>{formatCurrency(receivable.amountMinor)}</td>
              <td>{dueMetadata.bucketLabel}</td>
              <td>{dueMetadata.alertLabel}</td>
              <td>Pendiente</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function PayablesTable({
  onRegisterSupplierPayment,
  supplierPayables
}: {
  onRegisterSupplierPayment: (input: {
    payableId: string;
    amountMinor: number;
  }) => void;
  supplierPayables: SupplierPayableRecord[];
}) {
  const [form, setForm] = useState<SupplierPaymentFormState>({
    amount: "",
    payableId: ""
  });
  const [errors, setErrors] = useState<SupplierPaymentFormErrors>({});
  const selectedPayable =
    supplierPayables.find((payable) => payable.id === form.payableId) ?? null;

  function openPaymentForm(payableId: string) {
    setForm({ amount: "", payableId });
    setErrors({});
  }

  function updateAmount(value: string) {
    setForm((currentForm) => ({
      ...currentForm,
      amount: formatIntegerInput(value)
    }));
    setErrors({});
  }

  function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const amount = parseNonNegativeInteger(form.amount);

    if (amount === null || amount <= 0) {
      setErrors({ amount: "El abono debe ser mayor a cero." });
      return;
    }
    if (selectedPayable && amount > selectedPayable.balanceMinor) {
      setErrors({ amount: "El abono no puede superar el saldo pendiente." });
      return;
    }
    if (!selectedPayable) {
      return;
    }

    onRegisterSupplierPayment({
      amountMinor: amount,
      payableId: selectedPayable.id
    });
    setForm({ amount: "", payableId: "" });
    setErrors({});
  }

  if (supplierPayables.length === 0) {
    return (
      <div className="empty-state section-empty">
        <strong>Sin cartera por pagar</strong>
        <span>Las facturas pendientes de proveedor apareceran aqui.</span>
      </div>
    );
  }

  return (
    <>
      <table className="data-table" aria-label="Cartera por pagar">
        <thead>
          <tr>
            <th>Proveedor</th>
            <th>Factura</th>
            <th>Vence</th>
            <th>Original</th>
            <th>Abonado</th>
            <th>Saldo</th>
            <th>Rango</th>
            <th>Alerta</th>
            <th>Estado</th>
            <th>Accion</th>
          </tr>
        </thead>
        <tbody>
          {supplierPayables.map((payable) => {
            const dueMetadata = getDueMetadata(payable.dueAt);

            return (
              <tr key={payable.id}>
                <td>{payable.supplierName}</td>
                <td>{payable.invoiceNumber}</td>
                <td>{payable.dueAt || "Sin vencimiento"}</td>
                <td>{formatCurrency(payable.originalAmountMinor)}</td>
                <td>{formatCurrency(payable.paidAmountMinor)}</td>
                <td>{formatCurrency(payable.balanceMinor)}</td>
                <td>{dueMetadata.bucketLabel}</td>
                <td>{dueMetadata.alertLabel}</td>
                <td>{formatPayableStatus(payable.status)}</td>
                <td>
                  <button
                    className="table-action"
                    onClick={() => openPaymentForm(payable.id)}
                    type="button"
                  >
                    Registrar abono
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {selectedPayable ? (
        <form className="supplier-payment-form" onSubmit={submitPayment}>
          <div className="summary-card">
            <span>{selectedPayable.supplierName}</span>
            <strong>Saldo {formatCurrency(selectedPayable.balanceMinor)}</strong>
          </div>
          <TextField
            error={errors.amount}
            inputMode="numeric"
            label="Valor abono"
            onChange={updateAmount}
            value={form.amount}
          />
          <div className="form-actions">
            <button type="submit">Guardar abono</button>
          </div>
        </form>
      ) : null}
    </>
  );
}
```

- [ ] **Step 7: Keep `SuppliersSection` working**

Refactor `SuppliersSection` to reuse `PayablesTable`:

```tsx
function SuppliersSection({
  onRegisterSupplierPayment,
  supplierPayables
}: SuppliersSectionProps) {
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
      <PayablesTable
        onRegisterSupplierPayment={onRegisterSupplierPayment}
        supplierPayables={supplierPayables}
      />
    </section>
  );
}
```

If existing tests require `aria-label="Cuentas por pagar"`, keep a small compatibility table wrapper or update tests to query `Cartera por pagar` only where they intentionally use the new dashboard. Do not break existing supplier payment behavior.

- [ ] **Step 8: Run tests to verify dashboard behavior passes**

Run:

```bash
CI=true pnpm --config.confirmModulesPurge=false --filter @moneta/desktop test -- App.test.tsx
```

Expected: PASS for dashboard tests and existing supplier payable tests.

- [ ] **Step 9: Commit**

```bash
git add apps/desktop/src/App.tsx apps/desktop/src/App.test.tsx
git commit -m "feat: add cartera dashboard views"
```

---

### Task 4: Add supplier payment from `Cartera > Por pagar`

**Files:**
- Modify: `apps/desktop/src/App.tsx`
- Test: `apps/desktop/src/App.test.tsx`

- [ ] **Step 1: Write failing payment test from cartera**

Add this test:

```tsx
  it("registers supplier payable payments from cartera por pagar", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createPendingPurchaseFixture(user);
    await user.click(screen.getByRole("button", { name: "Cartera" }));
    await user.click(screen.getByRole("button", { name: "Por pagar" }));
    await user.click(screen.getByRole("button", { name: "Registrar abono" }));
    await user.type(screen.getByLabelText("Valor abono"), "5000");
    await user.click(screen.getByRole("button", { name: "Guardar abono" }));

    const payablesTable = screen.getByRole("table", { name: "Cartera por pagar" });
    expect(within(payablesTable).getByText("Abonada")).toBeTruthy();
    expect(within(payablesTable).getByText(/\$\s*5\.000/)).toBeTruthy();
    expect(within(payablesTable).getByText(/\$\s*10\.000/)).toBeTruthy();
  });
```

- [ ] **Step 2: Run test to verify it fails or exposes regressions**

Run:

```bash
CI=true pnpm --config.confirmModulesPurge=false --filter @moneta/desktop test -- App.test.tsx
```

Expected: FAIL only if Task 3 did not fully wire `PayablesTable` into `Cartera`.

- [ ] **Step 3: Fix payable filtering after full payment**

Ensure `CarteraDashboardSection` passes only open payables to the table:

```tsx
  const openPayables = getOpenPayables(supplierPayables);
```

Ensure `getOpenPayables` filters by balance:

```ts
function getOpenPayables(payables: SupplierPayableRecord[]): SupplierPayableRecord[] {
  return payables.filter((payable) => payable.balanceMinor > 0);
}
```

Keep `SuppliersSection` showing all supplier payables if existing tests expect paid rows there:

```tsx
      <PayablesTable
        onRegisterSupplierPayment={onRegisterSupplierPayment}
        supplierPayables={supplierPayables}
        tableLabel="Cuentas por pagar"
      />
```

If adding `tableLabel`, update `PayablesTable` props:

```ts
  tableLabel?: string;
```

and table:

```tsx
<table className="data-table" aria-label={tableLabel}>
```

with default:

```ts
tableLabel = "Cartera por pagar"
```

- [ ] **Step 4: Run test to verify payment behavior passes**

Run:

```bash
CI=true pnpm --config.confirmModulesPurge=false --filter @moneta/desktop test -- App.test.tsx
```

Expected: PASS for supplier payment from cartera and existing supplier payment tests.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/App.tsx apps/desktop/src/App.test.tsx
git commit -m "feat: register payable payments from cartera"
```

---

### Task 5: Style the dashboard controls and alerts

**Files:**
- Modify: `apps/desktop/src/App.css`
- Test: `apps/desktop/src/App.test.tsx`

- [ ] **Step 1: Add a light UI assertion for tabs**

Extend the dashboard test to assert selected tab state:

```tsx
    expect(screen.getByRole("tab", { name: "Por cobrar" })).toHaveAttribute(
      "aria-selected",
      "true"
    );

    await user.click(screen.getByRole("button", { name: "Por pagar" }));

    expect(screen.getByRole("tab", { name: "Por pagar" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
```

- [ ] **Step 2: Run test**

Run:

```bash
CI=true pnpm --config.confirmModulesPurge=false --filter @moneta/desktop test -- App.test.tsx
```

Expected: PASS if tabs already expose `aria-selected`; otherwise FAIL until Task 3 markup is corrected.

- [ ] **Step 3: Add CSS**

Append compact styles to `apps/desktop/src/App.css`:

```css
.cartera-dashboard {
  display: grid;
  gap: 18px;
}

.cartera-summary {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.cartera-alerts {
  background: #fff8e8;
  border: 1px solid #efd59a;
  border-radius: 8px;
  color: #4b3820;
  display: grid;
  gap: 10px;
  padding: 14px;
}

.cartera-alerts ul {
  display: grid;
  gap: 8px;
  list-style: none;
  margin: 0;
  padding: 0;
}

.cartera-alerts li {
  align-items: center;
  display: grid;
  gap: 10px;
  grid-template-columns: 90px 1fr 90px 1fr 110px 120px;
}

.view-switch {
  align-items: center;
  background: #eef2f7;
  border-radius: 8px;
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  width: fit-content;
}

.view-switch button {
  background: transparent;
  border: 0;
  border-radius: 6px;
  color: #334155;
  cursor: pointer;
  font-weight: 700;
  padding: 8px 12px;
}

.view-switch button.active,
.view-switch button[aria-selected="true"] {
  background: #ffffff;
  color: #111827;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.12);
}

@media (max-width: 980px) {
  .cartera-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .cartera-alerts li {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 4: Run desktop tests**

Run:

```bash
CI=true pnpm --config.confirmModulesPurge=false --filter @moneta/desktop test -- App.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/App.css apps/desktop/src/App.test.tsx
git commit -m "style: polish cartera dashboard"
```

---

### Task 6: Full verification

**Files:**
- No code changes expected.

- [ ] **Step 1: Run full test suite**

```bash
CI=true pnpm --config.confirmModulesPurge=false test
```

Expected: PASS.

- [ ] **Step 2: Run typecheck**

```bash
CI=true pnpm --config.confirmModulesPurge=false typecheck
```

Expected: PASS.

- [ ] **Step 3: Run build**

```bash
CI=true pnpm --config.confirmModulesPurge=false build
```

Expected: PASS.

- [ ] **Step 4: Inspect git status**

```bash
git status --short
```

Expected: clean working tree after all task commits.

---

## Self-Review

- Spec coverage: pending-sale due date is covered in Task 1; due labels and sorting in Task 2; unified dashboard, totals, alerts, and two views in Task 3; supplier abonos from `Por pagar` in Task 4; compact UI in Task 5; full verification in Task 6.
- Scope: no SQLite persistence, native notifications, customer abonos, or editing/deleting invoices are included.
- Type consistency: `ReceivableRecord.dueAt`, `DueMetadata`, `CarteraView`, `SupplierPayableRecord`, and `SupplierPaymentFormState` names match current app conventions and the approved spec.

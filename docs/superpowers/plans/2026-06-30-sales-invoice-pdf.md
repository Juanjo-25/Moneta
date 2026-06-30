# Sales Invoice PDF Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a visual Colombian-style PDF invoice action to each registered sale.

**Architecture:** Keep PDF layout isolated in `apps/desktop/src/invoice-pdf.ts`, with `App.tsx` only responsible for collecting customer and sale data and invoking the generator. Extend local customer and sale records so each sale stores a customer snapshot for stable invoice generation.

**Tech Stack:** React 19, Vite, Vitest, Testing Library, TypeScript, `jspdf` in `@moneta/desktop`.

---

## File Structure

- Modify `apps/desktop/package.json`: add `jspdf` as a desktop dependency.
- Modify `pnpm-lock.yaml`: lock the added dependency.
- Create `apps/desktop/src/invoice-pdf.ts`: own invoice PDF input types, formatting helpers, PDF drawing, and download call.
- Create `apps/desktop/src/invoice-pdf.test.ts`: unit tests for filename, payment labels, optional field fallback, and generated PDF calls.
- Modify `apps/desktop/src/App.tsx`: extend customer/sale records, inline customer form, sale snapshots, and invoice action.
- Modify `apps/desktop/src/App.test.tsx`: cover customer details, validation, invoice action, and generator invocation.
- Modify `apps/desktop/src/App.css`: add styles for the wider customer form and table action button.

## Task 1: Add PDF Dependency

**Files:**
- Modify: `apps/desktop/package.json`
- Modify: `pnpm-lock.yaml`

- [ ] **Step 1: Install the PDF dependency**

Run:

```bash
pnpm --filter @moneta/desktop add jspdf
```

Expected: `apps/desktop/package.json` includes `jspdf` under `dependencies`, and `pnpm-lock.yaml` is updated.

- [ ] **Step 2: Confirm dependency is local to desktop app**

Run:

```bash
pnpm --filter @moneta/desktop list jspdf
```

Expected: output includes `@moneta/desktop` and `jspdf`.

- [ ] **Step 3: Commit dependency update**

Run:

```bash
git add apps/desktop/package.json pnpm-lock.yaml
git commit -m "build: add desktop pdf dependency"
```

Expected: commit succeeds.

## Task 2: Build Invoice PDF Module with Tests

**Files:**
- Create: `apps/desktop/src/invoice-pdf.ts`
- Create: `apps/desktop/src/invoice-pdf.test.ts`

- [ ] **Step 1: Write failing tests for invoice generator behavior**

Create `apps/desktop/src/invoice-pdf.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildInvoiceFileName,
  buildInvoicePaymentLabel,
  generateInvoicePdf,
  type InvoicePdfInput
} from "./invoice-pdf";

const saveMock = vi.fn();
const textMock = vi.fn();
const setFontMock = vi.fn();
const setFontSizeMock = vi.fn();
const setFillColorMock = vi.fn();
const setDrawColorMock = vi.fn();
const setTextColorMock = vi.fn();
const rectMock = vi.fn();
const lineMock = vi.fn();

vi.mock("jspdf", () => ({
  jsPDF: vi.fn().mockImplementation(() => ({
    line: lineMock,
    rect: rectMock,
    save: saveMock,
    setDrawColor: setDrawColorMock,
    setFillColor: setFillColorMock,
    setFont: setFontMock,
    setFontSize: setFontSizeMock,
    setTextColor: setTextColorMock,
    text: textMock
  }))
}));

const invoiceInput: InvoicePdfInput = {
  customer: {
    address: "Calle 10 # 20-30",
    city: "Medellin",
    document: "123456789",
    email: "ana@example.com",
    name: "Ana Perez"
  },
  invoiceNumber: "FE-sale-1",
  issueDate: "30/06/2026, 8:30 a. m.",
  item: {
    description: "Arroz libra",
    quantity: 2,
    totalMinor: 9000,
    unitPriceMinor: 4500
  },
  paymentStatus: "paid"
};

describe("invoice PDF", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds a stable invoice PDF filename", () => {
    expect(buildInvoiceFileName("FE-sale-1")).toBe("factura-FE-sale-1.pdf");
  });

  it("maps sale payment status to Spanish invoice labels", () => {
    expect(buildInvoicePaymentLabel("paid")).toBe("Contado");
    expect(buildInvoicePaymentLabel("pending")).toBe("Credito");
  });

  it("renders customer, item, payment, and totals into the generated PDF", () => {
    generateInvoicePdf(invoiceInput);

    const renderedText = textMock.mock.calls
      .map((call) => String(call[0]))
      .join(" ");

    expect(renderedText).toContain("FACTURA DE VENTA");
    expect(renderedText).toContain("FE-sale-1");
    expect(renderedText).toContain("Ana Perez");
    expect(renderedText).toContain("123456789");
    expect(renderedText).toContain("Calle 10 # 20-30");
    expect(renderedText).toContain("Medellin");
    expect(renderedText).toContain("ana@example.com");
    expect(renderedText).toContain("Arroz libra");
    expect(renderedText).toContain("Contado");
    expect(renderedText).toContain("$ 9.000");
    expect(saveMock).toHaveBeenCalledWith("factura-FE-sale-1.pdf");
  });

  it("prints No registrado for empty optional customer fields", () => {
    generateInvoicePdf({
      ...invoiceInput,
      customer: {
        address: "",
        city: "",
        document: "123456789",
        email: "",
        name: "Ana Perez"
      }
    });

    const renderedText = textMock.mock.calls
      .map((call) => String(call[0]))
      .join(" ");

    expect(renderedText).toContain("Direccion: No registrado");
    expect(renderedText).toContain("Ciudad: No registrado");
    expect(renderedText).toContain("Email: No registrado");
  });
});
```

- [ ] **Step 2: Run the invoice PDF tests to verify RED**

Run:

```bash
pnpm --filter @moneta/desktop test -- invoice-pdf.test.ts
```

Expected: FAIL because `apps/desktop/src/invoice-pdf.ts` does not exist.

- [ ] **Step 3: Implement the minimal invoice PDF module**

Create `apps/desktop/src/invoice-pdf.ts`:

```ts
import { jsPDF } from "jspdf";

export type InvoicePaymentStatus = "paid" | "pending";

export type InvoiceCustomer = {
  name: string;
  document: string;
  address: string;
  city: string;
  email: string;
};

export type InvoicePdfInput = {
  customer: InvoiceCustomer;
  invoiceNumber: string;
  issueDate: string;
  item: {
    description: string;
    quantity: number;
    unitPriceMinor: number;
    totalMinor: number;
  };
  paymentStatus: InvoicePaymentStatus;
};

function formatCurrency(minor: number): string {
  return new Intl.NumberFormat("es-CO", {
    currency: "COP",
    maximumFractionDigits: 0,
    style: "currency"
  }).format(minor);
}

function fieldValue(value: string): string {
  return value.trim() === "" ? "No registrado" : value.trim();
}

export function buildInvoiceFileName(invoiceNumber: string): string {
  return `factura-${invoiceNumber}.pdf`;
}

export function buildInvoicePaymentLabel(status: InvoicePaymentStatus): string {
  return status === "paid" ? "Contado" : "Credito";
}

function writeText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  options?: { align?: "left" | "center" | "right"; maxWidth?: number }
) {
  doc.text(text, x, y, options);
}

export function generateInvoicePdf(input: InvoicePdfInput): void {
  const doc = new jsPDF({ format: "letter", unit: "mm" });
  const paymentLabel = buildInvoicePaymentLabel(input.paymentStatus);
  const subtotal = formatCurrency(input.item.totalMinor);
  const total = formatCurrency(input.item.totalMinor);
  const unitPrice = formatCurrency(input.item.unitPriceMinor);

  doc.setFillColor(15, 118, 110);
  doc.rect(0, 0, 216, 20, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  writeText(doc, "NOMBRE DE LA EMPRESA S.A.S.", 14, 12);
  doc.setFontSize(9);
  writeText(doc, "NIT: 900.123.456-7 | Calle 00 # 00-00 | contacto@empresa.com", 14, 17);

  doc.setTextColor(17, 24, 39);
  doc.setFontSize(18);
  writeText(doc, "FACTURA DE VENTA", 142, 33);
  doc.setFontSize(11);
  writeText(doc, `No. ${input.invoiceNumber}`, 142, 40);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  writeText(doc, `Fecha emision: ${input.issueDate}`, 14, 33);
  writeText(doc, `Fecha vencimiento: ${input.issueDate}`, 14, 39);
  writeText(doc, `Forma de pago: ${paymentLabel}`, 14, 45);
  writeText(doc, "Moneda: COP - Peso Colombiano", 14, 51);

  doc.setDrawColor(216, 222, 229);
  doc.line(14, 58, 202, 58);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  writeText(doc, "ADQUIRIENTE", 14, 68);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  writeText(doc, `Razon social: ${fieldValue(input.customer.name)}`, 14, 76);
  writeText(doc, `NIT / C.C.: ${fieldValue(input.customer.document)}`, 14, 83);
  writeText(doc, `Direccion: ${fieldValue(input.customer.address)}`, 14, 90);
  writeText(doc, `Ciudad: ${fieldValue(input.customer.city)}`, 114, 90);
  writeText(doc, `Email: ${fieldValue(input.customer.email)}`, 14, 97);

  doc.setFont("helvetica", "bold");
  doc.setFillColor(238, 242, 247);
  doc.rect(14, 110, 188, 10, "F");
  writeText(doc, "Descripcion", 17, 117);
  writeText(doc, "Cant.", 88, 117);
  writeText(doc, "Vr. Unitario", 108, 117);
  writeText(doc, "IVA %", 145, 117);
  writeText(doc, "IVA $", 162, 117);
  writeText(doc, "Total", 184, 117);

  doc.setFont("helvetica", "normal");
  doc.rect(14, 120, 188, 16);
  writeText(doc, input.item.description, 17, 130, { maxWidth: 66 });
  writeText(doc, String(input.item.quantity), 91, 130);
  writeText(doc, unitPrice, 108, 130);
  writeText(doc, "0%", 146, 130);
  writeText(doc, "$ 0", 162, 130);
  writeText(doc, total, 181, 130);

  doc.setFont("helvetica", "normal");
  writeText(doc, `Subtotal (sin IVA): ${subtotal}`, 138, 150);
  writeText(doc, "Total IVA: $ 0", 138, 158);
  writeText(doc, "Descuentos: $ 0", 138, 166);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  writeText(doc, `TOTAL A PAGAR: ${total}`, 138, 176);

  doc.setFontSize(10);
  writeText(doc, "INFORMACION LEGAL - DIAN", 14, 154);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  writeText(
    doc,
    "Plantilla visual imprimible. No corresponde a una factura electronica DIAN ni incluye CUFE real.",
    14,
    162,
    { maxWidth: 100 }
  );
  writeText(doc, "Observaciones: factura generada desde Moneta para impresion.", 14, 178, {
    maxWidth: 100
  });

  doc.line(14, 222, 78, 222);
  doc.setFont("helvetica", "bold");
  writeText(doc, "Firma autorizada", 14, 229);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  writeText(
    doc,
    "NOMBRE DE LA EMPRESA S.A.S. - NIT 900.123.456-7 - Colombia",
    108,
    254,
    { align: "center" }
  );

  doc.save(buildInvoiceFileName(input.invoiceNumber));
}
```

- [ ] **Step 4: Run the invoice PDF tests to verify GREEN**

Run:

```bash
pnpm --filter @moneta/desktop test -- invoice-pdf.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit invoice module**

Run:

```bash
git add apps/desktop/src/invoice-pdf.ts apps/desktop/src/invoice-pdf.test.ts
git commit -m "feat: add invoice pdf generator"
```

Expected: commit succeeds.

## Task 3: Extend Customer Capture and Validation

**Files:**
- Modify: `apps/desktop/src/App.tsx`
- Modify: `apps/desktop/src/App.test.tsx`
- Modify: `apps/desktop/src/App.css`

- [ ] **Step 1: Write failing UI tests for customer details**

Add these tests to `apps/desktop/src/App.test.tsx` inside `describe("App navigation", () => { ... })`:

```ts
  it("creates an inline customer with document, address, city, and email", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre o razon social"), "Ana Perez");
    await user.type(screen.getByLabelText("NIT o C.C."), "123456789");
    await user.type(screen.getByLabelText("Direccion"), "Calle 10 # 20-30");
    await user.type(screen.getByLabelText("Ciudad"), "Medellin");
    await user.type(screen.getByLabelText("Email"), "ana@example.com");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));

    expect(screen.getByRole("option", { name: "Ana Perez - 123456789" })).toBeTruthy();
  });

  it("requires customer name and document when creating an inline customer", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));

    expect(screen.getByText("El nombre del cliente es obligatorio.")).toBeTruthy();
    expect(screen.getByText("El documento del cliente es obligatorio.")).toBeTruthy();
  });
```

- [ ] **Step 2: Run the app tests to verify RED**

Run:

```bash
pnpm --filter @moneta/desktop test -- App.test.tsx
```

Expected: FAIL because the new labels and document validation do not exist.

- [ ] **Step 3: Extend customer types and form state**

In `apps/desktop/src/App.tsx`, replace `CustomerRecord` and `CustomerFormState` with:

```ts
type CustomerRecord = {
  id: string;
  name: string;
  document: string;
  address: string;
  city: string;
  email: string;
};

type CustomerFormState = {
  name: string;
  document: string;
  address: string;
  city: string;
  email: string;
};

type CustomerFormErrors = Partial<Record<keyof CustomerFormState, string>>;

const emptyCustomerForm: CustomerFormState = {
  address: "",
  city: "",
  document: "",
  email: "",
  name: ""
};
```

- [ ] **Step 4: Update customer creation callback**

In `apps/desktop/src/App.tsx`, replace `createCustomer` with:

```ts
  function createCustomer(input: CustomerFormState): CustomerRecord {
    const customer = {
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

Update `SectionContentProps`, `SalesSectionProps`, and call sites so `onCreateCustomer` accepts `CustomerFormState`.

- [ ] **Step 5: Update inline customer form UI**

In `SalesSection`, initialize:

```ts
  const [customerForm, setCustomerForm] =
    useState<CustomerFormState>(emptyCustomerForm);
  const [customerErrors, setCustomerErrors] = useState<CustomerFormErrors>({});
```

Replace `submitCustomer` with:

```ts
  function updateCustomerField(field: keyof CustomerFormState, value: string) {
    setCustomerForm((currentForm) => ({ ...currentForm, [field]: value }));
    setCustomerErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
  }

  function submitCustomer() {
    const nextErrors: CustomerFormErrors = {};

    if (customerForm.name.trim() === "") {
      nextErrors.name = "El nombre del cliente es obligatorio.";
    }
    if (customerForm.document.trim() === "") {
      nextErrors.document = "El documento del cliente es obligatorio.";
    }

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

Replace the inline customer form JSX with:

```tsx
          <div className="inline-customer-form">
            <TextField
              error={customerErrors.name}
              label="Nombre o razon social"
              onChange={(value) => updateCustomerField("name", value)}
              value={customerForm.name}
            />
            <TextField
              error={customerErrors.document}
              label="NIT o C.C."
              onChange={(value) => updateCustomerField("document", value)}
              value={customerForm.document}
            />
            <TextField
              error={customerErrors.address}
              label="Direccion"
              onChange={(value) => updateCustomerField("address", value)}
              value={customerForm.address}
            />
            <TextField
              error={customerErrors.city}
              label="Ciudad"
              onChange={(value) => updateCustomerField("city", value)}
              value={customerForm.city}
            />
            <TextField
              error={customerErrors.email}
              label="Email"
              onChange={(value) => updateCustomerField("email", value)}
              value={customerForm.email}
            />
            <button type="button" onClick={submitCustomer}>
              Guardar cliente
            </button>
          </div>
```

Update customer options to show the document:

```tsx
                  {customer.name} - {customer.document}
```

- [ ] **Step 6: Run the app tests to verify GREEN**

Before running the tests, update existing customer creation test flows in `apps/desktop/src/App.test.tsx`:

- Replace `screen.getByLabelText("Nombre cliente")` with `screen.getByLabelText("Nombre o razon social")`.
- After typing each customer name, type a document into `screen.getByLabelText("NIT o C.C.")`.
- In tests that create multiple customers, use a different document value per customer.

For example, update a paid sale setup from:

```ts
    await user.type(screen.getByLabelText("Nombre cliente"), "Ana Perez");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
```

to:

```ts
    await user.type(screen.getByLabelText("Nombre o razon social"), "Ana Perez");
    await user.type(screen.getByLabelText("NIT o C.C."), "123456789");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
```

In the existing validation test, keep the expected name error and add the expected document error:

```ts
    expect(screen.getByText("El nombre del cliente es obligatorio.")).toBeTruthy();
    expect(screen.getByText("El documento del cliente es obligatorio.")).toBeTruthy();
```

Update `apps/desktop/src/App.css` so the expanded inline customer form remains usable:

```css
.inline-customer-form {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e2e8f0;
}

.inline-customer-form button {
  align-self: end;
}
```

Then run:

Run:

```bash
pnpm --filter @moneta/desktop test -- App.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit customer form changes**

Run:

```bash
git add apps/desktop/src/App.tsx apps/desktop/src/App.test.tsx apps/desktop/src/App.css
git commit -m "feat: capture invoice customer details"
```

Expected: commit succeeds.

## Task 4: Add Invoice Action to Sales

**Files:**
- Modify: `apps/desktop/src/App.tsx`
- Modify: `apps/desktop/src/App.test.tsx`
- Modify: `apps/desktop/src/App.css`

- [ ] **Step 1: Mock invoice PDF module in app tests**

At the top of `apps/desktop/src/App.test.tsx`, after imports, add:

```ts
import { generateInvoicePdf } from "./invoice-pdf";

vi.mock("./invoice-pdf", () => ({
  generateInvoicePdf: vi.fn()
}));
```

Update the Vitest import to include `beforeEach` and `vi`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
```

Add:

```ts
const generateInvoicePdfMock = vi.mocked(generateInvoicePdf);
```

Inside `describe("App navigation", () => { ... })`, add:

```ts
  beforeEach(() => {
    generateInvoicePdfMock.mockClear();
  });
```

- [ ] **Step 2: Write failing UI test for generating an invoice**

Add this test to `apps/desktop/src/App.test.tsx`:

```ts
  it("generates a PDF invoice for a registered paid sale", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre o razon social"), "Ana Perez");
    await user.type(screen.getByLabelText("NIT o C.C."), "123456789");
    await user.type(screen.getByLabelText("Direccion"), "Calle 10 # 20-30");
    await user.type(screen.getByLabelText("Ciudad"), "Medellin");
    await user.type(screen.getByLabelText("Email"), "ana@example.com");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );
    await user.type(screen.getByLabelText("Cantidad"), "2");
    await user.click(screen.getByLabelText("Pagada"));
    await user.click(screen.getByRole("button", { name: "Registrar venta" }));
    await user.click(screen.getByRole("button", { name: "Generar factura PDF" }));

    expect(generateInvoicePdfMock).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: {
          address: "Calle 10 # 20-30",
          city: "Medellin",
          document: "123456789",
          email: "ana@example.com",
          name: "Ana Perez"
        },
        item: {
          description: "Arroz libra",
          quantity: 2,
          totalMinor: 9000,
          unitPriceMinor: 4500
        },
        paymentStatus: "paid"
      })
    );
  });
```

- [ ] **Step 3: Write failing UI test for pending payment label data**

Add this test to `apps/desktop/src/App.test.tsx`:

```ts
  it("passes pending status to invoice generation for pending sales", async () => {
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
    await user.type(screen.getByLabelText("Cantidad"), "3");
    await user.click(screen.getByLabelText("Pendiente"));
    await user.click(screen.getByRole("button", { name: "Registrar venta" }));
    await user.click(screen.getByRole("button", { name: "Generar factura PDF" }));

    expect(generateInvoicePdfMock).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: expect.objectContaining({
          document: "987654321",
          name: "Carlos Ruiz"
        }),
        item: expect.objectContaining({
          quantity: 3,
          totalMinor: 13500
        }),
        paymentStatus: "pending"
      })
    );
  });
```

- [ ] **Step 4: Run the app tests to verify RED**

Run:

```bash
pnpm --filter @moneta/desktop test -- App.test.tsx
```

Expected: FAIL because there is no invoice action and sales do not store customer snapshots.

- [ ] **Step 5: Extend `SaleRecord` with customer snapshot**

In `apps/desktop/src/App.tsx`, update `SaleRecord`:

```ts
type SaleRecord = {
  id: string;
  customer: CustomerRecord;
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
```

In both `registerPaidSaleInSession` and `registerPendingSaleInSession`, add:

```ts
        customer: input.customer,
```

to the sale row object.

- [ ] **Step 6: Add invoice generation handler**

In `apps/desktop/src/App.tsx`, add the import:

```ts
import { generateInvoicePdf } from "./invoice-pdf";
```

Inside `SalesSection`, add:

```ts
  const [invoiceError, setInvoiceError] = useState<string | null>(null);

  function generateInvoiceForSale(sale: SaleRecord) {
    try {
      generateInvoicePdf({
        customer: {
          address: sale.customer.address,
          city: sale.customer.city,
          document: sale.customer.document,
          email: sale.customer.email,
          name: sale.customer.name
        },
        invoiceNumber: `FE-${sale.id}`,
        issueDate: sale.occurredAtLabel,
        item: {
          description: sale.productName,
          quantity: sale.quantity,
          totalMinor: sale.totalMinor,
          unitPriceMinor: sale.unitPriceMinor
        },
        paymentStatus: sale.paymentStatus
      });
      setInvoiceError(null);
    } catch {
      setInvoiceError("No se pudo generar la factura PDF.");
    }
  }
```

- [ ] **Step 7: Add the sales table action column**

In the sales table header, add:

```tsx
              <th>Factura</th>
```

In each sales row, add:

```tsx
                <td>
                  <button
                    className="table-action"
                    onClick={() => generateInvoiceForSale(sale)}
                    type="button"
                  >
                    Generar factura PDF
                  </button>
                </td>
```

Below the sales table, render:

```tsx
        {invoiceError ? <p className="form-error">{invoiceError}</p> : null}
```

- [ ] **Step 8: Add table action styles**

In `apps/desktop/src/App.css`, add:

```css
.table-action {
  border-radius: 8px;
  background: #eef2f7;
  color: #334155;
  padding: 8px 10px;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}

.table-action:hover {
  background: #dbe5ef;
}
```

- [ ] **Step 9: Run the app tests to verify GREEN**

Run:

```bash
pnpm --filter @moneta/desktop test -- App.test.tsx
```

Expected: PASS.

- [ ] **Step 10: Commit invoice UI action**

Run:

```bash
git add apps/desktop/src/App.tsx apps/desktop/src/App.test.tsx apps/desktop/src/App.css
git commit -m "feat: generate invoice pdf from sales"
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

Expected: build passes.

- [ ] **Step 4: Review git status**

Run:

```bash
git status --short
```

Expected: only intentional changes are present.

- [ ] **Step 5: Commit any final verification fixes**

If Task 5 required code changes, run:

```bash
git add apps/desktop/src/App.tsx apps/desktop/src/App.test.tsx apps/desktop/src/App.css apps/desktop/src/invoice-pdf.ts apps/desktop/src/invoice-pdf.test.ts apps/desktop/package.json pnpm-lock.yaml
git commit -m "fix: stabilize invoice pdf flow"
```

Expected: commit succeeds if fixes were needed. Skip this step if no files changed during verification.

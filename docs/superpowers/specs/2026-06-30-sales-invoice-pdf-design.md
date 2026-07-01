# Sales Invoice PDF Design

## Context

Moneta currently supports a local desktop sales flow with one product per sale, customer selection, paid or pending payment status, local sales rows, and local receivable rows. The current customer record only stores a name, and the app has no invoice generation.

The user provided a Colombian invoice DOCX template and approved a first slice focused on a visual printable PDF. This slice is not intended to be a DIAN electronic invoice implementation.

## Goals

- Let the user generate a PDF invoice from each registered sale.
- Use the attached Colombian invoice template as the visual reference.
- Capture customer details needed by the invoice: business/name, NIT or C.C., address, city, and email.
- Keep the first invoice slice aligned with the existing one-product sales flow.
- Keep the invoice generation isolated from sales registration logic.

## Non-Goals

- DIAN electronic invoicing.
- CUFE generation.
- QR verification with DIAN.
- Real DIAN resolution management.
- Real company profile configuration.
- Real tax calculation rules beyond a placeholder IVA value.
- Multi-line invoices.
- Persisting PDFs or sales data to SQLite.

## User Flow

1. The user opens `Ventas`.
2. The user creates or selects a customer.
3. When creating a customer inline, the form captures:
   - Nombre o razon social.
   - NIT o C.C.
   - Direccion.
   - Ciudad.
   - Email.
4. The user registers a paid or pending sale.
5. The sale appears in the sales table.
6. Each sale row includes a `Generar factura PDF` action.
7. When the user clicks the action, Moneta downloads a PDF invoice for that sale.
8. The user can print the PDF or save it from the system viewer.

## Customer Data

Update the local desktop customer record to:

```ts
type CustomerRecord = {
  id: string;
  name: string;
  document: string;
  address: string;
  city: string;
  email: string;
};
```

`name` and `document` are required. `address`, `city`, and `email` can be optional at validation time but should be printed as empty or placeholder values when not provided.

## Invoice Data

The PDF invoice should derive its data from the selected sale row. Each sale row should keep a customer snapshot so invoice generation does not depend on later customer state changes:

- Invoice number: derived from the sale id, displayed with an `FE-` style prefix for the visual template.
- Issue date: sale date label already captured for the row.
- Payment form: `Contado` for paid sales and `Credito` for pending sales.
- Currency: COP.
- Customer details: name, document, address, city, and email from the sale customer snapshot.
- Item description: product name.
- Quantity: sale quantity.
- Unit value: sale unit price.
- IVA percent: `0%` for this first slice.
- IVA amount: `$0`.
- Subtotal: sale total.
- Total to pay: sale total.

## PDF Design

The PDF should be one US Letter page where possible and visually follow the provided template:

- Company header with placeholder company name, NIT, address, phone, and email.
- Invoice title block: `FACTURA DE VENTA` and invoice number.
- Metadata block for issue date, due date, payment form, and currency.
- `ADQUIRIENTE` block with customer details.
- Item table with columns for description, quantity, unit value, IVA %, IVA amount, and total.
- Totals summary for subtotal, total IVA, discounts, and total to pay.
- Legal and observation blocks with placeholder text clarifying this is a visual template.
- Signature area.

The visible language remains Spanish.

## Architecture

Add a focused PDF module in the desktop app, for example:

```txt
apps/desktop/src/invoice-pdf.ts
```

This module should expose a small API such as:

```ts
generateInvoicePdf(input: InvoicePdfInput): void
```

The React component should not know PDF layout details. It should map the selected sale and customer data into the invoice input and call the module.

The app currently has no PDF dependency. Add a lightweight client-side PDF dependency to `apps/desktop`, such as `jspdf`, and keep usage isolated to the invoice module.

## Error Handling

- A sale row should always contain the customer snapshot required for invoice generation. If that snapshot is missing because of unexpected state corruption, the PDF action should fail gracefully with a Spanish error message.
- Empty optional customer fields should print as `No registrado`.
- PDF generation errors should be caught in the UI and shown as a Spanish inline message near the sales table or action.

## Testing

Follow TDD for implementation.

Add or update tests to cover:

- Inline customer creation stores document, address, city, and email.
- Required customer fields reject missing name or document.
- A registered sale row exposes a `Generar factura PDF` action.
- Clicking `Generar factura PDF` calls the invoice generator with customer, sale, payment status, and totals.
- Pending sales map payment form to `Credito`; paid sales map it to `Contado`.

Existing verification remains:

```bash
CI=true pnpm --config.confirmModulesPurge=false test
CI=true pnpm --config.confirmModulesPurge=false typecheck
CI=true pnpm --config.confirmModulesPurge=false build
```

## Future Follow-Up

- Add company profile settings for real issuer data.
- Add configurable tax/IVA behavior.
- Support multi-line sales and invoices.
- Persist generated invoices.
- Integrate real DIAN electronic invoicing only after the data model supports fiscal requirements.

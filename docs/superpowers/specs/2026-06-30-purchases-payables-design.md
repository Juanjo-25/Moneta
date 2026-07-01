# Purchases and Supplier Payables Design

## Context

Moneta already has products, local inventory stock, sales, customers, receivables, and a PDF invoice flow for sales. The `Compras` and `Proveedores` sections still show empty states. The domain inventory model already supports `purchase` movements, so the next useful slice is purchase invoices that increase stock and create supplier payables when not fully paid.

This slice remains local to the desktop app session. It does not add SQLite persistence, file attachments, OCR, DIAN integration, or a full accounting ledger.

## Goals

- Let the user register supplier purchase invoices from `Compras`.
- Capture structured invoice data only, without attaching invoice files.
- Increase product stock when a purchase invoice is confirmed.
- Support supplier invoices with payment status `Pagada` or `Pendiente` at creation.
- Create supplier accounts payable for pending invoices.
- Let the user view supplier balances in `Proveedores`.
- Let the user register partial or full payments against payable invoices.
- Keep supplier balances and invoice states updated in the current app session.

## Non-Goals

- File upload or storage for invoice PDFs/images.
- SQLite persistence.
- Multi-line purchase invoices.
- Tax/IVA calculations.
- Expense invoices that do not affect inventory.
- Supplier statements exported to PDF.
- Bank/cash account reconciliation.
- Deleting or editing purchase invoices.

## User Flow

1. The user opens `Compras`.
2. The section shows a purchase invoice form.
3. The user selects a supplier or creates a new supplier inline.
4. The user enters invoice number, issue date, optional due date, product, quantity, unit cost, and payment status.
5. The UI shows the computed invoice total before confirmation.
6. The user confirms the purchase.
7. Moneta increases product stock by the purchased quantity.
8. The purchase appears in a purchases table.
9. If the invoice is `Pendiente`, Moneta creates a payable invoice visible in `Proveedores`.
10. The user opens `Proveedores` to see supplier balances.
11. The user registers an abono against a pending or partially paid supplier invoice.
12. Moneta reduces the invoice balance and updates the state to `Abonada` or `Pagada`.

## Data Shape

The desktop app should introduce local session models:

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
```

Existing `ProductRecord` remains the source for product selection and stock display.

## Purchases UI

The `Compras` section should replace the empty state with:

- A compact purchase invoice form.
- Supplier selector.
- `Nuevo proveedor` action that reveals a small inline supplier form.
- Invoice number input.
- Issue date input.
- Due date input.
- Product selector.
- Quantity input.
- Unit cost input formatted like existing money fields.
- Payment status control with `Pagada` and `Pendiente`.
- Summary panel with invoice total.
- Purchases table for invoices registered in the current session.

Visible copy remains Spanish.

## Suppliers UI

The `Proveedores` section should replace the empty state with:

- A supplier balance table.
- Supplier name.
- Total pending balance.
- Invoice number.
- Invoice status: `Pendiente`, `Abonada`, or `Pagada`.
- Original amount, paid amount, and balance.
- Due date.
- `Registrar abono` action for invoices with balance greater than zero.

The payment UI can be inline and scoped to one invoice at a time:

- Amount input.
- Confirm payment action.
- Validation message if the amount is invalid or greater than the invoice balance.

For this slice, suppliers only need a name. More supplier details can be added later when persistence and vendor management mature.

## Business Rules

- Supplier is mandatory.
- Supplier name is mandatory when creating a supplier inline.
- Invoice number is mandatory.
- Issue date is mandatory.
- Due date is optional.
- Product is mandatory.
- Quantity must be an integer greater than zero.
- Unit cost must be zero or greater.
- Purchase total equals quantity multiplied by unit cost.
- Confirming a purchase always increases product stock.
- A `Pagada` purchase creates no payable balance.
- A `Pendiente` purchase creates a supplier payable with full balance.
- A payable payment must be greater than zero.
- A payable payment cannot exceed the current balance.
- A payable with no payments and balance greater than zero is `Pendiente`.
- A payable with at least one payment and balance greater than zero is `Abonada`.
- A payable with balance equal to zero is `Pagada`.

## Architecture

This slice should stay local to the desktop app session, matching the current product, sale, receivable, and invoice PDF implementation style.

The first implementation can keep purchase and payable state in `App.tsx`, but should use small helper functions where useful for computing payable status and balances. It should reuse the existing inventory movement semantics rather than creating a new stock model.

Because purchases currently have no application use case, the UI may apply purchase stock locally through the same inventory movement rules used elsewhere. A later slice can introduce an application-layer `registerPurchase` use case once persistence and repositories exist.

## Validation

The form should reject:

- Missing supplier.
- Empty inline supplier name.
- Missing invoice number.
- Missing issue date.
- Missing product.
- Quantity less than 1.
- Unit cost missing or less than 0.
- Payable abono missing, zero, negative, or greater than the invoice balance.

Validation messages remain Spanish and invalid submissions must not create purchase rows, stock changes, payable rows, or payment changes.

## Testing

Add or extend desktop UI tests to cover:

- Registering a paid purchase increases stock and adds a purchase row without supplier payable balance.
- Registering a pending purchase increases stock and creates a supplier payable.
- Creating a supplier inline and using it in the same purchase.
- Supplier payable table shows pending balance by supplier and invoice.
- Registering a partial abono changes status to `Abonada` and reduces balance.
- Registering a full abono changes status to `Pagada` and balance to zero.
- Validation for missing supplier, missing invoice number, missing issue date, missing product, invalid quantity, invalid unit cost, empty supplier name, and abono greater than balance.

Existing verification remains:

```bash
CI=true pnpm --config.confirmModulesPurge=false test
CI=true pnpm --config.confirmModulesPurge=false typecheck
CI=true pnpm --config.confirmModulesPurge=false build
```

## Future Follow-Up

- Persist suppliers, purchases, payables, and payments in SQLite.
- Add supplier contact and tax fields.
- Support multi-line purchase invoices.
- Add invoice file attachments.
- Add purchase tax/IVA calculations.
- Add supplier statement export.
- Add application-layer `registerPurchase` and `registerSupplierPayment` use cases.

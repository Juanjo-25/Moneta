# Cartera Dashboard Design

## Context

Moneta already tracks pending sales as customer receivables and pending purchases as supplier payables in the local desktop session. Supplier payables already include due dates, balances, and partial/full payment states. Customer receivables currently only store customer, sale, amount, and pending status.

The next slice turns `Cartera` into the central place for pending money movement: what customers owe the business and what the business owes suppliers.

This remains a local desktop-session feature. It does not add SQLite persistence, operating-system notifications, email reminders, customer payment registration, or supplier statement exports.

## Goals

- Make `Cartera` a single dashboard with two views: `Por cobrar` and `Por pagar`.
- Show top-level totals and alert counts across both views.
- Add `Fecha vencimiento` to pending sales so customer receivables can be ordered and alerted.
- Classify pending invoices by due status and timing buckets: vencida, proxima, 15, 30, 60, and 90 dias.
- Sort debts by due date so the most urgent items appear first.
- Group debts by customer in `Por cobrar` and by supplier in `Por pagar`.
- Show automatic in-app alerts for overdue and soon-due invoices.
- Reuse existing supplier payable payment behavior from the provider flow.

## Non-Goals

- Native operating-system notifications.
- Email, WhatsApp, or SMS reminders.
- Background jobs while the app is closed.
- SQLite persistence.
- Customer payment registration in this slice.
- Editing due dates after an invoice is registered.
- Deleting or voiding sales, purchases, receivables, or payables.
- Aging based on accounting posting periods beyond the requested day buckets.

## User Flow

1. The user registers a sale.
2. If the sale is `Pendiente`, the form requires `Fecha vencimiento`.
3. Moneta creates a customer receivable with amount, customer, sale, status, and due date.
4. The user registers a purchase.
5. If the purchase is `Pendiente`, Moneta creates a supplier payable with the existing due date and balance fields.
6. The user opens `Cartera`.
7. The dashboard shows total por cobrar, total por pagar, vencidas, and proximas a vencer.
8. The user switches between `Por cobrar` and `Por pagar`.
9. Each view lists pending invoices sorted by due date and labeled with alert/bucket information.
10. The `Por pagar` view keeps the existing `Registrar abono` action for supplier invoices.

## Dashboard UI

The `Cartera` section should replace the current customer-only table with:

- A compact summary band:
  - Total por cobrar.
  - Total por pagar.
  - Facturas vencidas.
  - Facturas proximas a vencer.
- An alerts area for invoices that are vencidas or proximas a vencer.
- A two-option view switch:
  - `Por cobrar`.
  - `Por pagar`.
- A debt table scoped to the active view.

Visible copy remains Spanish. The screen should stay dense and operational, matching the current desktop shell.

## Por Cobrar

`Por cobrar` lists customer receivables from pending sales.

Columns:

- Cliente.
- Venta.
- Vence.
- Saldo.
- Rango.
- Alerta.
- Estado.

For this slice, customer receivables remain pending-only and do not support abonos yet. The table should still be shaped so `Abonada` and `Pagada` can be added later without redesigning the screen.

## Por Pagar

`Por pagar` lists supplier payables from pending purchases.

Columns:

- Proveedor.
- Factura.
- Vence.
- Original.
- Abonado.
- Saldo.
- Rango.
- Alerta.
- Estado.
- Accion.

The existing supplier payment form should be reachable from this view for invoices with balance greater than zero. The old `Proveedores` payable table can either be removed later or remain as a supplier-focused view, but `Cartera` becomes the primary operational view for payables.

## Due Date Rules

All date comparisons use local calendar dates. For this slice, "today" is computed when the React app renders.

Alert labels:

- `Vencida`: due date is before today.
- `Proxima`: due date is today or within the next 15 calendar days.
- `Al dia`: due date is more than 15 calendar days away.
- `Sin vencimiento`: only allowed for supplier payables if the purchase had no due date.

Range labels:

- `Vencida`: due date is before today.
- `15 dias`: due date is 0 to 15 days away.
- `30 dias`: due date is 16 to 30 days away.
- `60 dias`: due date is 31 to 60 days away.
- `90 dias`: due date is 61 to 90 days away.
- `Mas de 90 dias`: due date is more than 90 days away.
- `Sin vencimiento`: no due date.

Sorting:

- Items with due dates come first, ascending by due date.
- Overdue items naturally appear before upcoming items.
- Items without due date appear last.

## Data Shape

Customer receivables should add a due date:

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
```

Pending sale registration should accept the due date:

```ts
onRegisterPendingSale({
  customer,
  lines,
  dueAt
});
```

Supplier payable data can reuse the existing shape:

```ts
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
  status: "pending" | "partial" | "paid";
};
```

The dashboard can normalize receivables and payables into local view rows, but the underlying records should stay separate because cobrar and pagar represent opposite business actions.

## Business Rules

- Pending sales require `Fecha vencimiento`.
- Paid sales do not require `Fecha vencimiento`.
- Missing pending-sale due date blocks sale registration and shows a Spanish validation message.
- Pending sale receivables store the selected due date.
- Payables with zero balance are not included in pending alert totals.
- Receivables and payables are sorted by due date inside their views.
- Dashboard totals use outstanding balances:
  - Receivables use `amountMinor`.
  - Payables use `balanceMinor`.
- Alerts include only unpaid customer receivables and supplier payables with balance greater than zero.

## Error Handling

The sale form should add a clear validation message when the user marks a sale as pending without a due date:

`La fecha de vencimiento es obligatoria para ventas pendientes.`

Date parsing should be defensive. If a malformed date enters state, the row should fall back to `Sin vencimiento` instead of breaking the screen.

## Testing

Desktop UI tests should cover:

- Pending sale requires `Fecha vencimiento`.
- Pending sale stores the due date and shows it in `Cartera > Por cobrar`.
- `Cartera` shows both `Por cobrar` and `Por pagar` views.
- Summary totals include customer receivables and supplier payables.
- Overdue and soon-due invoices appear in the alerts area.
- Rows are sorted by due date.
- Supplier payable payment can be registered from `Cartera > Por pagar`.

Existing verification remains:

```bash
CI=true pnpm --config.confirmModulesPurge=false test
CI=true pnpm --config.confirmModulesPurge=false typecheck
CI=true pnpm --config.confirmModulesPurge=false build
```

## Future Follow-Up

- Add customer receivable abonos and statuses `Abonada` and `Pagada`.
- Persist receivables, payables, and payments in SQLite.
- Add native desktop notification scheduling.
- Add configurable alert windows instead of a fixed 15-day upcoming window.
- Add exportable cartera reports by customer, supplier, and aging bucket.

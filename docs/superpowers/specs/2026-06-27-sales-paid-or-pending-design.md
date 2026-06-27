# Sales Paid or Pending Design

## Context

Moneta already has local desktop product creation, low-stock metrics, and domain/application support for registering a paid sale that decreases inventory. The desktop `Ventas` section is still an empty state. The next useful slice is a single-line sales flow that can register either a paid sale or a pending sale with customer selection and inline customer creation.

## Goals

- Let the user register a sale from the `Ventas` section.
- Keep the first sales slice to one product per sale.
- Require a customer on every sale.
- Let the user select an existing customer or create a new one without leaving the sales flow.
- Support two payment states: `Pagada` and `Pendiente`.
- Decrease inventory only when the sale is marked `Pagada`.
- Create local receivable state for pending sales.
- Show registered sales in the desktop UI session.

## Non-Goals

- Multi-line sales.
- Partial payments.
- Editing or deleting sales.
- Marking a pending sale as paid later.
- SQLite persistence.
- Dedicated customer management screens beyond the inline creation needed for this flow.

## User Flow

1. The user opens `Ventas`.
2. The section shows a sales form instead of an empty state.
3. The user selects a customer from a list or clicks `Nuevo cliente`.
4. If needed, the user creates a customer inline and the new customer becomes immediately selectable.
5. The user selects one existing product.
6. The user enters a quantity.
7. The user chooses `Pagada` or `Pendiente`.
8. The UI shows unit price and total before confirmation.
9. The user confirms the sale.
10. Outcomes:
    - `Pagada`: the sale is stored and product stock decreases immediately.
    - `Pendiente`: the sale is stored, receivable state is created, and stock does not move.
11. The new sale appears in a sales table in the same section.

## UI Design

The `Ventas` section keeps the current shell and replaces the empty state with:

- A compact sale form.
- Customer selector.
- `Nuevo cliente` action that reveals a small inline customer form.
- Product selector.
- Quantity input.
- Payment status control with `Pagada` and `Pendiente`.
- Summary panel showing unit price and total.
- A table of sales registered in the current app session.

The customer form should stay minimal for this slice: only the fields needed to identify the customer in later sales and receivables. Visible copy remains Spanish.

## Data Shape

The desktop UI should introduce local session models for:

```ts
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
```

Existing `ProductRecord` local state remains the product source for product selection and stock display.

## Business Rules

- Customer is mandatory.
- Product is mandatory.
- Quantity must be an integer greater than zero.
- The sale total equals selected product sale price multiplied by quantity.
- `Pagada` must validate available stock before confirming.
- `Pendiente` does not decrease stock.
- `Pendiente` creates a receivable entry in local UI state.

Accepted tradeoff for this slice: because pending sales do not reserve or decrease stock, the app may later allow selling units that were already committed in a pending sale. This is intentional for now and should be revisited when payment follow-up and stock reservation rules are added.

## Architecture

This slice stays local to the desktop app session and does not introduce SQLite yet.

The paid path should reuse the existing application sale registration behavior because that path already validates stock and records inventory movement semantics. The pending path should stay in the desktop UI for now, storing a local sale row plus a local receivable row without touching inventory state.

If `App.tsx` becomes too large, small colocated helpers or UI subcomponents inside `apps/desktop/src/` are acceptable, but the behavior should stay scoped to the desktop app rather than changing domain boundaries prematurely.

## Validation

The form should reject:

- Missing customer.
- Missing product.
- Quantity less than 1.
- New customer submission with an empty customer name.
- Paid sale confirmation when stock is insufficient.

Validation messages remain Spanish and invalid submissions must not create sale rows.

## Testing

Add or extend desktop UI tests to cover:

- Registering a paid sale decreases stock and adds a sales row.
- Registering a pending sale does not decrease stock and creates receivable state.
- Creating a new customer inline and using it in the same sale.
- Validation for missing customer, missing product, and invalid quantity.

Existing verification remains:

```bash
CI=true pnpm --config.confirmModulesPurge=false test
CI=true pnpm --config.confirmModulesPurge=false typecheck
CI=true pnpm --config.confirmModulesPurge=false build
```

## Future Follow-Up

After this slice works, the next natural steps are:

- Mark pending sales as paid later.
- Define whether pending sales should reserve stock.
- Persist customers, sales, and receivables in SQLite.

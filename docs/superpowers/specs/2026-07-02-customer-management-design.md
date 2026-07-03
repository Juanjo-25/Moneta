# Customer Management Design

## Context

Moneta already has a `Clientes` navigation item, but customer creation currently lives inside the sales flow. Customer data is used by sales, receivables, reports, and the invoice PDF generator. The next slice turns `Clientes` into a full customer workspace while preserving the current local desktop, single-machine product scope.

The user approved a complete customer file rather than only a directory. Current customer data must remain editable, while historical sales and old invoices must keep the original customer snapshot captured at transaction time.

## Goals

- Let the user create customers directly from the `Clientes` section.
- Let the user edit current customer data at any time.
- Let the user deactivate and reactivate customers without deleting history.
- Prevent duplicate customer documents (`NIT o C.C.`), including against inactive customers.
- Hide inactive customers from new sales while keeping them visible in customer management, cartera, reports, and historical sales.
- Show a complete customer file with current data, status, sales history, pending receivables, and commercial metrics.
- Preserve the original customer snapshot on each sale for invoices, historical reporting, and reprints.

## Non-Goals

- SQLite persistence for customers, sales, or receivables.
- A separate route or window for customer details.
- Deleting customers.
- Merging duplicate customers.
- Official fiscal invoicing or DIAN integration.

## User Flows

### Create Customer

1. The user opens `Clientes`.
2. The user selects `Nuevo cliente`.
3. Moneta shows a customer form with:
   - Nombre o razon social
   - NIT o C.C.
   - Direccion
   - Ciudad
   - Email
4. Moneta validates required fields and duplicate document.
5. The customer is created as active and becomes available for new sales.

### Edit Customer

1. The user selects a customer from the customer list.
2. The customer file opens in the same section.
3. The user edits current customer data.
4. Moneta validates required fields and duplicate document.
5. Current customer records update immediately.
6. Existing sales and old invoice reprints keep using the customer snapshot stored on each sale.

### Deactivate Customer

1. The user selects an active customer.
2. The user chooses `Desactivar`.
3. Moneta marks the customer inactive.
4. The customer remains visible in `Clientes`, cartera, reports, and historical sales.
5. The customer is no longer selectable for new sales.

### Reactivate Customer

1. The user selects an inactive customer.
2. The user chooses `Reactivar`.
3. Moneta marks the customer active.
4. The customer becomes selectable for new sales again.

### Review Customer File

1. The user selects a customer.
2. Moneta shows:
   - Current customer details and active/inactive status.
   - Total sold to the customer.
   - Number of sales.
   - Pending receivable balance.
   - Last sale date.
   - Sales history table.
   - Pending receivables table.

## Data Model

### CustomerRecord

`CustomerRecord` should gain an `active` boolean:

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
```

All newly created customers start with `active: true`.

### Sale Customer Snapshot

`SaleRecord` already stores the full `customer: CustomerRecord` object along with `customerId` and `customerName`. That full customer object must be treated as the transaction snapshot. When a customer is edited later, existing `SaleRecord.customer` values must not be rewritten.

If `CustomerRecord.active` is added to the customer type, the snapshot may include the value at sale time, but invoice generation and historical reporting should continue reading the identity fields (`name`, `document`, `address`, `city`, `email`) from the sale snapshot.

## Validation Rules

- `name` is required.
- `document` is required.
- `document` must be unique across all customers except the customer currently being edited.
- Document comparison should normalize whitespace and casing. The first implementation may keep punctuation significant because Colombian documents can be entered with business-specific formatting, but surrounding whitespace must not create duplicates.
- `address`, `city`, and `email` stay optional because the current invoice PDF already handles missing optional customer fields.
- Inactive customers are not valid for new sales.

## UI Design

The `Clientes` section should become a work surface with two areas:

- Customer list:
  - Search by name, document, city, or email.
  - Status filter for all, active, inactive.
  - Rows showing customer name, document, status, pending balance, total sold, and last sale.
  - Empty states for no customers and no search results.

- Customer file:
  - Current customer data.
  - Edit form.
  - Active/inactive action.
  - Commercial summary cards.
  - Sales history table.
  - Pending receivables table.

On narrower widths, the list can stack above the selected customer file. The UI should stay Spanish-first and operational, matching the current dashboard and table style.

## Sales Integration

The sales customer selector must only show active customers. Inline customer creation inside sales can remain, but it must use the shared customer creation validation so duplicate documents are blocked consistently. Customers created inline from sales also start active.

If the selected customer is deactivated while a sale form is open, submitting the sale should reject it with a clear validation message.

## Reports, Cartera, and Invoices

- Cartera continues to show receivables by stored customer name.
- Reports that aggregate historical sales continue using the sale snapshot fields.
- Invoice PDF generation continues using `sale.customer`, not the current customer record.
- Editing or deactivating a customer must not alter existing sale snapshots.

## Error Handling

Customer form errors should be shown inline:

- Empty name: `El nombre del cliente es obligatorio.`
- Empty document: `El documento del cliente es obligatorio.`
- Duplicate document: `Ya existe un cliente con este NIT o C.C.`
- Inactive sale attempt: `El cliente seleccionado esta inactivo. Reactivalo para registrar nuevas ventas.`

## Testing

Add focused desktop app tests for:

- Creating a customer from `Clientes`.
- Blocking duplicate documents from `Clientes`.
- Editing current customer data.
- Preserving sale customer snapshots after editing the customer.
- Deactivating a customer hides it from new sales.
- Reactivating a customer makes it available for new sales.
- Customer file shows sales history, pending receivables, and summary metrics.
- Sales inline customer creation shares duplicate document validation.

## Open Decisions

None. The user approved the complete customer file approach, historical snapshots for transactions, inactive customers hidden only from new sales, and unique documents even for inactive customers.

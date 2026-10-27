# Moneta

Moneta is a local desktop app for inventory, purchases, sales, and receivables.

## Requirements

- Node.js
- pnpm
- Rust toolchain with `cargo` available in `PATH`

Install Rust from <https://rustup.rs/> before running the native desktop app.

## Development

Install dependencies:

```bash
pnpm install
```

Run the web shell:

```bash
pnpm dev:desktop
```

Run the native desktop app:

```bash
pnpm dev:native
```

Build the web assets:

```bash
pnpm build
```

Build the native desktop app:

```bash
pnpm build:native
```

## Quotations

Open **Ventas → Cotizaciones** to create, edit, search, and print quotations.
Quotations have their own numbering, validity dates, discounts, and taxes. They
do not change inventory, sales, or receivables. Saved quotations persist in the
native SQLite database and are included in database backups. In the web shell,
records are available only for the current session.

## Sales and purchase search

The registered sales and purchase lists have instant search by invoice, customer
or supplier, document number, and product name or catalog code. Sales also support
seller search. Searches ignore accents and case, and can combine words across
fields. Clear the search with **Limpiar búsqueda** or Escape to show all records.

## Reports

Use **Reportes → Consultar mes** to filter all reports by month, or choose the
complete history. Cash flow and profit charts can be grouped by day or month.
Excel exports include the selected period, grouping, and date criteria.

Sales, purchases, and credit notes use their issue date. Receipts and supplier
payments use their payment date; projections use the due date. Credit notes
reduce the period in which they are issued, including credits for earlier sales.
DSO shows the current outstanding balance of invoices issued in the selected
period, rather than reconstructing a historical month-end balance.

## Verification

```bash
pnpm test
pnpm typecheck
pnpm build
```

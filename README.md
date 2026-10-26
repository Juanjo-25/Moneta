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

## Verification

```bash
pnpm test
pnpm typecheck
pnpm build
```

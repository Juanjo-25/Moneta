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

## Verification

```bash
pnpm test
pnpm typecheck
pnpm build
```

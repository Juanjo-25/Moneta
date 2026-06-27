# Products and Basic Inventory Design

## Context

Moneta already has a Tauri desktop shell, side navigation, domain rules for products, inventory movements, and sales, plus an application use case for registering sales. The UI currently shows empty states only. The next useful slice is products with basic inventory because purchases, sales, alerts, and reports depend on products existing first.

## Goals

- Let the user create products from the `Productos` section.
- Show created products in a dense desktop table.
- Track initial stock and low-stock state in the UI.
- Update Dashboard metrics from product data.
- Keep this first slice local to the app session while preserving boundaries for later SQLite persistence.

## Non-Goals

- SQLite persistence.
- Editing or deleting products.
- Import/export.
- Barcode scanning.
- Purchase and sale workflows.
- Multi-user or cloud synchronization.

## User Flow

1. User opens `Productos`.
2. User clicks `Nuevo producto`.
3. The section shows a product form.
4. User enters:
   - SKU or code.
   - Product name.
   - Unit.
   - Cost.
   - Sale price.
   - Minimum stock.
   - Initial stock.
5. User submits the form.
6. The product appears in the products table.
7. The Dashboard updates:
   - `Productos activos` equals the number of active products.
   - `Alertas de inventario` equals products whose stock is less than or equal to minimum stock.

## UI Design

The `Productos` section keeps the existing app shell. Its main content changes from an empty state into:

- A compact form panel for product creation.
- A table with columns: Codigo, Producto, Unidad, Costo, Precio venta, Stock, Minimo, Estado.
- Empty state only when no products exist.

The primary action button `Nuevo producto` focuses or reveals the form. For the first slice, the form can stay visible in the section after the user enters `Productos`; this keeps the workflow direct and avoids modal complexity.

Dashboard cards stay in place and receive live values from local app state. The low-inventory panel lists products at or below minimum stock when any exist; otherwise it keeps the existing `Sin alertas` state.

Visible copy remains Spanish.

## Data Shape

The desktop UI will use a local app model:

```ts
type ProductRecord = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  costMinor: number;
  salePriceMinor: number;
  minimumStock: number;
  stock: number;
  active: boolean;
};
```

Monetary fields are stored as integer minor units in code. Form inputs may accept whole currency values and convert them to minor units before saving.

## Validation

The form should reject:

- Empty SKU.
- Empty product name.
- Empty unit.
- Negative cost.
- Negative sale price.
- Negative minimum stock.
- Negative initial stock.

Validation messages should be user-facing Spanish text. Invalid submissions should not add rows to the table.

## Architecture

This slice may keep UI state in `apps/desktop/src/App.tsx` or a small colocated module if `App.tsx` becomes too large. It should not add SQLite yet.

Domain package changes are optional for this slice because `Product.create` already exists. If new validation logic belongs in the domain, add focused tests first.

Application package changes are optional for this slice. A later persistence slice should introduce product repository ports and SQLite adapters.

## Testing

Add or extend desktop UI tests to cover:

- Opening `Productos`.
- Creating a valid product.
- Rendering the product row.
- Updating dashboard product and low-stock metrics.
- Rejecting invalid product submissions.

Existing verification remains:

```bash
pnpm test
pnpm typecheck
pnpm build
cargo check
```

## Future Follow-Up

After this slice works, the next natural step is SQLite persistence for products and inventory movements through Tauri commands.

# Product Price Format and Unit Stock Design

## Context

Moneta already has a working `Productos` form in the desktop app, but `Costo` and `Precio venta` currently accept plain digits with no visual guidance, which makes it easy to misplace zeros. The form also captures `Unidad` and `Stock inicial` separately even though the current workflow only needs one opening quantity.

## Goals

- Format `Costo` and `Precio venta` live as Colombian peso values while the user types.
- Keep the visible field label `Unidad`.
- Use the entered `Unidad` value as the product's initial stock.
- Remove the separate `Stock inicial` field from the product form.
- Keep the implementation local to the desktop UI state.

## Non-Goals

- Adding decimal currency support.
- Adding a `$` prefix inside the input.
- Bringing back descriptive unit labels such as `caja`, `bolsa`, or `paquete`.
- Changing persistence architecture or adding SQLite.

## User Flow

1. The user opens `Productos`.
2. The form shows `Codigo`, `Producto`, `Unidad`, `Costo`, `Precio venta`, and `Stock minimo`.
3. The user types digits into `Costo` or `Precio venta`.
4. The field immediately shows thousands separators, for example `3200` becomes `3.200`.
5. The user types a numeric quantity in `Unidad`.
6. The user saves the product.
7. The created row shows the saved cost and sale price in COP and uses the `Unidad` value as `Stock`.

## UI Design

The form stays inline in the `Productos` section. `Costo` and `Precio venta` remain text inputs with numeric keyboard hints, but their displayed value is formatted in real time using Colombian thousands separators.

`Unidad` remains the visible field name because that is the wording the user wants. Operationally, it behaves as the opening quantity for the product. Since that quantity already becomes stock, the products table should no longer render a separate `Unidad` column. The table should keep `Stock` as the single quantity column to avoid duplicate values.

Visible copy remains Spanish.

## Data Shape

The desktop UI model should simplify the local product record by removing the old descriptive `unit` string:

```ts
type ProductRecord = {
  id: string;
  sku: string;
  name: string;
  costMinor: number;
  salePriceMinor: number;
  minimumStock: number;
  stock: number;
  active: boolean;
};
```

The form state should keep a dedicated string field for the visible `Unidad` input and string fields for the formatted money inputs. Before validation and saving, the UI strips formatting characters and converts those strings into non-negative integers.

## Validation

The form should reject:

- Empty `Codigo`.
- Empty `Producto`.
- Empty `Unidad`.
- Non-numeric or negative `Unidad`.
- Empty, non-numeric, or negative `Costo`.
- Empty, non-numeric, or negative `Precio venta`.
- Empty, non-numeric, or negative `Stock minimo`.

Validation messages remain user-facing Spanish text. Invalid submissions must not add product rows.

## Architecture

This change stays inside `apps/desktop/src/App.tsx` and the existing desktop tests. The implementation should add small formatting helpers inside the desktop UI module instead of introducing a new persistence or domain layer abstraction.

The input formatting must be display-only. The app state and saved `ProductRecord` continue to use integers so later inventory and persistence slices can keep operating on plain numeric values.

## Testing

Add or update desktop UI tests to cover:

- Live formatting of `Costo` and `Precio venta`.
- Product creation using `Unidad` as the only opening quantity input.
- Absence of the old `Stock inicial` field.
- Correct product row rendering after the table column change.

Verification remains:

```bash
CI=true pnpm --config.confirmModulesPurge=false test
CI=true pnpm --config.confirmModulesPurge=false typecheck
CI=true pnpm --config.confirmModulesPurge=false build
```

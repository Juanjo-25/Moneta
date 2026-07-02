# Sales Margin Reports Design

## Context

Moneta currently supports local desktop sales, inline customer creation, multi-line sales, paid or pending payment status, invoice PDF generation, and a first cartera dashboard. Sales store unit price and totals, but the sales flow still assumes the product sale price is the transaction price and does not preserve a historical cost snapshot per sold line for analytical reporting.

The next slice introduces a reliable gross-margin foundation for analytics. The user wants to analyze margin by individual sale, product, and customer, and specifically needs to support selling the same product at different prices to different customers on the same day. That requirement means each sale line must preserve the real transaction price entered by the user and the cost reference used when the sale was recorded.

This remains a local desktop-session feature. It does not add SQLite persistence, predictive models, accounting-grade inventory costing, or external BI/export integrations.

## Goals

- Allow the user to edit the sale price per sale line before adding it to the sale.
- Preserve the actual sale price entered for each sale line.
- Preserve the cost reference used at the moment of sale for each sale line.
- Store historical margin data per sale line so later product price or cost edits do not change past margins.
- Add a first `Reportes` module focused on gross margin analytics.
- Show margin data at four levels:
  - Resumen general.
  - Por producto.
  - Por cliente.
  - Por venta.
- Reuse recorded transaction data as the reporting source so later predictive features can consume stable historical inputs.

## Non-Goals

- Predictive analytics or forecasting models.
- DSO, cash-flow, P&L waterfall, or direct-variation reports.
- SQLite persistence.
- Editing recorded sale-line prices after a sale is registered.
- Editing recorded cost snapshots after a sale is registered.
- Weighted-average, FIFO, LIFO, or layered inventory costing.
- Exporting reports to Excel, PDF, or CSV.
- Advanced filters by seller, geography, channel, or product category.

## User Flow

1. The user opens `Ventas`.
2. The user selects a customer.
3. The user selects a product.
4. Moneta loads the product sale price as a suggested unit sale price.
5. The user can keep that price or replace it with the real negotiated unit sale price.
6. Moneta keeps the current product cost as the cost reference for that line.
7. The user adds one or more sale lines.
8. The user registers the sale as paid or pending.
9. For each stored sale line, Moneta saves a margin snapshot with price, cost, revenue, total cost, margin amount, and margin percent.
10. The user opens `Reportes`.
11. Moneta shows gross-margin KPIs and analytical views for product, customer, and sale performance using the stored snapshots.

## Sales Data Capture

The sale form should stop treating the product sale price as immutable.

Each draft line should include:

- Product.
- Quantity.
- Suggested unit sale price from the selected product.
- Editable unit sale price input.
- Current product cost used as an internal reference for the snapshot.
- Draft line total derived from quantity and entered unit sale price.

When the user edits the line price, Moneta recalculates the line total immediately. The UI should continue to feel operational and dense, not like a quote builder.

## Historical Snapshot Rules

Each recorded sale line should preserve a full gross-margin snapshot:

```ts
type SaleLineRecord = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPriceMinor: number;
  unitCostMinorAtSale: number;
  totalMinor: number;
  costMinor: number;
  marginMinor: number;
  marginPercent: number;
};
```

Meaning:

- `unitPriceMinor`: the real unit sale price entered by the user for that line.
- `unitCostMinorAtSale`: the product cost at the moment the sale is recorded.
- `totalMinor`: quantity x entered unit sale price.
- `costMinor`: quantity x cost snapshot.
- `marginMinor`: total revenue minus total cost.
- `marginPercent`: `(marginMinor / totalMinor) * 100`, using `0` when revenue is `0`.

The sale record should keep using line snapshots as the source of truth for display, invoice generation, and reports. Reports must not recalculate old sales from the current product table.

## Business Rules

- Every sale line starts with the product `salePriceMinor` as the suggested unit price.
- The user can change that unit price before adding the line.
- The sale line stored in the final sale uses the edited unit price, not the product default.
- The cost snapshot uses the current `costMinor` from the selected product when the sale is registered.
- The sale detail, invoice generation, and reports all use the recorded line price.
- Paid and pending sales both contribute to commercial margin reporting, because margin is recognized from the transaction in this slice.
- Margin can be negative. The system should not block a below-cost sale in this slice.

## Reportes UI

`Reportes` becomes a real analytics surface instead of an empty state.

The first version should be a single operational dashboard with:

- A KPI band:
  - Ventas analizadas.
  - Costo de ventas.
  - Utilidad bruta.
  - % margen bruto.
  - Numero de ventas.
- A product margin area:
  - Comparative graphic for product margin contribution or margin percent.
  - Sortable table with producto, unidades, ventas, costo, utilidad, % margen.
- A customer margin area:
  - Comparative graphic for customer margin contribution or margin percent.
  - Sortable table with cliente, ventas, costo, utilidad, % margen, numero de compras.
- A sale margin area:
  - Transaction-level table with venta, cliente, estado, ventas, costo, utilidad, % margen.
  - Ability to inspect the recorded line values in the table row content or adjacent detail area.

Visible copy remains Spanish. The screen should stay work-focused and information-dense, aligned with the current desktop shell.

## Report Calculation Model

The `Reportes` module should derive aggregates from the stored sale lines:

- General summary:
  - `ventas = sum(totalMinor)`
  - `costo = sum(costMinor)`
  - `utilidad = sum(marginMinor)`
  - `% margen = utilidad / ventas`
- By product:
  - group by `productId`
- By customer:
  - group by `customerId`
- By sale:
  - group by `saleId`

For customer analytics, the grouping should use the customer snapshot stored on the sale row rather than live customer edits. This keeps historical reporting stable if customer details are later updated.

## Architecture

The current desktop app still concentrates most workflows inside `apps/desktop/src/App.tsx`. For this slice, the implementation should still prefer clear local helper functions and focused extracted types instead of introducing a new cross-package reporting architecture too early.

Reasonable decomposition inside the desktop app:

- Extend local sale-line draft and persisted sale-line types with price and margin snapshot fields.
- Add focused helpers for:
  - parsing/formatting editable sale prices
  - deriving line snapshot totals
  - aggregating report rows by product, customer, and sale
- Add a dedicated `Reportes` section component inside the desktop app instead of leaving all report rendering inline in the section switch.

If `App.tsx` becomes materially harder to maintain, extracting a `ReportsSection` and a small report helper module is acceptable in this slice.

## Error Handling

- The editable unit price must reject empty, zero, or invalid values with a Spanish validation message before the line is added.
- If a selected product is missing cost data because of unexpected state corruption, the sale should not be registered and the user should see a Spanish error.
- Division by zero in margin-percent calculations should resolve to `0%`, not `NaN` or a broken UI state.
- If no sales exist, `Reportes` should show a clear empty operational state instead of blank graphics or tables.

## Testing

Desktop UI tests should cover:

- Sale lines preload the product sale price as the suggested price.
- The user can change the unit sale price before adding a sale line.
- Registered sale lines keep the edited unit price instead of the product default.
- Registered sale lines keep the product cost snapshot used at the moment of sale.
- Sale totals use the edited line prices.
- `Reportes` summary reflects revenue, cost, utility, and gross margin from recorded snapshots.
- `Reportes` product rows aggregate from stored lines.
- `Reportes` customer rows aggregate from stored lines.
- `Reportes` sale rows aggregate from stored lines.
- Two sales of the same product at different prices remain distinguishable in reporting output.

Existing verification remains:

```bash
CI=true pnpm --config.confirmModulesPurge=false test
CI=true pnpm --config.confirmModulesPurge=false typecheck
CI=true pnpm --config.confirmModulesPurge=false build
```

## Future Follow-Up

- Add period filters for daily, weekly, monthly, and custom ranges.
- Add category-, supplier-, and inventory-family margin views.
- Add predictive analysis on top of stable historical margin snapshots.
- Add persistence in SQLite so reports survive application restarts.
- Add DSO, cash-flow, P&L waterfall, and direct-variation reports after the margin base is stable.

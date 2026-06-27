# Moneta Desktop App Design

## Context

Moneta will be a local desktop app for a single Windows computer. It will track inventory, purchases, sales, customers, suppliers, receivables, and payments. The project starts from an empty repository and should use a monorepo with hexagonal architecture from the beginning.

The first implementation target is a Windows desktop application backed by a local SQLite database. The code may be developed on macOS, but Windows packaging and installer validation must be verified on Windows or Windows CI.

## Goals

- Provide a practical desktop workflow for a small business to register products, purchases, sales, inventory movements, customers, suppliers, and receivables.
- Keep business rules independent from UI and persistence details.
- Use a monorepo that can grow without mixing domain logic into the desktop shell.
- Store data locally on one computer with SQLite.
- Keep the first version focused enough to become usable quickly.

## Non-Goals

- Multi-user or network synchronization.
- Cloud backup or remote database.
- Mobile app support.
- Fiscal/electronic invoicing integration.
- Barcode scanning, printer integration, or advanced accounting in the first version.

## Recommended Stack

- Desktop shell: Tauri, optimized for a lightweight Windows app.
- Frontend: React and TypeScript.
- Styling: CSS modules or a small app-level stylesheet first; no heavy design system until repeated components justify it.
- Local persistence: SQLite through the Tauri backend side.
- Package manager: pnpm workspaces.
- Testing: Vitest for domain and application packages, plus focused UI tests once screens exist.

## Monorepo Structure

```text
apps/
  desktop/
    src/
    src-tauri/
packages/
  domain/
  application/
  infrastructure-sqlite/
  shared/
docs/
  superpowers/
    specs/
```

`apps/desktop` owns the Windows desktop experience: navigation, screens, forms, tables, and Tauri command wiring.

`packages/domain` owns pure business concepts and rules. It must not depend on React, Tauri, SQLite, or filesystem APIs.

`packages/application` owns use cases and ports. It coordinates domain entities through repository interfaces and transaction boundaries.

`packages/infrastructure-sqlite` owns SQLite schema, migrations, repository implementations, and local database connection setup.

`packages/shared` owns shared TypeScript utilities and cross-package types that do not belong to a specific domain.

## Hexagonal Boundaries

The dependency direction is inward:

```text
apps/desktop -> packages/application -> packages/domain
apps/desktop -> packages/infrastructure-sqlite -> packages/application ports
packages/infrastructure-sqlite -> packages/domain
```

The UI calls application use cases. Use cases depend on ports such as product repositories, purchase repositories, sale repositories, inventory ledgers, receivable repositories, and transaction managers. SQLite implements those ports as an adapter.

Domain code should expose explicit operations and invariants. Examples:

- A product has identity, SKU or code, name, active state, unit, cost reference, and sale price reference.
- A purchase increases stock and creates payable purchase history, but first version does not need full accounts payable.
- A sale decreases stock and may create a receivable when payment is partial or pending.
- A receivable tracks customer debt, due amount, payments, and settled status.
- Inventory changes are recorded as movements, not just overwritten product stock.

## First Version Scope

### Dashboard

The dashboard shows operational summaries: total products, low-stock items, sales for the current day, pending receivables, and recent activity.

### Products and Inventory

Users can create and edit products, set stock thresholds, view current stock, and review inventory movements. Manual stock adjustments are allowed with a required reason.

### Purchases

Users can register purchases from suppliers with line items, quantities, unit costs, and totals. Confirmed purchases increase inventory through movement records.

### Sales

Users can register sales with customer, line items, quantities, prices, discounts if needed later, and payment status. Confirmed sales decrease inventory through movement records.

### Customers, Suppliers, and Receivables

Users can manage customers and suppliers. Customer balances are derived from sales and payments. Users can register payments against receivables and see pending balances.

## Data Model

Initial aggregate areas:

- Product
- InventoryMovement
- Supplier
- Purchase
- PurchaseLine
- Customer
- Sale
- SaleLine
- Receivable
- Payment

SQLite tables should use stable IDs, timestamps, and explicit status fields where lifecycle matters. Monetary values should be stored as integer minor units to avoid floating-point rounding errors.

## Error Handling

Domain errors should be typed and meaningful, for example insufficient stock, inactive product, invalid payment amount, or missing customer.

Application use cases should return structured success or failure results. UI screens should show product-facing messages in Spanish and avoid leaking technical adapter errors.

Infrastructure errors should be mapped at the adapter boundary. Database failures should not appear as raw SQLite messages in normal UI flows.

## UI Direction

The first screen should be the actual app shell, not a landing page. The desktop UI should be dense, calm, and operational:

- Left navigation for Dashboard, Productos, Compras, Ventas, Clientes, Proveedores, Cartera, and Reportes.
- Main content area with tables, filters, and direct create actions.
- Forms optimized for keyboard and repeated data entry.
- Spanish visible copy by default.
- No marketing-style hero sections.

## Testing Strategy

Start with tests where the risk is highest:

- Domain tests for inventory movement rules, stock availability, sale confirmation, purchase confirmation, and receivable settlement.
- Application tests for use cases with in-memory repositories.
- SQLite adapter tests for schema/repository behavior once persistence is implemented.
- UI smoke tests after the first app shell and core screens exist.

## Implementation Sequence

1. Scaffold the pnpm monorepo with TypeScript package boundaries.
2. Create domain entities, value objects, and errors for products, inventory, sales, purchases, customers, suppliers, receivables, and payments.
3. Create application ports and use cases.
4. Add SQLite schema and repository adapters.
5. Scaffold the Tauri React desktop app.
6. Wire the app shell and core screens to use cases.
7. Add packaging configuration for Windows.

## Open Constraints

- Windows packaging must be validated on Windows or Windows CI.
- Installer format can be decided when packaging starts; `.msi` is the default target unless a simpler `.exe` installer is preferable.
- Backup/export is intentionally outside the first version, but the local SQLite file location should remain easy to document later.

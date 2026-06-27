# Moneta Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first executable foundation for Moneta: a pnpm TypeScript monorepo with hexagonal package boundaries, tested inventory/sales domain rules, application use cases, and a Windows-oriented desktop shell.

**Architecture:** The domain package contains pure business rules. The application package exposes use cases and repository ports. The desktop app consumes application APIs through an adapter boundary, while SQLite/Tauri persistence is introduced after the domain and application contracts are stable.

**Tech Stack:** pnpm workspaces, TypeScript, Vitest, React, Vite, Tauri-ready app layout.

---

## Scope Check

The design spec includes inventory, purchases, sales, customers, suppliers, receivables, payments, SQLite persistence, and Windows packaging. This first plan intentionally implements the foundation slice only: monorepo setup, domain rules, application ports/use cases, and the initial desktop app shell. SQLite repositories, full CRUD screens, and Windows installer packaging should follow in separate plans after this foundation passes.

## File Structure

- `package.json`: root workspace scripts for build, test, typecheck, and desktop dev.
- `pnpm-workspace.yaml`: workspace package discovery.
- `tsconfig.base.json`: shared compiler settings.
- `.gitignore`: generated files and local artifacts.
- `packages/domain`: pure business rules, value types, entities, and domain tests.
- `packages/application`: use cases, repository ports, in-memory test doubles, and application tests.
- `apps/desktop`: React/Vite desktop frontend with Tauri-ready folder boundary.

## Task 1: Workspace Foundation

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `packages/domain/package.json`
- Create: `packages/domain/tsconfig.json`
- Create: `packages/domain/vitest.config.ts`
- Create: `packages/domain/src/index.ts`
- Create: `packages/application/package.json`
- Create: `packages/application/tsconfig.json`
- Create: `packages/application/vitest.config.ts`
- Create: `packages/application/src/index.ts`

- [ ] **Step 1: Create root workspace files**

Create `package.json`:

```json
{
  "name": "moneta",
  "version": "0.1.0",
  "private": true,
  "packageManager": "pnpm@9.15.4",
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "typecheck": "pnpm -r typecheck",
    "dev:desktop": "pnpm --filter @moneta/desktop dev"
  },
  "devDependencies": {
    "@types/node": "^22.10.7",
    "typescript": "^5.7.3",
    "vitest": "^2.1.8"
  }
}
```

Create `pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

Create `tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

Create `.gitignore`:

```gitignore
node_modules/
dist/
.turbo/
.vite/
coverage/
*.log
.DS_Store
apps/desktop/src-tauri/target/
apps/desktop/src-tauri/gen/
```

- [ ] **Step 2: Create package scaffolds**

Create `packages/domain/package.json`:

```json
{
  "name": "@moneta/domain",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "devDependencies": {
    "typescript": "workspace:*",
    "vitest": "workspace:*"
  }
}
```

Create `packages/domain/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src/**/*.ts"]
}
```

Create `packages/domain/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "node"
  }
});
```

Create `packages/domain/src/index.ts`:

```ts
export const domainReady = true;
```

Create `packages/application/package.json`:

```json
{
  "name": "@moneta/application",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@moneta/domain": "workspace:*"
  },
  "devDependencies": {
    "typescript": "workspace:*",
    "vitest": "workspace:*"
  }
}
```

Create `packages/application/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src/**/*.ts"],
  "references": [
    {
      "path": "../domain"
    }
  ]
}
```

Create `packages/application/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "node"
  }
});
```

Create `packages/application/src/index.ts`:

```ts
export const applicationReady = true;
```

- [ ] **Step 3: Install dependencies**

Run:

```bash
pnpm install
```

Expected: lockfile is created and dependencies install successfully.

- [ ] **Step 4: Verify the empty workspace**

Run:

```bash
pnpm test
pnpm typecheck
pnpm build
```

Expected: all commands pass with no tests found or empty package output accepted by Vitest.

- [ ] **Step 5: Commit**

```bash
git add .gitignore package.json pnpm-workspace.yaml tsconfig.base.json packages/domain packages/application pnpm-lock.yaml
git commit -m "chore: scaffold monorepo workspace"
```

## Task 2: Domain Rules for Inventory and Sales

**Files:**
- Create: `packages/domain/src/money.ts`
- Create: `packages/domain/src/result.ts`
- Create: `packages/domain/src/product.ts`
- Create: `packages/domain/src/inventory.ts`
- Create: `packages/domain/src/sale.ts`
- Create: `packages/domain/src/domain-errors.ts`
- Modify: `packages/domain/src/index.ts`
- Test: `packages/domain/src/inventory.test.ts`
- Test: `packages/domain/src/sale.test.ts`

- [ ] **Step 1: Write failing inventory tests**

Create `packages/domain/src/inventory.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { Product } from "./product";
import { applyInventoryMovement, getAvailableStock } from "./inventory";

describe("inventory movements", () => {
  it("increases stock when a purchase movement is applied", () => {
    const product = Product.create({
      id: "product-1",
      sku: "SKU-001",
      name: "Arroz libra",
      unit: "unidad",
      minimumStock: 5,
      salePriceMinor: 4500,
      costMinor: 3200
    });

    const result = applyInventoryMovement({
      product,
      currentStock: 10,
      movement: {
        id: "movement-1",
        productId: product.id,
        type: "purchase",
        quantity: 12,
        reason: "Compra inicial",
        occurredAt: new Date("2026-06-27T10:00:00.000Z")
      }
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.stock).toBe(22);
    }
  });

  it("rejects a sale movement when stock is insufficient", () => {
    const product = Product.create({
      id: "product-1",
      sku: "SKU-001",
      name: "Arroz libra",
      unit: "unidad",
      minimumStock: 5,
      salePriceMinor: 4500,
      costMinor: 3200
    });

    const result = applyInventoryMovement({
      product,
      currentStock: 2,
      movement: {
        id: "movement-2",
        productId: product.id,
        type: "sale",
        quantity: 3,
        reason: "Venta",
        occurredAt: new Date("2026-06-27T11:00:00.000Z")
      }
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INSUFFICIENT_STOCK");
    }
  });

  it("reports available stock from applied movement history", () => {
    const stock = getAvailableStock([
      { type: "purchase", quantity: 10 },
      { type: "sale", quantity: 4 },
      { type: "adjustment_in", quantity: 2 },
      { type: "adjustment_out", quantity: 1 }
    ]);

    expect(stock).toBe(7);
  });
});
```

- [ ] **Step 2: Run inventory tests to verify failure**

Run:

```bash
pnpm --filter @moneta/domain test -- inventory.test.ts
```

Expected: FAIL because `product` and `inventory` modules do not exist.

- [ ] **Step 3: Write failing sale tests**

Create `packages/domain/src/sale.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createMoney } from "./money";
import { createSaleDraft, confirmSale } from "./sale";

describe("sales", () => {
  it("calculates sale totals from line quantities and prices", () => {
    const draft = createSaleDraft({
      id: "sale-1",
      customerId: "customer-1",
      occurredAt: new Date("2026-06-27T12:00:00.000Z"),
      paymentStatus: "paid",
      lines: [
        {
          productId: "product-1",
          quantity: 2,
          unitPrice: createMoney(4500)
        },
        {
          productId: "product-2",
          quantity: 1,
          unitPrice: createMoney(12000)
        }
      ]
    });

    expect(draft.total.minor).toBe(21000);
  });

  it("creates a receivable when a sale is confirmed as pending", () => {
    const draft = createSaleDraft({
      id: "sale-1",
      customerId: "customer-1",
      occurredAt: new Date("2026-06-27T12:00:00.000Z"),
      paymentStatus: "pending",
      lines: [
        {
          productId: "product-1",
          quantity: 2,
          unitPrice: createMoney(4500)
        }
      ]
    });

    const result = confirmSale(draft);

    expect(result.receivable).toEqual({
      id: "receivable-sale-1",
      customerId: "customer-1",
      saleId: "sale-1",
      originalAmount: createMoney(9000),
      paidAmount: createMoney(0),
      status: "open"
    });
  });
});
```

- [ ] **Step 4: Run sale tests to verify failure**

Run:

```bash
pnpm --filter @moneta/domain test -- sale.test.ts
```

Expected: FAIL because `money` and `sale` modules do not exist.

- [ ] **Step 5: Implement domain primitives and rules**

Create `packages/domain/src/result.ts`:

```ts
export type Result<TValue, TError> =
  | { ok: true; value: TValue }
  | { ok: false; error: TError };

export function ok<TValue>(value: TValue): Result<TValue, never> {
  return { ok: true, value };
}

export function err<TError>(error: TError): Result<never, TError> {
  return { ok: false, error };
}
```

Create `packages/domain/src/domain-errors.ts`:

```ts
export type DomainErrorCode =
  | "INSUFFICIENT_STOCK"
  | "INVALID_QUANTITY"
  | "INACTIVE_PRODUCT"
  | "INVALID_MONEY";

export type DomainError = {
  code: DomainErrorCode;
  message: string;
};
```

Create `packages/domain/src/money.ts`:

```ts
import { DomainError } from "./domain-errors";
import { Result, err, ok } from "./result";

export type Money = {
  minor: number;
  currency: "COP";
};

export function createMoney(minor: number): Money {
  if (!Number.isInteger(minor) || minor < 0) {
    throw new Error("Money must be a non-negative integer minor-unit amount.");
  }

  return { minor, currency: "COP" };
}

export function tryCreateMoney(minor: number): Result<Money, DomainError> {
  if (!Number.isInteger(minor) || minor < 0) {
    return err({
      code: "INVALID_MONEY",
      message: "El valor monetario debe ser un entero no negativo."
    });
  }

  return ok(createMoney(minor));
}

export function addMoney(values: Money[]): Money {
  return createMoney(values.reduce((total, value) => total + value.minor, 0));
}

export function multiplyMoney(value: Money, quantity: number): Money {
  return createMoney(value.minor * quantity);
}
```

Create `packages/domain/src/product.ts`:

```ts
export type ProductProps = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  minimumStock: number;
  salePriceMinor: number;
  costMinor: number;
  active?: boolean;
};

export class Product {
  readonly id: string;
  readonly sku: string;
  readonly name: string;
  readonly unit: string;
  readonly minimumStock: number;
  readonly salePriceMinor: number;
  readonly costMinor: number;
  readonly active: boolean;

  private constructor(props: Required<ProductProps>) {
    this.id = props.id;
    this.sku = props.sku;
    this.name = props.name;
    this.unit = props.unit;
    this.minimumStock = props.minimumStock;
    this.salePriceMinor = props.salePriceMinor;
    this.costMinor = props.costMinor;
    this.active = props.active;
  }

  static create(props: ProductProps): Product {
    return new Product({
      ...props,
      active: props.active ?? true
    });
  }
}
```

Create `packages/domain/src/inventory.ts`:

```ts
import { DomainError } from "./domain-errors";
import { Product } from "./product";
import { Result, err, ok } from "./result";

export type InventoryMovementType =
  | "purchase"
  | "sale"
  | "adjustment_in"
  | "adjustment_out";

export type InventoryMovement = {
  id: string;
  productId: string;
  type: InventoryMovementType;
  quantity: number;
  reason: string;
  occurredAt: Date;
};

export type StockMovementInput = Pick<InventoryMovement, "type" | "quantity">;

export type ApplyInventoryMovementInput = {
  product: Product;
  currentStock: number;
  movement: InventoryMovement;
};

export type StockState = {
  stock: number;
};

export function getAvailableStock(movements: StockMovementInput[]): number {
  return movements.reduce((stock, movement) => {
    if (movement.type === "purchase" || movement.type === "adjustment_in") {
      return stock + movement.quantity;
    }

    return stock - movement.quantity;
  }, 0);
}

export function applyInventoryMovement(
  input: ApplyInventoryMovementInput
): Result<StockState, DomainError> {
  if (!input.product.active) {
    return err({
      code: "INACTIVE_PRODUCT",
      message: "No se puede mover inventario de un producto inactivo."
    });
  }

  if (!Number.isInteger(input.movement.quantity) || input.movement.quantity <= 0) {
    return err({
      code: "INVALID_QUANTITY",
      message: "La cantidad debe ser un entero positivo."
    });
  }

  const nextStock = getAvailableStock([
    { type: "purchase", quantity: input.currentStock },
    { type: input.movement.type, quantity: input.movement.quantity }
  ]);

  if (nextStock < 0) {
    return err({
      code: "INSUFFICIENT_STOCK",
      message: "No hay inventario suficiente para completar el movimiento."
    });
  }

  return ok({ stock: nextStock });
}
```

Create `packages/domain/src/sale.ts`:

```ts
import { Money, addMoney, createMoney, multiplyMoney } from "./money";

export type SalePaymentStatus = "paid" | "pending";

export type SaleLine = {
  productId: string;
  quantity: number;
  unitPrice: Money;
};

export type SaleDraftInput = {
  id: string;
  customerId: string;
  occurredAt: Date;
  paymentStatus: SalePaymentStatus;
  lines: SaleLine[];
};

export type SaleDraft = SaleDraftInput & {
  total: Money;
};

export type Receivable = {
  id: string;
  customerId: string;
  saleId: string;
  originalAmount: Money;
  paidAmount: Money;
  status: "open" | "settled";
};

export type ConfirmedSale = {
  sale: SaleDraft;
  receivable: Receivable | null;
};

export function createSaleDraft(input: SaleDraftInput): SaleDraft {
  const total = addMoney(
    input.lines.map((line) => multiplyMoney(line.unitPrice, line.quantity))
  );

  return {
    ...input,
    total
  };
}

export function confirmSale(sale: SaleDraft): ConfirmedSale {
  if (sale.paymentStatus === "paid") {
    return { sale, receivable: null };
  }

  return {
    sale,
    receivable: {
      id: `receivable-${sale.id}`,
      customerId: sale.customerId,
      saleId: sale.id,
      originalAmount: sale.total,
      paidAmount: createMoney(0),
      status: "open"
    }
  };
}
```

Modify `packages/domain/src/index.ts`:

```ts
export * from "./domain-errors";
export * from "./inventory";
export * from "./money";
export * from "./product";
export * from "./result";
export * from "./sale";
```

- [ ] **Step 6: Run domain tests**

Run:

```bash
pnpm --filter @moneta/domain test
pnpm --filter @moneta/domain typecheck
```

Expected: all domain tests and typecheck pass.

- [ ] **Step 7: Commit**

```bash
git add packages/domain
git commit -m "feat: add inventory and sales domain rules"
```

## Task 3: Application Ports and Use Cases

**Files:**
- Create: `packages/application/src/ports.ts`
- Create: `packages/application/src/register-sale.ts`
- Modify: `packages/application/src/index.ts`
- Test: `packages/application/src/register-sale.test.ts`

- [ ] **Step 1: Write failing application use-case tests**

Create `packages/application/src/register-sale.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createMoney, Product } from "@moneta/domain";
import { registerSale } from "./register-sale";
import { InMemoryInventoryRepository, InMemorySaleRepository } from "./test-doubles";

describe("registerSale", () => {
  it("persists a paid sale and decreases inventory", async () => {
    const product = Product.create({
      id: "product-1",
      sku: "SKU-001",
      name: "Arroz libra",
      unit: "unidad",
      minimumStock: 5,
      salePriceMinor: 4500,
      costMinor: 3200
    });
    const inventory = new InMemoryInventoryRepository([{ product, stock: 10 }]);
    const sales = new InMemorySaleRepository();

    const result = await registerSale({
      inventory,
      sales
    })({
      id: "sale-1",
      customerId: "customer-1",
      occurredAt: new Date("2026-06-27T12:00:00.000Z"),
      paymentStatus: "paid",
      lines: [
        {
          productId: "product-1",
          quantity: 3,
          unitPrice: createMoney(4500)
        }
      ]
    });

    expect(result.ok).toBe(true);
    expect(inventory.getStock("product-1")).toBe(7);
    expect(sales.savedSales).toHaveLength(1);
  });

  it("does not persist the sale when inventory is insufficient", async () => {
    const product = Product.create({
      id: "product-1",
      sku: "SKU-001",
      name: "Arroz libra",
      unit: "unidad",
      minimumStock: 5,
      salePriceMinor: 4500,
      costMinor: 3200
    });
    const inventory = new InMemoryInventoryRepository([{ product, stock: 1 }]);
    const sales = new InMemorySaleRepository();

    const result = await registerSale({
      inventory,
      sales
    })({
      id: "sale-1",
      customerId: "customer-1",
      occurredAt: new Date("2026-06-27T12:00:00.000Z"),
      paymentStatus: "paid",
      lines: [
        {
          productId: "product-1",
          quantity: 3,
          unitPrice: createMoney(4500)
        }
      ]
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INSUFFICIENT_STOCK");
    }
    expect(inventory.getStock("product-1")).toBe(1);
    expect(sales.savedSales).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run application tests to verify failure**

Run:

```bash
pnpm --filter @moneta/application test -- register-sale.test.ts
```

Expected: FAIL because `register-sale` and `test-doubles` modules do not exist.

- [ ] **Step 3: Implement ports, use case, and test doubles**

Create `packages/application/src/ports.ts`:

```ts
import { Product, SaleDraft, InventoryMovement, Receivable } from "@moneta/domain";

export type ProductStock = {
  product: Product;
  stock: number;
};

export interface InventoryRepository {
  findProductStock(productId: string): Promise<ProductStock | null>;
  recordMovement(movement: InventoryMovement): Promise<void>;
  getStock(productId: string): number;
}

export interface SaleRepository {
  saveSale(sale: SaleDraft, receivable: Receivable | null): Promise<void>;
}
```

Create `packages/application/src/register-sale.ts`:

```ts
import {
  DomainError,
  SaleDraftInput,
  applyInventoryMovement,
  confirmSale,
  createSaleDraft,
  err,
  ok,
  Result
} from "@moneta/domain";
import { InventoryRepository, SaleRepository } from "./ports";

export type RegisterSaleDependencies = {
  inventory: InventoryRepository;
  sales: SaleRepository;
};

export function registerSale(deps: RegisterSaleDependencies) {
  return async (
    input: SaleDraftInput
  ): Promise<Result<{ saleId: string }, DomainError>> => {
    const movements = [];

    for (const line of input.lines) {
      const productStock = await deps.inventory.findProductStock(line.productId);

      if (!productStock) {
        return err({
          code: "INACTIVE_PRODUCT",
          message: "El producto no existe o no esta disponible."
        });
      }

      const movement = {
        id: `movement-${input.id}-${line.productId}`,
        productId: line.productId,
        type: "sale" as const,
        quantity: line.quantity,
        reason: `Venta ${input.id}`,
        occurredAt: input.occurredAt
      };

      const stockResult = applyInventoryMovement({
        product: productStock.product,
        currentStock: productStock.stock,
        movement
      });

      if (!stockResult.ok) {
        return stockResult;
      }

      movements.push(movement);
    }

    const sale = createSaleDraft(input);
    const confirmed = confirmSale(sale);

    for (const movement of movements) {
      await deps.inventory.recordMovement(movement);
    }

    await deps.sales.saveSale(confirmed.sale, confirmed.receivable);

    return ok({ saleId: input.id });
  };
}
```

Create `packages/application/src/test-doubles.ts`:

```ts
import {
  InventoryMovement,
  Product,
  Receivable,
  SaleDraft,
  getAvailableStock
} from "@moneta/domain";
import { InventoryRepository, ProductStock, SaleRepository } from "./ports";

export class InMemoryInventoryRepository implements InventoryRepository {
  private readonly products = new Map<string, Product>();
  private readonly initialStock = new Map<string, number>();
  private readonly movements = new Map<string, InventoryMovement[]>();

  constructor(items: ProductStock[]) {
    for (const item of items) {
      this.products.set(item.product.id, item.product);
      this.initialStock.set(item.product.id, item.stock);
      this.movements.set(item.product.id, []);
    }
  }

  async findProductStock(productId: string): Promise<ProductStock | null> {
    const product = this.products.get(productId);

    if (!product) {
      return null;
    }

    return {
      product,
      stock: this.getStock(productId)
    };
  }

  async recordMovement(movement: InventoryMovement): Promise<void> {
    const existing = this.movements.get(movement.productId) ?? [];
    this.movements.set(movement.productId, [...existing, movement]);
  }

  getStock(productId: string): number {
    const startingStock = this.initialStock.get(productId) ?? 0;
    const movements = this.movements.get(productId) ?? [];

    return getAvailableStock([
      { type: "purchase", quantity: startingStock },
      ...movements.map((movement) => ({
        type: movement.type,
        quantity: movement.quantity
      }))
    ]);
  }
}

export class InMemorySaleRepository implements SaleRepository {
  readonly savedSales: Array<{
    sale: SaleDraft;
    receivable: Receivable | null;
  }> = [];

  async saveSale(sale: SaleDraft, receivable: Receivable | null): Promise<void> {
    this.savedSales.push({ sale, receivable });
  }
}
```

Modify `packages/application/src/index.ts`:

```ts
export * from "./ports";
export * from "./register-sale";
```

- [ ] **Step 4: Run application tests**

Run:

```bash
pnpm --filter @moneta/application test
pnpm --filter @moneta/application typecheck
```

Expected: all application tests and typecheck pass.

- [ ] **Step 5: Commit**

```bash
git add packages/application
git commit -m "feat: add register sale use case"
```

## Task 4: Desktop App Shell

**Files:**
- Create: `apps/desktop/package.json`
- Create: `apps/desktop/index.html`
- Create: `apps/desktop/tsconfig.json`
- Create: `apps/desktop/vite.config.ts`
- Create: `apps/desktop/src/main.tsx`
- Create: `apps/desktop/src/App.tsx`
- Create: `apps/desktop/src/App.css`
- Create: `apps/desktop/src-tauri/tauri.conf.json`

- [ ] **Step 1: Create desktop package files**

Create `apps/desktop/package.json`:

```json
{
  "name": "@moneta/desktop",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -p tsconfig.json && vite build",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@moneta/application": "workspace:*",
    "@moneta/domain": "workspace:*",
    "@vitejs/plugin-react": "^4.3.4",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "vite": "^6.0.7"
  },
  "devDependencies": {
    "@types/react": "^19.0.7",
    "@types/react-dom": "^19.0.3",
    "typescript": "workspace:*"
  }
}
```

Create `apps/desktop/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "vite.config.ts"]
}
```

Create `apps/desktop/vite.config.ts`:

```ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false
  }
});
```

Create `apps/desktop/index.html`:

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Moneta</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Create the app shell**

Create `apps/desktop/src/main.tsx`:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./App.css";

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

Create `apps/desktop/src/App.tsx`:

```tsx
const navigationItems = [
  "Dashboard",
  "Productos",
  "Compras",
  "Ventas",
  "Clientes",
  "Proveedores",
  "Cartera",
  "Reportes"
];

const metrics = [
  { label: "Productos activos", value: "0" },
  { label: "Ventas de hoy", value: "$0" },
  { label: "Cartera pendiente", value: "$0" },
  { label: "Alertas de inventario", value: "0" }
];

export function App() {
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">M</span>
          <div>
            <strong>Moneta</strong>
            <small>Inventario y cartera</small>
          </div>
        </div>

        <nav className="navigation" aria-label="Principal">
          {navigationItems.map((item) => (
            <button className={item === "Dashboard" ? "active" : ""} key={item}>
              {item}
            </button>
          ))}
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p>Dashboard</p>
            <h1>Resumen operativo</h1>
          </div>
          <button className="primary-action">Nueva venta</button>
        </header>

        <section className="metric-grid" aria-label="Indicadores">
          {metrics.map((metric) => (
            <article className="metric-card" key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </article>
          ))}
        </section>

        <section className="content-grid">
          <div className="panel">
            <div className="panel-header">
              <h2>Actividad reciente</h2>
              <button>Ver todo</button>
            </div>
            <div className="empty-state">
              <strong>Sin movimientos registrados</strong>
              <span>Las compras, ventas y pagos apareceran aqui.</span>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <h2>Inventario bajo</h2>
              <button>Revisar</button>
            </div>
            <div className="empty-state">
              <strong>Sin alertas</strong>
              <span>Los productos bajo el minimo se mostraran aqui.</span>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
```

Create `apps/desktop/src/App.css`:

```css
:root {
  color: #202124;
  background: #f5f7f8;
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
    sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-width: 1024px;
}

button {
  border: 0;
  cursor: pointer;
  font: inherit;
}

.app-shell {
  display: grid;
  grid-template-columns: 264px 1fr;
  min-height: 100vh;
}

.sidebar {
  background: #111827;
  color: #f9fafb;
  padding: 24px 18px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 32px;
}

.brand-mark {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: #2dd4bf;
  color: #06201d;
  font-weight: 800;
}

.brand strong,
.brand small {
  display: block;
}

.brand small {
  color: #a7b0bd;
  margin-top: 3px;
}

.navigation {
  display: grid;
  gap: 6px;
}

.navigation button {
  width: 100%;
  border-radius: 8px;
  background: transparent;
  color: #cbd5e1;
  padding: 11px 12px;
  text-align: left;
}

.navigation button.active,
.navigation button:hover {
  background: #233041;
  color: #ffffff;
}

.workspace {
  padding: 28px;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.topbar p {
  margin: 0 0 4px;
  color: #64748b;
  font-size: 14px;
}

.topbar h1 {
  margin: 0;
  font-size: 28px;
}

.primary-action {
  border-radius: 8px;
  background: #0f766e;
  color: white;
  padding: 10px 16px;
  font-weight: 700;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 20px;
}

.metric-card,
.panel {
  border: 1px solid #d8dee5;
  border-radius: 8px;
  background: white;
}

.metric-card {
  display: grid;
  gap: 10px;
  padding: 18px;
}

.metric-card span {
  color: #64748b;
  font-size: 14px;
}

.metric-card strong {
  font-size: 26px;
}

.content-grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 20px;
}

.panel {
  min-height: 280px;
  padding: 18px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.panel-header h2 {
  margin: 0;
  font-size: 18px;
}

.panel-header button {
  border-radius: 8px;
  background: #eef2f7;
  color: #334155;
  padding: 8px 12px;
}

.empty-state {
  display: grid;
  place-items: center;
  gap: 6px;
  min-height: 190px;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  color: #64748b;
  text-align: center;
}

.empty-state strong {
  color: #334155;
}
```

- [ ] **Step 3: Create Tauri config**

Create `apps/desktop/src-tauri/tauri.conf.json`:

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "Moneta",
  "version": "0.1.0",
  "identifier": "com.moneta.desktop",
  "build": {
    "beforeDevCommand": "pnpm dev",
    "beforeBuildCommand": "pnpm build",
    "devUrl": "http://localhost:5173",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "title": "Moneta",
        "width": 1280,
        "height": 800,
        "minWidth": 1024,
        "minHeight": 700
      }
    ]
  },
  "bundle": {
    "active": true,
    "targets": ["msi"],
    "windows": {
      "wix": {
        "language": "es-ES"
      }
    }
  }
}
```

- [ ] **Step 4: Install desktop dependencies**

Run:

```bash
pnpm install
```

Expected: lockfile updates for React, Vite, and plugin dependencies.

- [ ] **Step 5: Verify desktop build**

Run:

```bash
pnpm --filter @moneta/desktop typecheck
pnpm --filter @moneta/desktop build
```

Expected: both commands pass and `apps/desktop/dist` is generated.

- [ ] **Step 6: Commit**

```bash
git add apps/desktop package.json pnpm-lock.yaml
git commit -m "feat: add desktop app shell"
```

## Task 5: Whole-Workspace Verification

**Files:**
- Modify only if verification exposes concrete failures in files from Tasks 1-4.

- [ ] **Step 1: Run full verification**

Run:

```bash
pnpm test
pnpm typecheck
pnpm build
```

Expected: all packages pass.

- [ ] **Step 2: Start the local desktop web shell**

Run:

```bash
pnpm dev:desktop
```

Expected: Vite prints a local URL, usually `http://localhost:5173/`.

- [ ] **Step 3: Inspect the shell**

Open the local URL and verify:

- The first screen is the Moneta app shell.
- The left navigation includes Dashboard, Productos, Compras, Ventas, Clientes, Proveedores, Cartera, and Reportes.
- Dashboard metrics and empty states render without overlapping text.
- The UI is Spanish by default.

- [ ] **Step 4: Stop the dev server**

Stop the Vite process with `Ctrl+C`.

- [ ] **Step 5: Commit fixes only if changes were needed**

If Step 1, Step 2, or Step 3 required fixes, commit them:

```bash
git add apps packages package.json pnpm-lock.yaml tsconfig.base.json
git commit -m "fix: stabilize Moneta foundation"
```

If no fixes were needed, do not create an empty commit.

## Self-Review

- Spec coverage: this plan covers monorepo structure, hexagonal domain/application boundaries, initial Spanish desktop shell, TypeScript testing, and Windows-oriented Tauri configuration. SQLite persistence, detailed CRUD screens, and installer validation remain outside this foundation slice by design.
- Red flag scan: this plan avoids uncertainty markers and gives exact files, code, commands, and expected results for the foundation.
- Type consistency: `Product`, `Money`, `InventoryMovement`, `SaleDraft`, `Receivable`, `registerSale`, `InventoryRepository`, and `SaleRepository` are named consistently across tasks.

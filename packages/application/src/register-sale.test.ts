import { createMoney, Product } from "@moneta/domain";
import { describe, expect, it } from "vitest";
import { registerSale } from "./register-sale";
import {
  InMemoryInventoryRepository,
  InMemorySaleRepository
} from "./test-doubles";

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

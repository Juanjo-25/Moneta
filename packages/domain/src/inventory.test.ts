import { describe, expect, it } from "vitest";
import { applyInventoryMovement, getAvailableStock } from "./inventory";
import { Product } from "./product";

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

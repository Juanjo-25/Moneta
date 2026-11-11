import { describe, expect, it } from "vitest";
import {
  buildInventorySuggestions,
  classifyAbc,
  classifyXyz,
  type DemandMovement,
  type SuggestionProductInput
} from "./inventory-suggestions";

const DAY_MS = 24 * 60 * 60 * 1000;
const now = new Date(2026, 10, 10, 15, 0, 0).getTime();

function product(overrides: Partial<SuggestionProductInput> = {}): SuggestionProductInput {
  return {
    id: "p1",
    sku: "SKU-1",
    name: "Arroz",
    unit: "Unidad",
    stock: 30,
    minimumStock: 0,
    costMinor: 1000,
    active: true,
    ...overrides
  };
}

function dailySales(productId: string, days: number, quantity: (day: number) => number): DemandMovement[] {
  return Array.from({ length: days }, (_, day) => ({
    productId,
    quantity: quantity(day),
    occurredAtMs: now - day * DAY_MS,
    revenueMinor: quantity(day) * 2000
  })).filter((movement) => movement.quantity > 0);
}

describe("inventory suggestions", () => {
  it("computes min, max and order for steady demand", () => {
    const [row] = buildInventorySuggestions({
      products: [product({ stock: 10 })],
      sales: dailySales("p1", 90, () => 4),
      nowMs: now,
      settings: { leadTimeDays: 5, reviewPeriodDays: 7, windowDays: 90 }
    });

    expect(row!.averageDailyDemand).toBeCloseTo(4);
    expect(row!.safetyStock).toBe(0);
    expect(row!.suggestedMin).toBe(20);
    expect(row!.suggestedMax).toBe(48);
    expect(row!.status).toBe("review");
    expect(row!.suggestedOrderQuantity).toBe(38);
    expect(row!.suggestedOrderCostMinor).toBe(38000);
    expect(row!.confidence).toBe("high");
    expect(row!.coverageDays).toBeCloseTo(2.5);
  });

  it("adds safety stock when demand varies", () => {
    const [row] = buildInventorySuggestions({
      products: [product({ stock: 200 })],
      sales: dailySales("p1", 90, (day) => (Math.floor(day / 7) % 2 === 0 ? 8 : 0)),
      nowMs: now,
      settings: { leadTimeDays: 5, reviewPeriodDays: 7, windowDays: 90 }
    });

    expect(row!.safetyStock).toBeGreaterThan(0);
    expect(row!.xyzClass).not.toBe("X");
    expect(row!.suggestedMax).toBeGreaterThan(row!.suggestedMin);
  });

  it("flags excess stock and products without sales without suggesting orders", () => {
    const rows = buildInventorySuggestions({
      products: [product({ stock: 500 }), product({ id: "p2", stock: 12 })],
      sales: dailySales("p1", 90, () => 1),
      nowMs: now,
      settings: { leadTimeDays: 5, reviewPeriodDays: 7, windowDays: 90 }
    });

    expect(rows[0]!.status).toBe("excess");
    expect(rows[0]!.suggestedOrderQuantity).toBe(0);
    expect(rows[1]!.status).toBe("no-sales");
    expect(rows[1]!.suggestedOrderQuantity).toBe(0);
  });

  it("subtracts returns and marks short history as low confidence", () => {
    const [row] = buildInventorySuggestions({
      products: [product()],
      sales: dailySales("p1", 10, () => 2),
      returns: [{ productId: "p1", quantity: 10, occurredAtMs: now }],
      nowMs: now,
      settings: { windowDays: 90 }
    });

    expect(row!.historyDays).toBe(10);
    expect(row!.averageDailyDemand).toBeCloseTo(1);
    expect(row!.confidence).toBe("low");
  });

  it("ignores inactive products", () => {
    expect(
      buildInventorySuggestions({ products: [product({ active: false })], sales: [], nowMs: now })
    ).toHaveLength(0);
  });

  it("classifies ABC by cumulative revenue and XYZ by variation", () => {
    const abc = classifyAbc(new Map([["a", 800], ["b", 150], ["c", 50], ["d", 0]]));
    expect([abc.get("a"), abc.get("b"), abc.get("c"), abc.get("d")]).toEqual(["A", "B", "C", "C"]);
    expect([classifyXyz(0.2), classifyXyz(0.8), classifyXyz(1.5)]).toEqual(["X", "Y", "Z"]);
  });
});

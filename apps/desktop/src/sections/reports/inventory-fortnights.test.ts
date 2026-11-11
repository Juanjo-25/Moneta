import { describe, expect, it } from "vitest";
import { getUpcomingFortnights, planFortnightOrders } from "./inventory-fortnights";

describe("getUpcomingFortnights", () => {
  it("returns the second half of the month and the first half of the next one", () => {
    const [first, second] = getUpcomingFortnights(new Date(2026, 10, 11), 7);

    expect(first.label).toBe("16–30 nov");
    expect(first.days).toBe(15);
    expect(first.orderBy).toEqual(new Date(2026, 10, 9));
    expect(second.label).toBe("1–15 dic");
    expect(second.days).toBe(15);
  });

  it("includes a fortnight that starts today and handles month ends", () => {
    expect(getUpcomingFortnights(new Date(2026, 1, 16), 7).map((f) => [f.label, f.days])).toEqual([
      ["16–28 feb", 13],
      ["1–15 mar", 15]
    ]);
    expect(getUpcomingFortnights(new Date(2026, 11, 20), 7).map((f) => f.label)).toEqual([
      "1–15 ene",
      "16–31 ene"
    ]);
  });
});

describe("planFortnightOrders", () => {
  const today = new Date(2026, 10, 11);
  const fortnights = getUpcomingFortnights(today, 7);

  it("covers each fortnight's demand plus safety stock after current stock runs down", () => {
    // 2 por día: quedan 5 días hasta el 16 → 20 - 10 = 10 al iniciar.
    // Quincena 1: 2×15 + 4 - 10 = 24. Al terminarla quedan 4 (seguridad).
    // Quincena 2: 2×15 + 4 - 4 = 30.
    expect(
      planFortnightOrders({ averageDailyDemand: 2, hasDemand: true, safetyStock: 4, stock: 20 }, fortnights, today)
    ).toEqual([24, 30]);
  });

  it("does not order when stock already covers the first fortnight", () => {
    expect(
      planFortnightOrders({ averageDailyDemand: 1, hasDemand: true, safetyStock: 2, stock: 60 }, fortnights, today)
    ).toEqual([0, 0]);
  });

  it("returns null for products without sales", () => {
    expect(
      planFortnightOrders({ averageDailyDemand: 0, hasDemand: false, safetyStock: 0, stock: 9 }, fortnights, today)
    ).toBeNull();
  });
});

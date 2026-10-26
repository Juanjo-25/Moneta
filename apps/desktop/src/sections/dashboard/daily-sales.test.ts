import { describe, expect, it } from "vitest";
import {
  buildDailySales,
  chartTicks,
  compactSalesAmount,
  monthValue
} from "./daily-sales";
import {
  dailyCredit,
  dailyCreditsFixture,
  dailySale,
  dailySalesFixture
} from "../../test/daily-sales-fixture";

const today = new Date(2026, 9, 15, 12);

describe("daily sales", () => {
  it("groups by document date, counts sales and subtracts only confirmed credit notes", () => {
    const rows = buildDailySales(
      "2026-10",
      dailySalesFixture,
      dailyCreditsFixture,
      today
    );
    expect(rows[12]).toMatchObject({
      grossMinor: 300000,
      creditsMinor: 50000,
      valueMinor: 250000,
      future: false
    });
    expect(rows[12]!.sales.map((sale) => sale.id)).toEqual(["october"]);
    expect(rows[12]!.creditNotes.map((note) => note.id)).toEqual(["confirmed"]);
    expect(rows[0]!.valueMinor).toBe(0);
    expect(
      buildDailySales("2026-08", dailySalesFixture, [], today)[12]!.sales
    ).toHaveLength(2);
  });

  it("keeps the real month length and distinguishes future dates from zero sales", () => {
    expect(buildDailySales("2024-02", [], [], today)).toHaveLength(29);
    expect(buildDailySales("2025-02", [], [], today)).toHaveLength(28);
    expect(buildDailySales("2026-09", [], [], today)).toHaveLength(30);
    const rows = buildDailySales(
      "2026-10",
      [dailySale("future-record", "2026-10-20", 100)],
      [],
      today
    );
    expect(rows[14]!.future).toBe(false);
    expect(rows[15]!.future).toBe(true);
    expect(rows[19]).toMatchObject({ future: false, valueMinor: 100 });
  });

  it("preserves negative net days and exact monthly totals after multiple adjustments", () => {
    const rows = buildDailySales(
      "2026-10",
      [dailySale("sale", "2026-10-13", 100)],
      [dailyCredit("1", "2026-10-13", 50), dailyCredit("2", "2026-10-14", 200)],
      today
    );
    expect(rows[12]!.valueMinor).toBe(50);
    expect(rows[13]!.valueMinor).toBe(-200);
    expect(rows.reduce((sum, row) => sum + row.valueMinor, 0)).toBe(-150);
    const ticks = chartTicks(rows.map((row) => row.valueMinor));
    expect(ticks[0]).toBeLessThanOrEqual(-200);
    expect(ticks.at(-1)).toBeGreaterThanOrEqual(50);
    expect(ticks).toContain(0);
    expect(chartTicks([]).every(Number.isFinite)).toBe(true);
  });

  it("uses occurrence date for legacy records and formats whole COP amounts consistently", () => {
    const legacy = {
      ...dailySale("legacy", "", 4500),
      occurredAtMs: new Date(2026, 8, 8, 12).getTime()
    };
    expect(buildDailySales("2026-09", [legacy], [], today)[7]!.valueMinor).toBe(
      4500
    );
    expect(monthValue(new Date(2026, 0, 15), -1)).toBe("2025-12");
    expect(compactSalesAmount(1500000)).toBe("$1,5 M");
    expect(compactSalesAmount(500000)).toBe("$500 mil");
    expect(compactSalesAmount(-5000)).toBe("−$5 mil");
  });
});

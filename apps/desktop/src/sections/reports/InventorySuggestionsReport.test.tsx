import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { dailySale } from "../../test/daily-sales-fixture";
import type { ProductRecord, SaleRecord } from "../../types";
import { InventorySuggestionsReport } from "./InventorySuggestionsReport";

const now = new Date(2026, 10, 10, 12).getTime();

function isoDaysAgo(days: number) {
  const date = new Date(now - days * 24 * 60 * 60 * 1000);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function sale(day: number): SaleRecord {
  return {
    ...dailySale(`s-${day}`, isoDaysAgo(day), 8000),
    lines: [{
      id: `l-${day}`, productId: "rice", productName: "Arroz", unit: "Kg", quantity: 4,
      unitCostMinorAtSale: 1000, unitPriceMinor: 2000, discountPercent: 0, discountMinor: 0,
      taxPercent: 0, taxMinor: 0, subtotalMinor: 8000, costMinor: 4000, marginMinor: 4000,
      marginPercent: 50, totalMinor: 8000
    }]
  };
}

const products: ProductRecord[] = [
  { id: "rice", sku: "ARZ", name: "Arroz", unit: "Kg", costMinor: 1000, salePriceMinor: 2000, minimumStock: 0, stock: 5, active: true },
  { id: "beans", sku: "FRJ", name: "Frijol", unit: "Kg", costMinor: 1000, salePriceMinor: 2000, minimumStock: 0, stock: 9, active: true }
];

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("inventory suggestions report", () => {
  it("shows advisory suggestions and only changes the minimum when the user clicks", async () => {
    const onUpdateProduct = vi.fn(async () => true);
    render(
      <InventorySuggestionsReport
        creditNotes={[]}
        formatCurrency={(value) => `$${value}`}
        navigation={null}
        nowMs={now}
        onUpdateProduct={onUpdateProduct}
        products={products}
        purchases={[]}
        sales={Array.from({ length: 90 }, (_, day) => sale(day))}
      />
    );

    const table = screen.getByRole("table", { name: "Sugerencias de inventario" });
    const riceRow = within(table).getByText("Arroz").closest("tr")!;
    expect(within(riceRow).getByText("Revisar pronto")).toBeTruthy();
    expect(within(riceRow).getByText("28 – 56")).toBeTruthy();
    expect(riceRow.textContent).toContain("considera comprar ~51");
    const beansRow = within(table).getByText("Frijol").closest("tr")!;
    expect(within(beansRow).getByText("Sin ventas")).toBeTruthy();
    expect(onUpdateProduct).not.toHaveBeenCalled();

    const user = userEvent.setup();
    await user.click(within(riceRow).getByRole("button", { name: "Usar 28 como mínimo" }));
    expect(onUpdateProduct).toHaveBeenCalledWith(
      expect.objectContaining({ id: "rice", minimumStock: 28 })
    );
  });
});

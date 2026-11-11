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
  function renderReport(onUpdateProduct = vi.fn(async () => true)) {
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
    return onUpdateProduct;
  }

  it("shows advisory suggestions and only changes the minimum when the user clicks", async () => {
    const onUpdateProduct = renderReport();
    const user = userEvent.setup();

    const table = screen.getByRole("table", { name: "Sugerencias de inventario" });
    const riceRow = within(table).getByText("Arroz").closest("tr")!;
    expect(within(riceRow).getByText("Revisar pronto")).toBeTruthy();
    expect(within(riceRow).getByText("28 – 56")).toBeTruthy();
    expect(
      within(riceRow).getByRole("img", { name: /Stock 5, por debajo del mínimo sugerido/ })
    ).toBeTruthy();
    expect(riceRow.textContent).not.toContain("considera comprar");
    const beansRow = within(table).getByText("Frijol").closest("tr")!;
    expect(within(beansRow).getByText("Sin ventas")).toBeTruthy();
    expect(onUpdateProduct).not.toHaveBeenCalled();

    const toggle = within(riceRow).getByRole("button", { name: "Ver detalle de Arroz" });
    await user.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    const detail = document.getElementById(toggle.getAttribute("aria-controls")!)!;
    expect(detail.textContent).toContain("considera comprar ~51");

    await user.click(within(detail).getByRole("button", { name: "Usar 28 como mínimo" }));
    expect(onUpdateProduct).toHaveBeenCalledWith(
      expect.objectContaining({ id: "rice", minimumStock: 28 })
    );

    await user.click(within(riceRow).getByRole("button", { name: "Ocultar detalle de Arroz" }));
    expect(document.getElementById(toggle.getAttribute("aria-controls")!)).toBeNull();
  });

  it("exports filters, units and blank ranges, and drops a stale file when filters change", async () => {
    renderReport();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Sin ventas 1" }));
    await user.click(screen.getByRole("button", { name: "Exportar a Excel" }));
    const link = await screen.findByRole("link", { name: "Descargar archivo Excel" });
    const xml = decodeURIComponent(link.getAttribute("href")!.split(",").slice(1).join(","));
    const cellsOf = (rowText: string) => {
      const row = xml.split("<Row>").find((candidate) => candidate.includes(rowText))!;
      return [...row.matchAll(/<Data ss:Type="(\w+)">([^<]*)<\/Data>/g)].map(([, , value]) => value);
    };

    expect(cellsOf("Prioridad")).toEqual(["Prioridad", "Sin ventas"]);
    expect(cellsOf("Productos exportados")).toEqual(["Productos exportados", "1 de 2"]);
    expect(xml).toContain("Clase ABC");
    expect(xml).not.toContain("Arroz");

    const header = cellsOf("Explicacion");
    const beans = cellsOf("Frijol");
    const column = (name: string) => beans[header.indexOf(name)];
    expect(column("Unidad")).toBe("Kg");
    expect(column("Stock actual")).toBe("9");
    expect(column("Costo unitario COP")).toBe("1000");
    expect(column("Minimo sugerido")).toBe("");
    expect(column("Maximo sugerido")).toBe("");
    expect(column("Comprar sugerido")).toBe("");

    await user.type(screen.getByLabelText("Buscar producto"), "frijol");
    expect(screen.queryByRole("link", { name: "Descargar archivo Excel" })).toBeNull();
  });

  it("counts products per priority and filters them with the search box", async () => {
    renderReport();
    const user = userEvent.setup();
    const filters = screen.getByRole("group", { name: "Filtrar por prioridad" });

    expect(within(filters).getByRole("button", { name: "Todos 2" })).toBeTruthy();
    expect(within(filters).getByRole("button", { name: "Revisar pronto 1" })).toBeTruthy();
    expect(within(filters).getByRole("button", { name: "Sin ventas 1" })).toBeTruthy();

    const search = screen.getByLabelText("Buscar producto");
    await user.type(search, "frj");
    const table = screen.getByRole("table", { name: "Sugerencias de inventario" });
    expect(within(table).queryByText("Arroz")).toBeNull();
    expect(within(table).getByText("Frijol")).toBeTruthy();
    expect(within(filters).getByRole("button", { name: "Todos 1" })).toBeTruthy();
    expect(screen.getByText("1 de 2 productos")).toBeTruthy();

    await user.type(search, "{Escape}");
    expect(within(table).getByText("Arroz")).toBeTruthy();

    await user.type(search, "inexistente");
    expect(screen.getByText(/Ningún producto coincide/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Limpiar búsqueda" }));
    expect(within(table).getByText("Frijol")).toBeTruthy();
  });
});

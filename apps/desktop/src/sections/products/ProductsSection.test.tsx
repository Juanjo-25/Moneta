import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { afterEach, expect, it, vi } from "vitest";
import type { ProductRecord } from "../../types";
import { ProductsSection } from "./ProductsSection";

const products: ProductRecord[] = [
  { id: "coffee", sku: "CAF-001", name: "Café molido especial", unit: "Libra", stock: 12, minimumStock: 3, costMinor: 500, salePriceMinor: 800, active: true },
  { id: "rice", sku: "ARZ-002", name: "Arroz blanco", unit: "Libra", stock: 2, minimumStock: 3, costMinor: 200, salePriceMinor: 400, active: true },
  { id: "empty", sku: "CAF-003", name: "Café en grano", unit: "Kg", stock: 0, minimumStock: 1, costMinor: 700, salePriceMinor: 900, active: true },
  { id: "inactive", sku: "CAF-004", name: "Café descafeinado", unit: "Libra", stock: 0, minimumStock: 2, costMinor: 600, salePriceMinor: 800, active: false }
];

function makeProps(): ComponentProps<typeof ProductsSection> {
  return {
    creditNotes: [],
    deleteAllProductsRequestId: 0,
    zeroAllInventoryRequestId: 0,
    formVisible: false,
    formatCurrency: (amount) => `$${amount}`,
    formatIntegerInput: (value) => value,
    inventoryAdjustments: [],
    isLowStock: (product) => product.active && product.stock <= product.minimumStock,
    onCloseForm: vi.fn(),
    onCreateProduct: vi.fn(async () => true),
    onDeleteAllProducts: vi.fn(async () => ({ blockedCount: 0, deletedCount: 0, deletedProductIds: [], error: null })),
    onDeleteProduct: vi.fn(async () => null),
    onRegisterInventoryAdjustment: vi.fn(async () => null),
    onZeroAllInventory: vi.fn(async () => null),
    onUpdateProduct: vi.fn(async () => true),
    parseNonNegativeInteger: (value) => value === "" ? null : Number(value),
    products,
    purchases: [],
    sales: [],
    settings: {
      company: { address: "", city: "", document: "", email: "", logoDataUri: "", name: "Moneta", phone: "" },
      invoice: { accentColor: "#475569", legalNote: "", observations: "", title: "REMISION" },
      invoiceNumbering: { startingNumber: 1 },
      sellers: []
    }
  };
}

function visibleNames() {
  const table = screen.getByRole("table", { name: "Productos registrados" });
  return within(table).getAllByRole("row").slice(1).map((row) => within(row).getAllByRole("cell")[1]?.textContent);
}

afterEach(cleanup);

it("searches partial names and codes with words in any order, ignoring accents, case and extra spaces", async () => {
  const user = userEvent.setup();
  render(<ProductsSection {...makeProps()} />);
  const search = screen.getByRole("searchbox", { name: "Buscar productos" });

  await user.type(search, "  ESPECIAL cafe   ");
  expect(visibleNames()).toEqual(["Café molido especial"]);
  expect(screen.getByText("Mostrando 1 de 4 productos")).toBeTruthy();

  await user.clear(search);
  await user.type(search, "002 arr");
  expect(visibleNames()).toEqual(["Arroz blanco"]);

  await user.clear(search);
  await user.type(search, "   ");
  expect(visibleNames()).toHaveLength(4);
});

it("combines search, stock and active status filters and restores the catalog when cleared", async () => {
  const user = userEvent.setup();
  render(<ProductsSection {...makeProps()} />);
  const search = screen.getByRole("searchbox", { name: "Buscar productos" });
  const stock = screen.getByLabelText("Existencias");
  const status = screen.getByLabelText("Estado del producto");

  await user.selectOptions(stock, "in-stock");
  expect(visibleNames()).toEqual(["Café molido especial", "Arroz blanco"]);
  await user.selectOptions(stock, "low-stock");
  expect(visibleNames()).toEqual(["Arroz blanco", "Café en grano", "Café descafeinado"]);
  await user.type(search, "cafe");
  await user.selectOptions(stock, "out-of-stock");
  await user.selectOptions(status, "active");
  expect(visibleNames()).toEqual(["Café en grano"]);
  await user.selectOptions(status, "inactive");
  expect(visibleNames()).toEqual(["Café descafeinado"]);

  await user.click(screen.getByRole("button", { name: "Limpiar filtros" }));
  expect(visibleNames()).toHaveLength(4);
  expect((search as HTMLInputElement).value).toBe("");
  expect((stock as HTMLSelectElement).value).toBe("all");
  expect((status as HTMLSelectElement).value).toBe("all");
  expect(document.activeElement).toBe(search);
});

it("explains empty search results while leaving adjustment and history product choices available", async () => {
  const user = userEvent.setup();
  render(<ProductsSection {...makeProps()} />);
  await user.type(screen.getByRole("searchbox", { name: "Buscar productos" }), "inexistente");

  expect(screen.getByText("No se encontraron productos")).toBeTruthy();
  expect(screen.getByText("Mostrando 0 de 4 productos")).toBeTruthy();
  expect(screen.queryByRole("table", { name: "Productos registrados" })).toBeNull();
  expect(within(screen.getByLabelText("Producto a ajustar")).getAllByRole("option")).toHaveLength(4);
  await user.click(screen.getByRole("button", { name: "Ver historial" }));
  expect(within(screen.getByLabelText("Producto del historial")).getAllByRole("option")).toHaveLength(5);
  await user.click(screen.getByRole("button", { name: "Limpiar filtros" }));
  expect(visibleNames()).toHaveLength(4);
});

it("keeps product actions working in the filtered list and refreshes results after inventory changes", async () => {
  const user = userEvent.setup();
  const props = makeProps();
  const { rerender } = render(<ProductsSection {...props} />);
  await user.type(screen.getByRole("searchbox", { name: "Buscar productos" }), "ARZ");
  await user.click(screen.getByRole("button", { name: "Acciones de Arroz blanco" }));
  await user.click(screen.getByRole("menuitem", { name: "Editar" }));
  expect((screen.getByLabelText("Producto") as HTMLInputElement).value).toBe("Arroz blanco");

  await user.selectOptions(screen.getByLabelText("Existencias"), "in-stock");
  rerender(<ProductsSection {...props} products={products.map((product) => product.id === "rice" ? { ...product, stock: 0 } : product)} />);
  expect(screen.getByText("No se encontraron productos")).toBeTruthy();
  expect(screen.getByText("Mostrando 0 de 4 productos")).toBeTruthy();
});

it("distinguishes an empty inventory from a search with no matches", () => {
  render(<ProductsSection {...makeProps()} products={[]} />);
  expect(screen.getByText("Sin productos registrados")).toBeTruthy();
  expect(screen.queryByText("No se encontraron productos")).toBeNull();
});

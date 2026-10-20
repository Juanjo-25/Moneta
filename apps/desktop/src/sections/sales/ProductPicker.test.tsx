import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import type { ProductRecord } from "../../types";
import { ProductPicker } from "./ProductPicker";

const longName = "Manguera reforzada negra de media pulgada para conducción de agua, rollo de 100 metros";
const products: ProductRecord[] = [
  { id: "hose", sku: "MG-001", name: longName, unit: "Metro", stock: 12, minimumStock: 1, costMinor: 15000, salePriceMinor: 25000, active: true },
  { id: "clear-hose", sku: "TR-02", name: "Manguera transparente", unit: "Metro", stock: 7, minimumStock: 1, costMinor: 5000, salePriceMinor: 8000, active: true },
  { id: "inactive", sku: "MG-002", name: "Manguera inactiva", unit: "Metro", stock: 3, minimumStock: 1, costMinor: 5000, salePriceMinor: 8000, active: false }
];

function Picker({ onSubmit = vi.fn() }: { onSubmit?: () => void }) {
  const [value, setValue] = useState("");
  return (
    <form onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
      <ProductPicker formatCurrency={(amount) => `$${amount}`} onSelect={(product) => setValue(product?.id ?? "")} products={products} value={value} />
      <output aria-label="Producto elegido">{value}</output>
      <button type="button">Siguiente campo</button>
    </form>
  );
}

afterEach(cleanup);

it("finds words in any order without accents and supports product codes", async () => {
  const user = userEvent.setup();
  render(<Picker />);
  const input = screen.getByRole("combobox", { name: "Producto buscable" });
  await user.type(input, "AGUA MANGUERA conduccion");
  const list = screen.getByRole("listbox");
  expect(within(list).getAllByRole("option")).toHaveLength(1);
  expect(within(list).getByRole("option", { name: longName })).toBeTruthy();
  await user.clear(input);
  await user.type(input, "tr-02");
  await user.keyboard("{Enter}");
  expect(screen.getByLabelText("Producto elegido").textContent).toBe("clear-hose");
  expect((input as HTMLInputElement).value).toBe("Manguera transparente");
});

it("shows complete long names with stock and price and keeps the selection visible", async () => {
  const user = userEvent.setup();
  render(<Picker />);
  await user.click(screen.getByRole("button", { name: "Abrir productos" }));
  const list = screen.getByRole("listbox");
  expect(within(list).getAllByRole("option")).toHaveLength(2);
  const option = within(list).getByRole("option", { name: longName });
  expect(within(option).getByText("$25000")).toBeTruthy();
  expect(within(option).getByText(/Código: MG-001 · Stock: 12/)).toBeTruthy();
  await user.click(option);
  const selected = screen.getByLabelText("Producto seleccionado");
  expect(within(selected).getByText(longName)).toBeTruthy();
  expect(within(selected).getByText(/Stock disponible: 12/)).toBeTruthy();
  expect(screen.queryByRole("listbox")).toBeNull();
});

it("supports arrow keys, Enter and Escape without submitting the invoice", async () => {
  const user = userEvent.setup();
  const onSubmit = vi.fn();
  render(<Picker onSubmit={onSubmit} />);
  const input = screen.getByRole("combobox", { name: "Producto buscable" });
  await user.click(input);
  await user.keyboard("{ArrowDown}{ArrowDown}");
  const activeId = input.getAttribute("aria-activedescendant");
  expect(screen.getByRole("listbox").querySelector(`[id="${activeId}"]`)?.getAttribute("aria-label")).toBe("Manguera transparente");
  await user.keyboard("{ArrowUp}{Enter}");
  expect(screen.getByLabelText("Producto elegido").textContent).toBe("hose");
  expect(onSubmit).not.toHaveBeenCalled();
  await user.keyboard("{ArrowDown}{Escape}");
  expect(input.getAttribute("aria-expanded")).toBe("false");
  expect(screen.getByLabelText("Producto elegido").textContent).toBe("hose");
});

it("clears the selection, handles empty results and closes when focus leaves", async () => {
  const user = userEvent.setup();
  const onSubmit = vi.fn();
  render(<Picker onSubmit={onSubmit} />);
  const input = screen.getByRole("combobox", { name: "Producto buscable" });
  await user.type(input, "MG-001{Enter}");
  await user.click(screen.getByRole("button", { name: "Limpiar búsqueda de productos" }));
  expect(screen.getByLabelText("Producto elegido").textContent).toBe("");
  expect((input as HTMLInputElement).value).toBe("");
  await user.type(input, "inexistente{Enter}");
  expect(screen.getByText("Sin productos coincidentes")).toBeTruthy();
  expect(onSubmit).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Siguiente campo" }));
  expect(screen.queryByRole("listbox")).toBeNull();
});

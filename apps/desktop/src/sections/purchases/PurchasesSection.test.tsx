import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { PurchasesSection } from "./PurchasesSection";

afterEach(cleanup);

function setup() {
  const onRegisterPurchase = vi.fn().mockResolvedValue(true);
  render(
    <PurchasesSection
      formatCurrency={(value) => `$${value}`}
      formatIntegerInput={(value) => value.replace(/[^0-9]/g, "")}
      parseNonNegativeInteger={(value) => /^\d+$/.test(value) ? Number(value) : null}
      onCreateProduct={vi.fn()}
      onCreateSupplier={vi.fn()}
      onDeletePurchase={vi.fn()}
      onRegisterPurchase={onRegisterPurchase}
      products={[
        { id: "rice", sku: "1", name: "Arroz", unit: "Libra", costMinor: 3000, salePriceMinor: 4500, stock: 4, minimumStock: 1, active: true },
        { id: "sugar", sku: "2", name: "Azucar", unit: "Kg", costMinor: 2000, salePriceMinor: 3000, stock: 5, minimumStock: 1, active: true }
      ]}
      purchases={[]}
      suppliers={[{ id: "supplier", name: "Proveedor", active: true, address: "", city: "", department: "", document: "", email: "", phone: "" }]}
      supplierPayables={[]}
    />
  );
  return { user: userEvent.setup(), onRegisterPurchase };
}

async function addLine(user: UserEvent, productId = "rice") {
  await user.selectOptions(screen.getByLabelText("Producto"), productId);
  await user.type(screen.getByLabelText("Cantidad compra"), "2");
  await user.type(screen.getByLabelText("Costo unitario"), "3000");
  await user.click(screen.getByRole("button", { name: "Agregar producto" }));
}

it("cancels line changes while preserving the next product being entered", async () => {
  const { user, onRegisterPurchase } = setup();
  await addLine(user);
  await user.selectOptions(screen.getByLabelText("Proveedor"), "supplier");
  await user.type(screen.getByLabelText("Fecha emision"), "2026-10-20");
  await user.selectOptions(screen.getByLabelText("Producto"), "sugar");
  await user.type(screen.getByLabelText("Cantidad compra"), "1");
  await user.type(screen.getByLabelText("Costo unitario"), "2000");

  await user.click(screen.getByRole("button", { name: "Editar Arroz" }));
  await user.clear(screen.getByLabelText(/Cantidad del producto/));
  await user.type(screen.getByLabelText(/Cantidad del producto/), "5");
  await user.click(screen.getByRole("button", { name: "Registrar compra" }));
  expect(onRegisterPurchase).not.toHaveBeenCalled();
  expect(screen.getByRole("alert").textContent).toMatch(/Guarda o cancela/);
  await user.click(screen.getByRole("button", { name: "Cancelar edicion" }));
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.getByText("Total factura $8000")).toBeTruthy();
  expect((screen.getByLabelText("Producto") as HTMLSelectElement).value).toBe("sugar");
  expect((screen.getByLabelText("Cantidad compra") as HTMLInputElement).value).toBe("1");

  await user.click(screen.getByRole("button", { name: "Registrar compra" }));
  expect(onRegisterPurchase).toHaveBeenCalledOnce();
  expect(onRegisterPurchase.mock.calls[0]![0].lines).toEqual([
    expect.objectContaining({ product: expect.objectContaining({ id: "rice" }), quantity: 2, unitCostMinor: 3000 }),
    expect.objectContaining({ product: expect.objectContaining({ id: "sugar" }), quantity: 1, unitCostMinor: 2000 })
  ]);
});

it("validates edited quantities and discounts and permits a zero purchase cost", async () => {
  const { user } = setup();
  await addLine(user);
  await user.click(screen.getByRole("button", { name: "Editar Arroz" }));
  await user.clear(screen.getByLabelText(/Cantidad del producto/));
  await user.type(screen.getByLabelText(/Cantidad del producto/), "0");
  await user.clear(screen.getByLabelText(/Costo unitario del producto/));
  await user.clear(screen.getByLabelText(/Descuento del producto %/));
  await user.type(screen.getByLabelText(/Descuento del producto %/), "101");
  await user.click(screen.getByRole("button", { name: "Guardar producto" }));
  expect(screen.getByText("La cantidad debe ser un entero mayor a cero.")).toBeTruthy();
  expect(screen.getByText("El costo unitario debe ser cero o mayor.")).toBeTruthy();
  expect(screen.getByText("El descuento debe estar entre 0 y 100.")).toBeTruthy();
  expect(screen.getByText("Total factura $6000")).toBeTruthy();

  await user.clear(screen.getByLabelText(/Cantidad del producto/));
  await user.type(screen.getByLabelText(/Cantidad del producto/), "3");
  await user.type(screen.getByLabelText(/Costo unitario del producto/), "0");
  await user.clear(screen.getByLabelText(/Descuento del producto %/));
  await user.type(screen.getByLabelText(/Descuento del producto %/), "10");
  await user.selectOptions(screen.getByLabelText("Unidad del producto"), "Caja");
  await user.click(screen.getByRole("button", { name: "Guardar producto" }));
  expect(screen.queryByRole("region", { name: "Editar producto Arroz" })).toBeNull();
  const table = screen.getByRole("table", { name: "Productos de la compra" });
  expect(within(table).getByText("Caja")).toBeTruthy();
  expect(within(table).getByText("3")).toBeTruthy();
  expect(screen.getByText("Total factura $0")).toBeTruthy();
});

it("deletes the row being edited and prevents registering an empty purchase", async () => {
  const { user, onRegisterPurchase } = setup();
  await addLine(user);
  await addLine(user);
  await user.click(screen.getAllByRole("button", { name: "Editar Arroz" })[0]!);
  await user.click(screen.getAllByRole("button", { name: "Eliminar Arroz" })[0]!);
  expect(screen.queryByRole("region", { name: "Editar producto Arroz" })).toBeNull();
  expect(screen.getByText("Productos agregados 1")).toBeTruthy();
  expect((screen.getByRole("button", { name: "Editar Arroz" }) as HTMLButtonElement).disabled).toBe(false);
  await user.click(screen.getByRole("button", { name: "Eliminar Arroz" }));
  expect(screen.queryByRole("table", { name: "Productos de la compra" })).toBeNull();
  expect(screen.getByText("Total factura $0")).toBeTruthy();
  await user.selectOptions(screen.getByLabelText("Proveedor"), "supplier");
  await user.type(screen.getByLabelText("Fecha emision"), "2026-10-20");
  await user.click(screen.getByRole("button", { name: "Registrar compra" }));
  expect(onRegisterPurchase).not.toHaveBeenCalled();
  expect(screen.getByText("Debes seleccionar un producto.")).toBeTruthy();
});

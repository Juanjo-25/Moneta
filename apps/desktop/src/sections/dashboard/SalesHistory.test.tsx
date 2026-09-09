import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import type { SaleRecord } from "../../types";
import { SalesHistory } from "./SalesHistory";

function sale(id: string, issuedAt: string): SaleRecord {
  return {
    id, issuedAt, invoiceNumber: id, customerId: "customer", customerName: "Cliente histórico",
    customer: { id: "customer", name: "Cliente histórico", active: true, document: "", address: "", city: "", email: "" },
    branch: "", prefix: "", seller: "Ana", currency: "COP", concept: "", observations: "Entrega en tienda", footerNote: "",
    productId: "product", productName: "Producto histórico", quantity: 2, unitPriceMinor: 5000, totalMinor: 10000,
    paymentStatus: "paid", occurredAtMs: new Date(2026, 8, 9).getTime(), occurredAtLabel: "",
    lines: [{ id: "line", productId: "product", productName: "Producto histórico", unit: "unidad", quantity: 2,
      unitCostMinorAtSale: 2000, unitPriceMinor: 5000, discountPercent: 0, discountMinor: 0,
      taxPercent: 0, taxMinor: 0, subtotalMinor: 10000, costMinor: 4000, marginMinor: 6000, marginPercent: 60, totalMinor: 10000 }]
  };
}

afterEach(() => { cleanup(); vi.useRealTimers(); });

it("opens only sales issued in the selected month and year, with individual historical details", async () => {
  const user = userEvent.setup();
  render(<SalesHistory sales={[sale("ABR-1", "2026-04-01"), sale("ABR-2", "2026-04-30"), sale("OLD", "2025-04-15"), sale("MAY", "2026-05-01")]} formatCurrency={(n) => `$${n}`} />);
  fireEvent.change(screen.getByLabelText("Mes de las ventas"), { target: { value: "2026-04" } });
  expect(screen.getByText("2 ventas")).toBeTruthy();
  expect(screen.getByText("$20000")).toBeTruthy();
  expect(screen.queryByText("ABR-1")).toBeNull();
  await user.click(screen.getByRole("button", { name: "Acciones de abril de 2026" }));
  await user.click(screen.getByRole("menuitem", { name: "Ver ventas" }));
  expect(screen.queryByText("OLD")).toBeNull();
  expect(screen.queryByText("MAY")).toBeNull();
  expect(screen.getAllByText(/^ABR-/).map((node) => node.textContent)).toEqual(["ABR-2", "ABR-1"]);
  await user.click(screen.getByText("ABR-2"));
  expect(screen.getByText("ABR-2").closest("details")?.open).toBe(true);
  expect(screen.getByRole("table", { name: "Productos de venta ABR-2" })).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Mes de las ventas"), { target: { value: "2026-06" } });
  expect(screen.queryByText("ABR-2")).toBeNull();
  await user.click(screen.getByRole("button", { name: "Acciones de junio de 2026" }));
  await user.click(screen.getByRole("menuitem", { name: "Ver ventas" }));
  expect(screen.getByText("Sin ventas en este mes")).toBeTruthy();
});

it("defaults to December in January and supports legacy dates", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2027, 0, 15));
  const legacy = { ...sale("LEGACY", ""), occurredAtMs: new Date(2026, 11, 31).getTime() };
  render(<SalesHistory sales={[legacy]} formatCurrency={String} />);
  expect((screen.getByLabelText("Mes de las ventas") as HTMLInputElement).value).toBe("2026-12");
  expect(screen.getByText("1 venta")).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Mes de las ventas"), { target: { value: "2025-01" } });
  fireEvent.click(screen.getByRole("button", { name: "Mes pasado" }));
  expect(screen.getByText("1 venta")).toBeTruthy();
});

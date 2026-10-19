import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import type { ReceivableRecord } from "../../types";
import { ReceivablePicker } from "./ReceivablePicker";

function account(id: string, customerId: string, customerName: string, invoiceNumber?: string): ReceivableRecord {
  return {
    id, customerId, customerName, invoiceNumber, saleId: `sale-${id}`,
    amountMinor: 10000, originalAmountMinor: 10000, paidAmountMinor: 2000,
    balanceMinor: 8000, dueAt: "2026-11-01", status: "partial"
  };
}

const accounts = [
  account("b1", "b", "Beatriz", "FV-020"),
  account("a2", "a", "Ana", "FV-010"),
  account("a1", "a", "Ana", "FV-002"),
  account("c1", "c", "Ana", "FV-010"),
  account("legacy", "b", "Beatriz")
];

function Picker({ initialValue = "", receivables = accounts }: { initialValue?: string; receivables?: ReceivableRecord[] }) {
  const [value, setValue] = useState(initialValue);
  return <>
    <ReceivablePicker formatCurrency={(amount) => `$${amount}`} onSelect={setValue} receivables={receivables} value={value} />
    <output aria-label="Cuenta elegida">{value}</output>
    <button type="button">Siguiente campo</button>
  </>;
}

afterEach(cleanup);

it("groups invoices by customer identity and orders customers and invoices", async () => {
  const user = userEvent.setup();
  render(<Picker />);
  await user.click(screen.getByRole("combobox", { name: "Cuenta por cobrar" }));
  const groups = within(screen.getByRole("listbox")).getAllByRole("group");
  expect(groups.map((group) => group.getAttribute("aria-label"))).toEqual(["Ana", "Ana", "Beatriz"]);
  expect(within(groups[0]!).getAllByRole("option").map((option) => option.textContent)).toEqual([
    "Factura FV-002Saldo $8000 · Vence 2026-11-01",
    "Factura FV-010Saldo $8000 · Vence 2026-11-01"
  ]);
});

it("searches partial invoice numbers regardless of case and retains separate clients with the same number", async () => {
  const user = userEvent.setup();
  render(<Picker />);
  await user.type(screen.getByRole("combobox"), " fv-01 ");
  expect(screen.getAllByRole("option")).toHaveLength(2);
  expect(screen.queryByRole("group", { name: "Beatriz" })).toBeNull();
  const groups = screen.getAllByRole("group", { name: "Ana" });
  await user.click(within(groups[1]!).getByRole("option"));
  expect(screen.getByLabelText("Cuenta elegida").textContent).toBe("c1");
  expect((screen.getByRole("combobox") as HTMLInputElement).value).toBe("FV-010 · Ana");
  expect(screen.queryByRole("listbox")).toBeNull();
});

it("does not search customer names or internal sale IDs when an invoice number exists", async () => {
  const user = userEvent.setup();
  render(<Picker />);
  const input = screen.getByRole("combobox");
  await user.type(input, "Ana");
  expect(screen.queryByRole("option")).toBeNull();
  expect(within(screen.getByRole("listbox")).getByRole("status").textContent).toContain("No hay facturas");
  await user.clear(input);
  await user.type(input, "sale-a1");
  expect(screen.queryByRole("option")).toBeNull();
  await user.clear(input);
  await user.type(input, "legacy");
  expect(screen.getByRole("option", { name: /Factura sale-legacy/ })).toBeTruthy();
});

it("selects with the keyboard and clears the previous selection when searching for another invoice", async () => {
  const user = userEvent.setup();
  render(<Picker />);
  const input = screen.getByRole("combobox");
  await user.type(input, "020");
  await user.keyboard("{ArrowDown}");
  expect(input.getAttribute("aria-activedescendant")).toBe(screen.getByRole("option").id);
  await user.keyboard("{Enter}");
  expect(screen.getByLabelText("Cuenta elegida").textContent).toBe("b1");
  await user.type(input, "no-existe");
  expect(screen.getByLabelText("Cuenta elegida").textContent).toBe("");
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("listbox")).toBeNull();
  expect((input as HTMLInputElement).value).toBe("");
});

it("preserves an existing selection when browsing and dismissing without editing", async () => {
  const user = userEvent.setup();
  render(<Picker initialValue="a1" />);
  await user.click(screen.getByRole("combobox"));
  await user.keyboard("{Escape}");
  expect((screen.getByRole("combobox") as HTMLInputElement).value).toBe("FV-002 · Ana");
  expect(screen.getByLabelText("Cuenta elegida").textContent).toBe("a1");
  await user.click(screen.getByRole("combobox"));
  await user.tab();
  expect(screen.queryByRole("listbox")).toBeNull();
  expect(screen.getByLabelText("Cuenta elegida").textContent).toBe("a1");
});

it("shows the empty state and excludes settled accounts", async () => {
  const user = userEvent.setup();
  render(<Picker receivables={[{ ...accounts[0]!, balanceMinor: 0 }]} />);
  await user.click(screen.getByRole("combobox"));
  await user.keyboard("{ArrowDown}{Enter}");
  expect(screen.queryByRole("option")).toBeNull();
  expect(within(screen.getByRole("listbox")).getByRole("status").textContent).toContain("No hay cuentas por cobrar pendientes");
});

it("reflects an externally cleared selection after saving a receipt and associates validation errors", () => {
  const props = { formatCurrency: String, onSelect: vi.fn(), receivables: accounts };
  const { rerender } = render(<ReceivablePicker {...props} value="a1" />);
  expect((screen.getByRole("combobox") as HTMLInputElement).value).toBe("FV-002 · Ana");
  rerender(<ReceivablePicker {...props} value="" error="Debes seleccionar una cuenta por cobrar." />);
  const input = screen.getByRole("combobox");
  expect((input as HTMLInputElement).value).toBe("");
  expect(input.getAttribute("aria-invalid")).toBe("true");
  expect(input.getAttribute("aria-describedby")).toContain(screen.getByText("Debes seleccionar una cuenta por cobrar.").id);
});

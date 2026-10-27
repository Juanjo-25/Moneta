import { useState } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { dailySale } from "../../test/daily-sales-fixture";
import { quotationFixture, quotationProductFixture, quotationSettingsFixture } from "../../test/quotation-fixture";
import { SalesSection, emptySalesDraft } from "./SalesSection";

const sales = [
  { ...dailySale("sale-1", "2026-10-01", 10000), invoiceNumber: "FV-001", customerName: "María Gómez",
    customer: { ...quotationFixture.customer, name: "María Gómez", document: "DOC-900" }, seller: "Andrés Ruiz",
    productName: "2 productos", lines: [{ ...quotationFixture.lines[0]!,
      unitCostMinorAtSale: 3000, costMinor: 6000, marginMinor: 4000, marginPercent: 40 }] },
  { ...dailySale("sale-2", "2026-10-02", 5000), invoiceNumber: "FV-002", customerName: "Carlos Pérez",
    seller: "Laura", productName: "Café molido", productId: "deleted-product", lines: [] }
];

afterEach(cleanup);

function setup() {
  const onDeleteSale = vi.fn().mockResolvedValue(null);
  function Host() {
    const [draft, setDraft] = useState(emptySalesDraft);
    return <SalesSection customers={[sales[0]!.customer]} products={[quotationProductFixture]}
      sales={sales} receivables={[]} settings={quotationSettingsFixture}
      salesDraft={draft} onSalesDraftChange={setDraft}
      formatCurrency={String} formatIntegerInput={(value) => value.replace(/\D/g, "")}
      parseNonNegativeInteger={(value) => /^\d+$/.test(value) ? Number(value) : null}
      onCreateCustomer={vi.fn()} onValidateCustomer={() => ({})}
      onRegisterPaidSale={vi.fn()} onRegisterPendingSale={vi.fn()}
      onUpdateSale={vi.fn()} onDeleteSale={onDeleteSale} />;
  }
  render(<Host />);
  return { user: userEvent.setup(), onDeleteSale };
}

it("finds sales across fields and all invoice lines, ignoring accents, case, spacing and word order", () => {
  setup();
  const search = screen.getByRole("searchbox", { name: "Buscar ventas" });
  for (const query of ["  ARROZ   gomez ", "ARZ-001", "DOC-900", "andres", "FV-001"]) {
    fireEvent.change(search, { target: { value: query } });
    const table = within(screen.getByRole("table", { name: "Ventas registradas" }));
    expect(table.getByText("FV-001")).toBeTruthy();
    expect(table.queryByText("FV-002")).toBeNull();
    expect(screen.getByRole("status").textContent).toBe("1 de 2 ventas");
  }
  // Legacy records remain searchable without product lines or a current catalog entry.
  fireEvent.change(search, { target: { value: "CAFE perez" } });
  expect(within(screen.getByRole("table", { name: "Ventas registradas" })).getByText("FV-002")).toBeTruthy();
});

it("clears empty results, preserves the sale draft and numbering, and keeps actions on the matching sale", async () => {
  const { user, onDeleteSale } = setup();
  await user.type(screen.getByLabelText("Observaciones"), "Conservar borrador");
  const number = (screen.getByLabelText("Numero") as HTMLInputElement).value;
  const search = screen.getByRole("searchbox", { name: "Buscar ventas" });
  fireEvent.change(search, { target: { value: "sin coincidencias" } });
  expect(screen.getByText("No se encontraron ventas")).toBeTruthy();
  expect(screen.queryByRole("table", { name: "Ventas registradas" })).toBeNull();
  expect((screen.getByLabelText("Numero") as HTMLInputElement).value).toBe(number);
  expect((screen.getByLabelText("Observaciones") as HTMLInputElement).value).toBe("Conservar borrador");
  await user.click(screen.getByRole("button", { name: "Limpiar búsqueda" }));
  expect(document.activeElement).toBe(search);
  expect(screen.getByRole("status").textContent).toBe("2 de 2 ventas");
  fireEvent.change(search, { target: { value: "FV-002" } });
  await user.click(screen.getByRole("button", { name: "Ver detalle de venta FV-002" }));
  expect(screen.getByRole("button", { name: "Ocultar detalle de venta FV-002" })).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Acciones de venta FV-002" }));
  await user.click(screen.getByRole("menuitem", { name: "Eliminar venta" }));
  expect(onDeleteSale).toHaveBeenCalledWith("sale-2");
  await user.type(search, "{Escape}");
  expect((search as HTMLInputElement).value).toBe("");
  expect(screen.getByRole("status").textContent).toBe("2 de 2 ventas");
});

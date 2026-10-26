import { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  QuotationsSection,
  createEmptyQuotationDraft
} from "./QuotationsSection";
import {
  quotationFixture,
  quotationProductFixture,
  quotationSettingsFixture
} from "../../test/quotation-fixture";

function setup(
  quotations = [quotationFixture],
  save = vi.fn().mockResolvedValue(null)
) {
  const onDeleteQuotation = vi.fn().mockResolvedValue(null);
  function Host() {
    const [draft, setDraft] = useState(createEmptyQuotationDraft);
    return (
      <QuotationsSection
        customers={[quotationFixture.customer]}
        products={[quotationProductFixture]}
        quotations={quotations}
        settings={quotationSettingsFixture}
        onSaveQuotation={save}
        onDeleteQuotation={onDeleteQuotation}
        onCreateCustomer={vi.fn()}
        onValidateCustomer={() => ({})}
        quotationDraft={draft}
        onQuotationDraftChange={setDraft}
      />
    );
  }
  render(<Host />);
  return { user: userEvent.setup(), save, onDeleteQuotation };
}

describe("QuotationsSection", () => {
  it("saves products without available stock and calculates discounts and IVA", async () => {
    const { user, save } = setup([]);
    await user.selectOptions(
      screen.getByLabelText("Cliente"),
      quotationFixture.customer.id
    );
    await user.type(
      screen.getByRole("combobox", { name: "Producto buscable" }),
      "arroz{Enter}"
    );
    await user.type(screen.getByLabelText("Cantidad"), "20");
    await user.clear(screen.getByLabelText("Descuento %"));
    await user.type(screen.getByLabelText("Descuento %"), "10");
    await user.selectOptions(screen.getByLabelText("Impuesto"), "19");
    await user.click(screen.getByRole("button", { name: "Agregar producto" }));
    await user.click(
      screen.getByRole("button", { name: "Guardar cotización" })
    );
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        quotationNumber: "COT-0001",
        totalMinor: 107100,
        lines: [
          expect.objectContaining({
            quantity: 20,
            subtotalMinor: 100000,
            discountMinor: 10000,
            taxMinor: 17100
          })
        ]
      })
    );
    expect(screen.getByRole("status").textContent).toContain("guardada");
  });

  it("edits saved lines and preserves the draft after a persistence failure", async () => {
    const { user, save } = setup(
      undefined,
      vi.fn().mockResolvedValue("Error de base de datos")
    );
    await user.click(screen.getByRole("button", { name: "Editar COT-0001" }));
    await user.click(
      screen.getByRole("button", { name: "Editar Arroz libra" })
    );
    await user.clear(screen.getByLabelText("Cantidad"));
    await user.type(screen.getByLabelText("Cantidad"), "3");
    await user.click(
      screen.getByRole("button", { name: "Actualizar producto" })
    );
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: quotationFixture.id,
        quotationNumber: "COT-0001",
        totalMinor: 16065
      })
    );
    expect(screen.getByRole("alert").textContent).toBe(
      "Error de base de datos"
    );
    expect(
      within(
        screen.getByRole("table", { name: "Productos de la cotización" })
      ).getByText("3")
    ).toBeTruthy();
  });

  it("rejects dates before issuance and pending line changes and confirms deletion", async () => {
    const { user, save, onDeleteQuotation } = setup();
    await user.click(screen.getByRole("button", { name: "Editar COT-0001" }));
    await user.clear(screen.getByLabelText("Válida hasta"));
    await user.type(screen.getByLabelText("Válida hasta"), "2026-10-01");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(screen.getByRole("alert").textContent).toContain("anterior");
    expect(save).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Eliminar COT-0001" }));
    expect(onDeleteQuotation).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole("button", { name: "Confirmar eliminación" })
    );
    expect(onDeleteQuotation).toHaveBeenCalledWith(quotationFixture.id);
  });
});

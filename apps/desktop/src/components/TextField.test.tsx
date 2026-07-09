import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TextField } from "./TextField";

describe("TextField", () => {
  it("renders a neutral hint without marking the field as invalid", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <TextField
        hint="Solo se exige para ventas pendientes."
        label="Fecha vencimiento venta"
        onChange={handleChange}
        type="date"
        value=""
      />
    );

    const input = screen.getByLabelText("Fecha vencimiento venta");
    expect(input).toBeTruthy();
    expect(input.getAttribute("aria-invalid")).toBe("false");
    expect(screen.getByText("Solo se exige para ventas pendientes.")).toBeTruthy();

    await user.type(input, "2026-07-20");
    expect(handleChange).toHaveBeenCalled();
  });
});

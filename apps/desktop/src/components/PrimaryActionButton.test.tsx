import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PrimaryActionButton } from "./PrimaryActionButton";

describe("PrimaryActionButton", () => {
  it("renders the shared primary action class and forwards button props", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(
      <PrimaryActionButton
        aria-label="Crear nueva venta"
        className="toolbar-cta"
        onClick={handleClick}
      >
        Nueva venta
      </PrimaryActionButton>
    );

    const button = screen.getByRole("button", { name: "Crear nueva venta" });

    expect(button.className).toContain("primary-action");
    expect(button.className).toContain("toolbar-cta");

    await user.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});

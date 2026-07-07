import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SecondaryActionButton } from "./SecondaryActionButton";

describe("SecondaryActionButton", () => {
  it("supports default and compact variants while forwarding button props", async () => {
    const user = userEvent.setup();
    const handleCompactClick = vi.fn();

    render(
      <>
        <SecondaryActionButton>Nueva accion</SecondaryActionButton>
        <SecondaryActionButton
          aria-label="Ver detalle venta V-1"
          className="report-action"
          onClick={handleCompactClick}
          variant="compact"
        >
          Ver detalle
        </SecondaryActionButton>
      </>
    );

    const defaultButton = screen.getByRole("button", { name: "Nueva accion" });
    const compactButton = screen.getByRole("button", { name: "Ver detalle venta V-1" });

    expect(defaultButton.className).toContain("secondary-action");
    expect(defaultButton.className).not.toContain("secondary-action-compact");
    expect(compactButton.className).toContain("secondary-action");
    expect(compactButton.className).toContain("secondary-action-compact");
    expect(compactButton.className).toContain("report-action");

    await user.click(compactButton);

    expect(handleCompactClick).toHaveBeenCalledTimes(1);
  });
});

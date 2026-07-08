import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SubmenuSwitch } from "./SubmenuSwitch";

describe("SubmenuSwitch", () => {
  it("renders the shared submenu wrapper and active item semantics", async () => {
    const user = userEvent.setup();
    const handleSelect = vi.fn();

    render(
      <SubmenuSwitch
        ariaLabel="Tipos de reportes"
        items={[
          { label: "Rentabilidad", value: "profitability" },
          { label: "DSO", value: "dso" }
        ]}
        onSelect={handleSelect}
        selectedValue="profitability"
      />
    );

    const group = screen.getByRole("tablist", { name: "Tipos de reportes" });
    const profitabilityButton = screen.getByRole("tab", { name: "Rentabilidad" });
    const dsoButton = screen.getByRole("tab", { name: "DSO" });

    expect(group.className).toContain("reports-submenu");
    expect(profitabilityButton.className).toContain("active");
    expect(profitabilityButton.getAttribute("aria-selected")).toBe("true");
    expect(dsoButton.getAttribute("aria-selected")).toBe("false");

    await user.click(dsoButton);

    expect(handleSelect).toHaveBeenCalledTimes(1);
    expect(handleSelect).toHaveBeenCalledWith("dso");
  });
});

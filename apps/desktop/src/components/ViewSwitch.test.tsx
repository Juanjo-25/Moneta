import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ViewSwitch } from "./ViewSwitch";

describe("ViewSwitch", () => {
  it("renders a shared radio-style view switch and notifies on selection", async () => {
    const user = userEvent.setup();
    const handleSelect = vi.fn();

    render(
      <ViewSwitch
        ariaLabel="Vistas de cartera"
        options={[
          { label: "Por cobrar", value: "receivables" },
          { label: "Por pagar", value: "payables" }
        ]}
        selectedValue="receivables"
        onSelect={handleSelect}
      />
    );

    const switchGroup = screen.getByRole("radiogroup", {
      name: "Vistas de cartera"
    });
    const receivablesButton = screen.getByRole("radio", {
      name: "Por cobrar"
    });
    const payablesButton = screen.getByRole("radio", { name: "Por pagar" });

    expect(switchGroup.className).toContain("view-switch");
    expect(receivablesButton.className).toContain("view-switch-button");
    expect(receivablesButton.className).toContain("active");
    expect(receivablesButton.getAttribute("aria-checked")).toBe("true");
    expect(payablesButton.className).toContain("view-switch-button");
    expect(payablesButton.className).not.toContain("active");
    expect(payablesButton.getAttribute("aria-checked")).toBe("false");

    await user.click(payablesButton);

    expect(handleSelect).toHaveBeenCalledTimes(1);
    expect(handleSelect).toHaveBeenCalledWith("payables");
  });
});

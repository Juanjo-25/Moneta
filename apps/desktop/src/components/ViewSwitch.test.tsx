import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ViewSwitch } from "./ViewSwitch";

describe("ViewSwitch", () => {
  it("renders the shared view switch markup and notifies on selection", async () => {
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

    const receivablesButton = screen.getByRole("button", {
      name: "Por cobrar"
    });
    const payablesButton = screen.getByRole("button", { name: "Por pagar" });

    expect(receivablesButton.closest(".view-switch")).toBeTruthy();
    expect(receivablesButton.closest("[role='group']")).toBeTruthy();
    expect(receivablesButton.className).toContain("view-switch-button");
    expect(receivablesButton.className).toContain("active");
    expect(payablesButton.className).toContain("view-switch-button");
    expect(payablesButton.className).not.toContain("active");

    await user.click(payablesButton);

    expect(handleSelect).toHaveBeenCalledTimes(1);
    expect(handleSelect).toHaveBeenCalledWith("payables");
  });
});
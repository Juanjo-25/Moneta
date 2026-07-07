import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PanelHeader } from "./PanelHeader";
import { SecondaryActionButton } from "./SecondaryActionButton";

describe("PanelHeader", () => {
  it("renders header content and compact secondary action with custom classes", () => {
    render(
      <PanelHeader
        action={
          <SecondaryActionButton variant="compact">
            Ver detalle
          </SecondaryActionButton>
        }
        className="report-panel-header"
      >
        <div>
          <h2>Margen por cliente</h2>
          <p>Top clientes ordenados por utilidad.</p>
        </div>
      </PanelHeader>
    );

    expect(screen.getByRole("heading", { name: "Margen por cliente" })).toBeTruthy();
    expect(screen.getByText("Top clientes ordenados por utilidad.")).toBeTruthy();
    const actionButton = screen.getByRole("button", { name: "Ver detalle" });
    expect(actionButton.className).toContain("secondary-action");
    expect(actionButton.className).toContain("secondary-action-compact");
    expect(screen.getByText("Top clientes ordenados por utilidad.").closest(".report-panel-header")).toBeTruthy();
  });
});

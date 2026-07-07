import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PanelHeader } from "./PanelHeader";

describe("PanelHeader", () => {
  it("renders header content and action with custom classes", () => {
    render(
      <PanelHeader
        action={<button type="button">Ver detalle</button>}
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
    expect(screen.getByRole("button", { name: "Ver detalle" })).toBeTruthy();
    expect(screen.getByText("Top clientes ordenados por utilidad.").closest(".report-panel-header")).toBeTruthy();
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("renders optional heading, title, body, and custom classes", () => {
    render(
      <EmptyState
        body="Este reporte aparecera aqui cuando terminemos su implementacion."
        className="report-placeholder-panel"
        heading="Utilidades avanzadas"
        title="Proximamente"
      />
    );

    expect(screen.getByRole("heading", { name: "Utilidades avanzadas" })).toBeTruthy();
    expect(screen.getByText("Proximamente")).toBeTruthy();
    expect(
      screen.getByText("Este reporte aparecera aqui cuando terminemos su implementacion.")
    ).toBeTruthy();
    const panel = screen.getByText("Proximamente").closest(".report-placeholder-panel");
    expect(panel).toBeTruthy();
    expect((panel as HTMLElement).querySelector(".empty-state-copy")).toBeTruthy();
  });
});

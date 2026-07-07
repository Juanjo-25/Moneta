import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ReportChartButton } from "./ReportChartButton";

describe("ReportChartButton", () => {
  it("renders the shared interactive chart panel button and forwards click behavior", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(
      <ReportChartButton
        ariaLabel="Abrir detalle de margen por producto"
        onClick={handleClick}
      >
        <div>Contenido del chart</div>
      </ReportChartButton>
    );

    const button = screen.getByRole("button", {
      name: "Abrir detalle de margen por producto"
    });

    expect(button.className).toContain("report-chart-button");

    await user.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});

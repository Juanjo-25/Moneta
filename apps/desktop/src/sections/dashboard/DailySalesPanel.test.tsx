import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DailySalesPanel } from "./DailySalesPanel";
import { formatCurrency } from "../../lib/formatters";
import {
  dailyCreditsFixture,
  dailySalesFixture
} from "../../test/daily-sales-fixture";

function setup() {
  render(
    <DailySalesPanel
      sales={dailySalesFixture}
      creditNotes={dailyCreditsFixture}
      receivables={[]}
      formatCurrency={formatCurrency}
      onOpenReports={vi.fn()}
    />
  );
  const chart = screen.getByRole("img", { name: "Ventas diarias" });
  vi.spyOn(chart, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 960,
    bottom: 310,
    width: 960,
    height: 310,
    toJSON: () => ({})
  });
  return {
    chart,
    hover: (day: number) =>
      fireEvent.pointerMove(chart, {
        clientX: 76 + ((day - 1) / 30) * 864,
        clientY: 100
      }),
    click: (day: number) =>
      fireEvent.click(chart, {
        clientX: 76 + ((day - 1) / 30) * 864,
        clientY: 100
      })
  };
}

describe("DailySalesPanel", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 15, 12));
    vi.stubGlobal("PointerEvent", MouseEvent);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("shows exact daily values, dates and sale counts on pointer movement", () => {
    const { hover } = setup();
    hover(13);
    const tooltip = within(screen.getByRole("tooltip"));
    expect(screen.getByRole("tooltip").closest(".daily-sales-plot")).toBeNull();
    expect(
      within(
        screen.getByRole("complementary", { name: "Consulta del día" })
      ).getByRole("tooltip")
    ).toBeTruthy();
    expect(tooltip.getByText("13 de agosto de 2026")).toBeTruthy();
    expect(
      tooltip.getByText(formatCurrency(200000).replace(/\u00a0/g, " "))
    ).toBeTruthy();
    expect(tooltip.getByText("2 ventas")).toBeTruthy();
    expect(
      tooltip.getByText(formatCurrency(250000).replace(/\u00a0/g, " "))
    ).toBeTruthy();
    expect(tooltip.getByText("1 venta · 1 nota crédito")).toBeTruthy();
    hover(31);
    expect(tooltip.getByText("Día inexistente en este mes")).toBeTruthy();
    expect(tooltip.getByText("Día futuro")).toBeTruthy();
    expect(tooltip.getByText("Sin ventas")).toBeTruthy();
  });

  it("pins a day to show invoices, customers and adjustments and keeps it after pointer leave", () => {
    const { chart, click } = setup();
    click(13);
    const detail = within(
      screen.getByRole("region", { name: "Ventas del día 13" })
    );
    expect(detail.getByText("FV-august-1")).toBeTruthy();
    expect(detail.getByText("FV-august-2")).toBeTruthy();
    expect(detail.getByText("NC-confirmed")).toBeTruthy();
    expect(detail.queryByText("NC-draft")).toBeNull();
    fireEvent.pointerLeave(chart.parentElement!);
    expect(screen.getByRole("tooltip")).toBeTruthy();
    fireEvent.click(screen.getByText("FV-october").closest("summary")!);
    expect(
      screen.getByRole("region", { name: "Detalle de venta FV-october" })
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cerrar detalle" }));
    expect(
      screen.queryByRole("region", { name: "Ventas del día 13" })
    ).toBeNull();
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("hides months consistently and keeps at least one visible", () => {
    const { hover, click } = setup();
    fireEvent.click(screen.getByRole("button", { name: /agosto de 2026/ }));
    hover(13);
    expect(
      within(screen.getByRole("tooltip")).queryByText("13 de agosto de 2026")
    ).toBeNull();
    click(13);
    expect(
      within(
        screen.getByRole("region", { name: "Ventas del día 13" })
      ).queryByText("FV-august-1")
    ).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /septiembre de 2026/ }));
    expect(
      (
        screen.getByRole("button", {
          name: /octubre de 2026/
        }) as HTMLButtonElement
      ).disabled
    ).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: /agosto de 2026/ }));
    expect(
      screen
        .getByRole("button", { name: /agosto de 2026/ })
        .getAttribute("aria-pressed")
    ).toBe("true");
  });

  it("zooms the domain without changing month totals and resets selection when months change", () => {
    const { chart, click } = setup();
    click(13);
    fireEvent.change(screen.getByRole("slider", { name: "Desde día" }), {
      target: { value: "10" }
    });
    fireEvent.change(screen.getByRole("slider", { name: "Hasta día" }), {
      target: { value: "20" }
    });
    expect(screen.getByText("Del día 10 al 20")).toBeTruthy();
    expect(within(chart).queryByText("Día 1")).toBeNull();
    expect(within(chart).getByText("Día 20")).toBeTruthy();
    expect(
      screen.queryByRole("region", { name: "Ventas del día 13" })
    ).toBeNull();
    expect(
      screen.getByText(formatCurrency(250000).replace(/\u00a0/g, " "))
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Ver mes completo" }));
    expect(within(chart).getByText("Día 1")).toBeTruthy();
    for (const index of [1, 2, 3])
      fireEvent.change(
        screen.getByLabelText(`Periodo ${index} ventas diarias`),
        { target: { value: "2025-02" } }
      );
    expect(within(chart).getByText("Día 28")).toBeTruthy();
    expect(within(chart).queryByText("Día 31")).toBeNull();
  });

  it("supports keyboard exploration, selection and dismissal", () => {
    setup();
    const explorer = screen.getByRole("group", {
      name: "Explorar ventas diarias"
    });
    fireEvent.focus(explorer);
    fireEvent.keyDown(explorer, { key: "ArrowRight" });
    expect(within(screen.getByRole("tooltip")).getByText("Día 2")).toBeTruthy();
    fireEvent.keyDown(explorer, { key: "Enter" });
    expect(
      screen.getByRole("region", { name: "Ventas del día 2" })
    ).toBeTruthy();
    fireEvent.keyDown(explorer, { key: "Escape" });
    expect(screen.queryByRole("tooltip")).toBeNull();
    expect(
      screen.queryByRole("region", { name: "Ventas del día 2" })
    ).toBeNull();
  });
});

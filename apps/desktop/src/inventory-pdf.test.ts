import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildInventoryFileName,
  generateInventoryPdf,
  type InventoryPdfInput
} from "./inventory-pdf";

const addPageMock = vi.fn();
const outputMock = vi.fn(() => "data:application/pdf;base64,inventory-pdf");
const rectMock = vi.fn();
const lineMock = vi.fn();
const setDrawColorMock = vi.fn();
const setFillColorMock = vi.fn();
const setFontMock = vi.fn();
const setFontSizeMock = vi.fn();
const setTextColorMock = vi.fn();
const textMock = vi.fn();
const saveMock = vi.fn();

vi.mock("jspdf", () => ({
  jsPDF: vi.fn().mockImplementation(() => ({
    addPage: addPageMock,
    line: lineMock,
    output: outputMock,
    rect: rectMock,
    save: saveMock,
    setDrawColor: setDrawColorMock,
    setFillColor: setFillColorMock,
    setFont: setFontMock,
    setFontSize: setFontSizeMock,
    setTextColor: setTextColorMock,
    text: textMock
  }))
}));

const inventoryInput: InventoryPdfInput = {
  generatedAtLabel: "14/08/2026, 8:00 a. m.",
  products: [
    {
      active: true,
      costMinor: 3200,
      id: "product-1",
      minimumStock: 1,
      name: "Arroz libra",
      salePriceMinor: 4500,
      sku: "ARZ-001",
      stock: 4,
      unit: "Unidad"
    },
    {
      active: false,
      costMinor: 2500,
      id: "product-2",
      minimumStock: 1,
      name: "Panela unidad",
      salePriceMinor: 3500,
      sku: "PNL-001",
      stock: 3,
      unit: "Unidad"
    }
  ]
};

describe("inventory PDF", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds a stable inventory PDF filename", () => {
    expect(buildInventoryFileName()).toBe("inventario-productos.pdf");
  });

  it("renders product inventory data into a previewable PDF result", () => {
    const result = generateInventoryPdf(inventoryInput);
    const renderedText = textMock.mock.calls
      .map((call) => String(call[0]))
      .join(" ");

    expect(renderedText).toContain("INVENTARIO DE PRODUCTOS");
    expect(renderedText).toContain("Generado: 14/08/2026, 8:00 a. m.");
    expect(renderedText).toContain("Productos");
    expect(renderedText).toContain("Arroz libra");
    expect(renderedText).toContain("ARZ-001");
    expect(renderedText).toContain("$ 3.200");
    expect(renderedText).toContain("$ 4.500");
    expect(renderedText).toContain("Disponible");
    expect(renderedText).toContain("Inactivo");
    expect(outputMock).toHaveBeenCalledWith("datauristring");
    expect(saveMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      dataUri: "data:application/pdf;base64,inventory-pdf",
      fileName: "inventario-productos.pdf"
    });
  });
});

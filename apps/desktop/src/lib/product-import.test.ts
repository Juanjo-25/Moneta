import { describe, expect, it } from "vitest";
import { parseProductImportCsv } from "./product-import";

describe("parseProductImportCsv", () => {
  it("parses products exported from Excel as CSV", () => {
    const csv = [
      "Codigo;Producto;Unidad;Cantidad inicial;Costo;Precio venta;Stock minimo",
      "ARZ-001;Arroz libra;Libra;4;$ 3.200;$ 4.500;1",
      "FRJ-001;Frijol kilo;Kg;6;2800;5200;2"
    ].join("\n");

    expect(parseProductImportCsv(csv, [])).toEqual({
      errors: [],
      products: [
        {
          costMinor: 3200,
          minimumStock: 1,
          name: "Arroz libra",
          salePriceMinor: 4500,
          sku: "ARZ-001",
          stock: 4,
          unit: "Libra"
        },
        {
          costMinor: 2800,
          minimumStock: 2,
          name: "Frijol kilo",
          salePriceMinor: 5200,
          sku: "FRJ-001",
          stock: 6,
          unit: "Kg"
        }
      ]
    });
  });

  it("reports missing columns and duplicate skus", () => {
    expect(
      parseProductImportCsv("Codigo,Producto,Cantidad inicial\nARZ-001,Arroz,4", [])
    ).toEqual({
      errors: ["Faltan columnas obligatorias: costo, precio venta."],
      products: []
    });

    expect(
      parseProductImportCsv(
        [
          "Codigo,Producto,Cantidad inicial,Costo,Precio venta,Stock minimo",
          "ARZ-001,Arroz,4,3200,4500,1",
          "ARZ-001,Arroz extra,2,3000,4300,1"
        ].join("\n"),
        []
      )
    ).toEqual({
      errors: ["Fila 3: el codigo ARZ-001 esta repetido."],
      products: [
        {
          costMinor: 3200,
          minimumStock: 1,
          name: "Arroz",
          salePriceMinor: 4500,
          sku: "ARZ-001",
          stock: 4,
          unit: "Unidad"
        }
      ]
    });
  });

  it("parses Alegra item exports saved as CSV", () => {
    const csv = [
      [
        "Tipo",
        "Item inventariable",
        "Nombre",
        "Codigo del producto o servicio",
        "Referencia",
        "Unidad de medida",
        "Costo inicial",
        "Precio base",
        "Precio total"
      ].join(";"),
      [
        "Producto",
        "Si",
        '"MANGUERA AGROMINERA 1/2"" X 50"',
        "",
        "",
        "Unidad",
        "23964,000000",
        "32450,420000",
        "38616,00"
      ].join(";")
    ].join("\n");

    expect(parseProductImportCsv(csv, [])).toEqual({
      errors: [],
      products: [
        {
          costMinor: 23964,
          minimumStock: 0,
          name: 'MANGUERA AGROMINERA 1/2" X 50',
          salePriceMinor: 32450,
          sku: "SIN-CODIGO-0002",
          stock: 0,
          unit: "Unidad"
        }
      ]
    });
  });

  it("parses the cleaned three-column product file saved as CSV", () => {
    const csv = [
      "producto,costo,precio venta",
      '"MANGUERA AGROMINERA 1/2"" X 50",23964,32450.42',
      "MANGUERA AGOMINERA 1/2 X 100,47934,65000"
    ].join("\n");

    expect(parseProductImportCsv(csv, [])).toEqual({
      errors: [],
      products: [
        {
          costMinor: 23964,
          minimumStock: 0,
          name: 'MANGUERA AGROMINERA 1/2" X 50',
          salePriceMinor: 32450,
          sku: "SIN-CODIGO-0002",
          stock: 0,
          unit: "Unidad"
        },
        {
          costMinor: 47934,
          minimumStock: 0,
          name: "MANGUERA AGOMINERA 1/2 X 100",
          salePriceMinor: 65000,
          sku: "SIN-CODIGO-0003",
          stock: 0,
          unit: "Unidad"
        }
      ]
    });
  });
});

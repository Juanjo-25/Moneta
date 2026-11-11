import { describe, expect, it } from "vitest";
import { bytesFromDataHref, readXlsxEntries, readXlsxSheets } from "../test/xlsx";
import {
  buildExcelWorkbookBytes,
  buildExcelWorkbookDownload,
  normalizeExcelFileName
} from "./excel-export";

describe("buildExcelWorkbookBytes", () => {
  it("builds a real xlsx package with safe XML, numbers and styled headers", () => {
    const bytes = buildExcelWorkbookBytes({
      fileName: "moneta-prueba.xlsx",
      worksheets: [
        {
          name: "Ventas / clientes * especiales",
          autoFilter: true,
          rows: [
            ["Cliente", "Valor COP", "Activo", "Promedio"],
            ["Ana & Perez <VIP>", 4500, true, 2.5]
          ]
        }
      ]
    });

    expect([...bytes.subarray(0, 2)]).toEqual([0x50, 0x4b]);
    const entries = readXlsxEntries(bytes);
    expect(Object.keys(entries)).toEqual(
      expect.arrayContaining([
        "[Content_Types].xml",
        "_rels/.rels",
        "xl/workbook.xml",
        "xl/styles.xml",
        "xl/worksheets/sheet1.xml"
      ])
    );

    const [sheet] = readXlsxSheets(bytes);
    expect(sheet!.name).toBe("Ventas clientes especiales");
    expect(sheet!.rows).toEqual([
      ["Cliente", "Valor COP", "Activo", "Promedio"],
      ["Ana & Perez <VIP>", "4500", "Si", "2.5"]
    ]);
    expect(sheet!.xml).toContain("Ana &amp; Perez &lt;VIP&gt;");
    expect(sheet!.xml).toContain('<c r="A1" s="1"');
    expect(sheet!.xml).toContain('<c r="B2" s="3"><v>4500</v></c>');
    expect(sheet!.xml).toContain('<c r="D2" s="4"><v>2.5</v></c>');
    expect(sheet!.xml).toContain('state="frozen"');
    expect(sheet!.xml).toContain('<autoFilter ref="A1:D2"/>');
    expect(sheet!.xml).toMatch(/<col min="1" max="1" width="\d+" customWidth="1"\/>/);
  });

  it("keeps repeated worksheet names unique", () => {
    const sheets = readXlsxSheets(
      buildExcelWorkbookBytes({
        fileName: "x",
        worksheets: [
          { name: "Datos", rows: [["a"]] },
          { name: "datos", rows: [["b"]] }
        ]
      })
    );

    expect(sheets.map((sheet) => sheet.name)).toEqual(["Datos", "datos (2)"]);
  });
});

describe("buildExcelWorkbookDownload", () => {
  it("builds a direct xlsx download href for the workbook", () => {
    const download = buildExcelWorkbookDownload({
      fileName: "moneta-prueba",
      worksheets: [{ name: "Datos", rows: [["Cliente"], ["Ana Perez"]] }]
    });

    expect(download.fileName).toBe("moneta-prueba.xlsx");
    expect(download.href).toMatch(
      /^data:application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet;base64,/
    );
    expect(readXlsxSheets(bytesFromDataHref(download.href))[0]!.rows).toEqual([
      ["Cliente"],
      ["Ana Perez"]
    ]);
  });

  it("normalizes old .xls names to .xlsx", () => {
    expect(normalizeExcelFileName("reporte.xls")).toBe("reporte.xlsx");
    expect(normalizeExcelFileName("reporte.xlsx")).toBe("reporte.xlsx");
  });
});

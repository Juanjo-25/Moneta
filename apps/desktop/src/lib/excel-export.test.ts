import { describe, expect, it } from "vitest";
import {
  buildExcelWorkbookDownload,
  buildExcelWorkbookXml
} from "./excel-export";

describe("buildExcelWorkbookXml", () => {
  it("builds an Excel-compatible workbook with safe XML and numeric cells", () => {
    const xml = buildExcelWorkbookXml({
      fileName: "moneta-prueba.xls",
      worksheets: [
        {
          name: "Ventas / clientes * especiales",
          rows: [
            ["Cliente", "Valor COP", "Activo"],
            ["Ana & Perez <VIP>", 4500, true]
          ]
        }
      ]
    });

    expect(xml).toContain('<?mso-application progid="Excel.Sheet"?>');
    expect(xml).toContain('ss:Name="Ventas clientes especiales"');
    expect(xml).toContain("Ana &amp; Perez &lt;VIP&gt;");
    expect(xml).toContain('<Data ss:Type="Number">4500</Data>');
    expect(xml).toContain('<Data ss:Type="String">Si</Data>');
  });

  it("builds a direct download href for the workbook", () => {
    const download = buildExcelWorkbookDownload({
      fileName: "moneta-prueba",
      worksheets: [{ name: "Datos", rows: [["Cliente"], ["Ana Perez"]] }]
    });

    expect(download.fileName).toBe("moneta-prueba.xls");
    expect(download.href).toMatch(/^data:application\/vnd\.ms-excel;charset=utf-8,/);
    expect(decodeURIComponent(download.href)).toContain("Ana Perez");
  });
});

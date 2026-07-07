import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DataTable } from "./DataTable";
import { DataTableHeader } from "./DataTableHeader";

describe("DataTable", () => {
  it("renders an accessible table with shared header labels", () => {
    render(
      <DataTable ariaLabel="Productos registrados">
        <DataTableHeader labels={["Codigo", "Producto", "Estado"]} />
        <tbody>
          <tr>
            <td>ARZ-001</td>
            <td>Arroz libra</td>
            <td>Disponible</td>
          </tr>
        </tbody>
      </DataTable>
    );

    const table = screen.getByRole("table", { name: "Productos registrados" });
    const headers = within(table).getAllByRole("columnheader");

    expect(headers.map((header) => header.textContent)).toEqual([
      "Codigo",
      "Producto",
      "Estado"
    ]);
    expect(within(table).getByRole("cell", { name: "Arroz libra" })).toBeTruthy();
  });
});

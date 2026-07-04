import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { generateInvoicePdf } from "./invoice-pdf";

vi.mock("./invoice-pdf", () => ({
  generateInvoicePdf: vi.fn()
}));

const generateInvoicePdfMock = vi.mocked(generateInvoicePdf);

async function createProductFixture(user: UserEvent) {
  await user.click(screen.getByRole("button", { name: "Productos" }));
  await user.click(screen.getByRole("button", { name: "Nuevo producto" }));
  await user.type(screen.getByLabelText("Codigo"), "ARZ-001");
  await user.type(screen.getByLabelText("Producto"), "Arroz libra");
  await user.type(screen.getByLabelText("Unidad"), "4");
  await user.type(screen.getByLabelText("Costo"), "3200");
  await user.type(screen.getByLabelText("Precio venta"), "4500");
  await user.type(screen.getByLabelText("Stock minimo"), "1");
  await user.click(screen.getByRole("button", { name: "Guardar producto" }));
}

async function createSecondProductFixture(user: UserEvent) {
  await user.click(screen.getByRole("button", { name: "Productos" }));
  await user.click(screen.getByRole("button", { name: "Nuevo producto" }));
  await user.type(screen.getByLabelText("Codigo"), "PNL-001");
  await user.type(screen.getByLabelText("Producto"), "Panela unidad");
  await user.type(screen.getByLabelText("Unidad"), "3");
  await user.type(screen.getByLabelText("Costo"), "2500");
  await user.type(screen.getByLabelText("Precio venta"), "3500");
  await user.type(screen.getByLabelText("Stock minimo"), "1");
  await user.click(screen.getByRole("button", { name: "Guardar producto" }));
}

async function createSupplierFixture(user: UserEvent, name = "Distribuidora Norte") {
  await user.click(screen.getByRole("button", { name: "Compras" }));
  await user.click(screen.getByRole("button", { name: "Nuevo proveedor" }));
  await user.type(screen.getByLabelText("Nombre proveedor"), name);
  await user.click(screen.getByRole("button", { name: "Guardar proveedor" }));
}

async function createPendingPurchaseFixture(user: UserEvent) {
  await createProductFixture(user);
  await createSupplierFixture(user, "Proveedor Central");
  await user.type(screen.getByLabelText("Numero factura"), "FC-3001");
  await user.type(screen.getByLabelText("Fecha emision"), "2026-06-30");
  await user.type(screen.getByLabelText("Fecha vencimiento"), "2026-07-30");
  await user.selectOptions(
    screen.getByLabelText("Producto"),
    screen.getByRole("option", { name: "Arroz libra" })
  );
  await user.type(screen.getByLabelText("Cantidad compra"), "5");
  await user.type(screen.getByLabelText("Costo unitario"), "3000");
  await user.click(screen.getByLabelText("Pendiente"));
  await user.click(screen.getByRole("button", { name: "Registrar compra" }));
  await user.click(screen.getByRole("button", { name: "Proveedores" }));
}

function formatDateOffsetFromToday(days: number): string {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

describe("App navigation", () => {
  beforeEach(() => {
    generateInvoicePdfMock.mockReset();
    generateInvoicePdfMock.mockReturnValue({
      dataUri: "data:application/pdf;base64,invoice-pdf",
      fileName: "factura-FE-sale-1.pdf"
    });
  });

  it("switches active section from the sidebar", async () => {
    const user = userEvent.setup();

    render(<App />);

    expect(screen.getByRole("heading", { name: "Resumen operativo" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Productos" }));

    expect(screen.getByRole("heading", { name: "Productos" })).toBeTruthy();
    expect(screen.getByText("Catalogo de productos")).toBeTruthy();
  });

  it("uses dashboard quick actions to open their target sections", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Nueva venta" }));
    expect(screen.getByRole("heading", { name: "Ventas" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Dashboard" }));
    await user.click(screen.getByRole("button", { name: "Ver todo" }));
    expect(screen.getByRole("heading", { name: "Reportes" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Dashboard" }));
    await user.click(screen.getByRole("button", { name: "Revisar" }));
    expect(screen.getByRole("heading", { name: "Productos" })).toBeTruthy();
  });

  it("creates a product with unidad as initial stock and updates dashboard metrics", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Productos" }));
    await user.click(screen.getByRole("button", { name: "Nuevo producto" }));
    await user.type(screen.getByLabelText("Codigo"), "ARZ-001");
    await user.type(screen.getByLabelText("Producto"), "Arroz libra");
    await user.type(screen.getByLabelText("Unidad"), "4");
    await user.type(screen.getByLabelText("Costo"), "3200");
    await user.type(screen.getByLabelText("Precio venta"), "4500");
    await user.type(screen.getByLabelText("Stock minimo"), "5");
    await user.click(screen.getByRole("button", { name: "Guardar producto" }));

    expect(screen.queryByLabelText("Stock inicial")).toBeNull();
    expect(screen.getByRole("cell", { name: "ARZ-001" })).toBeTruthy();
    expect(screen.getByRole("cell", { name: "Arroz libra" })).toBeTruthy();
    expect(screen.getByRole("cell", { name: /\$\s*3\.200/ })).toBeTruthy();
    expect(screen.getByRole("cell", { name: /\$\s*4\.500/ })).toBeTruthy();
    expect(screen.getByRole("cell", { name: "4" })).toBeTruthy();
    expect(screen.getByRole("cell", { name: "Bajo stock" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Dashboard" }));

    expect(screen.getByText("Productos activos")).toBeTruthy();
    expect(screen.getByText("Alertas de inventario")).toBeTruthy();
    expect(screen.getAllByText("1")).toHaveLength(2);
    expect(screen.getByText("Arroz libra")).toBeTruthy();
  });

  it("shows the product entry form only after clicking nuevo producto", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Productos" }));

    expect(screen.queryByLabelText("Codigo")).toBeNull();
    expect(screen.queryByRole("button", { name: "Guardar producto" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Nuevo producto" }));

    expect(screen.getByLabelText("Codigo")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Guardar producto" })).toBeTruthy();
  });

  it("formats cost and sale price as colombian pesos while typing", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Productos" }));
    await user.click(screen.getByRole("button", { name: "Nuevo producto" }));

    const costInput = screen.getByLabelText("Costo") as HTMLInputElement;
    const salePriceInput = screen.getByLabelText("Precio venta") as HTMLInputElement;

    await user.type(costInput, "3200");
    await user.type(salePriceInput, "45000");

    expect(costInput.value).toBe("3.200");
    expect(salePriceInput.value).toBe("45.000");
  });

  it("rejects invalid product submissions without adding a row", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Productos" }));
    await user.click(screen.getByRole("button", { name: "Nuevo producto" }));
    expect(screen.queryByLabelText("Stock inicial")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Guardar producto" }));

    expect(screen.getByText("El codigo es obligatorio.")).toBeTruthy();
    expect(screen.getByText("El nombre es obligatorio.")).toBeTruthy();
    expect(screen.queryByRole("table", { name: "Productos registrados" })).toBeNull();
    expect(screen.getByText("Sin productos registrados")).toBeTruthy();
  });

  it("registers a paid sale, decreases stock, and lists it in ventas", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre o razon social"), "Ana Perez");
    await user.type(screen.getByLabelText("NIT o C.C."), "123456789");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );
    await user.type(screen.getByLabelText("Cantidad"), "2");
    await user.click(screen.getByLabelText("Pagada"));
    await user.click(screen.getByRole("button", { name: "Registrar venta" }));

    const salesTable = screen.getByRole("table", { name: "Ventas registradas" });
    expect(within(salesTable).getByText("Ana Perez")).toBeTruthy();
    expect(within(salesTable).getByText("Arroz libra")).toBeTruthy();
    expect(within(salesTable).getByText("Pagada")).toBeTruthy();
    expect(within(salesTable).getByText(/\$\s*9\.000/)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Productos" }));

    const productsTable = screen.getByRole("table", { name: "Productos registrados" });
    expect(within(productsTable).getByRole("cell", { name: "2" })).toBeTruthy();
  });

  it("registers a pending sale, decreases stock, and exposes receivable data", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre o razon social"), "Carlos Ruiz");
    await user.type(screen.getByLabelText("NIT o C.C."), "987654321");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );
    await user.type(screen.getByLabelText("Cantidad"), "3");
    await user.click(screen.getByLabelText("Pendiente"));
    await user.type(screen.getByLabelText("Fecha vencimiento venta"), "2026-07-20");
    await user.click(screen.getByRole("button", { name: "Registrar venta" }));

    const salesTable = screen.getByRole("table", { name: "Ventas registradas" });
    expect(within(salesTable).getByText("Pendiente")).toBeTruthy();
    expect(within(salesTable).getByText(/\$\s*13\.500/)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Productos" }));

    const productsTable = screen.getByRole("table", { name: "Productos registrados" });
    expect(
      within(productsTable).getByRole("row", {
        name: /ARZ-001\s+Arroz libra\s+\$\s*3\.200\s+\$\s*4\.500\s+1\s+1/
      })
    ).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Cartera" }));

    const receivablesTable = screen.getByRole("table", { name: "Cartera por cobrar" });
    expect(within(receivablesTable).getByText("Carlos Ruiz")).toBeTruthy();
    expect(within(receivablesTable).getByText(/\$\s*13\.500/)).toBeTruthy();
  });

  it("requires a due date for pending sales", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre o razon social"), "Carlos Ruiz");
    await user.type(screen.getByLabelText("NIT o C.C."), "987654321");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );
    await user.type(screen.getByLabelText("Cantidad"), "1");
    await user.click(screen.getByLabelText("Pendiente"));
    await user.click(screen.getByRole("button", { name: "Registrar venta" }));

    expect(
      screen.getByText("La fecha de vencimiento es obligatoria para ventas pendientes.")
    ).toBeTruthy();
    expect(screen.queryByRole("table", { name: "Ventas registradas" })).toBeNull();
  });

  it("stores the due date for a pending sale receivable", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre o razon social"), "Carlos Ruiz");
    await user.type(screen.getByLabelText("NIT o C.C."), "987654321");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );
    await user.type(screen.getByLabelText("Cantidad"), "2");
    await user.click(screen.getByLabelText("Pendiente"));
    await user.type(screen.getByLabelText("Fecha vencimiento venta"), "2026-07-15");
    await user.click(screen.getByRole("button", { name: "Registrar venta" }));
    await user.click(screen.getByRole("button", { name: "Cartera" }));

    const receivablesTable = screen.getByRole("table", { name: "Cartera por cobrar" });
    expect(within(receivablesTable).getByText("Carlos Ruiz")).toBeTruthy();
    expect(within(receivablesTable).getByText("2026-07-15")).toBeTruthy();
    expect(within(receivablesTable).getByText(/\$\s*9\.000/)).toBeTruthy();
  });

  it("registers a paid sale with several products and decreases each stock", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await createSecondProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre o razon social"), "Ana Perez");
    await user.type(screen.getByLabelText("NIT o C.C."), "123456789");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );
    await user.type(screen.getByLabelText("Cantidad"), "2");
    await user.click(screen.getByRole("button", { name: "Agregar producto" }));
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Panela unidad" })
    );
    await user.type(screen.getByLabelText("Cantidad"), "2");
    await user.click(screen.getByRole("button", { name: "Agregar producto" }));
    await user.click(screen.getByLabelText("Pagada"));
    await user.click(screen.getByRole("button", { name: "Registrar venta" }));

    const salesTable = screen.getByRole("table", { name: "Ventas registradas" });
    expect(within(salesTable).getByText("Ana Perez")).toBeTruthy();
    expect(within(salesTable).getByText("2 productos")).toBeTruthy();
    expect(within(salesTable).getByText("4")).toBeTruthy();
    expect(within(salesTable).getByText(/\$\s*16\.000/)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Productos" }));

    const productsTable = screen.getByRole("table", { name: "Productos registrados" });
    expect(
      within(productsTable).getByRole("row", {
        name: /ARZ-001\s+Arroz libra\s+\$\s*3\.200\s+\$\s*4\.500\s+2\s+1/
      })
    ).toBeTruthy();
    expect(
      within(productsTable).getByRole("row", {
        name: /PNL-001\s+Panela unidad\s+\$\s*2\.500\s+\$\s*3\.500\s+1\s+1/
      })
    ).toBeTruthy();
  });

  it("registers a pending sale with several products and creates one receivable", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await createSecondProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre o razon social"), "Carlos Ruiz");
    await user.type(screen.getByLabelText("NIT o C.C."), "987654321");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );
    await user.type(screen.getByLabelText("Cantidad"), "1");
    await user.click(screen.getByRole("button", { name: "Agregar producto" }));
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Panela unidad" })
    );
    await user.type(screen.getByLabelText("Cantidad"), "2");
    await user.click(screen.getByRole("button", { name: "Agregar producto" }));
    await user.click(screen.getByLabelText("Pendiente"));
    await user.type(screen.getByLabelText("Fecha vencimiento venta"), "2026-07-30");
    await user.click(screen.getByRole("button", { name: "Registrar venta" }));

    await user.click(screen.getByRole("button", { name: "Productos" }));

    const productsTable = screen.getByRole("table", { name: "Productos registrados" });
    expect(
      within(productsTable).getByRole("row", {
        name: /ARZ-001\s+Arroz libra\s+\$\s*3\.200\s+\$\s*4\.500\s+3\s+1/
      })
    ).toBeTruthy();
    expect(
      within(productsTable).getByRole("row", {
        name: /PNL-001\s+Panela unidad\s+\$\s*2\.500\s+\$\s*3\.500\s+1\s+1/
      })
    ).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Cartera" }));

    const receivablesTable = screen.getByRole("table", { name: "Cartera por cobrar" });
    expect(within(receivablesTable).getByText("Carlos Ruiz")).toBeTruthy();
    expect(within(receivablesTable).getByText(/\$\s*11\.500/)).toBeTruthy();
  });

  it("preloads the product sale price and allows overriding it before adding a line", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre o razon social"), "Ana Perez");
    await user.type(screen.getByLabelText("NIT o C.C."), "123456789");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );

    const unitPriceInput = screen.getByLabelText(
      "Precio venta unitario"
    ) as HTMLInputElement;
    expect(unitPriceInput.value).toBe("4.500");

    await user.clear(unitPriceInput);
    await user.type(unitPriceInput, "3850");
    expect(unitPriceInput.value).toBe("3.850");

    await user.type(screen.getByLabelText("Cantidad"), "2");
    await user.click(screen.getByRole("button", { name: "Agregar producto" }));

    const linesTable = screen.getByRole("table", { name: "Productos de la venta" });
    expect(within(linesTable).getByText(/\$\s*3\.850/)).toBeTruthy();
    expect(within(linesTable).getByText(/\$\s*7\.700/)).toBeTruthy();
  });

  it("rejects empty or zero sale-line unit prices", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );

    const unitPriceInput = screen.getByLabelText("Precio venta unitario");
    await user.clear(unitPriceInput);
    await user.type(screen.getByLabelText("Cantidad"), "1");
    await user.click(screen.getByRole("button", { name: "Agregar producto" }));

    expect(
      screen.getByText("El precio de venta debe ser un entero mayor a cero.")
    ).toBeTruthy();
  });

  it("stores the edited unit sale price in the registered sale row", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre o razon social"), "Cliente Precio");
    await user.type(screen.getByLabelText("NIT o C.C."), "111");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );
    await user.clear(screen.getByLabelText("Precio venta unitario"));
    await user.type(screen.getByLabelText("Precio venta unitario"), "3850");
    await user.type(screen.getByLabelText("Cantidad"), "2");
    await user.click(screen.getByRole("button", { name: "Registrar venta" }));

    const salesTable = screen.getByRole("table", { name: "Ventas registradas" });
    expect(within(salesTable).getByText(/\$\s*7\.700/)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Generar factura PDF" }));
    expect(generateInvoicePdfMock).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            totalMinor: 7700,
            unitPriceMinor: 3850
          })
        ]
      })
    );
  });

  it("keeps two sales of the same product at different prices as different recorded totals", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);

    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre o razon social"), "Cliente Uno");
    await user.type(screen.getByLabelText("NIT o C.C."), "111");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );
    await user.type(screen.getByLabelText("Cantidad"), "1");
    await user.click(screen.getByRole("button", { name: "Registrar venta" }));

    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre o razon social"), "Cliente Dos");
    await user.type(screen.getByLabelText("NIT o C.C."), "222");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );
    await user.clear(screen.getByLabelText("Precio venta unitario"));
    await user.type(screen.getByLabelText("Precio venta unitario"), "3850");
    await user.type(screen.getByLabelText("Cantidad"), "1");
    await user.click(screen.getByRole("button", { name: "Registrar venta" }));

    const salesTable = screen.getByRole("table", { name: "Ventas registradas" });
    expect(within(salesTable).getByText(/\$\s*4\.500/)).toBeTruthy();
    expect(within(salesTable).getByText(/\$\s*3\.850/)).toBeTruthy();
  });

  it("shows a general profitability dashboard in reportes", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre o razon social"), "Ana Perez");
    await user.type(screen.getByLabelText("NIT o C.C."), "123");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );
    await user.type(screen.getByLabelText("Cantidad"), "2");
    await user.click(screen.getByRole("button", { name: "Registrar venta" }));

    await user.click(screen.getByRole("button", { name: "Reportes" }));

    expect(screen.getByText("Margen bruto")).toBeTruthy();
    expect(screen.getByText("Margen neto")).toBeTruthy();
    const summary = screen.getByLabelText("Resumen rentabilidad general");
    const grossMarginCard = within(summary).getByText("Margen bruto").closest(".summary-card");
    expect(grossMarginCard).toBeTruthy();
    expect(within(grossMarginCard as HTMLElement).getByText(/\$\s*2\.600/)).toBeTruthy();
    expect(screen.getByLabelText("Grafico cascada de utilidad")).toBeTruthy();
    expect(screen.queryByRole("table", { name: "Detalle margen por producto" })).toBeNull();
  });

  it("shows report tabs and rentabilidad subviews separately", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre o razon social"), "Ana Perez");
    await user.type(screen.getByLabelText("NIT o C.C."), "123");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );
    await user.type(screen.getByLabelText("Cantidad"), "2");
    await user.click(screen.getByRole("button", { name: "Registrar venta" }));

    await user.click(screen.getByRole("button", { name: "Reportes" }));

    const submenu = screen.getByLabelText("Tipos de reportes");
    expect(
      within(submenu).getByRole("button", { name: "Rentabilidad" }).getAttribute("aria-selected")
    ).toBe("true");
    expect(within(submenu).getByRole("button", { name: "DSO" })).toBeTruthy();
    expect(within(submenu).getByRole("button", { name: "Flujo de caja" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Cascada" })).toBeNull();

    const profitabilityMenu = screen.getByLabelText("Tipos de rentabilidad");
    expect(
      within(profitabilityMenu)
        .getByRole("button", { name: "Dashboard general" })
        .getAttribute("aria-selected")
    ).toBe("true");
    expect(within(profitabilityMenu).getByRole("button", { name: "Clientes" })).toBeTruthy();
    expect(within(profitabilityMenu).getByRole("button", { name: "Producto" })).toBeTruthy();
    expect(within(profitabilityMenu).getByRole("button", { name: "Ventas" })).toBeTruthy();

    await user.click(within(profitabilityMenu).getByRole("button", { name: "Clientes" }));

    expect(
      within(profitabilityMenu).getByRole("button", { name: "Clientes" }).getAttribute("aria-selected")
    ).toBe("true");
    expect(screen.getByLabelText("Grafico margen por cliente")).toBeTruthy();
    expect(screen.queryByRole("table", { name: "Margen por venta" })).toBeNull();
  });

  it("shows dso global and top clients by receivable impact", async () => {
    const nowSpy = vi.spyOn(Date, "now");

    try {
      nowSpy.mockReturnValue(new Date("2026-07-02T10:00:00.000Z").getTime());
      const user = userEvent.setup();
      render(<App />);

      await createProductFixture(user);
      await user.click(screen.getByRole("button", { name: "Ventas" }));

      await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
      await user.type(screen.getByLabelText("Nombre o razon social"), "Cliente A");
      await user.type(screen.getByLabelText("NIT o C.C."), "100");
      await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
      await user.selectOptions(
        screen.getByLabelText("Producto"),
        screen.getByRole("option", { name: "Arroz libra" })
      );
      await user.type(screen.getByLabelText("Cantidad"), "2");
      await user.click(screen.getByLabelText("Pendiente"));
      await user.type(screen.getByLabelText("Fecha vencimiento venta"), "2026-07-30");
      await user.click(screen.getByRole("button", { name: "Registrar venta" }));

      nowSpy.mockReturnValue(new Date("2026-07-12T10:00:00.000Z").getTime());

      await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
      await user.type(screen.getByLabelText("Nombre o razon social"), "Cliente B");
      await user.type(screen.getByLabelText("NIT o C.C."), "200");
      await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
      await user.selectOptions(
        screen.getByLabelText("Producto"),
        screen.getByRole("option", { name: "Arroz libra" })
      );
      await user.type(screen.getByLabelText("Cantidad"), "1");
      await user.click(screen.getByLabelText("Pendiente"));
      await user.type(screen.getByLabelText("Fecha vencimiento venta"), "2026-08-05");
      await user.click(screen.getByRole("button", { name: "Registrar venta" }));

      nowSpy.mockReturnValue(new Date("2026-07-22T10:00:00.000Z").getTime());

      await user.click(screen.getByRole("button", { name: "Reportes" }));
      await user.click(
        within(screen.getByLabelText("Tipos de reportes")).getByRole("button", { name: "DSO" })
      );

      expect(screen.getByRole("heading", { name: "DSO" })).toBeTruthy();
      expect(screen.getByText("16.7 dias")).toBeTruthy();

      const dsoTable = screen.getByRole("table", { name: "Impacto DSO por cliente" });
      const rows = within(dsoTable).getAllByRole("row");
      expect(rows[1]?.textContent).toContain("Cliente A");
      expect(rows[1]?.textContent).toContain("$ 9.000");
      expect(rows[1]?.textContent).toContain("20.0 dias");
      expect(rows[1]?.textContent).toContain("66.7%");
      expect(rows[2]?.textContent).toContain("Cliente B");
      expect(rows[2]?.textContent).toContain("$ 4.500");
      expect(rows[2]?.textContent).toContain("10.0 dias");
      expect(rows[2]?.textContent).toContain("33.3%");
    } finally {
      nowSpy.mockRestore();
    }
  });

  it("shows real and projected cash flow in the flujo de caja report", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);

    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre o razon social"), "Cliente Caja");
    await user.type(screen.getByLabelText("NIT o C.C."), "300");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );
    await user.type(screen.getByLabelText("Cantidad"), "2");
    await user.click(screen.getByRole("button", { name: "Registrar venta" }));

    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre o razon social"), "Cliente Proyectado");
    await user.type(screen.getByLabelText("NIT o C.C."), "301");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );
    await user.type(screen.getByLabelText("Cantidad"), "1");
    await user.click(screen.getByLabelText("Pendiente"));
    await user.type(screen.getByLabelText("Fecha vencimiento venta"), "2026-07-30");
    await user.click(screen.getByRole("button", { name: "Registrar venta" }));

    await createSupplierFixture(user, "Proveedor Flujo");
    await user.type(screen.getByLabelText("Numero factura"), "FC-REAL");
    await user.type(screen.getByLabelText("Fecha emision"), "2026-07-01");
    await user.type(screen.getByLabelText("Fecha vencimiento"), "2026-07-10");
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );
    await user.type(screen.getByLabelText("Cantidad compra"), "3");
    await user.type(screen.getByLabelText("Costo unitario"), "3000");
    await user.click(screen.getByLabelText("Pagada"));
    await user.click(screen.getByRole("button", { name: "Registrar compra" }));

    await user.selectOptions(
      screen.getByLabelText("Proveedor"),
      screen.getByRole("option", { name: "Proveedor Flujo" })
    );
    await user.clear(screen.getByLabelText("Numero factura"));
    await user.type(screen.getByLabelText("Numero factura"), "FC-PEND");
    await user.clear(screen.getByLabelText("Fecha emision"));
    await user.type(screen.getByLabelText("Fecha emision"), "2026-07-02");
    await user.clear(screen.getByLabelText("Fecha vencimiento"));
    await user.type(screen.getByLabelText("Fecha vencimiento"), "2026-07-25");
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );
    await user.clear(screen.getByLabelText("Cantidad compra"));
    await user.type(screen.getByLabelText("Cantidad compra"), "5");
    await user.clear(screen.getByLabelText("Costo unitario"));
    await user.type(screen.getByLabelText("Costo unitario"), "2000");
    await user.click(screen.getByLabelText("Pendiente"));
    await user.click(screen.getByRole("button", { name: "Registrar compra" }));

    await user.click(screen.getByRole("button", { name: "Cartera" }));
    await user.click(screen.getByRole("button", { name: "Por pagar" }));
    const payablesTable = screen.getByRole("table", { name: "Cartera por pagar" });
    await user.click(within(payablesTable).getByRole("button", { name: "Registrar abono" }));
    await user.type(screen.getByLabelText("Valor abono"), "4000");
    await user.click(screen.getByRole("button", { name: "Guardar abono" }));

    await user.click(screen.getByRole("button", { name: "Reportes" }));
    await user.click(
      within(screen.getByLabelText("Tipos de reportes")).getByRole("button", { name: "Flujo de caja" })
    );

    const summary = screen.getByLabelText("Resumen flujo de caja");
    expect(within(summary).getByText("Entradas reales")).toBeTruthy();
    expect(within(summary).getByText("Salidas reales")).toBeTruthy();
    expect(within(summary).getByText("Flujo neto real")).toBeTruthy();
    expect(within(summary).getByText("Flujo neto proyectado")).toBeTruthy();
    expect(within(summary).getByText(/\$\s*9\.000/)).toBeTruthy();
    expect(within(summary).getByText(/\$\s*13\.000/)).toBeTruthy();
    expect(within(summary).getByText(/-\$\s*4\.000|\$\s*-4\.000/)).toBeTruthy();
    expect(within(summary).getByText(/-\$\s*1\.500|\$\s*-1\.500/)).toBeTruthy();

    expect(screen.getByLabelText("Grafico flujo de caja comparativo")).toBeTruthy();

    const table = screen.getByRole("table", { name: "Detalle flujo de caja" });
    expect(within(table).getByText("Venta pagada")).toBeTruthy();
    expect(within(table).getByText("Compra pagada")).toBeTruthy();
    expect(within(table).getByText("Abono proveedor")).toBeTruthy();
    expect(within(table).getByText("Cuenta por cobrar")).toBeTruthy();
    expect(within(table).getByText("Cuenta por pagar")).toBeTruthy();
    expect(within(table).getByText("Cliente Proyectado")).toBeTruthy();
    expect(within(table).getAllByText("Proveedor Flujo").length).toBeGreaterThan(0);
  });

  it("shows utilidades by day after renaming variacion directa", async () => {
    const nowSpy = vi.spyOn(Date, "now");

    try {
      const user = userEvent.setup();
      render(<App />);

      await createProductFixture(user);
      await user.click(screen.getByRole("button", { name: "Ventas" }));

      nowSpy.mockReturnValue(new Date("2026-07-01T10:00:00.000Z").getTime());
      await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
      await user.type(screen.getByLabelText("Nombre o razon social"), "Cliente Utilidad 1");
      await user.type(screen.getByLabelText("NIT o C.C."), "401");
      await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
      await user.selectOptions(
        screen.getByLabelText("Producto"),
        screen.getByRole("option", { name: "Arroz libra" })
      );
      await user.type(screen.getByLabelText("Cantidad"), "2");
      await user.click(screen.getByRole("button", { name: "Registrar venta" }));

      nowSpy.mockReturnValue(new Date("2026-07-02T10:00:00.000Z").getTime());
      await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
      await user.type(screen.getByLabelText("Nombre o razon social"), "Cliente Utilidad 2");
      await user.type(screen.getByLabelText("NIT o C.C."), "402");
      await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
      await user.selectOptions(
        screen.getByLabelText("Producto"),
        screen.getByRole("option", { name: "Arroz libra" })
      );
      await user.type(screen.getByLabelText("Cantidad"), "1");
      await user.click(screen.getByRole("button", { name: "Registrar venta" }));

      await user.click(screen.getByRole("button", { name: "Reportes" }));
      await user.click(
        within(screen.getByLabelText("Tipos de reportes")).getByRole("button", { name: "Utilidades" })
      );

      const summary = screen.getByLabelText("Resumen utilidades");
      expect(within(summary).getByText("Utilidad total")).toBeTruthy();
      expect(within(summary).getByText("Promedio por periodo")).toBeTruthy();
      expect(within(summary).getByText("Mejor periodo")).toBeTruthy();
      expect(within(summary).getByText("Peor periodo")).toBeTruthy();
      expect(within(summary).getAllByText(/\$\s*3\.900/).length).toBeGreaterThan(0);

      expect(screen.getByLabelText("Grafico utilidades por periodo")).toBeTruthy();

      const table = screen.getByRole("table", { name: "Detalle utilidades por periodo" });
      expect(within(table).getByText("01/07/2026")).toBeTruthy();
      expect(within(table).getByText("02/07/2026")).toBeTruthy();
      expect(within(table).getByText(/\$\s*9\.000/)).toBeTruthy();
      expect(within(table).getByText(/\$\s*4\.500/)).toBeTruthy();
      expect(within(table).getByText(/\$\s*2\.600/)).toBeTruthy();
      expect(within(table).getByText(/\$\s*1\.300/)).toBeTruthy();
    } finally {
      nowSpy.mockRestore();
    }
  });

  it("shows separate margin rows by client and sale when the same product is sold at different prices", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);

    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre o razon social"), "Cliente Uno");
    await user.type(screen.getByLabelText("NIT o C.C."), "111");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );
    await user.type(screen.getByLabelText("Cantidad"), "1");
    await user.click(screen.getByRole("button", { name: "Registrar venta" }));

    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre o razon social"), "Cliente Dos");
    await user.type(screen.getByLabelText("NIT o C.C."), "222");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );
    await user.clear(screen.getByLabelText("Precio venta unitario"));
    await user.type(screen.getByLabelText("Precio venta unitario"), "3850");
    await user.type(screen.getByLabelText("Cantidad"), "1");
    await user.click(screen.getByRole("button", { name: "Registrar venta" }));

    await user.click(screen.getByRole("button", { name: "Reportes" }));
    await user.click(
      within(screen.getByLabelText("Tipos de rentabilidad")).getByRole("button", { name: "Clientes" })
    );

    expect(screen.getByRole("button", { name: "Abrir detalle de margen por cliente" })).toBeTruthy();
    expect(screen.queryByRole("table", { name: "Detalle margen por cliente" })).toBeNull();

    await user.click(
      within(screen.getByLabelText("Tipos de rentabilidad")).getByRole("button", { name: "Ventas" })
    );
    expect(screen.getByLabelText("Grafico margen por venta")).toBeTruthy();
    expect(screen.queryByRole("table", { name: "Margen por venta" })).toBeNull();
  });

  it("opens a report detail subview from the product margin chart and returns to summary", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre o razon social"), "Ana Perez");
    await user.type(screen.getByLabelText("NIT o C.C."), "123");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );
    await user.type(screen.getByLabelText("Cantidad"), "2");
    await user.click(screen.getByRole("button", { name: "Registrar venta" }));

    await user.click(screen.getByRole("button", { name: "Reportes" }));
    await user.click(
      within(screen.getByLabelText("Tipos de rentabilidad")).getByRole("button", { name: "Producto" })
    );
    await user.click(screen.getByRole("button", { name: "Abrir detalle de margen por producto" }));

    expect(screen.getByRole("heading", { name: "Margen por producto" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Volver a resumen" })).toBeTruthy();

    const detailTable = screen.getByRole("table", { name: "Detalle margen por producto" });
    expect(within(detailTable).getByText("Arroz libra")).toBeTruthy();
    expect(within(detailTable).getByText(/\$\s*2\.600/)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Volver a resumen" }));

    expect(screen.getByRole("button", { name: "Abrir detalle de margen por producto" })).toBeTruthy();
    expect(screen.getByLabelText("Grafico margen por producto")).toBeTruthy();
  });

  it("opens a sale margin detail subview with total and per-product breakdown", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await createSecondProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre o razon social"), "Cliente Mixto");
    await user.type(screen.getByLabelText("NIT o C.C."), "333");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));

    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );
    await user.type(screen.getByLabelText("Cantidad"), "1");
    await user.click(screen.getByRole("button", { name: "Agregar producto" }));

    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Panela unidad" })
    );
    await user.type(screen.getByLabelText("Cantidad"), "2");
    await user.click(screen.getByRole("button", { name: "Registrar venta" }));

    await user.click(screen.getByRole("button", { name: "Reportes" }));
    await user.click(
      within(screen.getByLabelText("Tipos de rentabilidad")).getByRole("button", { name: "Ventas" })
    );
    await user.click(screen.getByRole("button", { name: "Abrir detalle de margen por venta" }));
    await user.click(screen.getByRole("button", { name: /Ver detalle de venta sale-/ }));

    expect(screen.getByRole("heading", { name: "Margen por venta" })).toBeTruthy();
    expect(screen.getByText("Cliente Mixto")).toBeTruthy();
    const saleSummary = screen.getByText("Margen total").closest(".summary-card");
    expect(saleSummary).toBeTruthy();
    expect(within(saleSummary as HTMLElement).getByText(/\$\s*3\.300/)).toBeTruthy();

    const detailTable = screen.getByRole("table", { name: "Detalle margen por producto de la venta" });
    expect(within(detailTable).getByText("Arroz libra")).toBeTruthy();
    expect(within(detailTable).getByText("Panela unidad")).toBeTruthy();
    expect(within(detailTable).getByText(/\$\s*1\.300/)).toBeTruthy();
    expect(within(detailTable).getByText(/\$\s*2\.000/)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Volver a resumen" }));

    expect(screen.getByRole("table", { name: "Detalle margen por venta" })).toBeTruthy();
  });

  it("sorts cartera rows by due date and labels overdue and upcoming invoices", async () => {
    const user = userEvent.setup();
    const upcomingDueAt = formatDateOffsetFromToday(20);
    const overdueDueAt = formatDateOffsetFromToday(-5);

    render(<App />);

    await createProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre o razon social"), "Cliente Tarde");
    await user.type(screen.getByLabelText("NIT o C.C."), "123");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );
    await user.type(screen.getByLabelText("Cantidad"), "1");
    await user.click(screen.getByLabelText("Pendiente"));
    await user.type(screen.getByLabelText("Fecha vencimiento venta"), upcomingDueAt);
    await user.click(screen.getByRole("button", { name: "Registrar venta" }));

    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre o razon social"), "Cliente Vencido");
    await user.type(screen.getByLabelText("NIT o C.C."), "456");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );
    await user.type(screen.getByLabelText("Cantidad"), "1");
    await user.click(screen.getByLabelText("Pendiente"));
    await user.type(screen.getByLabelText("Fecha vencimiento venta"), overdueDueAt);
    await user.click(screen.getByRole("button", { name: "Registrar venta" }));

    await user.click(screen.getByRole("button", { name: "Cartera" }));

    const rows = within(
      screen.getByRole("table", { name: "Cartera por cobrar" })
    ).getAllByRole("row");
    expect(rows[1]?.textContent).toContain("Cliente Vencido");
    expect(rows[1]?.textContent).toContain("Vencida");
    expect(rows[2]?.textContent).toContain("Cliente Tarde");
    expect(rows[2]?.textContent).toContain("30 dias");
  });

  it("shows cartera summary totals and switches between por cobrar and por pagar", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre o razon social"), "Carlos Ruiz");
    await user.type(screen.getByLabelText("NIT o C.C."), "987654321");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );
    await user.type(screen.getByLabelText("Cantidad"), "2");
    await user.click(screen.getByLabelText("Pendiente"));
    await user.type(screen.getByLabelText("Fecha vencimiento venta"), "2026-07-10");
    await user.click(screen.getByRole("button", { name: "Registrar venta" }));

    await user.click(screen.getByRole("button", { name: "Compras" }));
    await user.click(screen.getByRole("button", { name: "Nuevo proveedor" }));
    await user.type(screen.getByLabelText("Nombre proveedor"), "Proveedor Central");
    await user.click(screen.getByRole("button", { name: "Guardar proveedor" }));
    await user.type(screen.getByLabelText("Numero factura"), "FC-3001");
    await user.type(screen.getByLabelText("Fecha emision"), "2026-06-30");
    await user.type(screen.getByLabelText("Fecha vencimiento"), "2026-07-30");
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );
    await user.type(screen.getByLabelText("Cantidad compra"), "5");
    await user.type(screen.getByLabelText("Costo unitario"), "3000");
    await user.click(screen.getByLabelText("Pendiente"));
    await user.click(screen.getByRole("button", { name: "Registrar compra" }));

    await user.click(screen.getByRole("button", { name: "Cartera" }));

    expect(screen.getByText("Total por cobrar")).toBeTruthy();
    expect(screen.getByText("Total por pagar")).toBeTruthy();
    expect(screen.getByText("Facturas vencidas")).toBeTruthy();
    expect(screen.getByText("Proximas a vencer")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Por cobrar" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Por pagar" })).toBeTruthy();
    expect(screen.getByRole("table", { name: "Cartera por cobrar" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Por pagar" }));

    const payablesTable = screen.getByRole("table", { name: "Cartera por pagar" });
    expect(within(payablesTable).getByText("Proveedor Central")).toBeTruthy();
    expect(within(payablesTable).getByText("FC-3001")).toBeTruthy();
    expect(within(payablesTable).getAllByText(/\$\s*15\.000/).length).toBeGreaterThan(0);
  });

  it("registers supplier payable payments from cartera por pagar", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createPendingPurchaseFixture(user);
    await user.click(screen.getByRole("button", { name: "Cartera" }));
    await user.click(screen.getByRole("button", { name: "Por pagar" }));
    const payablesTable = screen.getByRole("table", { name: "Cartera por pagar" });
    await user.click(within(payablesTable).getByRole("button", { name: "Registrar abono" }));
    await user.type(screen.getByLabelText("Valor abono"), "5000");
    await user.click(screen.getByRole("button", { name: "Guardar abono" }));

    expect(within(payablesTable).getByText("Abonada")).toBeTruthy();
    expect(within(payablesTable).getByText(/\$\s*5\.000/)).toBeTruthy();
    expect(within(payablesTable).getByText(/\$\s*10\.000/)).toBeTruthy();
  });

  it("creates a supplier profile with an Antioquia municipality", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Proveedores" }));
    await user.click(screen.getByRole("button", { name: "Nuevo proveedor" }));
    await user.type(screen.getByLabelText("Nombre proveedor"), "Distribuidora Oriente");
    await user.type(screen.getByLabelText("NIT o C.C. proveedor"), "900123456");
    await user.type(screen.getByLabelText("Telefono proveedor"), "6044440000");
    await user.type(screen.getByLabelText("Email proveedor"), "compras@oriente.test");
    await user.type(screen.getByLabelText("Direccion proveedor"), "Calle 10 #20-30");
    await user.selectOptions(
      screen.getByLabelText("Municipio"),
      screen.getByRole("option", { name: "Rionegro" })
    );
    await user.click(screen.getByRole("button", { name: "Guardar proveedor" }));

    const suppliersTable = screen.getByRole("table", { name: "Proveedores registrados" });
    expect(within(suppliersTable).getByText("Distribuidora Oriente")).toBeTruthy();
    expect(within(suppliersTable).getByText("900123456")).toBeTruthy();
    expect(within(suppliersTable).getByText("Rionegro")).toBeTruthy();
    expect(within(suppliersTable).getByText("Activo")).toBeTruthy();
  });

  it("defaults supplier department to Antioquia and allows manual department and municipality", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Proveedores" }));
    await user.click(screen.getByRole("button", { name: "Nuevo proveedor" }));

    const departmentInput = screen.getByLabelText("Departamento") as HTMLInputElement;
    expect(departmentInput.value).toBe("Antioquia");

    await user.type(screen.getByLabelText("Nombre proveedor"), "Proveedor Externo");
    await user.clear(departmentInput);
    await user.type(departmentInput, "Choco");
    await user.type(screen.getByLabelText("Municipio"), "Quibdo");
    await user.click(screen.getByRole("button", { name: "Guardar proveedor" }));

    const suppliersTable = screen.getByRole("table", { name: "Proveedores registrados" });
    expect(within(suppliersTable).getByText("Proveedor Externo")).toBeTruthy();
    expect(within(suppliersTable).getByText("Choco")).toBeTruthy();
    expect(within(suppliersTable).getByText("Quibdo")).toBeTruthy();
  });

  it("edits an existing supplier profile", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Proveedores" }));
    await user.click(screen.getByRole("button", { name: "Nuevo proveedor" }));
    await user.type(screen.getByLabelText("Nombre proveedor"), "Proveedor Inicial");
    await user.selectOptions(
      screen.getByLabelText("Municipio"),
      screen.getByRole("option", { name: "Medellin" })
    );
    await user.click(screen.getByRole("button", { name: "Guardar proveedor" }));

    await user.click(screen.getByRole("button", { name: "Editar proveedor Proveedor Inicial" }));
    await user.clear(screen.getByLabelText("Nombre proveedor"));
    await user.type(screen.getByLabelText("Nombre proveedor"), "Proveedor Actualizado");
    await user.type(screen.getByLabelText("Telefono proveedor"), "3005550101");
    await user.selectOptions(
      screen.getByLabelText("Municipio"),
      screen.getByRole("option", { name: "Envigado" })
    );
    await user.click(screen.getByRole("button", { name: "Guardar cambios proveedor" }));

    const suppliersTable = screen.getByRole("table", { name: "Proveedores registrados" });
    expect(within(suppliersTable).queryByText("Proveedor Inicial")).toBeNull();
    expect(within(suppliersTable).getByText("Proveedor Actualizado")).toBeTruthy();
    expect(within(suppliersTable).getByText("3005550101")).toBeTruthy();
    expect(within(suppliersTable).getByText("Envigado")).toBeTruthy();
  });

  it("registers a paid purchase, increases stock, and lists the invoice", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await createSupplierFixture(user);
    await user.type(screen.getByLabelText("Numero factura"), "FC-1001");
    await user.type(screen.getByLabelText("Fecha emision"), "2026-06-30");
    await user.type(screen.getByLabelText("Fecha vencimiento"), "2026-07-15");
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );
    await user.type(screen.getByLabelText("Cantidad compra"), "6");
    await user.type(screen.getByLabelText("Costo unitario"), "3100");
    await user.click(screen.getByLabelText("Pagada"));
    await user.click(screen.getByRole("button", { name: "Registrar compra" }));

    const purchasesTable = screen.getByRole("table", { name: "Compras registradas" });
    expect(within(purchasesTable).getByText("Distribuidora Norte")).toBeTruthy();
    expect(within(purchasesTable).getByText("FC-1001")).toBeTruthy();
    expect(within(purchasesTable).getByText("Arroz libra")).toBeTruthy();
    expect(within(purchasesTable).getByText("Pagada")).toBeTruthy();
    expect(within(purchasesTable).getByText(/\$\s*18\.600/)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Productos" }));
    const productsTable = screen.getByRole("table", { name: "Productos registrados" });
    expect(within(productsTable).getByRole("cell", { name: "10" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Proveedores" }));
    expect(screen.getByText("Sin cuentas por pagar")).toBeTruthy();
  });

  it("uses calendar date inputs for purchase issue and due dates", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Compras" }));

    expect(screen.getByLabelText("Fecha emision").getAttribute("type")).toBe("date");
    expect(screen.getByLabelText("Fecha vencimiento").getAttribute("type")).toBe(
      "date"
    );
  });

  it("creates a new product inline while registering a purchase invoice", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createSupplierFixture(user, "Distribuidora Sur");
    await user.click(screen.getByRole("button", { name: "Nuevo producto" }));
    await user.type(screen.getByLabelText("Codigo producto"), "PAN-001");
    await user.type(screen.getByLabelText("Nombre producto"), "Panela unidad");
    await user.type(screen.getByLabelText("Costo producto"), "2500");
    await user.type(screen.getByLabelText("Precio venta producto"), "3500");
    await user.type(screen.getByLabelText("Stock minimo producto"), "2");
    await user.click(screen.getByRole("button", { name: "Guardar producto compra" }));
    await user.type(screen.getByLabelText("Numero factura"), "FC-1002");
    await user.type(screen.getByLabelText("Fecha emision"), "2026-06-30");
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Panela unidad" })
    );
    await user.type(screen.getByLabelText("Cantidad compra"), "8");
    await user.type(screen.getByLabelText("Costo unitario"), "2500");
    await user.click(screen.getByRole("button", { name: "Registrar compra" }));

    const purchasesTable = screen.getByRole("table", { name: "Compras registradas" });
    expect(within(purchasesTable).getByText("Panela unidad")).toBeTruthy();
    expect(within(purchasesTable).getByText(/\$\s*20\.000/)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Productos" }));
    const productsTable = screen.getByRole("table", { name: "Productos registrados" });
    expect(within(productsTable).getByRole("cell", { name: "PAN-001" })).toBeTruthy();
    expect(within(productsTable).getByRole("cell", { name: "Panela unidad" })).toBeTruthy();
    expect(within(productsTable).getByRole("cell", { name: "8" })).toBeTruthy();
  });

  it("registers a pending purchase and creates a supplier payable", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await createSupplierFixture(user, "Proveedor Central");
    await user.type(screen.getByLabelText("Numero factura"), "FC-2001");
    await user.type(screen.getByLabelText("Fecha emision"), "2026-06-30");
    await user.type(screen.getByLabelText("Fecha vencimiento"), "2026-07-30");
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );
    await user.type(screen.getByLabelText("Cantidad compra"), "5");
    await user.type(screen.getByLabelText("Costo unitario"), "3000");
    await user.click(screen.getByLabelText("Pendiente"));
    await user.click(screen.getByRole("button", { name: "Registrar compra" }));

    await user.click(screen.getByRole("button", { name: "Proveedores" }));

    const payablesTable = screen.getByRole("table", { name: "Cuentas por pagar" });
    expect(within(payablesTable).getByText("Proveedor Central")).toBeTruthy();
    expect(within(payablesTable).getByText("FC-2001")).toBeTruthy();
    expect(within(payablesTable).getByText("Pendiente")).toBeTruthy();
    expect(within(payablesTable).getAllByText(/\$\s*15\.000/).length).toBeGreaterThan(0);
  });

  it("registers multiple products in one pending purchase invoice", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Productos" }));
    await user.click(screen.getByRole("button", { name: "Nuevo producto" }));
    await user.type(screen.getByLabelText("Codigo"), "PNL-001");
    await user.type(screen.getByLabelText("Producto"), "Panela unidad");
    await user.type(screen.getByLabelText("Unidad"), "2");
    await user.type(screen.getByLabelText("Costo"), "2500");
    await user.type(screen.getByLabelText("Precio venta"), "3500");
    await user.type(screen.getByLabelText("Stock minimo"), "1");
    await user.click(screen.getByRole("button", { name: "Guardar producto" }));

    await createSupplierFixture(user, "Proveedor Mixto");
    await user.type(screen.getByLabelText("Numero factura"), "FC-4001");
    await user.type(screen.getByLabelText("Fecha emision"), "2026-06-30");
    await user.type(screen.getByLabelText("Fecha vencimiento"), "2026-07-30");
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );
    await user.type(screen.getByLabelText("Cantidad compra"), "3");
    await user.type(screen.getByLabelText("Costo unitario"), "3000");
    await user.click(screen.getByRole("button", { name: "Agregar producto" }));
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Panela unidad" })
    );
    await user.type(screen.getByLabelText("Cantidad compra"), "4");
    await user.type(screen.getByLabelText("Costo unitario"), "2500");
    await user.click(screen.getByRole("button", { name: "Agregar producto" }));
    await user.click(screen.getByLabelText("Pendiente"));
    await user.click(screen.getByRole("button", { name: "Registrar compra" }));

    const purchasesTable = screen.getByRole("table", { name: "Compras registradas" });
    expect(within(purchasesTable).getByText("Proveedor Mixto")).toBeTruthy();
    expect(within(purchasesTable).getByText("2 productos")).toBeTruthy();
    expect(within(purchasesTable).getByText(/\$\s*19\.000/)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Productos" }));
    const productsTable = screen.getByRole("table", { name: "Productos registrados" });
    expect(within(productsTable).getByRole("row", { name: /Arroz libra.*7/ })).toBeTruthy();
    expect(within(productsTable).getByRole("row", { name: /Panela unidad.*6/ })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Proveedores" }));
    const payablesTable = screen.getByRole("table", { name: "Cuentas por pagar" });
    expect(within(payablesTable).getByText("FC-4001")).toBeTruthy();
    expect(within(payablesTable).getAllByText(/\$\s*19\.000/).length).toBeGreaterThan(0);
  });

  it("registers a partial supplier payment and marks payable as abonada", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createPendingPurchaseFixture(user);
    await user.click(screen.getByRole("button", { name: "Registrar abono" }));
    await user.type(screen.getByLabelText("Valor abono"), "5000");
    await user.click(screen.getByRole("button", { name: "Guardar abono" }));

    const payablesTable = screen.getByRole("table", { name: "Cuentas por pagar" });
    expect(within(payablesTable).getByText("Abonada")).toBeTruthy();
    expect(within(payablesTable).getByText(/\$\s*5\.000/)).toBeTruthy();
    expect(within(payablesTable).getByText(/\$\s*10\.000/)).toBeTruthy();
  });

  it("registers a full supplier payment and marks payable as pagada", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createPendingPurchaseFixture(user);
    await user.click(screen.getByRole("button", { name: "Registrar abono" }));
    await user.type(screen.getByLabelText("Valor abono"), "15000");
    await user.click(screen.getByRole("button", { name: "Guardar abono" }));

    const payablesTable = screen.getByRole("table", { name: "Cuentas por pagar" });
    expect(within(payablesTable).getByText("Pagada")).toBeTruthy();
    expect(within(payablesTable).getAllByText(/\$\s*15\.000/).length).toBeGreaterThan(1);
    expect(within(payablesTable).getByText(/\$\s*0/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Registrar abono" })).toBeNull();
  });

  it("validates missing purchase invoice fields and empty supplier name", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Compras" }));
    await user.click(screen.getByRole("button", { name: "Nuevo proveedor" }));
    await user.click(screen.getByRole("button", { name: "Guardar proveedor" }));

    expect(screen.getByText("El nombre del proveedor es obligatorio.")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Registrar compra" }));

    expect(screen.getByText("Debes seleccionar un proveedor.")).toBeTruthy();
    expect(screen.getByText("El numero de factura es obligatorio.")).toBeTruthy();
    expect(screen.getByText("La fecha de emision es obligatoria.")).toBeTruthy();
    expect(screen.getByText("Debes seleccionar un producto.")).toBeTruthy();
    expect(screen.getByText("La cantidad debe ser un entero mayor a cero.")).toBeTruthy();
    expect(screen.getByText("El costo unitario debe ser cero o mayor.")).toBeTruthy();
    expect(screen.queryByRole("table", { name: "Compras registradas" })).toBeNull();
  });

  it("rejects supplier payment greater than payable balance", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createPendingPurchaseFixture(user);
    await user.click(screen.getByRole("button", { name: "Registrar abono" }));
    await user.type(screen.getByLabelText("Valor abono"), "16000");
    await user.click(screen.getByRole("button", { name: "Guardar abono" }));

    expect(screen.getByText("El abono no puede superar el saldo pendiente.")).toBeTruthy();
    const payablesTable = screen.getByRole("table", { name: "Cuentas por pagar" });
    expect(within(payablesTable).getByText("Pendiente")).toBeTruthy();
    expect(within(payablesTable).getAllByText(/\$\s*15\.000/).length).toBeGreaterThan(0);
  });

  it("validates missing customer, product, quantity, and empty inline customer name", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));

    expect(screen.getByText("El nombre del cliente es obligatorio.")).toBeTruthy();
    expect(screen.getByText("El documento del cliente es obligatorio.")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Registrar venta" }));

    expect(screen.getByText("Debes seleccionar un cliente.")).toBeTruthy();
    expect(screen.getByText("Debes seleccionar un producto.")).toBeTruthy();
    expect(screen.getByText("La cantidad debe ser un entero mayor a cero.")).toBeTruthy();
  });

  it("rejects a paid sale when stock is insufficient", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre o razon social"), "Luisa Mora");
    await user.type(screen.getByLabelText("NIT o C.C."), "456789123");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );
    await user.type(screen.getByLabelText("Cantidad"), "5");
    await user.click(screen.getByLabelText("Pagada"));
    await user.click(screen.getByRole("button", { name: "Registrar venta" }));

    expect(
      screen.getByText("No hay inventario suficiente para completar el movimiento.")
    ).toBeTruthy();
  });

  it("creates an inline customer with document, address, city, and email", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre o razon social"), "Ana Perez");
    await user.type(screen.getByLabelText("NIT o C.C."), "123456789");
    await user.type(screen.getByLabelText("Direccion"), "Calle 10 # 20-30");
    await user.type(screen.getByLabelText("Ciudad"), "Medellin");
    await user.type(screen.getByLabelText("Email"), "ana@example.com");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));

    expect(screen.getByRole("option", { name: "Ana Perez - 123456789" })).toBeTruthy();
  });

  it("creates a customer from Clientes and lists it with active status", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Clientes" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre o razon social"), "Comercial Andes");
    await user.type(screen.getByLabelText("NIT o C.C."), "900123456");
    await user.type(screen.getByLabelText("Direccion"), "Carrera 45 # 10-20");
    await user.type(screen.getByLabelText("Ciudad"), "Medellin");
    await user.type(screen.getByLabelText("Email"), "compras@andes.test");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));

    const customersTable = screen.getByRole("table", { name: "Clientes registrados" });
    expect(within(customersTable).getByText("Comercial Andes")).toBeTruthy();
    expect(within(customersTable).getByText("900123456")).toBeTruthy();
    expect(within(customersTable).getByText("Activo")).toBeTruthy();
  });

  it("searches customers by name and document", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Clientes" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre o razon social"), "Comercial Andes");
    await user.type(screen.getByLabelText("NIT o C.C."), "900123456");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre o razon social"), "Tienda Sur");
    await user.type(screen.getByLabelText("NIT o C.C."), "111222333");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));

    const searchInput = screen.getByLabelText("Buscar clientes");

    await user.type(searchInput, "900123456");

    const customersTable = screen.getByRole("table", { name: "Clientes registrados" });
    expect(within(customersTable).getByText("Comercial Andes")).toBeTruthy();
    expect(within(customersTable).queryByText("Tienda Sur")).toBeNull();

    await user.clear(searchInput);
    await user.type(searchInput, "Tienda");

    expect(within(customersTable).getByText("Tienda Sur")).toBeTruthy();
    expect(within(customersTable).queryByText("Comercial Andes")).toBeNull();
  });

  it("edits current customer data from the customer file", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Clientes" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre o razon social"), "Ana Perez");
    await user.type(screen.getByLabelText("NIT o C.C."), "123456789");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.click(screen.getByRole("button", { name: "Ver cliente Ana Perez" }));
    await user.click(screen.getByRole("button", { name: "Editar cliente" }));
    await user.clear(screen.getByLabelText("Nombre o razon social"));
    await user.type(screen.getByLabelText("Nombre o razon social"), "Ana Perez SAS");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    const customersTable = screen.getByRole("table", { name: "Clientes registrados" });
    expect(within(customersTable).getByText("Ana Perez SAS")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Ana Perez SAS" })).toBeTruthy();
  });

  it("deactivates a customer and hides it from new sales", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Clientes" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre o razon social"), "Ana Perez");
    await user.type(screen.getByLabelText("NIT o C.C."), "123456789");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.click(screen.getByRole("button", { name: "Ver cliente Ana Perez" }));
    await user.click(screen.getByRole("button", { name: "Desactivar cliente" }));

    expect(within(screen.getByLabelText("Ficha de cliente")).getByText("Inactivo")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Ventas" }));
    expect(screen.queryByRole("option", { name: "Ana Perez - 123456789" })).toBeNull();
  });

  it("reactivates a customer and shows it for new sales again", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Clientes" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre o razon social"), "Ana Perez");
    await user.type(screen.getByLabelText("NIT o C.C."), "123456789");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.click(screen.getByRole("button", { name: "Ver cliente Ana Perez" }));
    await user.click(screen.getByRole("button", { name: "Desactivar cliente" }));
    await user.click(screen.getByRole("button", { name: "Reactivar cliente" }));
    await user.click(screen.getByRole("button", { name: "Ventas" }));

    expect(screen.getByRole("option", { name: "Ana Perez - 123456789" })).toBeTruthy();
  });

  it("shows customer file metrics, sales history, and pending receivables", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre o razon social"), "Carlos Ruiz");
    await user.type(screen.getByLabelText("NIT o C.C."), "987654321");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.selectOptions(screen.getByLabelText("Producto"), screen.getByRole("option", { name: "Arroz libra" }));
    await user.type(screen.getByLabelText("Cantidad"), "2");
    await user.click(screen.getByLabelText("Pendiente"));
    await user.type(screen.getByLabelText("Fecha vencimiento venta"), "2026-07-15");
    await user.click(screen.getByRole("button", { name: "Registrar venta" }));
    await user.click(screen.getByRole("button", { name: "Clientes" }));
    await user.click(screen.getByRole("button", { name: "Ver cliente Carlos Ruiz" }));

    const customerSummary = screen.getByLabelText("Resumen del cliente");
    expect(within(customerSummary).getByText("Total vendido")).toBeTruthy();
    expect(within(customerSummary).getAllByText(/\$\s*9\.000/).length).toBeGreaterThan(0);
    expect(within(customerSummary).getByText("Ventas")).toBeTruthy();
    expect(within(customerSummary).getByText("1")).toBeTruthy();

    const salesHistory = screen.getByRole("table", { name: "Historial de ventas del cliente" });
    expect(within(salesHistory).getByText("Arroz libra")).toBeTruthy();
    expect(within(salesHistory).getByText("Pendiente")).toBeTruthy();

    const customerReceivables = screen.getByRole("table", { name: "Cartera pendiente del cliente" });
    expect(within(customerReceivables).getByText("2026-07-15")).toBeTruthy();
  });

  it("rejects a sale when the selected customer becomes inactive", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre o razon social"), "Ana Perez");
    await user.type(screen.getByLabelText("NIT o C.C."), "123456789");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );
    await user.type(screen.getByLabelText("Cantidad"), "1");
    await user.click(screen.getByRole("button", { name: "Clientes" }));
    await user.click(screen.getByRole("button", { name: "Ver cliente Ana Perez" }));
    await user.click(screen.getByRole("button", { name: "Desactivar cliente" }));
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Registrar venta" }));

    expect(
      screen.getByText(
        "El cliente seleccionado esta inactivo. Reactivalo para registrar nuevas ventas."
      )
    ).toBeTruthy();
  });

  it("keeps old invoice customer data after editing the current customer", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre o razon social"), "Ana Perez");
    await user.type(screen.getByLabelText("NIT o C.C."), "123456789");
    await user.type(screen.getByLabelText("Direccion"), "Calle 1");
    await user.type(screen.getByLabelText("Ciudad"), "Medellin");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.selectOptions(screen.getByLabelText("Producto"), screen.getByRole("option", { name: "Arroz libra" }));
    await user.type(screen.getByLabelText("Cantidad"), "1");
    await user.click(screen.getByRole("button", { name: "Registrar venta" }));
    await user.click(screen.getByRole("button", { name: "Clientes" }));
    await user.click(screen.getByRole("button", { name: "Ver cliente Ana Perez" }));
    await user.click(screen.getByRole("button", { name: "Editar cliente" }));
    await user.clear(screen.getByLabelText("Nombre o razon social"));
    await user.type(screen.getByLabelText("Nombre o razon social"), "Ana Perez SAS");
    await user.clear(screen.getByLabelText("Direccion"));
    await user.type(screen.getByLabelText("Direccion"), "Calle 99");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Generar factura PDF" }));

    await waitFor(() =>
      expect(generateInvoicePdfMock).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: expect.objectContaining({
            address: "Calle 1",
            name: "Ana Perez"
          })
        })
      )
    );
  });

  it("blocks duplicate customer documents from inline sales creation", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre o razon social"), "Ana Perez");
    await user.type(screen.getByLabelText("NIT o C.C."), "123456789");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre o razon social"), "Ana Perez Sucursal");
    await user.type(screen.getByLabelText("NIT o C.C."), " 123456789 ");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));

    expect(screen.getByText("Ya existe un cliente con este NIT o C.C.")).toBeTruthy();
  });

  it("requires customer name and document when creating an inline customer", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));

    expect(screen.getByText("El nombre del cliente es obligatorio.")).toBeTruthy();
    expect(screen.getByText("El documento del cliente es obligatorio.")).toBeTruthy();
  });

  it("generates a PDF invoice for a registered paid sale", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre o razon social"), "Ana Perez");
    await user.type(screen.getByLabelText("NIT o C.C."), "123456789");
    await user.type(screen.getByLabelText("Direccion"), "Calle 10 # 20-30");
    await user.type(screen.getByLabelText("Ciudad"), "Medellin");
    await user.type(screen.getByLabelText("Email"), "ana@example.com");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );
    await user.type(screen.getByLabelText("Cantidad"), "2");
    await user.click(screen.getByLabelText("Pagada"));
    await user.click(screen.getByRole("button", { name: "Registrar venta" }));
    await user.click(screen.getByRole("button", { name: "Generar factura PDF" }));

    await waitFor(() =>
      expect(generateInvoicePdfMock).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: {
            address: "Calle 10 # 20-30",
            city: "Medellin",
            document: "123456789",
            email: "ana@example.com",
            name: "Ana Perez"
          },
          item: {
            description: "Arroz libra",
            quantity: 2,
            totalMinor: 9000,
            unitPriceMinor: 4500
          },
          paymentStatus: "paid"
        })
      )
    );
    await waitFor(() => expect(screen.getByText("Factura generada")).toBeTruthy());
    expect(screen.getByTitle("Vista previa de factura PDF").getAttribute("src")).toBe(
      "data:application/pdf;base64,invoice-pdf"
    );
    expect(screen.getByRole("link", { name: "Descargar PDF" }).getAttribute("href")).toBe(
      "data:application/pdf;base64,invoice-pdf"
    );
  });

  it("passes every sold product to invoice generation", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await createSecondProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre o razon social"), "Ana Perez");
    await user.type(screen.getByLabelText("NIT o C.C."), "123456789");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );
    await user.type(screen.getByLabelText("Cantidad"), "2");
    await user.click(screen.getByRole("button", { name: "Agregar producto" }));
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Panela unidad" })
    );
    await user.type(screen.getByLabelText("Cantidad"), "1");
    await user.click(screen.getByRole("button", { name: "Registrar venta" }));
    await user.click(screen.getByRole("button", { name: "Generar factura PDF" }));

    await waitFor(() =>
      expect(generateInvoicePdfMock).toHaveBeenCalledWith(
        expect.objectContaining({
          items: [
            {
              description: "Arroz libra",
              quantity: 2,
              totalMinor: 9000,
              unitPriceMinor: 4500
            },
            {
              description: "Panela unidad",
              quantity: 1,
              totalMinor: 3500,
              unitPriceMinor: 3500
            }
          ],
          paymentStatus: "paid"
        })
      )
    );
  });

  it("passes pending status to invoice generation for pending sales", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre o razon social"), "Carlos Ruiz");
    await user.type(screen.getByLabelText("NIT o C.C."), "987654321");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );
    await user.type(screen.getByLabelText("Cantidad"), "3");
    await user.click(screen.getByLabelText("Pendiente"));
    await user.type(screen.getByLabelText("Fecha vencimiento venta"), "2026-07-15");
    await user.click(screen.getByRole("button", { name: "Registrar venta" }));
    await user.click(screen.getByRole("button", { name: "Generar factura PDF" }));

    await waitFor(() =>
      expect(generateInvoicePdfMock).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: expect.objectContaining({
            document: "987654321",
            name: "Carlos Ruiz"
          }),
          item: expect.objectContaining({
            quantity: 3,
            totalMinor: 13500
          }),
          paymentStatus: "pending"
        })
      )
    );
  });
});

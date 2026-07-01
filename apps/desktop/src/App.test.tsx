import { render, screen, within } from "@testing-library/react";
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
    );
    expect(screen.getByText("Factura generada")).toBeTruthy();
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
    );
  });
});

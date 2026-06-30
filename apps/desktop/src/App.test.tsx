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
  await user.type(screen.getByLabelText("Codigo"), "ARZ-001");
  await user.type(screen.getByLabelText("Producto"), "Arroz libra");
  await user.type(screen.getByLabelText("Unidad"), "4");
  await user.type(screen.getByLabelText("Costo"), "3200");
  await user.type(screen.getByLabelText("Precio venta"), "4500");
  await user.type(screen.getByLabelText("Stock minimo"), "1");
  await user.click(screen.getByRole("button", { name: "Guardar producto" }));
}

describe("App navigation", () => {
  beforeEach(() => {
    generateInvoicePdfMock.mockClear();
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

  it("formats cost and sale price as colombian pesos while typing", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Productos" }));

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

  it("registers a pending sale without decreasing stock and exposes receivable data", async () => {
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
    await user.click(screen.getByRole("button", { name: "Registrar venta" }));

    const salesTable = screen.getByRole("table", { name: "Ventas registradas" });
    expect(within(salesTable).getByText("Pendiente")).toBeTruthy();
    expect(within(salesTable).getByText(/\$\s*13\.500/)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Productos" }));

    const productsTable = screen.getByRole("table", { name: "Productos registrados" });
    expect(within(productsTable).getByRole("cell", { name: "4" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Cartera" }));

    const receivablesTable = screen.getByRole("table", { name: "Cartera pendiente" });
    expect(within(receivablesTable).getByText("Carlos Ruiz")).toBeTruthy();
    expect(within(receivablesTable).getByText(/\$\s*13\.500/)).toBeTruthy();
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

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { generateInvoicePdf } from "./invoice-pdf";

vi.mock("./invoice-pdf", () => ({
  generateInvoicePdf: vi.fn()
}));

const generateInvoicePdfMock = vi.mocked(generateInvoicePdf);

function setTauriInvoke(
  invoke?: (command: string, args?: Record<string, unknown>) => Promise<unknown>
) {
  Object.defineProperty(window, "__TAURI__", {
    configurable: true,
    value: invoke ? { core: { invoke } } : undefined
  });
}

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
  await user.type(screen.getByLabelText("Razón social"), name);
  await user.click(screen.getByRole("button", { name: "Guardar proveedor" }));
}

async function createPendingPurchaseFixture(user: UserEvent) {
  await createProductFixture(user);
  await createSupplierFixture(user, "Proveedor Central");
  await user.type(screen.getByLabelText("Fecha emision"), "2026-06-30");
  await user.click(screen.getByLabelText("Pendiente"));
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

async function clickFirstSaleAction(user: UserEvent, actionName: string) {
  const salesTable = screen.getByRole("table", { name: "Ventas registradas" });
  const firstActionsButton = within(salesTable).getAllByRole("button", {
    name: /Acciones de venta/
  })[0];

  if (!firstActionsButton) {
    throw new Error("No sale actions button was rendered.");
  }

  await user.click(firstActionsButton);
  await user.click(screen.getByRole("menuitem", { name: actionName }));
}

describe("App navigation", () => {
  beforeEach(() => {
    generateInvoicePdfMock.mockReset();
    generateInvoicePdfMock.mockReturnValue({
      dataUri: "data:application/pdf;base64,invoice-pdf",
      fileName: "factura-FE-sale-1.pdf"
    });
  });

  afterEach(() => {
    setTauriInvoke();
  });

  it("switches active section from the sidebar", async () => {
    const user = userEvent.setup();

    render(<App />);

    const sidebar = document.querySelector(".sidebar");
    const navigation = screen.getByRole("navigation", { name: "Principal" });
    const topbar = document.querySelector(".topbar");
    const topbarContext = document.querySelector(".topbar-context");
    const topbarAction = document.querySelector(".topbar-action");

    expect(sidebar?.querySelector(".sidebar-brand")).toBeTruthy();
    expect(sidebar?.querySelector(".sidebar-nav")).toBeTruthy();
    expect(sidebar?.querySelector(".brand")).toBeTruthy();
    expect(navigation.closest(".sidebar-nav")).toBeTruthy();
    expect(topbarContext).toBeTruthy();
    expect(topbarAction).toBeTruthy();
    expect(topbar?.firstElementChild).toBe(topbarContext);
    expect(topbar?.lastElementChild).toBe(topbarAction);

    expect(screen.getByRole("heading", { name: "Resumen operativo" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Inicio" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Productos" }));

    expect(screen.getByRole("heading", { name: "Productos" })).toBeTruthy();
    expect(screen.getByText("Catalogo de productos")).toBeTruthy();
  });

  it("uses dashboard quick actions to open their target sections", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Nueva venta" }));
    expect(screen.getByRole("heading", { name: "Ventas" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Inicio" }));
    await user.click(screen.getByRole("button", { name: "Ver todo" }));
    expect(screen.getByRole("heading", { name: "Reportes" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Inicio" }));
    await user.click(screen.getByRole("button", { name: "Revisar" }));
    expect(screen.getByRole("heading", { name: "Productos" })).toBeTruthy();
  });

  it("returns to the dashboard when the dashboard item is clicked", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Ventas" }));
    expect(screen.getByRole("heading", { name: "Ventas" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Inicio" }));

    expect(screen.getByRole("heading", { name: "Resumen operativo" })).toBeTruthy();
  });

  it("opens configuration from the lower-left sidebar control", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Configuracion" }));

    expect(screen.getByRole("heading", { name: "Configuracion" })).toBeTruthy();
    expect(screen.getByLabelText("Nombre empresa")).toBeTruthy();
    expect(screen.getByLabelText("Logo empresa")).toBeTruthy();
    expect(screen.getByLabelText("Titulo factura")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeTruthy();
  });

  it("manages sellers and uses them in sales and reports", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Configuracion" }));
    await user.type(screen.getByLabelText("Nombre vendedor"), "Laura Gomez");
    await user.click(screen.getByRole("button", { name: "Agregar vendedor" }));
    await user.type(screen.getByLabelText("Nombre vendedor"), "Mario");
    await user.click(screen.getByRole("button", { name: "Agregar vendedor" }));

    const sellersTable = screen.getByRole("table", { name: "Vendedores configurados" });
    const marioRow = within(sellersTable).getByText("Mario").closest("tr");
    const lauraRow = within(sellersTable).getByText("Laura Gomez").closest("tr");

    if (!marioRow || !lauraRow) {
      throw new Error("Configured seller rows were not rendered.");
    }

    await user.click(within(marioRow).getByRole("button", { name: "Editar" }));
    await user.clear(screen.getByLabelText("Nombre vendedor"));
    await user.type(screen.getByLabelText("Nombre vendedor"), "Mario Ruiz");
    await user.click(screen.getByRole("button", { name: "Guardar vendedor" }));

    const updatedSellersTable = screen.getByRole("table", {
      name: "Vendedores configurados"
    });
    const updatedLauraRow = within(updatedSellersTable)
      .getByText("Laura Gomez")
      .closest("tr");

    if (!updatedLauraRow) {
      throw new Error("Seller row to delete was not rendered.");
    }

    await user.click(within(updatedLauraRow).getByRole("button", { name: "Eliminar" }));
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await createProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Razón social"), "Ana Perez");
    await user.type(screen.getByLabelText("NIT o C.C."), "123456789");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.selectOptions(screen.getByLabelText("Vendedor"), "Mario Ruiz");
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );
    await user.type(screen.getByLabelText("Cantidad"), "1");
    await user.click(screen.getByRole("button", { name: "Registrar venta" }));

    const salesTable = screen.getByRole("table", { name: "Ventas registradas" });
    expect(within(salesTable).getByText("Mario Ruiz")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Reportes" }));
    await user.click(
      within(screen.getByRole("tablist", { name: "Tipos de rentabilidad" })).getByRole(
        "tab",
        { name: "Vendedores" }
      )
    );

    expect(screen.getByLabelText("Grafico ventas por vendedor")).toBeTruthy();
    expect(screen.getByText("Mario Ruiz")).toBeTruthy();

    await user.click(
      screen.getByRole("button", { name: "Abrir detalle de ventas por vendedor" })
    );
    const sellerReportTable = screen.getByRole("table", {
      name: "Detalle ventas por vendedor"
    });
    expect(within(sellerReportTable).getByText("Mario Ruiz")).toBeTruthy();
  });

  it("saves configuration changes through SQLite when Tauri is available", async () => {
    const user = userEvent.setup();
    const invoke = vi.fn().mockImplementation((command: string) => {
      if (command === "health_check") {
        return Promise.resolve("Moneta Tauri conectado");
      }
      if (command === "database_status") {
        return Promise.resolve({
          migrationCount: 2,
          path: "/tmp/moneta.sqlite3"
        });
      }
      if (command === "get_app_settings") {
        return Promise.resolve(null);
      }

      return Promise.resolve(undefined);
    });
    setTauriInvoke(invoke);

    render(<App />);

    await waitFor(() =>
      expect(invoke).toHaveBeenCalledWith("get_app_settings")
    );

    await user.click(screen.getByRole("button", { name: "Configuracion" }));
    await user.type(screen.getByLabelText("Nombre vendedor"), "Laura Gomez");
    await user.click(screen.getByRole("button", { name: "Agregar vendedor" }));
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() =>
      expect(invoke).toHaveBeenCalledWith(
        "save_app_settings",
        expect.objectContaining({
          settings: expect.objectContaining({
            sellers: ["Laura Gomez"]
          })
        })
      )
    );
  });

  it("loads and saves products through SQLite when Tauri is available", async () => {
    const user = userEvent.setup();
    const storedProduct = {
      active: true,
      costMinor: 2800,
      id: "product-stored",
      minimumStock: 2,
      name: "Frijol kilo",
      salePriceMinor: 5200,
      sku: "FRJ-001",
      stock: 6
    };
    const invoke = vi.fn().mockImplementation((command: string) => {
      if (command === "health_check") {
        return Promise.resolve("Moneta Tauri conectado");
      }
      if (command === "database_status") {
        return Promise.resolve({
          migrationCount: 2,
          path: "/tmp/moneta.sqlite3"
        });
      }
      if (command === "get_app_settings") {
        return Promise.resolve(null);
      }
      if (command === "list_products") {
        return Promise.resolve([storedProduct]);
      }

      return Promise.resolve(undefined);
    });
    setTauriInvoke(invoke);

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Productos" }));
    expect(await screen.findByRole("cell", { name: "FRJ-001" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Nuevo producto" }));
    await user.type(screen.getByLabelText("Codigo"), "ARZ-001");
    await user.type(screen.getByLabelText("Producto"), "Arroz libra");
    await user.type(screen.getByLabelText("Unidad"), "4");
    await user.type(screen.getByLabelText("Costo"), "3200");
    await user.type(screen.getByLabelText("Precio venta"), "4500");
    await user.type(screen.getByLabelText("Stock minimo"), "1");
    await user.click(screen.getByRole("button", { name: "Guardar producto" }));

    await waitFor(() =>
      expect(invoke).toHaveBeenCalledWith(
        "save_product",
        expect.objectContaining({
          product: expect.objectContaining({
            name: "Arroz libra",
            sku: "ARZ-001",
            stock: 4
          })
        })
      )
    );
  });

  it("loads and updates customers through SQLite when Tauri is available", async () => {
    const user = userEvent.setup();
    const storedCustomer = {
      active: true,
      address: "Calle 10",
      city: "Medellin",
      document: "123456789",
      email: "ana@correo.com",
      id: "customer-stored",
      name: "Ana Perez"
    };
    const invoke = vi.fn().mockImplementation((command: string) => {
      if (command === "health_check") {
        return Promise.resolve("Moneta Tauri conectado");
      }
      if (command === "database_status") {
        return Promise.resolve({
          migrationCount: 2,
          path: "/tmp/moneta.sqlite3"
        });
      }
      if (command === "get_app_settings") {
        return Promise.resolve(null);
      }
      if (command === "list_products") {
        return Promise.resolve([]);
      }
      if (command === "list_customers") {
        return Promise.resolve([storedCustomer]);
      }
      if (command === "list_suppliers") {
        return Promise.resolve([]);
      }

      return Promise.resolve(undefined);
    });
    setTauriInvoke(invoke);

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Clientes" }));
    expect(await screen.findByRole("cell", { name: "Ana Perez" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Ver cliente Ana Perez" }));
    await user.click(screen.getByRole("button", { name: "Editar cliente" }));
    await user.clear(screen.getByLabelText("Razón social"));
    await user.type(screen.getByLabelText("Razón social"), "Ana Perez Mayorista");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() =>
      expect(invoke).toHaveBeenCalledWith(
        "save_customer",
        expect.objectContaining({
          customer: expect.objectContaining({
            id: "customer-stored",
            name: "Ana Perez Mayorista"
          })
        })
      )
    );

    await user.click(screen.getByRole("button", { name: "Desactivar cliente" }));

    await waitFor(() =>
      expect(invoke).toHaveBeenCalledWith(
        "save_customer",
        expect.objectContaining({
          customer: expect.objectContaining({
            active: false,
            id: "customer-stored"
          })
        })
      )
    );
  });

  it("saves sales and receivables through SQLite when Tauri is available", async () => {
    const user = userEvent.setup();
    const storedProduct = {
      active: true,
      costMinor: 3200,
      id: "product-stored",
      minimumStock: 1,
      name: "Arroz libra",
      salePriceMinor: 4500,
      sku: "ARZ-001",
      stock: 4
    };
    const storedCustomer = {
      active: true,
      address: "Calle 10",
      city: "Medellin",
      document: "123456789",
      email: "ana@correo.com",
      id: "customer-stored",
      name: "Ana Perez"
    };
    const invoke = vi.fn().mockImplementation((command: string) => {
      if (command === "health_check") {
        return Promise.resolve("Moneta Tauri conectado");
      }
      if (command === "database_status") {
        return Promise.resolve({
          migrationCount: 5,
          path: "/tmp/moneta.sqlite3"
        });
      }
      if (command === "get_app_settings") {
        return Promise.resolve(null);
      }
      if (command === "list_products") {
        return Promise.resolve([storedProduct]);
      }
      if (command === "list_customers") {
        return Promise.resolve([storedCustomer]);
      }
      if (command === "list_sales") {
        return Promise.resolve([]);
      }
      if (command === "list_receivables") {
        return Promise.resolve([]);
      }
      if (command === "list_suppliers") {
        return Promise.resolve([]);
      }
      if (command === "list_purchases") {
        return Promise.resolve([]);
      }
      if (command === "list_supplier_payables") {
        return Promise.resolve([]);
      }
      if (command === "list_supplier_payments") {
        return Promise.resolve([]);
      }

      return Promise.resolve(undefined);
    });
    setTauriInvoke(invoke);

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await screen.findByRole("option", { name: /Ana Perez/ });
    await user.selectOptions(screen.getByLabelText("Cliente"), "customer-stored");
    await user.selectOptions(screen.getByLabelText("Producto"), "product-stored");
    await user.type(screen.getByLabelText("Cantidad"), "2");
    await user.click(screen.getByLabelText("Pendiente"));
    await user.type(screen.getByLabelText("Fecha vencimiento venta"), "2026-08-18");
    await user.click(screen.getByRole("button", { name: "Registrar venta" }));

    await waitFor(() =>
      expect(invoke).toHaveBeenCalledWith(
        "save_sale",
        expect.objectContaining({
          receivable: expect.objectContaining({
            balanceMinor: 9000,
            customerId: "customer-stored",
            dueAt: "2026-08-18",
            status: "pending"
          }),
          sale: expect.objectContaining({
            customer: storedCustomer,
            customerId: "customer-stored",
            customerName: "Ana Perez",
            paymentStatus: "pending",
            productName: "Arroz libra",
            quantity: 2,
            totalMinor: 9000
          })
        })
      )
    );

    await user.click(screen.getByRole("button", { name: "Productos" }));
    const productsTable = screen.getByRole("table", { name: "Productos registrados" });
    expect(within(productsTable).getByText("2")).toBeTruthy();
  });

  it("loads and updates suppliers through SQLite when Tauri is available", async () => {
    const user = userEvent.setup();
    const storedSupplier = {
      active: true,
      address: "Calle 20",
      city: "Medellin",
      department: "Antioquia",
      document: "900123",
      email: "proveedor@correo.com",
      id: "supplier-stored",
      name: "Distribuidora Norte",
      phone: "300"
    };
    const invoke = vi.fn().mockImplementation((command: string) => {
      if (command === "health_check") {
        return Promise.resolve("Moneta Tauri conectado");
      }
      if (command === "database_status") {
        return Promise.resolve({
          migrationCount: 2,
          path: "/tmp/moneta.sqlite3"
        });
      }
      if (command === "get_app_settings") {
        return Promise.resolve(null);
      }
      if (command === "list_products") {
        return Promise.resolve([]);
      }
      if (command === "list_customers") {
        return Promise.resolve([]);
      }
      if (command === "list_suppliers") {
        return Promise.resolve([storedSupplier]);
      }

      return Promise.resolve(undefined);
    });
    setTauriInvoke(invoke);

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Proveedores" }));
    expect(
      await screen.findByRole("cell", { name: "Distribuidora Norte" })
    ).toBeTruthy();
    await user.click(
      screen.getByRole("button", { name: "Editar proveedor Distribuidora Norte" })
    );
    await user.clear(screen.getByLabelText("Razón social"));
    await user.type(screen.getByLabelText("Razón social"), "Distribuidora Sur");
    await user.click(screen.getByRole("button", { name: "Guardar cambios proveedor" }));

    await waitFor(() =>
      expect(invoke).toHaveBeenCalledWith(
        "save_supplier",
        expect.objectContaining({
          supplier: expect.objectContaining({
            id: "supplier-stored",
            name: "Distribuidora Sur"
          })
        })
      )
    );

    await user.click(screen.getByRole("button", { name: "Desactivar proveedor" }));

    await waitFor(() =>
      expect(invoke).toHaveBeenCalledWith(
        "save_supplier",
        expect.objectContaining({
          supplier: expect.objectContaining({
            active: false,
            id: "supplier-stored"
          })
        })
      )
    );
  });

  it("loads and saves purchases through SQLite when Tauri is available", async () => {
    const user = userEvent.setup();
    const storedProduct = {
      active: true,
      costMinor: 3200,
      id: "product-stored",
      minimumStock: 1,
      name: "Arroz libra",
      salePriceMinor: 4500,
      sku: "ARZ-001",
      stock: 4
    };
    const storedSupplier = {
      active: true,
      address: "Calle 20",
      city: "Medellin",
      department: "Antioquia",
      document: "900123",
      email: "proveedor@correo.com",
      id: "supplier-stored",
      name: "Distribuidora Norte",
      phone: "300"
    };
    const storedPurchase = {
      branch: "Principal",
      concept: "Factura de compra",
      currency: "COP" as const,
      dueAt: "",
      expenseCategory: "inventory" as const,
      id: "purchase-stored",
      invoiceNumber: "001",
      issuedAt: "2026-07-01",
      lines: [
        {
          discountMinor: 0,
          discountPercent: 0,
          id: "purchase-stored-line-0",
          productId: "product-stored",
          productName: "Arroz libra",
          quantity: 1,
          subtotalMinor: 3200,
          taxMinor: 0,
          taxPercent: 0,
          totalMinor: 3200,
          unit: "Unidad",
          unitCostMinor: 3200
        }
      ],
      occurredAtLabel: "01/07/26, 12:00",
      occurredAtMs: 1,
      paymentStatus: "paid" as const,
      prefix: "",
      productId: "product-stored",
      productName: "Arroz libra",
      quantity: 1,
      supplierId: "supplier-stored",
      supplierName: "Distribuidora Norte",
      totalMinor: 3200,
      unitCostMinor: 3200
    };
    const invoke = vi.fn().mockImplementation((command: string) => {
      if (command === "health_check") {
        return Promise.resolve("Moneta Tauri conectado");
      }
      if (command === "database_status") {
        return Promise.resolve({
          migrationCount: 3,
          path: "/tmp/moneta.sqlite3"
        });
      }
      if (command === "get_app_settings") {
        return Promise.resolve(null);
      }
      if (command === "list_products") {
        return Promise.resolve([storedProduct]);
      }
      if (command === "list_customers") {
        return Promise.resolve([]);
      }
      if (command === "list_suppliers") {
        return Promise.resolve([storedSupplier]);
      }
      if (command === "list_purchases") {
        return Promise.resolve([storedPurchase]);
      }
      if (command === "list_supplier_payables") {
        return Promise.resolve([]);
      }

      return Promise.resolve(undefined);
    });
    setTauriInvoke(invoke);

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Compras" }));
    expect(await screen.findByRole("cell", { name: "001" })).toBeTruthy();
    await user.selectOptions(screen.getByLabelText("Proveedor"), "supplier-stored");
    await user.type(screen.getByLabelText("Fecha emision"), "2026-07-18");
    await user.click(screen.getByLabelText("Pendiente"));
    await user.type(screen.getByLabelText("Fecha vencimiento"), "2026-08-18");
    await user.selectOptions(screen.getByLabelText("Producto"), "product-stored");
    await user.type(screen.getByLabelText("Cantidad compra"), "2");
    await user.type(screen.getByLabelText("Costo unitario"), "3300");
    await user.click(screen.getByRole("button", { name: "Registrar compra" }));

    await waitFor(() =>
      expect(invoke).toHaveBeenCalledWith(
        "save_purchase",
        expect.objectContaining({
          purchase: expect.objectContaining({
            invoiceNumber: "002",
            paymentStatus: "pending",
            quantity: 2,
            supplierId: "supplier-stored",
            totalMinor: 6600
          }),
          supplierPayable: expect.objectContaining({
            balanceMinor: 6600,
            invoiceNumber: "002",
            status: "pending",
            supplierId: "supplier-stored"
          })
        })
      )
    );
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

    await user.click(screen.getByRole("button", { name: "Inicio" }));

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
    await user.type(screen.getByLabelText("Razón social"), "Ana Perez");
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

  it("shows sales charts on the dashboard from registered sales", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Razón social"), "Ana Perez");
    await user.type(screen.getByLabelText("NIT o C.C."), "123456789");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );
    await user.type(screen.getByLabelText("Cantidad"), "2");
    await user.click(screen.getByLabelText("Pagada"));
    await user.click(screen.getByRole("button", { name: "Registrar venta" }));

    await user.click(screen.getByRole("button", { name: "Inicio" }));

    expect(screen.getByRole("heading", { name: "Ventas diarias" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Ventas por mes" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Productos mas vendidos" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Top clientes" })).toBeTruthy();
    expect(screen.getByText("Ventas del mes")).toBeTruthy();
    const dailySalesChart = screen.getByLabelText("Grafico ventas diarias");
    expect(screen.getByLabelText("Periodo 1 ventas diarias")).toBeTruthy();
    expect(screen.getByLabelText("Periodo 2 ventas diarias")).toBeTruthy();
    expect(within(dailySalesChart).getByText("Periodo 1")).toBeTruthy();
    expect(within(dailySalesChart).getByText("Periodo 2")).toBeTruthy();
    expect(within(dailySalesChart).getByText("Dia 1")).toBeTruthy();
    expect(within(dailySalesChart).getByText("Dia 31")).toBeTruthy();
    expect(within(dailySalesChart).getByText("Precios")).toBeTruthy();
    expect(within(dailySalesChart).getByText("Dias")).toBeTruthy();
    expect(within(dailySalesChart).getByText(/\$\s*0/)).toBeTruthy();
    const productPieChart = screen.getByLabelText("Grafico productos mas vendidos");
    expect(within(productPieChart).getByRole("img", { name: "Torta productos mas vendidos" })).toBeTruthy();
    await user.click(within(productPieChart).getByRole("button", { name: "Seleccionar Arroz libra" }));
    expect(within(productPieChart).getByText("Producto seleccionado")).toBeTruthy();
    expect(within(productPieChart).getByText("2 unidades")).toBeTruthy();
    expect(within(productPieChart).getAllByText("Arroz libra").length).toBeGreaterThan(0);
    expect(screen.getByText("Ana Perez")).toBeTruthy();
    expect(screen.getByText("Ana Perez").closest(".dashboard-ranking-row")).toBeTruthy();
    expect(screen.getAllByText(/\$\s*9\.000/).length).toBeGreaterThan(0);
  });

  it("renders the dashboard with analytical hierarchy", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Razón social"), "Ana Perez");
    await user.type(screen.getByLabelText("NIT o C.C."), "123456789");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );
    await user.type(screen.getByLabelText("Cantidad"), "2");
    await user.click(screen.getByLabelText("Pagada"));
    await user.click(screen.getByRole("button", { name: "Registrar venta" }));

    await user.click(screen.getByRole("button", { name: "Inicio" }));

    const analyticsSummary = screen.getByRole("region", { name: "Resumen analitico" });
    const primaryAnalysis = screen.getByRole("region", { name: "Analisis principal" });
    const secondaryAnalysis = screen.getByRole("region", { name: "Analisis secundario" });
    const operationalAlerts = screen.getByRole("region", { name: "Alertas operativas" });
    const primaryControls = within(primaryAnalysis).getByRole("region", {
      name: "Controles del analisis principal"
    });
    const dailySalesChart = within(primaryAnalysis).getByLabelText("Grafico ventas diarias");

    expect(
      analyticsSummary.compareDocumentPosition(primaryAnalysis) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      primaryAnalysis.compareDocumentPosition(secondaryAnalysis) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      secondaryAnalysis.compareDocumentPosition(operationalAlerts) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      primaryControls.compareDocumentPosition(dailySalesChart) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("registers a pending sale, decreases stock, and exposes receivable data", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Razón social"), "Carlos Ruiz");
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
    expect(within(receivablesTable).getAllByText(/\$\s*13\.500/)).toHaveLength(2);
  });

  it("requires a due date for pending sales", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Razón social"), "Carlos Ruiz");
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

  it("uses a compact summary card in the sales form", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Ventas" }));

    expect(screen.getByText("Productos agregados 0").closest(".summary-card-compact")).toBeTruthy();
  });

  it("stores the due date for a pending sale receivable", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Razón social"), "Carlos Ruiz");
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
    expect(within(receivablesTable).getAllByText(/\$\s*9\.000/)).toHaveLength(2);
  });

  it("registers a cash receipt for a customer receivable and updates cartera balance", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Razón social"), "Carlos Ruiz");
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

    await user.click(screen.getByRole("button", { name: "Recibos de caja" }));
    await user.selectOptions(
      screen.getByLabelText("Cuenta por cobrar"),
      screen.getByRole("option", { name: /Carlos Ruiz - sale-/ })
    );
    await user.clear(screen.getByLabelText("Fecha recibo"));
    await user.type(screen.getByLabelText("Fecha recibo"), "2026-07-21");
    await user.type(screen.getByLabelText("Valor recibido"), "5000");
    await user.click(screen.getByRole("button", { name: "Guardar recibo" }));

    const receiptsTable = screen.getByRole("table", {
      name: "Recibos de caja registrados"
    });
    expect(within(receiptsTable).getByText("RC-001")).toBeTruthy();
    expect(within(receiptsTable).getByText("Carlos Ruiz")).toBeTruthy();
    expect(within(receiptsTable).getByText(/\$\s*5\.000/)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Cartera" }));

    const receivablesTable = screen.getByRole("table", { name: "Cartera por cobrar" });
    expect(within(receivablesTable).getByText("Carlos Ruiz")).toBeTruthy();
    expect(within(receivablesTable).getByText(/\$\s*13\.500/)).toBeTruthy();
    expect(within(receivablesTable).getByText(/\$\s*5\.000/)).toBeTruthy();
    expect(within(receivablesTable).getByText(/\$\s*8\.500/)).toBeTruthy();
    expect(within(receivablesTable).getByText("Abonada")).toBeTruthy();
  });

  it("uses cash receipts as real inflows and keeps the remaining receivable projected", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Razón social"), "Carlos Ruiz");
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

    await user.click(screen.getByRole("button", { name: "Recibos de caja" }));
    await user.selectOptions(
      screen.getByLabelText("Cuenta por cobrar"),
      screen.getByRole("option", { name: /Carlos Ruiz - sale-/ })
    );
    await user.type(screen.getByLabelText("Valor recibido"), "5000");
    await user.click(screen.getByRole("button", { name: "Guardar recibo" }));

    await user.click(screen.getByRole("button", { name: "Reportes" }));
    await user.click(
      within(screen.getByRole("tablist", { name: "Tipos de reportes" })).getByRole(
        "tab",
        { name: "Flujo de caja" }
      )
    );

    const cashflowTable = screen.getByRole("table", { name: "Detalle flujo de caja" });
    expect(within(cashflowTable).getByText("Recibo de caja")).toBeTruthy();
    expect(within(cashflowTable).getByText("Cuenta por cobrar")).toBeTruthy();
    expect(within(cashflowTable).getAllByText(/\$\s*5\.000/)).toHaveLength(2);
    expect(within(cashflowTable).getAllByText(/\$\s*8\.500/)).toHaveLength(2);
  });

  it("registers a credit note for a paid sale and returns stock", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Razón social"), "Ana Perez");
    await user.type(screen.getByLabelText("NIT o C.C."), "123456789");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );
    await user.type(screen.getByLabelText("Cantidad"), "2");
    await user.click(screen.getByRole("button", { name: "Registrar venta" }));

    await user.click(screen.getByRole("button", { name: "Notas credito" }));
    await user.selectOptions(
      screen.getByLabelText("Venta acreditada"),
      screen.getByRole("option", { name: "001 - Ana Perez" })
    );
    expect(
      screen.getByRole("option", {
        name: "Devolución de parte de los bienes; no aceptación de partes del servicio"
      })
    ).toBeTruthy();
    expect(
      screen.queryByRole("option", { name: "Anulación de factura electrónica" })
    ).toBeNull();
    expect(
      screen.queryByRole("option", { name: "Rebaja o descuento parcial o total" })
    ).toBeNull();
    await user.type(screen.getByLabelText("Cantidad a acreditar Arroz libra"), "1");
    await user.click(screen.getByRole("button", { name: "Registrar nota credito" }));

    const creditNotesTable = screen.getByRole("table", {
      name: "Notas credito registradas"
    });
    expect(within(creditNotesTable).getByText("NC-001")).toBeTruthy();
    expect(within(creditNotesTable).getByText("001")).toBeTruthy();
    expect(within(creditNotesTable).getByText("Ana Perez")).toBeTruthy();
    expect(
      within(creditNotesTable).getByText(
        "Devolución de parte de los bienes; no aceptación de partes del servicio"
      )
    ).toBeTruthy();
    expect(within(creditNotesTable).getByText("Borrador")).toBeTruthy();
    expect(within(creditNotesTable).getByText(/\$\s*4\.500/)).toBeTruthy();
    await user.click(within(creditNotesTable).getByRole("button", { name: "Revisar" }));
    const reviewPanel = screen.getByLabelText("Resumen antes de confirmar NC-001");
    expect(within(reviewPanel).getByText("Entran 1 unidades")).toBeTruthy();
    expect(within(reviewPanel).getByText("Sin saldo por cobrar")).toBeTruthy();
    expect(within(reviewPanel).getByText("Arroz libra")).toBeTruthy();
    await user.click(within(reviewPanel).getByRole("button", { name: "Confirmar nota" }));
    expect(within(creditNotesTable).getByText("Confirmada")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Productos" }));

    const productsTable = screen.getByRole("table", { name: "Productos registrados" });
    expect(
      within(productsTable).getByRole("row", {
        name: /ARZ-001\s+Arroz libra\s+\$\s*3\.200\s+\$\s*4\.500\s+3\s+1/
      })
    ).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Notas credito" }));
    await user.click(screen.getByRole("button", { name: "Anular" }));
    expect(screen.getByText("Anulada")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Productos" }));

    expect(
      within(screen.getByRole("table", { name: "Productos registrados" })).getByRole(
        "row",
        {
          name: /ARZ-001\s+Arroz libra\s+\$\s*3\.200\s+\$\s*4\.500\s+2\s+1/
        }
      )
    ).toBeTruthy();
  });

  it("registers a discount credit note without returning inventory", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Razón social"), "Cliente Descuento");
    await user.type(screen.getByLabelText("NIT o C.C."), "555");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );
    await user.type(screen.getByLabelText("Cantidad"), "2");
    await user.click(screen.getByRole("button", { name: "Registrar venta" }));

    await user.click(screen.getByRole("button", { name: "Notas credito" }));
    await user.selectOptions(
      screen.getByLabelText("Venta acreditada"),
      screen.getByRole("option", { name: "001 - Cliente Descuento" })
    );
    await user.selectOptions(
      screen.getByLabelText("Tipo de ajuste"),
      screen.getByRole("option", { name: "Descuento / ajuste de valor" })
    );
    expect((screen.getByLabelText("Motivo") as HTMLSelectElement).value).toBe(
      "Rebaja o descuento parcial o total"
    );
    expect(
      screen.queryByRole("option", {
        name: "Devolución de parte de los bienes; no aceptación de partes del servicio"
      })
    ).toBeNull();
    expect(screen.getByRole("option", { name: "Ajuste de precio" })).toBeTruthy();
    await user.type(screen.getByLabelText("Valor a acreditar Arroz libra"), "1000");
    await user.click(screen.getByRole("button", { name: "Registrar nota credito" }));

    const creditNotesTable = screen.getByRole("table", {
      name: "Notas credito registradas"
    });
    expect(
      within(creditNotesTable).getByText("Rebaja o descuento parcial o total")
    ).toBeTruthy();
    expect(within(creditNotesTable).getByText("Descuento")).toBeTruthy();
    expect(within(creditNotesTable).getByText("Borrador")).toBeTruthy();
    expect(within(creditNotesTable).getByText(/\$\s*1\.000/)).toBeTruthy();
    await user.click(within(creditNotesTable).getByRole("button", { name: "Revisar" }));
    const reviewPanel = screen.getByLabelText("Resumen antes de confirmar NC-001");
    expect(within(reviewPanel).getAllByText("Sin movimiento")).toHaveLength(2);
    await user.click(within(reviewPanel).getByRole("button", { name: "Confirmar nota" }));
    expect(within(creditNotesTable).getByText("Confirmada")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Productos" }));

    const productsTable = screen.getByRole("table", { name: "Productos registrados" });
    expect(
      within(productsTable).getByRole("row", {
        name: /ARZ-001\s+Arroz libra\s+\$\s*3\.200\s+\$\s*4\.500\s+2\s+1/
      })
    ).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Inicio" }));

    const metrics = screen.getByRole("region", { name: "Resumen analitico" });
    const monthSalesCard = within(metrics)
      .getByText("Ventas del mes")
      .closest(".metric-card");
    expect(monthSalesCard).toBeTruthy();
    expect(within(monthSalesCard as HTMLElement).getByText(/\$\s*8\.000/)).toBeTruthy();
    expect(
      within(screen.getByLabelText("Grafico productos mas vendidos")).getByText("2 unidades")
    ).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Reportes" }));

    const profitabilitySummary = screen.getByLabelText("Resumen rentabilidad general");
    expect(within(profitabilitySummary).getByText(/\$\s*8\.000/)).toBeTruthy();
    expect(within(profitabilitySummary).getByText(/\$\s*6\.400/)).toBeTruthy();
    expect(within(profitabilitySummary).getAllByText(/\$\s*1\.600/)).toHaveLength(2);

    await user.click(
      within(screen.getByRole("tablist", { name: "Tipos de reportes" })).getByRole("tab", {
        name: "Flujo de caja"
      })
    );

    const cashflowSummary = screen.getByLabelText("Resumen flujo de caja");
    expect(within(cashflowSummary).getByText(/\$\s*9\.000/)).toBeTruthy();
    expect(within(cashflowSummary).getByText(/\$\s*1\.000/)).toBeTruthy();
    expect(within(cashflowSummary).getByText(/\$\s*8\.000/)).toBeTruthy();
    expect(
      within(screen.getByRole("table", { name: "Detalle flujo de caja" })).getByText(
        "Nota credito"
      )
    ).toBeTruthy();
  });

  it("reduces receivable balance when registering a credit note for a pending sale", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Razón social"), "Carlos Ruiz");
    await user.type(screen.getByLabelText("NIT o C.C."), "987654321");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );
    await user.type(screen.getByLabelText("Cantidad"), "2");
    await user.click(screen.getByLabelText("Pendiente"));
    await user.type(screen.getByLabelText("Fecha vencimiento venta"), "2026-07-20");
    await user.click(screen.getByRole("button", { name: "Registrar venta" }));

    await user.click(screen.getByRole("button", { name: "Notas credito" }));
    await user.selectOptions(
      screen.getByLabelText("Venta acreditada"),
      screen.getByRole("option", { name: "001 - Carlos Ruiz" })
    );
    await user.type(screen.getByLabelText("Cantidad a acreditar Arroz libra"), "1");
    await user.click(screen.getByRole("button", { name: "Registrar nota credito" }));
    await user.click(screen.getByRole("button", { name: "Revisar" }));
    await user.click(screen.getByRole("button", { name: "Confirmar nota" }));
    await user.click(screen.getByRole("button", { name: "Cartera" }));

    const receivablesTable = screen.getByRole("table", { name: "Cartera por cobrar" });
    expect(within(receivablesTable).getByText("Carlos Ruiz")).toBeTruthy();
    expect(within(receivablesTable).getAllByText(/\$\s*4\.500/)).toHaveLength(2);
    expect(within(receivablesTable).queryByText(/\$\s*9\.000/)).toBeNull();
  });

  it("uses credit notes as negative adjustments in dashboard and reports", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Razón social"), "Ana Perez");
    await user.type(screen.getByLabelText("NIT o C.C."), "123456789");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );
    await user.type(screen.getByLabelText("Cantidad"), "2");
    await user.click(screen.getByRole("button", { name: "Registrar venta" }));

    await user.click(screen.getByRole("button", { name: "Notas credito" }));
    await user.selectOptions(
      screen.getByLabelText("Venta acreditada"),
      screen.getByRole("option", { name: "001 - Ana Perez" })
    );
    await user.type(screen.getByLabelText("Cantidad a acreditar Arroz libra"), "1");
    await user.click(screen.getByRole("button", { name: "Registrar nota credito" }));
    await user.click(screen.getByRole("button", { name: "Revisar" }));
    await user.click(screen.getByRole("button", { name: "Confirmar nota" }));

    await user.click(screen.getByRole("button", { name: "Inicio" }));

    const metrics = screen.getByRole("region", { name: "Resumen analitico" });
    const monthSalesCard = within(metrics)
      .getByText("Ventas del mes")
      .closest(".metric-card");
    expect(monthSalesCard).toBeTruthy();
    expect(within(monthSalesCard as HTMLElement).getByText(/\$\s*4\.500/)).toBeTruthy();
    expect(within(screen.getByLabelText("Grafico productos mas vendidos")).getByText("1 unidades")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Reportes" }));

    const profitabilitySummary = screen.getByLabelText("Resumen rentabilidad general");
    expect(within(profitabilitySummary).getByText("Ingresos totales")).toBeTruthy();
    expect(within(profitabilitySummary).getByText(/\$\s*4\.500/)).toBeTruthy();
    expect(within(profitabilitySummary).getByText(/\$\s*3\.200/)).toBeTruthy();
    expect(within(profitabilitySummary).getAllByText(/\$\s*1\.300/)).toHaveLength(2);

    await user.click(
      within(screen.getByRole("tablist", { name: "Tipos de reportes" })).getByRole("tab", {
        name: "Flujo de caja"
      })
    );

    const cashflowSummary = screen.getByLabelText("Resumen flujo de caja");
    expect(within(cashflowSummary).getByText("Entradas reales")).toBeTruthy();
    expect(within(cashflowSummary).getByText(/\$\s*9\.000/)).toBeTruthy();
    expect(within(cashflowSummary).getAllByText(/\$\s*4\.500/)).toHaveLength(2);
    expect(within(screen.getByRole("table", { name: "Detalle flujo de caja" })).getByText("Nota credito")).toBeTruthy();
  });

  it("registers a paid sale with several products and decreases each stock", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await createSecondProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Razón social"), "Ana Perez");
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
    await user.type(screen.getByLabelText("Razón social"), "Carlos Ruiz");
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
    expect(within(receivablesTable).getAllByText(/\$\s*11\.500/)).toHaveLength(2);
  });

  it("preloads the product sale price and allows overriding it before adding a line", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Razón social"), "Ana Perez");
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
    await user.type(screen.getByLabelText("Razón social"), "Cliente Precio");
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

    await clickFirstSaleAction(user, "Generar factura PDF");
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
    await user.type(screen.getByLabelText("Razón social"), "Cliente Uno");
    await user.type(screen.getByLabelText("NIT o C.C."), "111");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );
    await user.type(screen.getByLabelText("Cantidad"), "1");
    await user.click(screen.getByRole("button", { name: "Registrar venta" }));

    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Razón social"), "Cliente Dos");
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
    await user.type(screen.getByLabelText("Razón social"), "Ana Perez");
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
    expect((grossMarginCard as HTMLElement).className).toContain("summary-card-compact");
    expect(within(grossMarginCard as HTMLElement).getByText(/\$\s*2\.600/)).toBeTruthy();
    expect(screen.getByLabelText("Grafico cascada de utilidad")).toBeTruthy();
    expect(screen.queryByRole("table", { name: "Detalle margen por producto" })).toBeNull();
  });

  it("renders reportes overview with analytical hierarchy", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Razón social"), "Ana Perez");
    await user.type(screen.getByLabelText("NIT o C.C."), "123");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );
    await user.type(screen.getByLabelText("Cantidad"), "2");
    await user.click(screen.getByRole("button", { name: "Registrar venta" }));

    await user.click(screen.getByRole("button", { name: "Reportes" }));

    const reportNavigation = screen.getByRole("region", { name: "Navegacion de reportes" });
    const reportSummary = screen.getByRole("region", { name: "Resumen del reporte" });
    const primaryInsight = screen.getByRole("region", { name: "Insight principal del reporte" });

    expect(
      reportNavigation.compareDocumentPosition(reportSummary) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      reportSummary.compareDocumentPosition(primaryInsight) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("shows report tabs and rentabilidad subviews separately", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Razón social"), "Ana Perez");
    await user.type(screen.getByLabelText("NIT o C.C."), "123");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );
    await user.type(screen.getByLabelText("Cantidad"), "2");
    await user.click(screen.getByRole("button", { name: "Registrar venta" }));

    await user.click(screen.getByRole("button", { name: "Reportes" }));

    const submenu = screen.getByRole("tablist", { name: "Tipos de reportes" });
    expect(
      within(submenu).getByRole("tab", { name: "Rentabilidad" }).getAttribute("aria-selected")
    ).toBe("true");
    expect(within(submenu).getByRole("tab", { name: "DSO" })).toBeTruthy();
    expect(within(submenu).getByRole("tab", { name: "Flujo de caja" })).toBeTruthy();
    expect(within(submenu).getByRole("tab", { name: "Egresos" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Cascada" })).toBeNull();

    const profitabilityMenu = screen.getByRole("tablist", { name: "Tipos de rentabilidad" });
    expect(
      within(profitabilityMenu)
        .getByRole("tab", { name: "Dashboard general" })
        .getAttribute("aria-selected")
    ).toBe("true");
    expect(within(profitabilityMenu).getByRole("tab", { name: "Clientes" })).toBeTruthy();
    expect(within(profitabilityMenu).getByRole("tab", { name: "Producto" })).toBeTruthy();
    expect(within(profitabilityMenu).getByRole("tab", { name: "Ventas" })).toBeTruthy();

    await user.click(within(profitabilityMenu).getByRole("tab", { name: "Clientes" }));

    expect(
      within(profitabilityMenu).getByRole("tab", { name: "Clientes" }).getAttribute("aria-selected")
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
      await user.type(screen.getByLabelText("Razón social"), "Cliente A");
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
      await user.type(screen.getByLabelText("Razón social"), "Cliente B");
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
        within(screen.getByRole("tablist", { name: "Tipos de reportes" })).getByRole("tab", { name: "DSO" })
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
    await user.type(screen.getByLabelText("Razón social"), "Cliente Caja");
    await user.type(screen.getByLabelText("NIT o C.C."), "300");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );
    await user.type(screen.getByLabelText("Cantidad"), "2");
    await user.click(screen.getByRole("button", { name: "Registrar venta" }));

    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Razón social"), "Cliente Proyectado");
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
    await user.type(screen.getByLabelText("Fecha emision"), "2026-07-01");
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
    await user.clear(screen.getByLabelText("Fecha emision"));
    await user.type(screen.getByLabelText("Fecha emision"), "2026-07-02");
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );
    await user.clear(screen.getByLabelText("Cantidad compra"));
    await user.type(screen.getByLabelText("Cantidad compra"), "5");
    await user.clear(screen.getByLabelText("Costo unitario"));
    await user.type(screen.getByLabelText("Costo unitario"), "2000");
    await user.click(screen.getByLabelText("Pendiente"));
    await user.type(screen.getByLabelText("Fecha vencimiento"), "2026-07-25");
    await user.click(screen.getByRole("button", { name: "Registrar compra" }));

    await user.click(screen.getByRole("button", { name: "Cartera" }));
    await user.click(screen.getByRole("radio", { name: "Por pagar" }));
    const payablesTable = screen.getByRole("table", { name: "Cartera por pagar" });
    await user.click(within(payablesTable).getByRole("button", { name: "Registrar abono" }));
    await user.type(screen.getByLabelText("Valor abono"), "4000");
    await user.click(screen.getByRole("button", { name: "Guardar abono" }));

    await user.click(screen.getByRole("button", { name: "Reportes" }));
    await user.click(
      within(screen.getByRole("tablist", { name: "Tipos de reportes" })).getByRole("tab", { name: "Flujo de caja" })
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

  it("shows detailed company expenses in the egresos report", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await createSupplierFixture(user, "Proveedor Egresos");
    await user.type(screen.getByLabelText("Fecha emision"), "2026-07-01");
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
      screen.getByRole("option", { name: "Proveedor Egresos" })
    );
    await user.clear(screen.getByLabelText("Fecha emision"));
    await user.type(screen.getByLabelText("Fecha emision"), "2026-07-02");
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );
    await user.clear(screen.getByLabelText("Cantidad compra"));
    await user.type(screen.getByLabelText("Cantidad compra"), "5");
    await user.clear(screen.getByLabelText("Costo unitario"));
    await user.type(screen.getByLabelText("Costo unitario"), "2000");
    await user.click(screen.getByLabelText("Pendiente"));
    await user.type(screen.getByLabelText("Fecha vencimiento"), "2026-07-25");
    await user.click(screen.getByRole("button", { name: "Registrar compra" }));

    await user.click(screen.getByRole("button", { name: "Cartera" }));
    await user.click(screen.getByRole("radio", { name: "Por pagar" }));
    const payablesTable = screen.getByRole("table", { name: "Cartera por pagar" });
    await user.click(within(payablesTable).getByRole("button", { name: "Registrar abono" }));
    await user.type(screen.getByLabelText("Valor abono"), "4000");
    await user.click(screen.getByRole("button", { name: "Guardar abono" }));

    await user.click(screen.getByRole("button", { name: "Reportes" }));
    await user.click(
      within(screen.getByRole("tablist", { name: "Tipos de reportes" })).getByRole("tab", {
        name: "Egresos"
      })
    );

    const summary = screen.getByLabelText("Resumen egresos");
    expect(within(summary).getByText("Egresos reales")).toBeTruthy();
    expect(within(summary).getByText("Egresos proyectados")).toBeTruthy();
    expect(within(summary).getByText("Compromisos totales")).toBeTruthy();
    expect(within(summary).getByText("Proveedores")).toBeTruthy();
    expect(within(summary).getByText(/\$\s*13\.000/)).toBeTruthy();
    expect(within(summary).getByText(/\$\s*6\.000/)).toBeTruthy();
    expect(within(summary).getByText(/\$\s*19\.000/)).toBeTruthy();

    expect(screen.getByLabelText("Grafico egresos por origen")).toBeTruthy();

    const originTable = screen.getByRole("table", { name: "Resumen egresos por origen" });
    expect(within(originTable).getByText("Compra pagada")).toBeTruthy();
    expect(within(originTable).getByText("Abono proveedor")).toBeTruthy();
    expect(within(originTable).getByText("Cuenta por pagar")).toBeTruthy();

    const detailTable = screen.getByRole("table", { name: "Detalle egresos" });
    expect(within(detailTable).getAllByText("Real")).toHaveLength(2);
    expect(within(detailTable).getByText("Proyectado")).toBeTruthy();
    expect(within(detailTable).getAllByText("Proveedor Egresos").length).toBeGreaterThan(0);
    expect(within(detailTable).getByText(/\$\s*9\.000/)).toBeTruthy();
    expect(within(detailTable).getByText(/\$\s*4\.000/)).toBeTruthy();
    expect(within(detailTable).getByText(/\$\s*6\.000/)).toBeTruthy();
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
      await user.type(screen.getByLabelText("Razón social"), "Cliente Utilidad 1");
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
      await user.type(screen.getByLabelText("Razón social"), "Cliente Utilidad 2");
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
        within(screen.getByRole("tablist", { name: "Tipos de reportes" })).getByRole("tab", { name: "Utilidades" })
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
    await user.type(screen.getByLabelText("Razón social"), "Cliente Uno");
    await user.type(screen.getByLabelText("NIT o C.C."), "111");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );
    await user.type(screen.getByLabelText("Cantidad"), "1");
    await user.click(screen.getByRole("button", { name: "Registrar venta" }));

    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Razón social"), "Cliente Dos");
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
      within(screen.getByRole("tablist", { name: "Tipos de rentabilidad" })).getByRole("tab", { name: "Clientes" })
    );

    expect(screen.getByRole("button", { name: "Abrir detalle de margen por cliente" })).toBeTruthy();
    expect(screen.queryByRole("table", { name: "Detalle margen por cliente" })).toBeNull();

    await user.click(
      within(screen.getByRole("tablist", { name: "Tipos de rentabilidad" })).getByRole("tab", { name: "Ventas" })
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
    await user.type(screen.getByLabelText("Razón social"), "Ana Perez");
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
      within(screen.getByRole("tablist", { name: "Tipos de rentabilidad" })).getByRole("tab", { name: "Producto" })
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
    await user.type(screen.getByLabelText("Razón social"), "Cliente Mixto");
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
      within(screen.getByRole("tablist", { name: "Tipos de rentabilidad" })).getByRole("tab", { name: "Ventas" })
    );
    await user.click(screen.getByRole("button", { name: "Abrir detalle de margen por venta" }));
    await user.click(screen.getByRole("button", { name: /Ver detalle de venta sale-/ }));

    expect(screen.getByRole("heading", { name: "Margen por venta" })).toBeTruthy();
    expect(screen.getByText("Cliente Mixto")).toBeTruthy();
    const reportSummary = screen.getByRole("region", { name: "Resumen del reporte" });
    const primaryInsight = screen.getByRole("region", { name: "Insight principal del reporte" });
    const detailContext = screen.getByRole("region", { name: "Contexto del detalle" });
    const supportingContent = screen.getByRole("region", {
      name: "Contenido secundario del reporte"
    });
    expect(
      reportSummary.compareDocumentPosition(primaryInsight) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      primaryInsight.compareDocumentPosition(supportingContent) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      detailContext.compareDocumentPosition(
        screen.getByRole("table", { name: "Detalle margen por producto de la venta" })
      ) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    const saleSummary = screen.getByText("Margen total").closest(".summary-card");
    expect(saleSummary).toBeTruthy();
    expect((saleSummary as HTMLElement).className).toContain("summary-card-compact");
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
    await user.type(screen.getByLabelText("Razón social"), "Cliente Tarde");
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
    await user.type(screen.getByLabelText("Razón social"), "Cliente Vencido");
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
    await user.type(screen.getByLabelText("Razón social"), "Carlos Ruiz");
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
    await user.type(screen.getByLabelText("Razón social"), "Proveedor Central");
    await user.click(screen.getByRole("button", { name: "Guardar proveedor" }));
    await user.type(screen.getByLabelText("Fecha emision"), "2026-06-30");
    await user.click(screen.getByLabelText("Pendiente"));
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

    const summary = screen.getByRole("region", { name: "Resumen de cartera" });
    const alerts = screen.getByRole("region", { name: "Alertas de cartera" });
    const views = screen.getByRole("region", { name: "Selector de cartera" });
    const receivablesContent = screen.getByRole("region", { name: "Contenido por cobrar" });

    expect(screen.getByText("Total por cobrar")).toBeTruthy();
    expect(screen.getByText("Total por pagar")).toBeTruthy();
    expect(screen.getByText("Facturas vencidas")).toBeTruthy();
    expect(screen.getByText("Proximas a vencer")).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Por cobrar" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Por pagar" })).toBeTruthy();
    expect(screen.getByRole("table", { name: "Cartera por cobrar" })).toBeTruthy();
    expect(
      summary.compareDocumentPosition(alerts) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      alerts.compareDocumentPosition(views) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      views.compareDocumentPosition(receivablesContent) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(receivablesContent.className).toContain("cartera-content");
    expect(receivablesContent.className).toContain("cartera-content-receivables");

    await user.click(screen.getByRole("radio", { name: "Por pagar" }));

    const payablesContent = screen.getByRole("region", { name: "Contenido por pagar" });
    const payablesTable = screen.getByRole("table", { name: "Cartera por pagar" });
    expect(payablesContent.className).toContain("cartera-content");
    expect(payablesContent.className).toContain("cartera-content-payables");
    expect(within(payablesTable).getByText("Proveedor Central")).toBeTruthy();
    expect(within(payablesTable).getByText("001")).toBeTruthy();
    expect(within(payablesTable).getAllByText(/\$\s*15\.000/).length).toBeGreaterThan(0);
  });

  it("renders the shared view switch wrapper in cartera", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Cartera" }));

    const switchGroup = screen.getByRole("radiogroup", {
      name: "Vistas de cartera"
    });
    const receivablesButton = screen.getByRole("radio", { name: "Por cobrar" });
    const payablesButton = screen.getByRole("radio", { name: "Por pagar" });

    expect(switchGroup.className).toContain("view-switch");
    expect(receivablesButton.className).toContain("view-switch-button");
    expect(receivablesButton.getAttribute("aria-checked")).toBe("true");
    expect(payablesButton.getAttribute("aria-checked")).toBe("false");

    await user.click(payablesButton);

    expect(receivablesButton.getAttribute("aria-checked")).toBe("false");
    expect(payablesButton.getAttribute("aria-checked")).toBe("true");
  });

  it("registers supplier payable payments from cartera por pagar", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createPendingPurchaseFixture(user);
    await user.click(screen.getByRole("button", { name: "Cartera" }));
    await user.click(screen.getByRole("radio", { name: "Por pagar" }));
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
    await user.type(screen.getByLabelText("Razón social"), "Distribuidora Oriente");
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

    await user.type(screen.getByLabelText("Razón social"), "Proveedor Externo");
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
    await user.type(screen.getByLabelText("Razón social"), "Proveedor Inicial");
    await user.selectOptions(
      screen.getByLabelText("Municipio"),
      screen.getByRole("option", { name: "Medellin" })
    );
    await user.click(screen.getByRole("button", { name: "Guardar proveedor" }));

    await user.click(screen.getByRole("button", { name: "Editar proveedor Proveedor Inicial" }));
    await user.clear(screen.getByLabelText("Razón social"));
    await user.type(screen.getByLabelText("Razón social"), "Proveedor Actualizado");
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
    await user.type(screen.getByLabelText("Fecha emision"), "2026-06-30");
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
    expect(within(purchasesTable).getByText("001")).toBeTruthy();
    expect(within(purchasesTable).getByText("Arroz libra")).toBeTruthy();
    expect(within(purchasesTable).getByText("Pagada")).toBeTruthy();
    expect(within(purchasesTable).getByText(/\$\s*18\.600/)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Productos" }));
    const productsTable = screen.getByRole("table", { name: "Productos registrados" });
    expect(within(productsTable).getByRole("cell", { name: "10" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Proveedores" }));
    expect(screen.getByText("Sin cuentas por pagar")).toBeTruthy();
  });

  it("generates sequential purchase invoice numbers automatically", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await createSupplierFixture(user);
    await user.type(screen.getByLabelText("Fecha emision"), "2026-06-30");
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );
    await user.type(screen.getByLabelText("Cantidad compra"), "6");
    await user.type(screen.getByLabelText("Costo unitario"), "3100");
    await user.click(screen.getByRole("button", { name: "Registrar compra" }));

    await user.selectOptions(
      screen.getByLabelText("Proveedor"),
      screen.getByRole("option", { name: "Distribuidora Norte" })
    );
    await user.type(screen.getByLabelText("Fecha emision"), "2026-07-01");
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );
    await user.type(screen.getByLabelText("Cantidad compra"), "1");
    await user.type(screen.getByLabelText("Costo unitario"), "3200");
    await user.click(screen.getByRole("button", { name: "Registrar compra" }));

    const purchasesTable = screen.getByRole("table", { name: "Compras registradas" });
    expect(within(purchasesTable).getByText("001")).toBeTruthy();
    expect(within(purchasesTable).getByText("002")).toBeTruthy();
  });

  it("only shows the purchase due date field for pending purchases", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Compras" }));

    expect(screen.queryByLabelText("Vendedor")).toBeNull();
    expect(screen.queryByLabelText("Fecha vencimiento")).toBeNull();

    await user.click(screen.getByLabelText("Pendiente"));
    expect(screen.getByLabelText("Fecha vencimiento").getAttribute("type")).toBe(
      "date"
    );

    await user.click(screen.getByLabelText("Pagada"));
    expect(screen.queryByLabelText("Fecha vencimiento")).toBeNull();
  });

  it("uses a compact summary card in the purchases form", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Compras" }));

    expect(screen.getByText("Productos agregados 0").closest(".summary-card-compact")).toBeTruthy();
  });

  it("uses calendar date inputs for purchase issue and due dates", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Compras" }));

    expect(screen.getByLabelText("Fecha emision").getAttribute("type")).toBe("date");
    await user.click(screen.getByLabelText("Pendiente"));
    expect(screen.getByLabelText("Fecha vencimiento").getAttribute("type")).toBe(
      "date"
    );
  });

  it("creates a new product inline while registering a purchase invoice", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createSupplierFixture(user, "Distribuidora Sur");
    await user.click(screen.getByRole("button", { name: "Nuevo producto" }));
    expect(screen.queryByLabelText("Codigo producto")).toBeNull();
    expect(screen.queryByLabelText("Costo producto")).toBeNull();
    expect(screen.queryByLabelText("Precio venta producto")).toBeNull();
    await user.type(screen.getByLabelText("Nombre producto"), "Panela unidad");
    await user.type(screen.getByLabelText("Stock minimo producto"), "2");
    await user.click(screen.getByRole("button", { name: "Guardar producto compra" }));
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
    expect(within(productsTable).getByRole("cell", { name: "001" })).toBeTruthy();
    expect(within(productsTable).getByRole("cell", { name: "Panela unidad" })).toBeTruthy();
    expect(within(productsTable).getAllByText(/\$\s*2\.500/).length).toBeGreaterThan(1);
    expect(within(productsTable).getByRole("cell", { name: "8" })).toBeTruthy();
  });

  it("registers a pending purchase and creates a supplier payable", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await createSupplierFixture(user, "Proveedor Central");
    await user.type(screen.getByLabelText("Fecha emision"), "2026-06-30");
    await user.click(screen.getByLabelText("Pendiente"));
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
    expect(within(payablesTable).getByText("001")).toBeTruthy();
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
    await user.type(screen.getByLabelText("Fecha emision"), "2026-06-30");
    await user.click(screen.getByLabelText("Pendiente"));
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
    await user.click(screen.getByRole("button", { name: "Registrar compra" }));

    const purchasesTable = screen.getByRole("table", { name: "Compras registradas" });
    expect(within(purchasesTable).queryByText("Vendedor")).toBeNull();
    expect(within(purchasesTable).getByText("Proveedor Mixto")).toBeTruthy();
    expect(within(purchasesTable).getByText("2 productos")).toBeTruthy();
    expect(within(purchasesTable).getByText(/\$\s*19\.000/)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Productos" }));
    const productsTable = screen.getByRole("table", { name: "Productos registrados" });
    expect(within(productsTable).getByRole("row", { name: /Arroz libra.*7/ })).toBeTruthy();
    expect(within(productsTable).getByRole("row", { name: /Panela unidad.*6/ })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Proveedores" }));
    const payablesTable = screen.getByRole("table", { name: "Cuentas por pagar" });
    expect(within(payablesTable).getByText("001")).toBeTruthy();
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

  it("uses a compact summary card in the supplier payment form", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createPendingPurchaseFixture(user);
    await user.click(screen.getByRole("button", { name: "Cartera" }));
    await user.click(screen.getByRole("radio", { name: "Por pagar" }));

    const payablesTable = screen.getByRole("table", { name: "Cartera por pagar" });
    await user.click(within(payablesTable).getByRole("button", { name: "Registrar abono" }));
    const paymentForm = screen.getByLabelText("Valor abono").closest("form");
    expect(paymentForm).toBeTruthy();
    expect(within(paymentForm as HTMLFormElement).getByText("Proveedor Central").closest(".summary-card-compact")).toBeTruthy();
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
    await user.type(screen.getByLabelText("Razón social"), "Luisa Mora");
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
    await user.type(screen.getByLabelText("Razón social"), "Ana Perez");
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
    await user.type(screen.getByLabelText("Razón social"), "Comercial Andes");
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

  it("uses a shared form shell across products, compras, clientes, and proveedores", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Productos" }));
    await user.click(screen.getByRole("button", { name: "Nuevo producto" }));
    expect(screen.getByLabelText("Codigo").closest("form")?.className).toContain("section-form-shell");

    await user.click(screen.getByRole("button", { name: "Compras" }));
    expect(screen.getByLabelText("Proveedor").closest("form")?.className).toContain("section-form-shell");

    await user.click(screen.getByRole("button", { name: "Clientes" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    expect(screen.getByLabelText("Razón social").closest("form")?.className).toContain(
      "section-form-shell"
    );

    await user.click(screen.getByRole("button", { name: "Proveedores" }));
    await user.click(screen.getByRole("button", { name: "Nuevo proveedor" }));
    expect(screen.getByLabelText("Razón social").closest("form")?.className).toContain(
      "section-form-shell"
    );
  });

  it("searches customers by name and document", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Clientes" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Razón social"), "Comercial Andes");
    await user.type(screen.getByLabelText("NIT o C.C."), "900123456");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Razón social"), "Tienda Sur");
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
    await user.type(screen.getByLabelText("Razón social"), "Ana Perez");
    await user.type(screen.getByLabelText("NIT o C.C."), "123456789");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.click(screen.getByRole("button", { name: "Ver cliente Ana Perez" }));
    await user.click(screen.getByRole("button", { name: "Editar cliente" }));
    await user.clear(screen.getByLabelText("Razón social"));
    await user.type(screen.getByLabelText("Razón social"), "Ana Perez SAS");
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
    await user.type(screen.getByLabelText("Razón social"), "Ana Perez");
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
    await user.type(screen.getByLabelText("Razón social"), "Ana Perez");
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
    await user.type(screen.getByLabelText("Razón social"), "Carlos Ruiz");
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
    await user.type(screen.getByLabelText("Razón social"), "Ana Perez");
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
    await user.type(screen.getByLabelText("Razón social"), "Ana Perez");
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
    await user.clear(screen.getByLabelText("Razón social"));
    await user.type(screen.getByLabelText("Razón social"), "Ana Perez SAS");
    await user.clear(screen.getByLabelText("Direccion"));
    await user.type(screen.getByLabelText("Direccion"), "Calle 99");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await clickFirstSaleAction(user, "Generar factura PDF");

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
    await user.type(screen.getByLabelText("Razón social"), "Ana Perez");
    await user.type(screen.getByLabelText("NIT o C.C."), "123456789");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Razón social"), "Ana Perez Sucursal");
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
    await user.type(screen.getByLabelText("Razón social"), "Ana Perez");
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
    await clickFirstSaleAction(user, "Generar factura PDF");

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

  it("uses configured company and invoice data when generating a sales PDF", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Configuracion" }));
    await user.clear(screen.getByLabelText("Nombre empresa"));
    await user.type(screen.getByLabelText("Nombre empresa"), "Comercial La 80");
    await user.clear(screen.getByLabelText("NIT empresa"));
    await user.type(screen.getByLabelText("NIT empresa"), "901222333-4");
    await user.clear(screen.getByLabelText("Titulo factura"));
    await user.type(screen.getByLabelText("Titulo factura"), "CUENTA DE COBRO");
    await user.selectOptions(screen.getByLabelText("Color principal"), "#2563eb");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(screen.getByText("Cambios guardados")).toBeTruthy();

    await createProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Razón social"), "Ana Perez");
    await user.type(screen.getByLabelText("NIT o C.C."), "123456789");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );
    await user.type(screen.getByLabelText("Cantidad"), "1");
    await user.click(screen.getByRole("button", { name: "Registrar venta" }));
    await clickFirstSaleAction(user, "Generar factura PDF");

    await waitFor(() =>
      expect(generateInvoicePdfMock).toHaveBeenCalledWith(
        expect.objectContaining({
          settings: expect.objectContaining({
            company: expect.objectContaining({
              document: "901222333-4",
              name: "Comercial La 80"
            }),
            invoice: expect.objectContaining({
              accentColor: "#2563eb",
              title: "CUENTA DE COBRO"
            })
          })
        })
      )
    );
  });

  it("passes every sold product to invoice generation", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await createSecondProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Razón social"), "Ana Perez");
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
    await clickFirstSaleAction(user, "Generar factura PDF");

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
    await user.type(screen.getByLabelText("Razón social"), "Carlos Ruiz");
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
    await clickFirstSaleAction(user, "Generar factura PDF");

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

  it("persists the document prefix and seller and calculates line discount and tax", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Razón social"), "Ana Perez");
    await user.type(screen.getByLabelText("NIT o C.C."), "123456789");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.type(screen.getByLabelText("Prefijo"), "FV");
    await user.type(screen.getByLabelText("Vendedor"), "Laura Gomez");
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );
    await user.selectOptions(screen.getByLabelText("Unidad"), "Libra");
    await user.type(screen.getByLabelText("Cantidad"), "2");
    await user.clear(screen.getByLabelText("Descuento %"));
    await user.type(screen.getByLabelText("Descuento %"), "10");
    await user.selectOptions(screen.getByLabelText("Impuesto"), "19");
    await user.click(screen.getByRole("button", { name: "Registrar venta" }));

    const salesTable = screen.getByRole("table", { name: "Ventas registradas" });
    expect(within(salesTable).getByText("FV-001")).toBeTruthy();
    expect(within(salesTable).getByText("Laura Gomez")).toBeTruthy();
    expect(within(salesTable).getByText(/\$\s*9\.639/)).toBeTruthy();
  });

  it("edits a sale and reconciles inventory with the new quantity", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Razón social"), "Ana Perez");
    await user.type(screen.getByLabelText("NIT o C.C."), "123456789");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );
    await user.type(screen.getByLabelText("Cantidad"), "2");
    await user.click(screen.getByRole("button", { name: "Registrar venta" }));
    await clickFirstSaleAction(user, "Editar venta");
    await user.clear(screen.getByLabelText("Cantidad Arroz libra"));
    await user.type(screen.getByLabelText("Cantidad Arroz libra"), "1");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    const salesTable = screen.getByRole("table", { name: "Ventas registradas" });
    expect(within(salesTable).getByText(/\$\s*4\.500/)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Productos" }));
    const productsTable = screen.getByRole("table", { name: "Productos registrados" });
    expect(within(productsTable).getByRole("cell", { name: "3" })).toBeTruthy();
  });

  it("deletes a sale and restores inventory", async () => {
    const user = userEvent.setup();

    render(<App />);

    await createProductFixture(user);
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Razón social"), "Ana Perez");
    await user.type(screen.getByLabelText("NIT o C.C."), "123456789");
    await user.click(screen.getByRole("button", { name: "Guardar cliente" }));
    await user.selectOptions(
      screen.getByLabelText("Producto"),
      screen.getByRole("option", { name: "Arroz libra" })
    );
    await user.type(screen.getByLabelText("Cantidad"), "2");
    await user.click(screen.getByRole("button", { name: "Registrar venta" }));
    await clickFirstSaleAction(user, "Eliminar venta");

    expect(screen.getByText("Sin ventas registradas")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Productos" }));
    const productsTable = screen.getByRole("table", { name: "Productos registrados" });
    expect(within(productsTable).getByRole("cell", { name: "4" })).toBeTruthy();
  });
});

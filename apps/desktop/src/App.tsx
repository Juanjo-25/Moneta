import { registerSale, type InventoryRepository, type SaleRepository } from "@moneta/application";
import {
  Product,
  createMoney,
  type InventoryMovement,
  type Receivable,
  type SaleDraft
} from "@moneta/domain";
import {
  useMemo,
  useState,
  type FormEvent,
  type HTMLAttributes
} from "react";

type SectionId =
  | "dashboard"
  | "products"
  | "purchases"
  | "sales"
  | "customers"
  | "suppliers"
  | "receivables"
  | "reports";

type SectionConfig = {
  id: SectionId;
  label: string;
  title: string;
  description: string;
  primaryAction: string;
  emptyTitle: string;
  emptyBody: string;
};

type ProductRecord = {
  id: string;
  sku: string;
  name: string;
  costMinor: number;
  salePriceMinor: number;
  minimumStock: number;
  stock: number;
  active: boolean;
};

type CustomerRecord = {
  id: string;
  name: string;
};

type SaleRecord = {
  id: string;
  customerId: string;
  customerName: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPriceMinor: number;
  totalMinor: number;
  paymentStatus: "paid" | "pending";
  occurredAtLabel: string;
};

type ReceivableRecord = {
  id: string;
  customerId: string;
  customerName: string;
  saleId: string;
  amountMinor: number;
  status: "pending";
};

type ProductFormState = {
  sku: string;
  name: string;
  quantity: string;
  cost: string;
  salePrice: string;
  minimumStock: string;
};

type ProductFormErrors = Partial<Record<keyof ProductFormState, string>>;

type SalesFormState = {
  customerId: string;
  productId: string;
  quantity: string;
  paymentStatus: "paid" | "pending";
};

type SalesFormErrors = {
  customerId?: string | undefined;
  productId?: string | undefined;
  quantity?: string | undefined;
  submit?: string | undefined;
};

type CustomerFormState = {
  name: string;
};

const emptyProductForm: ProductFormState = {
  sku: "",
  name: "",
  quantity: "",
  cost: "",
  salePrice: "",
  minimumStock: ""
};

const emptySalesForm: SalesFormState = {
  customerId: "",
  productId: "",
  quantity: "",
  paymentStatus: "paid"
};

const navigationItems: SectionConfig[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    title: "Resumen operativo",
    description: "Vista general del negocio",
    primaryAction: "Nueva venta",
    emptyTitle: "Sin movimientos registrados",
    emptyBody: "Las compras, ventas y pagos apareceran aqui."
  },
  {
    id: "products",
    label: "Productos",
    title: "Productos",
    description: "Catalogo de productos",
    primaryAction: "Nuevo producto",
    emptyTitle: "Sin productos registrados",
    emptyBody: "Crea productos para empezar a controlar inventario."
  },
  {
    id: "purchases",
    label: "Compras",
    title: "Compras",
    description: "Entradas de inventario",
    primaryAction: "Nueva compra",
    emptyTitle: "Sin compras registradas",
    emptyBody: "Las compras confirmadas aumentaran el inventario."
  },
  {
    id: "sales",
    label: "Ventas",
    title: "Ventas",
    description: "Salidas de inventario y pagos",
    primaryAction: "Nueva venta",
    emptyTitle: "Sin ventas registradas",
    emptyBody: "Registra ventas para actualizar inventario y cartera."
  },
  {
    id: "customers",
    label: "Clientes",
    title: "Clientes",
    description: "Contactos y saldos de clientes",
    primaryAction: "Nuevo cliente",
    emptyTitle: "Sin clientes registrados",
    emptyBody: "Los clientes quedaran disponibles para ventas y cartera."
  },
  {
    id: "suppliers",
    label: "Proveedores",
    title: "Proveedores",
    description: "Contactos de compra",
    primaryAction: "Nuevo proveedor",
    emptyTitle: "Sin proveedores registrados",
    emptyBody: "Agrega proveedores para asociarlos a tus compras."
  },
  {
    id: "receivables",
    label: "Cartera",
    title: "Cartera",
    description: "Cuentas por cobrar",
    primaryAction: "Registrar abono",
    emptyTitle: "Sin cartera pendiente",
    emptyBody: "Las ventas pendientes de pago apareceran aqui."
  },
  {
    id: "reports",
    label: "Reportes",
    title: "Reportes",
    description: "Resumenes y actividad",
    primaryAction: "Exportar",
    emptyTitle: "Sin reportes disponibles",
    emptyBody: "Los reportes se activaran cuando existan movimientos."
  }
];

function stripNonDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function parseNonNegativeInteger(value: string): number | null {
  const digits = stripNonDigits(value);

  if (digits === "") {
    return null;
  }

  const parsed = Number(digits);

  if (!Number.isInteger(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function formatIntegerInput(value: string): string {
  const digits = stripNonDigits(value);

  if (digits === "") {
    return "";
  }

  return new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: 0
  }).format(Number(digits));
}

function formatCurrency(minor: number): string {
  return new Intl.NumberFormat("es-CO", {
    currency: "COP",
    maximumFractionDigits: 0,
    style: "currency"
  }).format(minor);
}

function formatOccurredAtLabel(date: Date): string {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

function isLowStock(product: ProductRecord): boolean {
  return product.stock <= product.minimumStock;
}

function toDomainProduct(product: ProductRecord): Product {
  return Product.create({
    id: product.id,
    sku: product.sku,
    name: product.name,
    unit: "unidad",
    minimumStock: product.minimumStock,
    salePriceMinor: product.salePriceMinor,
    costMinor: product.costMinor,
    active: product.active
  });
}

function createInventoryRepository(product: ProductRecord): InventoryRepository {
  let currentStock = product.stock;

  return {
    async findProductStock(productId) {
      if (productId !== product.id) {
        return null;
      }

      return {
        product: toDomainProduct(product),
        stock: currentStock
      };
    },
    async recordMovement(movement: InventoryMovement) {
      if (movement.type === "sale" || movement.type === "adjustment_out") {
        currentStock -= movement.quantity;
        return;
      }

      currentStock += movement.quantity;
    },
    getStock(productId) {
      return productId === product.id ? currentStock : 0;
    }
  };
}

function createSaleRepository() {
  let saved: { sale: SaleDraft; receivable: Receivable | null } | null = null;

  const repository: SaleRepository = {
    async saveSale(sale, receivable) {
      saved = { sale, receivable };
    }
  };

  return {
    repository,
    getSavedSale() {
      return saved;
    }
  };
}

export function App() {
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [receivables, setReceivables] = useState<ReceivableRecord[]>([]);
  const [activeSectionId, setActiveSectionId] = useState<SectionId>("dashboard");
  const activeSection: SectionConfig = useMemo(
    () =>
      navigationItems.find((item) => item.id === activeSectionId) ??
      navigationItems[0]!,
    [activeSectionId]
  );

  const lowStockProducts = products.filter(isLowStock);
  const salesTodayTotal = sales.reduce(
    (total, sale) => total + sale.totalMinor,
    0
  );
  const pendingReceivablesTotal = receivables.reduce(
    (total, receivable) => total + receivable.amountMinor,
    0
  );
  const metrics = [
    {
      label: "Productos activos",
      value: String(products.filter((product) => product.active).length)
    },
    { label: "Ventas de hoy", value: formatCurrency(salesTodayTotal) },
    {
      label: "Cartera pendiente",
      value: formatCurrency(pendingReceivablesTotal)
    },
    {
      label: "Alertas de inventario",
      value: String(lowStockProducts.length)
    }
  ];

  function openSection(sectionId: SectionId) {
    setActiveSectionId(sectionId);
  }

  function createProduct(product: ProductRecord) {
    setProducts((currentProducts) => [...currentProducts, product]);
  }

  function createCustomer(name: string): CustomerRecord {
    const customer = {
      id: `customer-${Date.now()}`,
      name: name.trim()
    };

    setCustomers((currentCustomers) => [...currentCustomers, customer]);

    return customer;
  }

  async function registerPaidSaleInSession(input: {
    customer: CustomerRecord;
    product: ProductRecord;
    quantity: number;
  }): Promise<string | null> {
    const occurredAt = new Date();
    const inventory = createInventoryRepository(input.product);
    const salesRepository = createSaleRepository();

    const result = await registerSale({
      inventory,
      sales: salesRepository.repository
    })({
      id: `sale-${Date.now()}`,
      customerId: input.customer.id,
      occurredAt,
      paymentStatus: "paid",
      lines: [
        {
          productId: input.product.id,
          quantity: input.quantity,
          unitPrice: createMoney(input.product.salePriceMinor)
        }
      ]
    });

    if (!result.ok) {
      return result.error.message;
    }

    const savedSale = salesRepository.getSavedSale();

    if (!savedSale) {
      return "No se pudo registrar la venta.";
    }

    setProducts((currentProducts) =>
      currentProducts.map((product) =>
        product.id === input.product.id
          ? { ...product, stock: inventory.getStock(product.id) }
          : product
      )
    );
    setSales((currentSales) => [
      {
        id: savedSale.sale.id,
        customerId: input.customer.id,
        customerName: input.customer.name,
        productId: input.product.id,
        productName: input.product.name,
        quantity: input.quantity,
        unitPriceMinor: input.product.salePriceMinor,
        totalMinor: savedSale.sale.total.minor,
        paymentStatus: "paid",
        occurredAtLabel: formatOccurredAtLabel(occurredAt)
      },
      ...currentSales
    ]);

    return null;
  }

  function registerPendingSaleInSession(input: {
    customer: CustomerRecord;
    product: ProductRecord;
    quantity: number;
  }) {
    const occurredAt = new Date();
    const saleId = `sale-${Date.now()}`;
    const totalMinor = input.product.salePriceMinor * input.quantity;

    setSales((currentSales) => [
      {
        id: saleId,
        customerId: input.customer.id,
        customerName: input.customer.name,
        productId: input.product.id,
        productName: input.product.name,
        quantity: input.quantity,
        unitPriceMinor: input.product.salePriceMinor,
        totalMinor,
        paymentStatus: "pending",
        occurredAtLabel: formatOccurredAtLabel(occurredAt)
      },
      ...currentSales
    ]);
    setReceivables((currentReceivables) => [
      {
        id: `receivable-${saleId}`,
        customerId: input.customer.id,
        customerName: input.customer.name,
        saleId,
        amountMinor: totalMinor,
        status: "pending"
      },
      ...currentReceivables
    ]);
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">M</span>
          <div>
            <strong>Moneta</strong>
            <small>Inventario y cartera</small>
          </div>
        </div>

        <nav className="navigation" aria-label="Principal">
          {navigationItems.map((item) => (
            <button
              aria-current={item.id === activeSectionId ? "page" : undefined}
              className={item.id === activeSectionId ? "active" : ""}
              key={item.id}
              onClick={() => openSection(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p>{activeSection.label}</p>
            <h1>{activeSection.title}</h1>
            <span>{activeSection.description}</span>
          </div>
          <button
            className="primary-action"
            onClick={() =>
              activeSection.id === "dashboard"
                ? openSection("sales")
                : openSection(activeSection.id)
            }
          >
            {activeSection.primaryAction}
          </button>
        </header>

        {activeSection.id === "dashboard" ? (
          <DashboardContent
            lowStockProducts={lowStockProducts}
            metrics={metrics}
            onOpenProducts={() => openSection("products")}
            onOpenReports={() => openSection("reports")}
          />
        ) : (
          <SectionContent
            customers={customers}
            onCreateCustomer={createCustomer}
            onCreateProduct={createProduct}
            onRegisterPaidSale={registerPaidSaleInSession}
            onRegisterPendingSale={registerPendingSaleInSession}
            products={products}
            receivables={receivables}
            sales={sales}
            section={activeSection}
          />
        )}
      </section>
    </main>
  );
}

type DashboardContentProps = {
  lowStockProducts: ProductRecord[];
  metrics: Array<{ label: string; value: string }>;
  onOpenProducts: () => void;
  onOpenReports: () => void;
};

function DashboardContent({
  lowStockProducts,
  metrics,
  onOpenProducts,
  onOpenReports
}: DashboardContentProps) {
  return (
    <>
      <section className="metric-grid" aria-label="Indicadores">
        {metrics.map((metric) => (
          <article className="metric-card" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </article>
        ))}
      </section>

      <section className="content-grid">
        <div className="panel">
          <div className="panel-header">
            <h2>Actividad reciente</h2>
            <button onClick={onOpenReports}>Ver todo</button>
          </div>
          <div className="empty-state">
            <strong>Sin movimientos registrados</strong>
            <span>Las compras, ventas y pagos apareceran aqui.</span>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>Inventario bajo</h2>
            <button onClick={onOpenProducts}>Revisar</button>
          </div>
          {lowStockProducts.length > 0 ? (
            <ul className="alert-list" aria-label="Productos con bajo stock">
              {lowStockProducts.map((product) => (
                <li key={product.id}>
                  <strong>{product.name}</strong>
                  <span>
                    Stock {product.stock} / minimo {product.minimumStock}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state">
              <strong>Sin alertas</strong>
              <span>Los productos bajo el minimo se mostraran aqui.</span>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

type SectionContentProps = {
  customers: CustomerRecord[];
  onCreateCustomer: (name: string) => CustomerRecord;
  onCreateProduct: (product: ProductRecord) => void;
  onRegisterPaidSale: (input: {
    customer: CustomerRecord;
    product: ProductRecord;
    quantity: number;
  }) => Promise<string | null>;
  onRegisterPendingSale: (input: {
    customer: CustomerRecord;
    product: ProductRecord;
    quantity: number;
  }) => void;
  products: ProductRecord[];
  receivables: ReceivableRecord[];
  sales: SaleRecord[];
  section: SectionConfig;
};

function SectionContent({
  customers,
  onCreateCustomer,
  onCreateProduct,
  onRegisterPaidSale,
  onRegisterPendingSale,
  products,
  receivables,
  sales,
  section
}: SectionContentProps) {
  if (section.id === "products") {
    return <ProductsSection onCreateProduct={onCreateProduct} products={products} />;
  }

  if (section.id === "sales") {
    return (
      <SalesSection
        customers={customers}
        onCreateCustomer={onCreateCustomer}
        onRegisterPaidSale={onRegisterPaidSale}
        onRegisterPendingSale={onRegisterPendingSale}
        products={products}
        sales={sales}
      />
    );
  }

  if (section.id === "receivables") {
    return <ReceivablesSection receivables={receivables} />;
  }

  return (
    <section className="section-panel">
      <div className="empty-state section-empty">
        <strong>{section.emptyTitle}</strong>
        <span>{section.emptyBody}</span>
      </div>
    </section>
  );
}

type ProductsSectionProps = {
  onCreateProduct: (product: ProductRecord) => void;
  products: ProductRecord[];
};

function ProductsSection({ onCreateProduct, products }: ProductsSectionProps) {
  const [form, setForm] = useState<ProductFormState>(emptyProductForm);
  const [errors, setErrors] = useState<ProductFormErrors>({});

  function updateField(
    field: "sku" | "name" | "quantity" | "minimumStock",
    value: string
  ) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
    setErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
  }

  function updateMoneyField(field: "cost" | "salePrice", value: string) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: formatIntegerInput(value)
    }));
    setErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
  }

  function submitProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: ProductFormErrors = {};
    const quantity = parseNonNegativeInteger(form.quantity);
    const cost = parseNonNegativeInteger(form.cost);
    const salePrice = parseNonNegativeInteger(form.salePrice);
    const minimumStock = parseNonNegativeInteger(form.minimumStock);

    if (form.sku.trim() === "") {
      nextErrors.sku = "El codigo es obligatorio.";
    }
    if (form.name.trim() === "") {
      nextErrors.name = "El nombre es obligatorio.";
    }
    if (quantity === null) {
      nextErrors.quantity = "La unidad debe ser cero o mayor.";
    }
    if (cost === null) {
      nextErrors.cost = "El costo debe ser cero o mayor.";
    }
    if (salePrice === null) {
      nextErrors.salePrice = "El precio de venta debe ser cero o mayor.";
    }
    if (minimumStock === null) {
      nextErrors.minimumStock = "El stock minimo debe ser cero o mayor.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    onCreateProduct({
      active: true,
      costMinor: cost!,
      id: `product-${Date.now()}`,
      minimumStock: minimumStock!,
      name: form.name.trim(),
      salePriceMinor: salePrice!,
      sku: form.sku.trim(),
      stock: quantity!
    });
    setForm(emptyProductForm);
  }

  return (
    <section className="products-layout">
      <form className="product-form" onSubmit={submitProduct}>
        <div className="form-grid">
          <TextField
            error={errors.sku}
            label="Codigo"
            onChange={(value) => updateField("sku", value)}
            value={form.sku}
          />
          <TextField
            error={errors.name}
            label="Producto"
            onChange={(value) => updateField("name", value)}
            value={form.name}
          />
          <TextField
            error={errors.quantity}
            inputMode="numeric"
            label="Unidad"
            onChange={(value) => updateField("quantity", value)}
            value={form.quantity}
          />
          <TextField
            error={errors.cost}
            inputMode="numeric"
            label="Costo"
            onChange={(value) => updateMoneyField("cost", value)}
            value={form.cost}
          />
          <TextField
            error={errors.salePrice}
            inputMode="numeric"
            label="Precio venta"
            onChange={(value) => updateMoneyField("salePrice", value)}
            value={form.salePrice}
          />
          <TextField
            error={errors.minimumStock}
            inputMode="numeric"
            label="Stock minimo"
            onChange={(value) => updateField("minimumStock", value)}
            value={form.minimumStock}
          />
        </div>
        <div className="form-actions">
          <button type="submit">Guardar producto</button>
        </div>
      </form>

      {products.length > 0 ? (
        <ProductTable products={products} />
      ) : (
        <div className="empty-state section-empty">
          <strong>Sin productos registrados</strong>
          <span>Crea productos para empezar a controlar inventario.</span>
        </div>
      )}
    </section>
  );
}

type SalesSectionProps = {
  customers: CustomerRecord[];
  onCreateCustomer: (name: string) => CustomerRecord;
  onRegisterPaidSale: (input: {
    customer: CustomerRecord;
    product: ProductRecord;
    quantity: number;
  }) => Promise<string | null>;
  onRegisterPendingSale: (input: {
    customer: CustomerRecord;
    product: ProductRecord;
    quantity: number;
  }) => void;
  products: ProductRecord[];
  sales: SaleRecord[];
};

function SalesSection({
  customers,
  onCreateCustomer,
  onRegisterPaidSale,
  onRegisterPendingSale,
  products,
  sales
}: SalesSectionProps) {
  const [form, setForm] = useState<SalesFormState>(emptySalesForm);
  const [errors, setErrors] = useState<SalesFormErrors>({});
  const [customerFormVisible, setCustomerFormVisible] = useState(false);
  const [customerForm, setCustomerForm] = useState<CustomerFormState>({ name: "" });
  const [customerError, setCustomerError] = useState<string | null>(null);

  const selectedCustomer =
    customers.find((customer) => customer.id === form.customerId) ?? null;
  const selectedProduct =
    products.find((product) => product.id === form.productId) ?? null;
  const quantity = parseNonNegativeInteger(form.quantity) ?? 0;
  const totalMinor = selectedProduct ? selectedProduct.salePriceMinor * quantity : 0;

  async function submitSale(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: SalesFormErrors = {};
    const parsedQuantity = parseNonNegativeInteger(form.quantity);

    if (!selectedCustomer) {
      nextErrors.customerId = "Debes seleccionar un cliente.";
    }
    if (!selectedProduct) {
      nextErrors.productId = "Debes seleccionar un producto.";
    }
    if (parsedQuantity === null || parsedQuantity <= 0) {
      nextErrors.quantity = "La cantidad debe ser un entero mayor a cero.";
    }

    setErrors(nextErrors);

    if (
      Object.keys(nextErrors).length > 0 ||
      !selectedCustomer ||
      !selectedProduct ||
      parsedQuantity === null ||
      parsedQuantity <= 0
    ) {
      return;
    }

    if (form.paymentStatus === "paid") {
      const submitError = await onRegisterPaidSale({
        customer: selectedCustomer,
        product: selectedProduct,
        quantity: parsedQuantity
      });

      if (submitError) {
        setErrors({ submit: submitError });
        return;
      }
    } else {
      onRegisterPendingSale({
        customer: selectedCustomer,
        product: selectedProduct,
        quantity: parsedQuantity
      });
    }

    setErrors({});
    setForm(emptySalesForm);
  }

  function submitCustomer() {
    if (customerForm.name.trim() === "") {
      setCustomerError("El nombre del cliente es obligatorio.");
      return;
    }

    const customer = onCreateCustomer(customerForm.name);

    setForm((currentForm) => ({ ...currentForm, customerId: customer.id }));
    setCustomerForm({ name: "" });
    setCustomerError(null);
    setCustomerFormVisible(false);
  }

  return (
    <section className="sales-layout">
      <form className="sales-form" onSubmit={submitSale}>
        <div className="sales-grid">
          <label className="field" htmlFor="cliente">
            <span>Cliente</span>
            <select
              aria-invalid={Boolean(errors.customerId)}
              id="cliente"
              onChange={(event) => {
                setForm((currentForm) => ({
                  ...currentForm,
                  customerId: event.target.value
                }));
                setErrors((currentErrors) => ({
                  ...currentErrors,
                  customerId: undefined
                }));
              }}
              value={form.customerId}
            >
              <option value="">Selecciona un cliente</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
            {errors.customerId ? <small>{errors.customerId}</small> : null}
          </label>

          <div className="inline-action-group">
            <button
              type="button"
              onClick={() => setCustomerFormVisible((visible) => !visible)}
            >
              Nuevo cliente
            </button>
          </div>

          <label className="field" htmlFor="producto-venta">
            <span>Producto</span>
            <select
              aria-invalid={Boolean(errors.productId)}
              id="producto-venta"
              onChange={(event) => {
                setForm((currentForm) => ({
                  ...currentForm,
                  productId: event.target.value
                }));
                setErrors((currentErrors) => ({
                  ...currentErrors,
                  productId: undefined
                }));
              }}
              value={form.productId}
            >
              <option value="">Selecciona un producto</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
            {errors.productId ? <small>{errors.productId}</small> : null}
          </label>

          <TextField
            error={errors.quantity}
            inputMode="numeric"
            label="Cantidad"
            onChange={(value) => {
              setForm((currentForm) => ({ ...currentForm, quantity: value }));
              setErrors((currentErrors) => ({
                ...currentErrors,
                quantity: undefined
              }));
            }}
            value={form.quantity}
          />
        </div>

        {customerFormVisible ? (
          <div className="inline-customer-form">
            <TextField
              error={customerError ?? undefined}
              label="Nombre cliente"
              onChange={(value) => {
                setCustomerForm({ name: value });
                setCustomerError(null);
              }}
              value={customerForm.name}
            />
            <button type="button" onClick={submitCustomer}>
              Guardar cliente
            </button>
          </div>
        ) : null}

        <div
          aria-label="Estado de pago"
          className="payment-status-group"
          role="radiogroup"
        >
          <label htmlFor="estado-pagada">
            <input
              checked={form.paymentStatus === "paid"}
              id="estado-pagada"
              name="payment-status"
              onChange={() =>
                setForm((currentForm) => ({
                  ...currentForm,
                  paymentStatus: "paid"
                }))
              }
              type="radio"
            />
            Pagada
          </label>
          <label htmlFor="estado-pendiente">
            <input
              checked={form.paymentStatus === "pending"}
              id="estado-pendiente"
              name="payment-status"
              onChange={() =>
                setForm((currentForm) => ({
                  ...currentForm,
                  paymentStatus: "pending"
                }))
              }
              type="radio"
            />
            Pendiente
          </label>
        </div>

        <div className="summary-card">
          <span>
            Precio unitario{" "}
            {selectedProduct ? formatCurrency(selectedProduct.salePriceMinor) : formatCurrency(0)}
          </span>
          <strong>Total {formatCurrency(totalMinor)}</strong>
        </div>

        {errors.submit ? <p className="form-error">{errors.submit}</p> : null}

        <div className="form-actions">
          <button type="submit">Registrar venta</button>
        </div>
      </form>

      {sales.length > 0 ? (
        <table className="data-table" aria-label="Ventas registradas">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Producto</th>
              <th>Cantidad</th>
              <th>Estado</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((sale) => (
              <tr key={sale.id}>
                <td>{sale.occurredAtLabel}</td>
                <td>{sale.customerName}</td>
                <td>{sale.productName}</td>
                <td>{sale.quantity}</td>
                <td>{sale.paymentStatus === "paid" ? "Pagada" : "Pendiente"}</td>
                <td>{formatCurrency(sale.totalMinor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="empty-state section-empty">
          <strong>Sin ventas registradas</strong>
          <span>Registra ventas para actualizar inventario y cartera.</span>
        </div>
      )}
    </section>
  );
}

type ReceivablesSectionProps = {
  receivables: ReceivableRecord[];
};

function ReceivablesSection({ receivables }: ReceivablesSectionProps) {
  if (receivables.length === 0) {
    return (
      <section className="section-panel">
        <div className="empty-state section-empty">
          <strong>Sin cartera pendiente</strong>
          <span>Las ventas pendientes de pago apareceran aqui.</span>
        </div>
      </section>
    );
  }

  return (
    <section className="section-panel">
      <table className="data-table" aria-label="Cartera pendiente">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Venta</th>
            <th>Saldo</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {receivables.map((receivable) => (
            <tr key={receivable.id}>
              <td>{receivable.customerName}</td>
              <td>{receivable.saleId}</td>
              <td>{formatCurrency(receivable.amountMinor)}</td>
              <td>Pendiente</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

type TextFieldProps = {
  error?: string | undefined;
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
  label: string;
  onChange: (value: string) => void;
  value: string;
};

function TextField({ error, inputMode, label, onChange, value }: TextFieldProps) {
  const id = label.toLowerCase().replace(/\s+/g, "-");

  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <input
        aria-invalid={Boolean(error)}
        id={id}
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
      {error ? <small>{error}</small> : null}
    </label>
  );
}

type ProductTableProps = {
  products: ProductRecord[];
};

function ProductTable({ products }: ProductTableProps) {
  return (
    <table className="data-table" aria-label="Productos registrados">
      <thead>
        <tr>
          <th>Codigo</th>
          <th>Producto</th>
          <th>Costo</th>
          <th>Precio venta</th>
          <th>Stock</th>
          <th>Minimo</th>
          <th>Estado</th>
        </tr>
      </thead>
      <tbody>
        {products.map((product) => (
          <tr key={product.id}>
            <td>{product.sku}</td>
            <td>{product.name}</td>
            <td>{formatCurrency(product.costMinor)}</td>
            <td>{formatCurrency(product.salePriceMinor)}</td>
            <td>{product.stock}</td>
            <td>{product.minimumStock}</td>
            <td>
              <span className={isLowStock(product) ? "status warning" : "status ok"}>
                {isLowStock(product) ? "Bajo stock" : "Disponible"}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

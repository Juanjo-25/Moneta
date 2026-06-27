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

type ProductFormState = {
  sku: string;
  name: string;
  quantity: string;
  cost: string;
  salePrice: string;
  minimumStock: string;
};

type ProductFormErrors = Partial<Record<keyof ProductFormState, string>>;

const emptyProductForm: ProductFormState = {
  sku: "",
  name: "",
  quantity: "",
  cost: "",
  salePrice: "",
  minimumStock: ""
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

function stripNonDigits(value: string): string {
  return value.replace(/\D/g, "");
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

function isLowStock(product: ProductRecord): boolean {
  return product.stock <= product.minimumStock;
}

export function App() {
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [activeSectionId, setActiveSectionId] = useState<SectionId>("dashboard");
  const activeSection: SectionConfig = useMemo(
    () =>
      navigationItems.find((item) => item.id === activeSectionId) ??
      navigationItems[0]!,
    [activeSectionId]
  );

  const lowStockProducts = products.filter(isLowStock);
  const metrics = [
    {
      label: "Productos activos",
      value: String(products.filter((product) => product.active).length)
    },
    { label: "Ventas de hoy", value: "$0" },
    { label: "Cartera pendiente", value: "$0" },
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
            onCreateProduct={createProduct}
            products={products}
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
  onCreateProduct: (product: ProductRecord) => void;
  products: ProductRecord[];
  section: SectionConfig;
};

function SectionContent({
  onCreateProduct,
  products,
  section
}: SectionContentProps) {
  if (section.id === "products") {
    return <ProductsSection onCreateProduct={onCreateProduct} products={products} />;
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

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
import { generateInvoicePdf, type InvoicePdfResult } from "./invoice-pdf";

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
  document: string;
  address: string;
  city: string;
  email: string;
};

type SaleRecord = {
  id: string;
  customer: CustomerRecord;
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

type SupplierRecord = {
  id: string;
  name: string;
};

type PurchasePaymentStatus = "paid" | "pending";

type PurchaseRecord = {
  id: string;
  supplierId: string;
  supplierName: string;
  invoiceNumber: string;
  issuedAt: string;
  dueAt: string;
  productId: string;
  productName: string;
  quantity: number;
  unitCostMinor: number;
  totalMinor: number;
  paymentStatus: PurchasePaymentStatus;
  occurredAtLabel: string;
};

type SupplierPayableStatus = "pending" | "partial" | "paid";

type SupplierPayableRecord = {
  id: string;
  supplierId: string;
  supplierName: string;
  purchaseId: string;
  invoiceNumber: string;
  originalAmountMinor: number;
  paidAmountMinor: number;
  balanceMinor: number;
  dueAt: string;
  status: SupplierPayableStatus;
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
  document: string;
  address: string;
  city: string;
  email: string;
};

type CustomerFormErrors = Partial<Record<keyof CustomerFormState, string>>;

type SupplierFormState = {
  name: string;
};

type SupplierFormErrors = Partial<Record<keyof SupplierFormState, string>>;

type PurchaseFormState = {
  supplierId: string;
  invoiceNumber: string;
  issuedAt: string;
  dueAt: string;
  productId: string;
  quantity: string;
  unitCost: string;
  paymentStatus: PurchasePaymentStatus;
};

type PurchaseFormErrors = {
  dueAt?: string | undefined;
  invoiceNumber?: string | undefined;
  issuedAt?: string | undefined;
  paymentStatus?: string | undefined;
  productId?: string | undefined;
  quantity?: string | undefined;
  submit?: string | undefined;
  supplierId?: string | undefined;
  unitCost?: string | undefined;
};

type PurchaseProductFormState = {
  sku: string;
  name: string;
  cost: string;
  salePrice: string;
  minimumStock: string;
};

type PurchaseProductFormErrors = {
  cost?: string | undefined;
  minimumStock?: string | undefined;
  name?: string | undefined;
  salePrice?: string | undefined;
  sku?: string | undefined;
};

type SupplierPaymentFormState = {
  payableId: string;
  amount: string;
};

type SupplierPaymentFormErrors = {
  amount?: string | undefined;
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

const emptyCustomerForm: CustomerFormState = {
  address: "",
  city: "",
  document: "",
  email: "",
  name: ""
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

function getSupplierPayableStatus(input: {
  originalAmountMinor: number;
  paidAmountMinor: number;
}): SupplierPayableStatus {
  const balance = input.originalAmountMinor - input.paidAmountMinor;

  if (balance <= 0) {
    return "paid";
  }

  return input.paidAmountMinor > 0 ? "partial" : "pending";
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

  function handlePrimaryAction() {
    if (activeSection.id === "dashboard") {
      openSection("sales");
      return;
    }

    if (activeSection.id === "products") {
      setProductFormVisible((visible) => !visible);
      return;
    }

    openSection(activeSection.id);
  }

  function createProduct(product: ProductRecord) {
    setProducts((currentProducts) => [...currentProducts, product]);
  }

  function createCustomer(input: CustomerFormState): CustomerRecord {
    const customer = {
      address: input.address.trim(),
      city: input.city.trim(),
      document: input.document.trim(),
      email: input.email.trim(),
      id: `customer-${Date.now()}`,
      name: input.name.trim()
    };

    setCustomers((currentCustomers) => [...currentCustomers, customer]);

    return customer;
  }

  function createSupplier(input: SupplierFormState): SupplierRecord {
    const supplier = {
      id: `supplier-${Date.now()}`,
      name: input.name.trim()
    };

    setSuppliers((currentSuppliers) => [...currentSuppliers, supplier]);

    return supplier;
  }

  function registerPurchaseInSession(input: {
    supplier: SupplierRecord;
    product: ProductRecord;
    invoiceNumber: string;
    issuedAt: string;
    dueAt: string;
    quantity: number;
    unitCostMinor: number;
    paymentStatus: PurchasePaymentStatus;
  }) {
    const occurredAt = new Date();
    const purchaseId = `purchase-${Date.now()}`;
    const totalMinor = input.quantity * input.unitCostMinor;

    setProducts((currentProducts) =>
      currentProducts.map((product) =>
        product.id === input.product.id
          ? { ...product, stock: product.stock + input.quantity }
          : product
      )
    );
    setPurchases((currentPurchases) => [
      {
        dueAt: input.dueAt,
        id: purchaseId,
        invoiceNumber: input.invoiceNumber,
        issuedAt: input.issuedAt,
        occurredAtLabel: formatOccurredAtLabel(occurredAt),
        paymentStatus: input.paymentStatus,
        productId: input.product.id,
        productName: input.product.name,
        quantity: input.quantity,
        supplierId: input.supplier.id,
        supplierName: input.supplier.name,
        totalMinor,
        unitCostMinor: input.unitCostMinor
      },
      ...currentPurchases
    ]);

    if (input.paymentStatus === "pending") {
      setSupplierPayables((currentPayables) => [
        {
          balanceMinor: totalMinor,
          dueAt: input.dueAt,
          id: `payable-${purchaseId}`,
          invoiceNumber: input.invoiceNumber,
          originalAmountMinor: totalMinor,
          paidAmountMinor: 0,
          purchaseId,
          status: "pending",
          supplierId: input.supplier.id,
          supplierName: input.supplier.name
        },
        ...currentPayables
      ]);
    }
  }

  function registerSupplierPayment(input: { payableId: string; amountMinor: number }) {
    setSupplierPayables((currentPayables) =>
      currentPayables.map((payable) => {
        if (payable.id !== input.payableId) {
          return payable;
        }

        const paidAmountMinor = payable.paidAmountMinor + input.amountMinor;
        const balanceMinor = Math.max(payable.originalAmountMinor - paidAmountMinor, 0);

        return {
          ...payable,
          balanceMinor,
          paidAmountMinor,
          status: getSupplierPayableStatus({
            originalAmountMinor: payable.originalAmountMinor,
            paidAmountMinor
          })
        };
      })
    );
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
        customer: input.customer,
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
        customer: input.customer,
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
            onClick={handlePrimaryAction}
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
            onCreateSupplier={createSupplier}
            onRegisterPurchase={registerPurchaseInSession}
            onRegisterPaidSale={registerPaidSaleInSession}
            onRegisterPendingSale={registerPendingSaleInSession}
            onRegisterSupplierPayment={registerSupplierPayment}
            onCloseProductForm={() => setProductFormVisible(false)}
            productFormVisible={productFormVisible}
            products={products}
            purchases={purchases}
            receivables={receivables}
            sales={sales}
            section={activeSection}
            supplierPayables={supplierPayables}
            suppliers={suppliers}
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
  onCreateCustomer: (input: CustomerFormState) => CustomerRecord;
  onCreateProduct: (product: ProductRecord) => void;
  onCreateSupplier: (input: SupplierFormState) => SupplierRecord;
  onRegisterPurchase: (input: {
    supplier: SupplierRecord;
    product: ProductRecord;
    invoiceNumber: string;
    issuedAt: string;
    dueAt: string;
    quantity: number;
    unitCostMinor: number;
    paymentStatus: PurchasePaymentStatus;
  }) => void;
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
  onRegisterSupplierPayment: (input: {
    payableId: string;
    amountMinor: number;
  }) => void;
  onCloseProductForm: () => void;
  productFormVisible: boolean;
  products: ProductRecord[];
  purchases: PurchaseRecord[];
  receivables: ReceivableRecord[];
  sales: SaleRecord[];
  section: SectionConfig;
  supplierPayables: SupplierPayableRecord[];
  suppliers: SupplierRecord[];
};

function SectionContent({
  customers,
  onCreateCustomer,
  onCreateProduct,
  onCreateSupplier,
  onRegisterPurchase,
  onRegisterPaidSale,
  onRegisterPendingSale,
  onRegisterSupplierPayment,
  onCloseProductForm,
  productFormVisible,
  products,
  purchases,
  receivables,
  sales,
  section,
  supplierPayables,
  suppliers
}: SectionContentProps) {
  if (section.id === "products") {
    return (
      <ProductsSection
        formVisible={productFormVisible}
        onCloseForm={onCloseProductForm}
        onCreateProduct={onCreateProduct}
        products={products}
      />
    );
  }

  if (section.id === "purchases") {
    return (
      <PurchasesSection
        onCreateProduct={onCreateProduct}
        onCreateSupplier={onCreateSupplier}
        onRegisterPurchase={onRegisterPurchase}
        products={products}
        purchases={purchases}
        suppliers={suppliers}
      />
    );
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

  if (section.id === "suppliers") {
    return (
      <SuppliersSection
        onRegisterSupplierPayment={onRegisterSupplierPayment}
        supplierPayables={supplierPayables}
      />
    );
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
  formVisible: boolean;
  onCloseForm: () => void;
  onCreateProduct: (product: ProductRecord) => void;
  products: ProductRecord[];
};

function ProductsSection({
  formVisible,
  onCloseForm,
  onCreateProduct,
  products
}: ProductsSectionProps) {
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
    onCloseForm();
  }

  return (
    <section className="products-layout">
      {formVisible ? (
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
      ) : null}

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

type PurchasesSectionProps = {
  onCreateProduct: (product: ProductRecord) => void;
  onCreateSupplier: (input: SupplierFormState) => SupplierRecord;
  onRegisterPurchase: (input: {
    supplier: SupplierRecord;
    product: ProductRecord;
    invoiceNumber: string;
    issuedAt: string;
    dueAt: string;
    quantity: number;
    unitCostMinor: number;
    paymentStatus: PurchasePaymentStatus;
  }) => void;
  products: ProductRecord[];
  purchases: PurchaseRecord[];
  suppliers: SupplierRecord[];
};

function PurchasesSection({
  onCreateProduct,
  onCreateSupplier,
  onRegisterPurchase,
  products,
  purchases,
  suppliers
}: PurchasesSectionProps) {
  const [form, setForm] = useState<PurchaseFormState>(emptyPurchaseForm);
  const [errors, setErrors] = useState<PurchaseFormErrors>({});
  const [supplierFormVisible, setSupplierFormVisible] = useState(false);
  const [supplierForm, setSupplierForm] =
    useState<SupplierFormState>(emptySupplierForm);
  const [supplierErrors, setSupplierErrors] = useState<SupplierFormErrors>({});
  const [productFormVisible, setProductFormVisible] = useState(false);
  const [productForm, setProductForm] =
    useState<PurchaseProductFormState>(emptyPurchaseProductForm);
  const [productErrors, setProductErrors] = useState<PurchaseProductFormErrors>({});

  const selectedSupplier =
    suppliers.find((supplier) => supplier.id === form.supplierId) ?? null;
  const selectedProduct =
    products.find((product) => product.id === form.productId) ?? null;
  const quantity = parseNonNegativeInteger(form.quantity) ?? 0;
  const unitCost = parseNonNegativeInteger(form.unitCost) ?? 0;
  const totalMinor = quantity * unitCost;

  function updateField(field: keyof PurchaseFormState, value: string) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
    setErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
  }

  function updateMoneyField(value: string) {
    setForm((currentForm) => ({
      ...currentForm,
      unitCost: formatIntegerInput(value)
    }));
    setErrors((currentErrors) => ({ ...currentErrors, unitCost: undefined }));
  }

  function updateProductField(
    field: keyof PurchaseProductFormState,
    value: string
  ) {
    setProductForm((currentForm) => ({
      ...currentForm,
      [field]:
        field === "cost" || field === "salePrice" || field === "minimumStock"
          ? formatIntegerInput(value)
          : value
    }));
    setProductErrors((currentErrors) => ({
      ...currentErrors,
      [field]: undefined
    }));
  }

  function submitSupplier() {
    const nextErrors: SupplierFormErrors = {};

    if (supplierForm.name.trim() === "") {
      nextErrors.name = "El nombre del proveedor es obligatorio.";
    }

    setSupplierErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const supplier = onCreateSupplier(supplierForm);

    setForm((currentForm) => ({ ...currentForm, supplierId: supplier.id }));
    setSupplierForm(emptySupplierForm);
    setSupplierErrors({});
    setSupplierFormVisible(false);
  }

  function submitProduct() {
    const nextErrors: PurchaseProductFormErrors = {};
    const cost = parseNonNegativeInteger(productForm.cost);
    const salePrice = parseNonNegativeInteger(productForm.salePrice);
    const minimumStock = parseNonNegativeInteger(productForm.minimumStock);

    if (productForm.sku.trim() === "") {
      nextErrors.sku = "El codigo es obligatorio.";
    }
    if (productForm.name.trim() === "") {
      nextErrors.name = "El nombre es obligatorio.";
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

    setProductErrors(nextErrors);

    if (
      Object.keys(nextErrors).length > 0 ||
      cost === null ||
      salePrice === null ||
      minimumStock === null
    ) {
      return;
    }

    const product = {
      active: true,
      costMinor: cost,
      id: `product-${Date.now()}`,
      minimumStock,
      name: productForm.name.trim(),
      salePriceMinor: salePrice,
      sku: productForm.sku.trim(),
      stock: 0
    };

    onCreateProduct(product);
    setForm((currentForm) => ({ ...currentForm, productId: product.id }));
    setProductForm(emptyPurchaseProductForm);
    setProductErrors({});
    setProductFormVisible(false);
  }

  function submitPurchase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: PurchaseFormErrors = {};
    const parsedQuantity = parseNonNegativeInteger(form.quantity);
    const parsedUnitCost = parseNonNegativeInteger(form.unitCost);

    if (!selectedSupplier) {
      nextErrors.supplierId = "Debes seleccionar un proveedor.";
    }
    if (form.invoiceNumber.trim() === "") {
      nextErrors.invoiceNumber = "El numero de factura es obligatorio.";
    }
    if (form.issuedAt.trim() === "") {
      nextErrors.issuedAt = "La fecha de emision es obligatoria.";
    }
    if (!selectedProduct) {
      nextErrors.productId = "Debes seleccionar un producto.";
    }
    if (parsedQuantity === null || parsedQuantity <= 0) {
      nextErrors.quantity = "La cantidad debe ser un entero mayor a cero.";
    }
    if (parsedUnitCost === null) {
      nextErrors.unitCost = "El costo unitario debe ser cero o mayor.";
    }

    setErrors(nextErrors);

    if (
      Object.keys(nextErrors).length > 0 ||
      !selectedSupplier ||
      !selectedProduct ||
      parsedQuantity === null ||
      parsedQuantity <= 0 ||
      parsedUnitCost === null
    ) {
      return;
    }

    onRegisterPurchase({
      dueAt: form.dueAt.trim(),
      invoiceNumber: form.invoiceNumber.trim(),
      issuedAt: form.issuedAt.trim(),
      paymentStatus: form.paymentStatus,
      product: selectedProduct,
      quantity: parsedQuantity,
      supplier: selectedSupplier,
      unitCostMinor: parsedUnitCost
    });
    setErrors({});
    setForm(emptyPurchaseForm);
  }

  return (
    <section className="purchases-layout">
      <form className="purchase-form" onSubmit={submitPurchase}>
        <div className="purchase-grid">
          <label className="field" htmlFor="proveedor-compra">
            <span>Proveedor</span>
            <select
              aria-invalid={Boolean(errors.supplierId)}
              id="proveedor-compra"
              onChange={(event) => updateField("supplierId", event.target.value)}
              value={form.supplierId}
            >
              <option value="">Selecciona un proveedor</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
            {errors.supplierId ? <small>{errors.supplierId}</small> : null}
          </label>

          <div className="inline-action-group">
            <button
              type="button"
              onClick={() => setSupplierFormVisible((visible) => !visible)}
            >
              Nuevo proveedor
            </button>
          </div>

          <TextField
            error={errors.invoiceNumber}
            label="Numero factura"
            onChange={(value) => updateField("invoiceNumber", value)}
            value={form.invoiceNumber}
          />
          <TextField
            error={errors.issuedAt}
            label="Fecha emision"
            onChange={(value) => updateField("issuedAt", value)}
            value={form.issuedAt}
          />
          <TextField
            error={errors.dueAt}
            label="Fecha vencimiento"
            onChange={(value) => updateField("dueAt", value)}
            value={form.dueAt}
          />
          <label className="field" htmlFor="producto-compra">
            <span>Producto</span>
            <select
              aria-invalid={Boolean(errors.productId)}
              id="producto-compra"
              onChange={(event) => updateField("productId", event.target.value)}
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
          <div className="inline-action-group">
            <button
              type="button"
              onClick={() => setProductFormVisible((visible) => !visible)}
            >
              Nuevo producto
            </button>
          </div>
          <TextField
            error={errors.quantity}
            inputMode="numeric"
            label="Cantidad compra"
            onChange={(value) => updateField("quantity", value)}
            value={form.quantity}
          />
          <TextField
            error={errors.unitCost}
            inputMode="numeric"
            label="Costo unitario"
            onChange={updateMoneyField}
            value={form.unitCost}
          />
        </div>

        {supplierFormVisible ? (
          <div className="inline-supplier-form">
            <TextField
              error={supplierErrors.name}
              label="Nombre proveedor"
              onChange={(value) => {
                setSupplierForm({ name: value });
                setSupplierErrors({});
              }}
              value={supplierForm.name}
            />
            <button type="button" onClick={submitSupplier}>
              Guardar proveedor
            </button>
          </div>
        ) : null}

        {productFormVisible ? (
          <div className="inline-purchase-product-form">
            <TextField
              error={productErrors.sku}
              label="Codigo producto"
              onChange={(value) => updateProductField("sku", value)}
              value={productForm.sku}
            />
            <TextField
              error={productErrors.name}
              label="Nombre producto"
              onChange={(value) => updateProductField("name", value)}
              value={productForm.name}
            />
            <TextField
              error={productErrors.cost}
              inputMode="numeric"
              label="Costo producto"
              onChange={(value) => updateProductField("cost", value)}
              value={productForm.cost}
            />
            <TextField
              error={productErrors.salePrice}
              inputMode="numeric"
              label="Precio venta producto"
              onChange={(value) => updateProductField("salePrice", value)}
              value={productForm.salePrice}
            />
            <TextField
              error={productErrors.minimumStock}
              inputMode="numeric"
              label="Stock minimo producto"
              onChange={(value) => updateProductField("minimumStock", value)}
              value={productForm.minimumStock}
            />
            <button type="button" onClick={submitProduct}>
              Guardar producto compra
            </button>
          </div>
        ) : null}

        <div
          aria-label="Estado de factura compra"
          className="payment-status-group"
          role="radiogroup"
        >
          <label htmlFor="compra-pagada">
            <input
              checked={form.paymentStatus === "paid"}
              id="compra-pagada"
              name="purchase-payment-status"
              onChange={() => updateField("paymentStatus", "paid")}
              type="radio"
            />
            Pagada
          </label>
          <label htmlFor="compra-pendiente">
            <input
              checked={form.paymentStatus === "pending"}
              id="compra-pendiente"
              name="purchase-payment-status"
              onChange={() => updateField("paymentStatus", "pending")}
              type="radio"
            />
            Pendiente
          </label>
        </div>

        <div className="summary-card">
          <span>Costo unitario {formatCurrency(unitCost)}</span>
          <strong>Total factura {formatCurrency(totalMinor)}</strong>
        </div>

        <div className="form-actions">
          <button type="submit">Registrar compra</button>
        </div>
      </form>

      {purchases.length > 0 ? (
        <table className="data-table" aria-label="Compras registradas">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Proveedor</th>
              <th>Factura</th>
              <th>Producto</th>
              <th>Cantidad</th>
              <th>Estado</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {purchases.map((purchase) => (
              <tr key={purchase.id}>
                <td>{purchase.occurredAtLabel}</td>
                <td>{purchase.supplierName}</td>
                <td>{purchase.invoiceNumber}</td>
                <td>{purchase.productName}</td>
                <td>{purchase.quantity}</td>
                <td>{purchase.paymentStatus === "paid" ? "Pagada" : "Pendiente"}</td>
                <td>{formatCurrency(purchase.totalMinor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="empty-state section-empty">
          <strong>Sin compras registradas</strong>
          <span>Las compras confirmadas aumentaran el inventario.</span>
        </div>
      )}
    </section>
  );
}

type SuppliersSectionProps = {
  onRegisterSupplierPayment: (input: {
    payableId: string;
    amountMinor: number;
  }) => void;
  supplierPayables: SupplierPayableRecord[];
};

function formatPayableStatus(status: SupplierPayableStatus): string {
  if (status === "paid") {
    return "Pagada";
  }

  return status === "partial" ? "Abonada" : "Pendiente";
}

function SuppliersSection({
  onRegisterSupplierPayment,
  supplierPayables
}: SuppliersSectionProps) {
  const [form, setForm] = useState<SupplierPaymentFormState>({
    amount: "",
    payableId: ""
  });
  const [errors, setErrors] = useState<SupplierPaymentFormErrors>({});
  const selectedPayable =
    supplierPayables.find((payable) => payable.id === form.payableId) ?? null;

  function openPaymentForm(payableId: string) {
    setForm({ amount: "", payableId });
    setErrors({});
  }

  function updateAmount(value: string) {
    setForm((currentForm) => ({
      ...currentForm,
      amount: formatIntegerInput(value)
    }));
    setErrors({});
  }

  function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const amount = parseNonNegativeInteger(form.amount);

    if (amount === null || amount <= 0) {
      setErrors({ amount: "El abono debe ser mayor a cero." });
      return;
    }
    if (selectedPayable && amount > selectedPayable.balanceMinor) {
      setErrors({ amount: "El abono no puede superar el saldo pendiente." });
      return;
    }
    if (!selectedPayable) {
      return;
    }

    onRegisterSupplierPayment({
      amountMinor: amount,
      payableId: selectedPayable.id
    });
    setForm({ amount: "", payableId: "" });
    setErrors({});
  }

  if (supplierPayables.length === 0) {
    return (
      <section className="section-panel">
        <div className="empty-state section-empty">
          <strong>Sin cuentas por pagar</strong>
          <span>Las facturas pendientes de proveedor apareceran aqui.</span>
        </div>
      </section>
    );
  }

  return (
    <section className="section-panel">
      <table className="data-table" aria-label="Cuentas por pagar">
        <thead>
          <tr>
            <th>Proveedor</th>
            <th>Factura</th>
            <th>Vence</th>
            <th>Original</th>
            <th>Abonado</th>
            <th>Saldo</th>
            <th>Estado</th>
            <th>Accion</th>
          </tr>
        </thead>
        <tbody>
          {supplierPayables.map((payable) => (
            <tr key={payable.id}>
              <td>{payable.supplierName}</td>
              <td>{payable.invoiceNumber}</td>
              <td>{payable.dueAt || "Sin vencimiento"}</td>
              <td>{formatCurrency(payable.originalAmountMinor)}</td>
              <td>{formatCurrency(payable.paidAmountMinor)}</td>
              <td>{formatCurrency(payable.balanceMinor)}</td>
              <td>{formatPayableStatus(payable.status)}</td>
              <td>
                {payable.status !== "paid" ? (
                  <button
                    className="table-action"
                    onClick={() => openPaymentForm(payable.id)}
                    type="button"
                  >
                    Registrar abono
                  </button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedPayable ? (
        <form className="supplier-payment-form" onSubmit={submitPayment}>
          <div className="summary-card">
            <span>{selectedPayable.supplierName}</span>
            <strong>Saldo {formatCurrency(selectedPayable.balanceMinor)}</strong>
          </div>
          <TextField
            error={errors.amount}
            inputMode="numeric"
            label="Valor abono"
            onChange={updateAmount}
            value={form.amount}
          />
          <div className="form-actions">
            <button type="submit">Guardar abono</button>
          </div>
        </form>
      ) : null}
    </section>
  );
}

type SalesSectionProps = {
  customers: CustomerRecord[];
  onCreateCustomer: (input: CustomerFormState) => CustomerRecord;
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
  const [customerForm, setCustomerForm] =
    useState<CustomerFormState>(emptyCustomerForm);
  const [customerErrors, setCustomerErrors] = useState<CustomerFormErrors>({});
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [invoicePreview, setInvoicePreview] = useState<InvoicePdfResult | null>(null);

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

  function updateCustomerField(field: keyof CustomerFormState, value: string) {
    setCustomerForm((currentForm) => ({ ...currentForm, [field]: value }));
    setCustomerErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
  }

  function submitCustomer() {
    const nextErrors: CustomerFormErrors = {};

    if (customerForm.name.trim() === "") {
      nextErrors.name = "El nombre del cliente es obligatorio.";
    }
    if (customerForm.document.trim() === "") {
      nextErrors.document = "El documento del cliente es obligatorio.";
    }

    setCustomerErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const customer = onCreateCustomer(customerForm);

    setForm((currentForm) => ({ ...currentForm, customerId: customer.id }));
    setCustomerForm(emptyCustomerForm);
    setCustomerErrors({});
    setCustomerFormVisible(false);
  }

  function generateInvoiceForSale(sale: SaleRecord) {
    try {
      const invoice = generateInvoicePdf({
        customer: {
          address: sale.customer.address,
          city: sale.customer.city,
          document: sale.customer.document,
          email: sale.customer.email,
          name: sale.customer.name
        },
        invoiceNumber: `FE-${sale.id}`,
        issueDate: sale.occurredAtLabel,
        item: {
          description: sale.productName,
          quantity: sale.quantity,
          totalMinor: sale.totalMinor,
          unitPriceMinor: sale.unitPriceMinor
        },
        paymentStatus: sale.paymentStatus
      });
      setInvoicePreview(invoice);
      setInvoiceError(null);
    } catch {
      setInvoicePreview(null);
      setInvoiceError("No se pudo generar la factura PDF.");
    }
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
                  {customer.name} - {customer.document}
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
              error={customerErrors.name}
              label="Nombre o razon social"
              onChange={(value) => updateCustomerField("name", value)}
              value={customerForm.name}
            />
            <TextField
              error={customerErrors.document}
              label="NIT o C.C."
              onChange={(value) => updateCustomerField("document", value)}
              value={customerForm.document}
            />
            <TextField
              error={customerErrors.address}
              label="Direccion"
              onChange={(value) => updateCustomerField("address", value)}
              value={customerForm.address}
            />
            <TextField
              error={customerErrors.city}
              label="Ciudad"
              onChange={(value) => updateCustomerField("city", value)}
              value={customerForm.city}
            />
            <TextField
              error={customerErrors.email}
              label="Email"
              onChange={(value) => updateCustomerField("email", value)}
              value={customerForm.email}
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
        <>
          <table className="data-table" aria-label="Ventas registradas">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Estado</th>
                <th>Total</th>
                <th>Factura</th>
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
                  <td>
                    <button
                      className="table-action"
                      onClick={() => generateInvoiceForSale(sale)}
                      type="button"
                    >
                      Generar factura PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {invoicePreview ? (
            <section className="invoice-preview" aria-label="Factura PDF generada">
              <div className="invoice-preview-header">
                <strong>Factura generada</strong>
                <a download={invoicePreview.fileName} href={invoicePreview.dataUri}>
                  Descargar PDF
                </a>
              </div>
              <iframe
                src={invoicePreview.dataUri}
                title="Vista previa de factura PDF"
              />
            </section>
          ) : null}
          {invoiceError ? <p className="form-error">{invoiceError}</p> : null}
        </>
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

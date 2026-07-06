import {
  useEffect,
  useMemo,
  useState
} from "react";
import { SectionHeader } from "./components/SectionHeader";
import { SectionContent } from "./sections/SectionContent";
import { DashboardContent } from "./sections/dashboard/DashboardContent";
import {
  emptySalesDraft,
  type SalesDraftState
} from "./sections/sales/SalesSection";
import type {
  CustomerFormErrors,
  CustomerFormState,
  CustomerRecord,
  CustomerValidationOptions,
  ProductRecord,
  PurchasePaymentStatus,
  PurchaseRecord,
  ReceivableRecord,
  SaleRecord,
  SectionConfig,
  SectionId,
  SupplierFormState,
  SupplierPayableRecord,
  SupplierPayableStatus,
  SupplierPaymentRecord,
  SupplierRecord
} from "./types";

function normalizeCustomerDocument(document: string): string {
  return document.trim().toLocaleLowerCase();
}

function validateCustomerForm(
  input: CustomerFormState,
  options: CustomerValidationOptions
): CustomerFormErrors {
  const errors: CustomerFormErrors = {};
  const normalizedDocument = normalizeCustomerDocument(input.document);

  if (input.name.trim() === "") {
    errors.name = "El nombre del cliente es obligatorio.";
  }

  if (normalizedDocument === "") {
    errors.document = "El documento del cliente es obligatorio.";
  } else {
    const duplicate = options.customers.some(
      (customer) =>
        customer.id !== options.currentCustomerId &&
        normalizeCustomerDocument(customer.document) === normalizedDocument
    );

    if (duplicate) {
      errors.document = "Ya existe un cliente con este NIT o C.C.";
    }
  }

  return errors;
}

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
    description: "Cuentas por cobrar y por pagar",
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

const sidebarNavigationItems = navigationItems.filter(
  (item) => item.id !== "dashboard"
);

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

type DueAlert = "overdue" | "upcoming" | "current" | "none";

type DueMetadata = {
  alert: DueAlert;
  alertLabel: string;
  bucketLabel: string;
  daysUntilDue: number | null;
};

type CustomerSummary = {
  lastSaleLabel: string;
  pendingReceivableMinor: number;
  saleCount: number;
  totalSoldMinor: number;
};

function parseLocalDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const parts = value.split("-").map(Number);

  if (parts.length !== 3) {
    return null;
  }

  const [year, month, day] = parts;

  if (
    year === undefined ||
    month === undefined ||
    day === undefined
  ) {
    return null;
  }

  const parsed = new Date(year, month - 1, day);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getDaysUntilDue(dueAt: string, today = new Date()): number | null {
  const dueDate = parseLocalDate(dueAt);

  if (!dueDate) {
    return null;
  }

  const millisecondsPerDay = 24 * 60 * 60 * 1000;

  return Math.round(
    (startOfLocalDay(dueDate).getTime() - startOfLocalDay(today).getTime()) /
      millisecondsPerDay
  );
}

function getDueMetadata(dueAt: string, today = new Date()): DueMetadata {
  const daysUntilDue = getDaysUntilDue(dueAt, today);

  if (daysUntilDue === null) {
    return {
      alert: "none",
      alertLabel: "Sin vencimiento",
      bucketLabel: "Sin vencimiento",
      daysUntilDue
    };
  }

  if (daysUntilDue < 0) {
    return {
      alert: "overdue",
      alertLabel: "Vencida",
      bucketLabel: "Vencida",
      daysUntilDue
    };
  }

  const bucketLabel =
    daysUntilDue <= 15
      ? "15 dias"
      : daysUntilDue <= 30
        ? "30 dias"
        : daysUntilDue <= 60
          ? "60 dias"
          : daysUntilDue <= 90
            ? "90 dias"
            : "Mas de 90 dias";

  return {
    alert: daysUntilDue <= 15 ? "upcoming" : "current",
    alertLabel: daysUntilDue <= 15 ? "Proxima" : "Al dia",
    bucketLabel,
    daysUntilDue
  };
}

function compareDueDates(leftDueAt: string, rightDueAt: string): number {
  const left = parseLocalDate(leftDueAt)?.getTime() ?? Number.POSITIVE_INFINITY;
  const right = parseLocalDate(rightDueAt)?.getTime() ?? Number.POSITIVE_INFINITY;

  return left - right;
}

function buildCustomerSummary(input: {
  customer: CustomerRecord;
  receivables: ReceivableRecord[];
  sales: SaleRecord[];
}): CustomerSummary {
  const customerSales = input.sales.filter(
    (sale) => sale.customerId === input.customer.id
  );
  const customerReceivables = input.receivables.filter(
    (receivable) => receivable.customerId === input.customer.id
  );
  const lastSale = [...customerSales].sort(
    (left, right) => right.occurredAtMs - left.occurredAtMs
  )[0];

  return {
    lastSaleLabel: lastSale?.occurredAtLabel ?? "Sin ventas",
    pendingReceivableMinor: customerReceivables.reduce(
      (total, receivable) => total + receivable.amountMinor,
      0
    ),
    saleCount: customerSales.length,
    totalSoldMinor: customerSales.reduce(
      (total, sale) => total + sale.totalMinor,
      0
    )
  };
}

function isSameLocalDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function isSameLocalMonth(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth()
  );
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

export function App() {
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [salesDraft, setSalesDraft] = useState<SalesDraftState>(emptySalesDraft);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [receivables, setReceivables] = useState<ReceivableRecord[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [supplierPayables, setSupplierPayables] = useState<SupplierPayableRecord[]>([]);
  const [supplierPayments, setSupplierPayments] = useState<SupplierPaymentRecord[]>([]);
  const [productFormVisible, setProductFormVisible] = useState(false);
  const [supplierFormVisible, setSupplierFormVisible] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<SectionId>("dashboard");
  const activeSection: SectionConfig = useMemo(
    () =>
      navigationItems.find((item) => item.id === activeSectionId) ??
      navigationItems[0]!,
    [activeSectionId]
  );

  const lowStockProducts = products.filter(isLowStock);
  const today = new Date();
  const salesTodayTotal = sales.reduce(
    (total, sale) =>
      isSameLocalDay(new Date(sale.occurredAtMs), today)
        ? total + sale.totalMinor
        : total,
    0
  );
  const salesMonthTotal = sales.reduce(
    (total, sale) =>
      isSameLocalMonth(new Date(sale.occurredAtMs), today)
        ? total + sale.totalMinor
        : total,
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
    { label: "Ventas del mes", value: formatCurrency(salesMonthTotal) },
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

    if (activeSection.id === "suppliers") {
      setSupplierFormVisible((visible) => !visible);
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
      active: true,
      city: input.city.trim(),
      document: input.document.trim(),
      email: input.email.trim(),
      id: `customer-${Date.now()}`,
      name: input.name.trim()
    };

    setCustomers((currentCustomers) => [...currentCustomers, customer]);

    return customer;
  }

  function updateCustomer(customerId: string, input: CustomerFormState) {
    setCustomers((currentCustomers) =>
      currentCustomers.map((customer) =>
        customer.id === customerId
          ? {
              ...customer,
              address: input.address.trim(),
              city: input.city.trim(),
              document: input.document.trim(),
              email: input.email.trim(),
              name: input.name.trim()
            }
          : customer
      )
    );
  }

  function setCustomerActive(customerId: string, active: boolean) {
    setCustomers((currentCustomers) =>
      currentCustomers.map((customer) =>
        customer.id === customerId ? { ...customer, active } : customer
      )
    );
  }

  function validateCustomer(
    input: CustomerFormState,
    currentCustomerId?: string | undefined
  ): CustomerFormErrors {
    return validateCustomerForm(input, { customers, currentCustomerId });
  }

  function createSupplier(input: SupplierFormState): SupplierRecord {
    const supplier = {
      active: true,
      address: input.address.trim(),
      city: input.city.trim(),
      department: input.department.trim() || "Antioquia",
      document: input.document.trim(),
      email: input.email.trim(),
      id: `supplier-${Date.now()}`,
      name: input.name.trim(),
      phone: input.phone.trim()
    };

    setSuppliers((currentSuppliers) => [...currentSuppliers, supplier]);

    return supplier;
  }

  function updateSupplier(supplierId: string, input: SupplierFormState) {
    setSuppliers((currentSuppliers) =>
      currentSuppliers.map((supplier) =>
        supplier.id === supplierId
          ? {
              ...supplier,
              address: input.address.trim(),
              city: input.city.trim(),
              department: input.department.trim() || "Antioquia",
              document: input.document.trim(),
              email: input.email.trim(),
              name: input.name.trim(),
              phone: input.phone.trim()
            }
          : supplier
      )
    );
  }

  function setSupplierActive(supplierId: string, active: boolean) {
    setSuppliers((currentSuppliers) =>
      currentSuppliers.map((supplier) =>
        supplier.id === supplierId ? { ...supplier, active } : supplier
      )
    );
  }

  function registerPurchaseInSession(input: {
    supplier: SupplierRecord;
    invoiceNumber: string;
    issuedAt: string;
    dueAt: string;
    lines: Array<{
      product: ProductRecord;
      quantity: number;
      unitCostMinor: number;
    }>;
    paymentStatus: PurchasePaymentStatus;
  }) {
    const occurredAt = new Date();
    const purchaseId = `purchase-${Date.now()}`;
    const lines = input.lines.map((line, index) => ({
      id: `${purchaseId}-line-${index}`,
      productId: line.product.id,
      productName: line.product.name,
      quantity: line.quantity,
      totalMinor: line.quantity * line.unitCostMinor,
      unitCostMinor: line.unitCostMinor
    }));
    const totalMinor = lines.reduce((total, line) => total + line.totalMinor, 0);
    const totalQuantity = lines.reduce((total, line) => total + line.quantity, 0);
    const firstLine = lines[0]!;

    setProducts((currentProducts) =>
      currentProducts.map((product) => {
        const productLines = lines.filter((line) => line.productId === product.id);
        const latestLine = productLines.at(-1);

        return productLines.length > 0 && latestLine
          ? {
              ...product,
              costMinor: latestLine.unitCostMinor,
              salePriceMinor:
                product.salePriceMinor === 0
                  ? latestLine.unitCostMinor
                  : product.salePriceMinor,
              stock:
                product.stock +
                productLines.reduce((total, line) => total + line.quantity, 0)
            }
          : product;
      })
    );
    setPurchases((currentPurchases) => [
      {
        dueAt: input.dueAt,
        id: purchaseId,
        invoiceNumber: input.invoiceNumber,
        issuedAt: input.issuedAt,
        lines,
        occurredAtMs: occurredAt.getTime(),
        occurredAtLabel: formatOccurredAtLabel(occurredAt),
        paymentStatus: input.paymentStatus,
        productId: firstLine.productId,
        productName:
          lines.length === 1 ? firstLine.productName : `${lines.length} productos`,
        quantity: totalQuantity,
        supplierId: input.supplier.id,
        supplierName: input.supplier.name,
        totalMinor,
        unitCostMinor: firstLine.unitCostMinor
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
    const selectedPayable =
      supplierPayables.find((payable) => payable.id === input.payableId) ?? null;

    if (selectedPayable) {
      const paidAt = new Date();

      setSupplierPayments((currentPayments) => [
        {
          amountMinor: input.amountMinor,
          id: `supplier-payment-${Date.now()}`,
          paidAtLabel: formatOccurredAtLabel(paidAt),
          paidAtMs: paidAt.getTime(),
          payableId: selectedPayable.id,
          purchaseId: selectedPayable.purchaseId,
          supplierId: selectedPayable.supplierId,
          supplierName: selectedPayable.supplierName
        },
        ...currentPayments
      ]);
    }

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

  function registerSaleInSession(input: {
    customer: CustomerRecord;
    dueAt?: string | undefined;
    lines: Array<{
      product: ProductRecord;
      quantity: number;
      unitCostMinorAtSale: number;
      unitPriceMinor: number;
      costMinor: number;
      marginMinor: number;
      marginPercent: number;
      totalMinor: number;
    }>;
    paymentStatus: "paid" | "pending";
  }): string | null {
    const occurredAtMs = Date.now();
    const occurredAt = new Date(occurredAtMs);
    const requestedByProduct = input.lines.reduce((requested, line) => {
      requested.set(
        line.product.id,
        (requested.get(line.product.id) ?? 0) + line.quantity
      );
      return requested;
    }, new Map<string, number>());
    const insufficientProduct = products.find(
      (product) => (requestedByProduct.get(product.id) ?? 0) > product.stock
    );

    if (insufficientProduct) {
      return "No hay inventario suficiente para completar el movimiento.";
    }

    const saleId = `sale-${Date.now()}`;
    const lines = input.lines.map((line, index) => ({
      costMinor: line.costMinor,
      id: `${saleId}-line-${index}`,
      marginMinor: line.marginMinor,
      marginPercent: line.marginPercent,
      productId: line.product.id,
      productName: line.product.name,
      quantity: line.quantity,
      totalMinor: line.totalMinor,
      unitCostMinorAtSale: line.unitCostMinorAtSale,
      unitPriceMinor: line.unitPriceMinor
    }));
    const totalMinor = lines.reduce((total, line) => total + line.totalMinor, 0);
    const totalQuantity = lines.reduce((total, line) => total + line.quantity, 0);
    const firstLine = lines[0]!;

    setProducts((currentProducts) =>
      currentProducts.map((product) => ({
        ...product,
        stock: product.stock - (requestedByProduct.get(product.id) ?? 0)
      }))
    );
    setSales((currentSales) => [
      {
        customer: input.customer,
        customerId: input.customer.id,
        customerName: input.customer.name,
        id: saleId,
        lines,
        occurredAtMs,
        occurredAtLabel: formatOccurredAtLabel(occurredAt),
        paymentStatus: input.paymentStatus,
        productId: firstLine.productId,
        productName:
          lines.length === 1 ? firstLine.productName : `${lines.length} productos`,
        quantity: totalQuantity,
        totalMinor,
        unitPriceMinor: firstLine.unitPriceMinor,
      },
      ...currentSales
    ]);

    if (input.paymentStatus === "pending") {
      setReceivables((currentReceivables) => [
        {
          amountMinor: totalMinor,
          customerId: input.customer.id,
          customerName: input.customer.name,
          dueAt: input.dueAt ?? "",
          id: `receivable-${saleId}`,
          saleId,
          status: "pending"
        },
        ...currentReceivables
      ]);
    }

    return null;
  }

  function registerPaidSaleInSession(input: {
    customer: CustomerRecord;
    lines: Array<{
      product: ProductRecord;
      quantity: number;
      unitCostMinorAtSale: number;
      unitPriceMinor: number;
      costMinor: number;
      marginMinor: number;
      marginPercent: number;
      totalMinor: number;
    }>;
  }): string | null {
    return registerSaleInSession({
      customer: input.customer,
      lines: input.lines,
      paymentStatus: "paid"
    });
  }

  function registerPendingSaleInSession(input: {
    customer: CustomerRecord;
    dueAt: string;
    lines: Array<{
      product: ProductRecord;
      quantity: number;
      unitCostMinorAtSale: number;
      unitPriceMinor: number;
      costMinor: number;
      marginMinor: number;
      marginPercent: number;
      totalMinor: number;
    }>;
  }): string | null {
    return registerSaleInSession({
      customer: input.customer,
      dueAt: input.dueAt,
      lines: input.lines,
      paymentStatus: "pending"
    });
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <button
          aria-label="Moneta Inventario y cartera"
          aria-current={activeSectionId === "dashboard" ? "page" : undefined}
          className="brand"
          onClick={() => openSection("dashboard")}
          type="button"
        >
          <span className="brand-mark">M</span>
          <div>
            <strong>Moneta</strong>
            <small>Inventario y cartera</small>
          </div>
        </button>

        <nav className="navigation" aria-label="Principal">
          {sidebarNavigationItems.map((item) => (
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
        <SectionHeader
          action={activeSection.primaryAction ? (
            <button
              className="primary-action"
              onClick={handlePrimaryAction}
            >
              {activeSection.primaryAction}
            </button>
          ) : null}
          description={activeSection.description}
          eyebrow={activeSection.label}
          title={activeSection.title}
        />

        {activeSection.id === "dashboard" ? (
          <DashboardContent
            formatCurrency={formatCurrency}
            lowStockProducts={lowStockProducts}
            metrics={metrics}
            onOpenProducts={() => openSection("products")}
            onOpenReports={() => openSection("reports")}
            sales={sales}
          />
        ) : (
          <SectionContent
            buildCustomerSummary={buildCustomerSummary}
            compareDueDates={compareDueDates}
            customers={customers}
            formatCurrency={formatCurrency}
            formatIntegerInput={formatIntegerInput}
            formatPayableStatus={formatPayableStatus}
            getDueMetadata={getDueMetadata}
            isLowStock={isLowStock}
            onCreateCustomer={createCustomer}
            onCreateProduct={createProduct}
            onCreateSupplier={createSupplier}
            onUpdateSupplier={updateSupplier}
            onSetSupplierActive={setSupplierActive}
            onRegisterPurchase={registerPurchaseInSession}
            onRegisterPaidSale={registerPaidSaleInSession}
            onRegisterPendingSale={registerPendingSaleInSession}
            onRegisterSupplierPayment={registerSupplierPayment}
            onValidateCustomer={validateCustomer}
            onUpdateCustomer={updateCustomer}
            onSetCustomerActive={setCustomerActive}
            onCloseProductForm={() => setProductFormVisible(false)}
            onCloseSupplierForm={() => setSupplierFormVisible(false)}
            parseNonNegativeInteger={parseNonNegativeInteger}
            productFormVisible={productFormVisible}
            supplierFormVisible={supplierFormVisible}
            products={products}
            purchases={purchases}
            receivables={receivables}
            sales={sales}
            salesDraft={salesDraft}
            section={activeSection}
            onSalesDraftChange={setSalesDraft}
            supplierPayables={supplierPayables}
            supplierPayments={supplierPayments}
            suppliers={suppliers}
          />
        )}
      </section>
    </main>
  );
}

function formatPayableStatus(status: SupplierPayableStatus): string {
  if (status === "paid") {
    return "Pagada";
  }

  return status === "partial" ? "Abonada" : "Pendiente";
}

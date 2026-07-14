import {
  useEffect,
  useMemo,
  useState
} from "react";
import { PrimaryActionButton } from "./components/PrimaryActionButton";
import { SectionHeader } from "./components/SectionHeader";
import {
  compareDueDates,
  getDueMetadata,
  parseLocalDate
} from "./lib/dates";
import {
  formatCurrency,
  formatIntegerInput,
  parseNonNegativeInteger
} from "./lib/formatters";
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
  AppSettings,
  CustomerValidationOptions,
  CreditNoteAdjustmentType,
  CreditNoteRecord,
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
    label: "Inicio",
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
    id: "credit-notes",
    label: "Notas credito",
    title: "Notas credito",
    description: "Devoluciones y ajustes de ventas",
    emptyTitle: "Sin notas credito",
    emptyBody: "Las devoluciones registradas apareceran aqui."
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

const settingsSection: SectionConfig = {
  id: "settings",
  label: "Configuracion",
  title: "Configuracion",
  description: "Empresa, logo y plantilla de factura",
  emptyTitle: "Sin configuracion",
  emptyBody: "Configura los datos del negocio y el formato de factura."
};

const defaultSettings: AppSettings = {
  company: {
    address: "Calle 00 # 00-00",
    city: "Colombia",
    document: "900.123.456-7",
    email: "contacto@empresa.com",
    logoDataUri: "",
    name: "NOMBRE DE LA EMPRESA S.A.S.",
    phone: ""
  },
  invoice: {
    accentColor: "#475569",
    legalNote:
      "Plantilla visual imprimible. No corresponde a una factura electronica DIAN ni incluye CUFE real.",
    observations: "Observaciones: factura generada desde Moneta para impresion.",
    title: "REMISION"
  }
};

function formatOccurredAtLabel(date: Date): string {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

type CustomerSummary = {
  lastSaleLabel: string;
  pendingReceivableMinor: number;
  saleCount: number;
  totalSoldMinor: number;
};

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
  const [creditNotes, setCreditNotes] = useState<CreditNoteRecord[]>([]);
  const [receivables, setReceivables] = useState<ReceivableRecord[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [supplierPayables, setSupplierPayables] = useState<SupplierPayableRecord[]>([]);
  const [supplierPayments, setSupplierPayments] = useState<SupplierPaymentRecord[]>([]);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [productFormVisible, setProductFormVisible] = useState(false);
  const [supplierFormVisible, setSupplierFormVisible] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<SectionId>("dashboard");
  const activeSection: SectionConfig = useMemo(
    () =>
      [...navigationItems, settingsSection].find((item) => item.id === activeSectionId) ??
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
  const creditNotesTodayTotal = creditNotes.reduce(
    (total, creditNote) =>
      isSameLocalDay(new Date(creditNote.occurredAtMs), today)
        ? total + creditNote.totalMinor
        : total,
    0
  );
  const creditNotesMonthTotal = creditNotes.reduce(
    (total, creditNote) =>
      isSameLocalMonth(new Date(creditNote.occurredAtMs), today)
        ? total + creditNote.totalMinor
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
    {
      label: "Ventas de hoy",
      value: formatCurrency(Math.max(salesTodayTotal - creditNotesTodayTotal, 0))
    },
    {
      label: "Ventas del mes",
      value: formatCurrency(Math.max(salesMonthTotal - creditNotesMonthTotal, 0))
    },
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
    branch: string;
    prefix: string;
    concept: string;
    invoiceNumber: string;
    issuedAt: string;
    dueAt: string;
    lines: Array<{
      product: ProductRecord;
      unit: string;
      quantity: number;
      unitCostMinor: number;
      discountPercent: number;
      discountMinor: number;
      taxPercent: number;
      taxMinor: number;
      subtotalMinor: number;
    }>;
    paymentStatus: PurchasePaymentStatus;
  }) {
    const occurredAt = new Date();
    const purchaseId = `purchase-${Date.now()}`;
    const lines = input.lines.map((line, index) => ({
      discountMinor: line.discountMinor,
      discountPercent: line.discountPercent,
      id: `${purchaseId}-line-${index}`,
      productId: line.product.id,
      productName: line.product.name,
      quantity: line.quantity,
      subtotalMinor: line.subtotalMinor,
      taxMinor: line.taxMinor,
      taxPercent: line.taxPercent,
      totalMinor: line.subtotalMinor - line.discountMinor + line.taxMinor,
      unit: line.unit,
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
        branch: input.branch,
        concept: input.concept,
        currency: "COP",
        id: purchaseId,
        invoiceNumber: input.invoiceNumber,
        issuedAt: input.issuedAt,
        lines,
        occurredAtMs: occurredAt.getTime(),
        occurredAtLabel: formatOccurredAtLabel(occurredAt),
        paymentStatus: input.paymentStatus,
        prefix: input.prefix,
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
    branch: string;
    prefix: string;
    invoiceNumber: string;
    issuedAt: string;
    seller: string;
    concept: string;
    dueAt?: string | undefined;
    lines: Array<{
      product: ProductRecord;
      unit: string;
      quantity: number;
      unitCostMinorAtSale: number;
      unitPriceMinor: number;
      discountPercent: number;
      discountMinor: number;
      taxPercent: number;
      taxMinor: number;
      subtotalMinor: number;
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
      discountMinor: line.discountMinor,
      discountPercent: line.discountPercent,
      id: `${saleId}-line-${index}`,
      marginMinor: line.marginMinor,
      marginPercent: line.marginPercent,
      productId: line.product.id,
      productName: line.product.name,
      quantity: line.quantity,
      subtotalMinor: line.subtotalMinor,
      taxMinor: line.taxMinor,
      taxPercent: line.taxPercent,
      totalMinor: line.totalMinor,
      unit: line.unit,
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
        branch: input.branch,
        concept: input.concept,
        currency: "COP",
        customer: input.customer,
        customerId: input.customer.id,
        customerName: input.customer.name,
        id: saleId,
        invoiceNumber: input.invoiceNumber,
        issuedAt: input.issuedAt,
        lines,
        occurredAtMs,
        occurredAtLabel: formatOccurredAtLabel(occurredAt),
        paymentStatus: input.paymentStatus,
        prefix: input.prefix,
        productId: firstLine.productId,
        productName:
          lines.length === 1 ? firstLine.productName : `${lines.length} productos`,
        quantity: totalQuantity,
        seller: input.seller,
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
    branch: string;
    prefix: string;
    invoiceNumber: string;
    issuedAt: string;
    seller: string;
    concept: string;
    lines: Array<{
      product: ProductRecord;
      unit: string;
      quantity: number;
      unitCostMinorAtSale: number;
      unitPriceMinor: number;
      discountPercent: number;
      discountMinor: number;
      taxPercent: number;
      taxMinor: number;
      subtotalMinor: number;
      costMinor: number;
      marginMinor: number;
      marginPercent: number;
      totalMinor: number;
    }>;
  }): string | null {
    return registerSaleInSession({
      branch: input.branch,
      concept: input.concept,
      customer: input.customer,
      invoiceNumber: input.invoiceNumber,
      issuedAt: input.issuedAt,
      lines: input.lines,
      paymentStatus: "paid",
      prefix: input.prefix,
      seller: input.seller
    });
  }

  function registerPendingSaleInSession(input: {
    customer: CustomerRecord;
    branch: string;
    prefix: string;
    invoiceNumber: string;
    issuedAt: string;
    seller: string;
    concept: string;
    dueAt: string;
    lines: Array<{
      product: ProductRecord;
      unit: string;
      quantity: number;
      unitCostMinorAtSale: number;
      unitPriceMinor: number;
      discountPercent: number;
      discountMinor: number;
      taxPercent: number;
      taxMinor: number;
      subtotalMinor: number;
      costMinor: number;
      marginMinor: number;
      marginPercent: number;
      totalMinor: number;
    }>;
  }): string | null {
    return registerSaleInSession({
      branch: input.branch,
      concept: input.concept,
      customer: input.customer,
      dueAt: input.dueAt,
      invoiceNumber: input.invoiceNumber,
      issuedAt: input.issuedAt,
      lines: input.lines,
      paymentStatus: "pending",
      prefix: input.prefix,
      seller: input.seller
    });
  }

  function updateSaleInSession(input: {
    sale: SaleRecord;
    dueAt: string;
  }): string | null {
    const previousSale = sales.find((sale) => sale.id === input.sale.id);

    if (!previousSale) {
      return "La venta que intentas modificar ya no existe.";
    }

    const previousQuantityByProduct = previousSale.lines.reduce((total, line) => {
      total.set(line.productId, (total.get(line.productId) ?? 0) + line.quantity);
      return total;
    }, new Map<string, number>());
    const nextQuantityByProduct = input.sale.lines.reduce((total, line) => {
      total.set(line.productId, (total.get(line.productId) ?? 0) + line.quantity);
      return total;
    }, new Map<string, number>());
    const invalidProduct = input.sale.lines.some(
      (line) => !products.some((product) => product.id === line.productId)
    );
    const insufficientProduct = products.find(
      (product) =>
        (nextQuantityByProduct.get(product.id) ?? 0) >
        product.stock + (previousQuantityByProduct.get(product.id) ?? 0)
    );

    if (invalidProduct) {
      return "Uno de los productos de la venta ya no esta disponible.";
    }
    if (insufficientProduct) {
      return "No hay inventario suficiente para guardar los cambios.";
    }

    setProducts((currentProducts) =>
      currentProducts.map((product) =>
        nextQuantityByProduct.has(product.id) || previousQuantityByProduct.has(product.id)
          ? {
              ...product,
              stock:
                product.stock +
                (previousQuantityByProduct.get(product.id) ?? 0) -
                (nextQuantityByProduct.get(product.id) ?? 0)
            }
          : product
      )
    );
    setSales((currentSales) =>
      currentSales.map((sale) => (sale.id === input.sale.id ? input.sale : sale))
    );
    setReceivables((currentReceivables) => {
      const remaining = currentReceivables.filter(
        (receivable) => receivable.saleId !== input.sale.id
      );

      return input.sale.paymentStatus === "pending"
        ? [
            {
              amountMinor: input.sale.totalMinor,
              customerId: input.sale.customerId,
              customerName: input.sale.customerName,
              dueAt: input.dueAt,
              id: `receivable-${input.sale.id}`,
              saleId: input.sale.id,
              status: "pending"
            },
            ...remaining
          ]
        : remaining;
    });

    return null;
  }

  function deleteSaleInSession(saleId: string) {
    const sale = sales.find((currentSale) => currentSale.id === saleId);

    if (!sale) {
      return;
    }

    const soldQuantityByProduct = sale.lines.reduce((total, line) => {
      total.set(line.productId, (total.get(line.productId) ?? 0) + line.quantity);
      return total;
    }, new Map<string, number>());

    setProducts((currentProducts) =>
      currentProducts.map((product) => ({
        ...product,
        stock: product.stock + (soldQuantityByProduct.get(product.id) ?? 0)
      }))
    );
    setSales((currentSales) => currentSales.filter((currentSale) => currentSale.id !== saleId));
    setReceivables((currentReceivables) =>
      currentReceivables.filter((receivable) => receivable.saleId !== saleId)
    );
    setCreditNotes((currentCreditNotes) =>
      currentCreditNotes.filter((creditNote) => creditNote.saleId !== saleId)
    );
  }

  function registerCreditNoteInSession(input: {
    sale: SaleRecord;
    adjustmentType: CreditNoteAdjustmentType;
    issuedAt: string;
    reason: string;
    lines: Array<{
      amountMinor: number;
      saleLineId: string;
      quantity: number;
    }>;
  }): string | null {
    const creditedQuantityByLine = creditNotes.reduce((totals, creditNote) => {
      if (creditNote.saleId !== input.sale.id) {
        return totals;
      }

      creditNote.lines.forEach((line) => {
        totals.set(line.saleLineId, (totals.get(line.saleLineId) ?? 0) + line.quantity);
      });

      return totals;
    }, new Map<string, number>());
    const creditedAmountByLine = creditNotes.reduce((totals, creditNote) => {
      if (creditNote.saleId !== input.sale.id) {
        return totals;
      }

      creditNote.lines.forEach((line) => {
        totals.set(line.saleLineId, (totals.get(line.saleLineId) ?? 0) + line.totalMinor);
      });

      return totals;
    }, new Map<string, number>());
    const selectedLines = input.lines
      .map((line) => {
        const saleLine = input.sale.lines.find(
          (currentLine) => currentLine.id === line.saleLineId
        );

        return saleLine
          ? { amountMinor: line.amountMinor, quantity: line.quantity, saleLine }
          : null;
      })
      .filter((line): line is NonNullable<typeof line> => line !== null);

    if (selectedLines.length === 0) {
      return "Debes acreditar al menos una linea de la venta.";
    }

    const invalidLine = selectedLines.find(({ amountMinor, quantity, saleLine }) => {
      const alreadyCreditedAmount = creditedAmountByLine.get(saleLine.id) ?? 0;
      const alreadyCredited = creditedQuantityByLine.get(saleLine.id) ?? 0;
      return input.adjustmentType === "discount"
        ? amountMinor <= 0 || amountMinor > saleLine.totalMinor - alreadyCreditedAmount
        : quantity <= 0 ||
            quantity > saleLine.quantity - alreadyCredited ||
            amountMinor > saleLine.totalMinor - alreadyCreditedAmount;
    });

    if (invalidLine) {
      return input.adjustmentType === "discount"
        ? "El valor a acreditar supera lo disponible en la venta."
        : "La cantidad a acreditar supera lo disponible en la venta.";
    }

    const occurredAtMs = Date.now();
    const occurredAt = new Date(occurredAtMs);
    const creditNoteId = `credit-note-${occurredAtMs}`;
    const lines = selectedLines.map(({ amountMinor, quantity, saleLine }, index) => ({
      costMinor:
        input.adjustmentType === "discount"
          ? 0
          : Math.round((saleLine.costMinor / saleLine.quantity) * quantity),
      discountPercent: saleLine.discountPercent,
      id: `${creditNoteId}-line-${index}`,
      marginMinor:
        input.adjustmentType === "discount"
          ? amountMinor
          : Math.round((saleLine.marginMinor / saleLine.quantity) * quantity),
      marginPercent:
        input.adjustmentType === "discount" ? 100 : saleLine.marginPercent,
      productId: saleLine.productId,
      productName: saleLine.productName,
      quantity: input.adjustmentType === "discount" ? 0 : quantity,
      saleLineId: saleLine.id,
      taxPercent: saleLine.taxPercent,
      totalMinor:
        input.adjustmentType === "discount"
          ? amountMinor
          : Math.round((saleLine.totalMinor / saleLine.quantity) * quantity),
      unit: saleLine.unit,
      unitPriceMinor: saleLine.unitPriceMinor
    }));
    const totalMinor = lines.reduce((total, line) => total + line.totalMinor, 0);

    setProducts((currentProducts) =>
      currentProducts.map((product) => {
        const returnedQuantity = lines
          .filter((line) => line.productId === product.id)
          .reduce((total, line) => total + line.quantity, 0);

        return returnedQuantity > 0
          ? { ...product, stock: product.stock + returnedQuantity }
          : product;
      })
    );
    setCreditNotes((currentCreditNotes) => [
      {
        adjustmentType: input.adjustmentType,
        customer: input.sale.customer,
        customerId: input.sale.customerId,
        customerName: input.sale.customerName,
        id: creditNoteId,
        invoiceNumber: input.sale.invoiceNumber,
        issuedAt: input.issuedAt,
        lines,
        number: `NC-${String(currentCreditNotes.length + 1).padStart(3, "0")}`,
        occurredAtLabel: formatOccurredAtLabel(occurredAt),
        occurredAtMs,
        reason:
          input.reason.trim() ||
          "Devolución de parte de los bienes; no aceptación de partes del servicio",
        saleId: input.sale.id,
        totalMinor
      },
      ...currentCreditNotes
    ]);
    setReceivables((currentReceivables) =>
      currentReceivables
        .map((receivable) =>
          receivable.saleId === input.sale.id
            ? {
                ...receivable,
                amountMinor: Math.max(receivable.amountMinor - totalMinor, 0)
              }
            : receivable
        )
        .filter((receivable) => receivable.amountMinor > 0)
    );

    return null;
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand">
            <span className="brand-mark">M</span>
            <div>
              <strong>Moneta</strong>
              <small>Inventario y cartera</small>
            </div>
          </div>
        </div>

        <div className="sidebar-nav">
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
        </div>

        <div className="sidebar-footer">
          <button
            aria-current={activeSectionId === "settings" ? "page" : undefined}
            aria-label="Configuracion"
            className={`settings-nav-button ${
              activeSectionId === "settings" ? "active" : ""
            }`}
            onClick={() => openSection("settings")}
            title="Configuracion"
          >
            <span aria-hidden="true">&#9881;</span>
            <strong>Configuracion</strong>
          </button>
        </div>
      </aside>

      <section className="workspace">
        <SectionHeader
          action={activeSection.primaryAction ? (
            <PrimaryActionButton onClick={handlePrimaryAction}>
              {activeSection.primaryAction}
            </PrimaryActionButton>
          ) : null}
          description={activeSection.description}
          eyebrow={activeSection.label}
          title={activeSection.title}
        />

        {activeSection.id === "dashboard" ? (
          <DashboardContent
            creditNotes={creditNotes}
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
            creditNotes={creditNotes}
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
            onRegisterCreditNote={registerCreditNoteInSession}
            onUpdateSale={updateSaleInSession}
            onDeleteSale={deleteSaleInSession}
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
            onSettingsChange={setSettings}
            supplierPayables={supplierPayables}
            supplierPayments={supplierPayments}
            suppliers={suppliers}
            settings={settings}
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

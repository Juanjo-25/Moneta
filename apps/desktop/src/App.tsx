import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type HTMLAttributes,
  type HTMLInputTypeAttribute
} from "react";
import type { InvoicePdfResult } from "./invoice-pdf";

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
  primaryAction?: string | undefined;
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

type SaleLineRecord = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitCostMinorAtSale: number;
  unitPriceMinor: number;
  costMinor: number;
  marginMinor: number;
  marginPercent: number;
  totalMinor: number;
};

type SaleDraftLine = {
  id: string;
  product: ProductRecord;
  quantity: number;
  unitCostMinorAtSale: number;
  unitPriceMinor: number;
  costMinor: number;
  marginMinor: number;
  marginPercent: number;
  totalMinor: number;
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
  lines: SaleLineRecord[];
  paymentStatus: "paid" | "pending";
  occurredAtMs: number;
  occurredAtLabel: string;
};

type ReceivableRecord = {
  id: string;
  customerId: string;
  customerName: string;
  saleId: string;
  amountMinor: number;
  dueAt: string;
  status: "pending";
};

type SupplierRecord = {
  id: string;
  name: string;
};

type PurchasePaymentStatus = "paid" | "pending";

type PurchaseLineRecord = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitCostMinor: number;
  totalMinor: number;
};

type PurchaseDraftLine = {
  id: string;
  product: ProductRecord;
  quantity: number;
  unitCostMinor: number;
  totalMinor: number;
};

type PurchaseRecord = {
  id: string;
  supplierId: string;
  supplierName: string;
  invoiceNumber: string;
  issuedAt: string;
  dueAt: string;
  occurredAtMs: number;
  productId: string;
  productName: string;
  quantity: number;
  unitCostMinor: number;
  totalMinor: number;
  lines: PurchaseLineRecord[];
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

type SupplierPaymentRecord = {
  id: string;
  payableId: string;
  purchaseId: string;
  supplierId: string;
  supplierName: string;
  amountMinor: number;
  paidAtMs: number;
  paidAtLabel: string;
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
  dueAt: string;
  productId: string;
  quantity: string;
  unitPrice: string;
  paymentStatus: "paid" | "pending";
};

type SalesFormErrors = {
  customerId?: string | undefined;
  dueAt?: string | undefined;
  productId?: string | undefined;
  quantity?: string | undefined;
  unitPrice?: string | undefined;
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
  dueAt: "",
  productId: "",
  quantity: "",
  unitPrice: "",
  paymentStatus: "paid"
};

const emptyCustomerForm: CustomerFormState = {
  address: "",
  city: "",
  document: "",
  email: "",
  name: ""
};

const emptySupplierForm: SupplierFormState = {
  name: ""
};

const emptyPurchaseForm: PurchaseFormState = {
  dueAt: "",
  invoiceNumber: "",
  issuedAt: "",
  paymentStatus: "paid",
  productId: "",
  quantity: "",
  supplierId: "",
  unitCost: ""
};

const emptyPurchaseProductForm: PurchaseProductFormState = {
  cost: "",
  minimumStock: "",
  name: "",
  salePrice: "",
  sku: ""
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

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatDays(value: number): string {
  return `${value.toFixed(1)} dias`;
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateLabel(date: Date): string {
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

function formatLocalDateLabel(value: string): string {
  const parsed = parseLocalDate(value);

  if (!parsed) {
    return value || "Sin fecha";
  }

  return formatDateLabel(parsed);
}

function formatOccurredAtLabel(date: Date): string {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

function buildSaleLineSnapshot(input: {
  product: ProductRecord;
  quantity: number;
  unitPriceMinor: number;
}): SaleDraftLine {
  const totalMinor = input.quantity * input.unitPriceMinor;
  const costMinor = input.quantity * input.product.costMinor;
  const marginMinor = totalMinor - costMinor;
  const marginPercent = totalMinor > 0 ? (marginMinor / totalMinor) * 100 : 0;

  return {
    costMinor,
    id: `sale-line-${Date.now()}`,
    marginMinor,
    marginPercent,
    product: input.product,
    quantity: input.quantity,
    totalMinor,
    unitCostMinorAtSale: input.product.costMinor,
    unitPriceMinor: input.unitPriceMinor
  };
}

type DueAlert = "overdue" | "upcoming" | "current" | "none";

type DueMetadata = {
  alert: DueAlert;
  alertLabel: string;
  bucketLabel: string;
  daysUntilDue: number | null;
};

type MarginSummary = {
  costMinor: number;
  marginMinor: number;
  marginPercent: number;
  revenueMinor: number;
  salesCount: number;
};

type ProductMarginRow = {
  costMinor: number;
  marginMinor: number;
  marginPercent: number;
  productId: string;
  productName: string;
  quantity: number;
  revenueMinor: number;
};

type CustomerMarginRow = {
  costMinor: number;
  customerId: string;
  customerName: string;
  marginMinor: number;
  marginPercent: number;
  purchaseCount: number;
  revenueMinor: number;
};

type SaleMarginRow = {
  costMinor: number;
  customerName: string;
  marginMinor: number;
  marginPercent: number;
  occurredAtLabel: string;
  paymentStatus: "paid" | "pending";
  revenueMinor: number;
  saleId: string;
};

type ReportDetailView = "product" | "customer" | "sales" | "sale" | null;
type ReportTab = "profitability" | "dso" | "cashflow" | "variance";
type ProfitabilityTab = "overview" | "customer" | "product" | "sales";

type DsoSummary = {
  activeReceivablesMinor: number;
  clientCount: number;
  dsoDays: number;
  openInvoiceCount: number;
};

type DsoClientRow = {
  averageOutstandingDays: number;
  customerId: string;
  customerName: string;
  invoiceCount: number;
  participationPercent: number;
  receivableMinor: number;
};

type CashflowEntry = {
  id: string;
  dateLabel: string;
  dateSortMs: number;
  inflowMinor: number;
  outflowMinor: number;
  netMinor: number;
  originLabel: string;
  partyName: string;
  type: "real" | "projected";
  typeLabel: string;
};

type CashflowSummary = {
  projectedInflowMinor: number;
  projectedNetMinor: number;
  projectedOutflowMinor: number;
  realInflowMinor: number;
  realNetMinor: number;
  realOutflowMinor: number;
};

type CashflowPeriodRow = {
  dateLabel: string;
  dateSortMs: number;
  projectedInflowMinor: number;
  projectedNetMinor: number;
  projectedOutflowMinor: number;
  realInflowMinor: number;
  realNetMinor: number;
  realOutflowMinor: number;
};

type UtilityPeriodRow = {
  dateKey: string;
  dateLabel: string;
  dateSortMs: number;
  marginMinor: number;
  marginPercent: number;
  salesCount: number;
  costMinor: number;
  revenueMinor: number;
};

type UtilitySummary = {
  totalMarginMinor: number;
  averageMarginMinor: number;
  bestPeriodLabel: string;
  bestPeriodMarginMinor: number;
  worstPeriodLabel: string;
  worstPeriodMarginMinor: number;
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

function buildMarginSummary(sales: SaleRecord[]): MarginSummary {
  const revenueMinor = sales.reduce((sum, sale) => sum + sale.totalMinor, 0);
  const costMinor = sales.reduce(
    (sum, sale) => sum + sale.lines.reduce((lineSum, line) => lineSum + line.costMinor, 0),
    0
  );
  const marginMinor = revenueMinor - costMinor;

  return {
    costMinor,
    marginMinor,
    marginPercent: revenueMinor > 0 ? (marginMinor / revenueMinor) * 100 : 0,
    revenueMinor,
    salesCount: sales.length
  };
}

function buildProductMarginRows(sales: SaleRecord[]): ProductMarginRow[] {
  const productMap = new Map<string, ProductMarginRow>();

  sales.forEach((sale) => {
    sale.lines.forEach((line) => {
      const currentRow = productMap.get(line.productId) ?? {
        costMinor: 0,
        marginMinor: 0,
        marginPercent: 0,
        productId: line.productId,
        productName: line.productName,
        quantity: 0,
        revenueMinor: 0
      };

      currentRow.quantity += line.quantity;
      currentRow.revenueMinor += line.totalMinor;
      currentRow.costMinor += line.costMinor;
      currentRow.marginMinor += line.marginMinor;
      currentRow.marginPercent =
        currentRow.revenueMinor > 0
          ? (currentRow.marginMinor / currentRow.revenueMinor) * 100
          : 0;

      productMap.set(line.productId, currentRow);
    });
  });

  return [...productMap.values()].sort((left, right) => right.marginMinor - left.marginMinor);
}

function buildCustomerMarginRows(sales: SaleRecord[]): CustomerMarginRow[] {
  const customerMap = new Map<string, CustomerMarginRow>();

  sales.forEach((sale) => {
    const saleCostMinor = sale.lines.reduce((sum, line) => sum + line.costMinor, 0);
    const saleMarginMinor = sale.lines.reduce((sum, line) => sum + line.marginMinor, 0);
    const currentRow = customerMap.get(sale.customerId) ?? {
      costMinor: 0,
      customerId: sale.customerId,
      customerName: sale.customerName,
      marginMinor: 0,
      marginPercent: 0,
      purchaseCount: 0,
      revenueMinor: 0
    };

    currentRow.purchaseCount += 1;
    currentRow.revenueMinor += sale.totalMinor;
    currentRow.costMinor += saleCostMinor;
    currentRow.marginMinor += saleMarginMinor;
    currentRow.marginPercent =
      currentRow.revenueMinor > 0
        ? (currentRow.marginMinor / currentRow.revenueMinor) * 100
        : 0;

    customerMap.set(sale.customerId, currentRow);
  });

  return [...customerMap.values()].sort((left, right) => right.marginMinor - left.marginMinor);
}

function buildSaleMarginRows(sales: SaleRecord[]): SaleMarginRow[] {
  return sales.map((sale) => {
    const costMinor = sale.lines.reduce((sum, line) => sum + line.costMinor, 0);
    const marginMinor = sale.lines.reduce((sum, line) => sum + line.marginMinor, 0);

    return {
      costMinor,
      customerName: sale.customerName,
      marginMinor,
      marginPercent: sale.totalMinor > 0 ? (marginMinor / sale.totalMinor) * 100 : 0,
      occurredAtLabel: sale.occurredAtLabel,
      paymentStatus: sale.paymentStatus,
      revenueMinor: sale.totalMinor,
      saleId: sale.id
    };
  });
}

function buildDsoClientRows(input: {
  receivables: ReceivableRecord[];
  sales: SaleRecord[];
  todayMs?: number;
}): DsoClientRow[] {
  const todayMs = input.todayMs ?? Date.now();
  const saleById = new Map(input.sales.map((sale) => [sale.id, sale]));
  const customerMap = new Map<
    string,
    {
      customerId: string;
      customerName: string;
      invoiceCount: number;
      receivableMinor: number;
      weightedOutstandingDays: number;
    }
  >();

  input.receivables.forEach((receivable) => {
    const sale = saleById.get(receivable.saleId);

    if (!sale) {
      return;
    }

    const outstandingDays = Math.max(
      (todayMs - sale.occurredAtMs) / (24 * 60 * 60 * 1000),
      0
    );
    const currentRow = customerMap.get(receivable.customerId) ?? {
      customerId: receivable.customerId,
      customerName: receivable.customerName,
      invoiceCount: 0,
      receivableMinor: 0,
      weightedOutstandingDays: 0
    };

    currentRow.invoiceCount += 1;
    currentRow.receivableMinor += receivable.amountMinor;
    currentRow.weightedOutstandingDays += outstandingDays * receivable.amountMinor;

    customerMap.set(receivable.customerId, currentRow);
  });

  const totalReceivableMinor = [...customerMap.values()].reduce(
    (sum, row) => sum + row.receivableMinor,
    0
  );

  return [...customerMap.values()]
    .map((row) => ({
      averageOutstandingDays:
        row.receivableMinor > 0 ? row.weightedOutstandingDays / row.receivableMinor : 0,
      customerId: row.customerId,
      customerName: row.customerName,
      invoiceCount: row.invoiceCount,
      participationPercent:
        totalReceivableMinor > 0 ? (row.receivableMinor / totalReceivableMinor) * 100 : 0,
      receivableMinor: row.receivableMinor
    }))
    .sort((left, right) => right.receivableMinor - left.receivableMinor);
}

function buildDsoSummary(input: {
  receivables: ReceivableRecord[];
  sales: SaleRecord[];
  todayMs?: number;
}): DsoSummary {
  const clientRows = buildDsoClientRows(input);
  const activeReceivablesMinor = clientRows.reduce((sum, row) => sum + row.receivableMinor, 0);

  if (activeReceivablesMinor <= 0) {
    return {
      activeReceivablesMinor: 0,
      clientCount: 0,
      dsoDays: 0,
      openInvoiceCount: 0
    };
  }

  const weightedDays = clientRows.reduce(
    (sum, row) => sum + row.averageOutstandingDays * row.receivableMinor,
    0
  );

  return {
    activeReceivablesMinor,
    clientCount: clientRows.length,
    dsoDays: weightedDays / activeReceivablesMinor,
    openInvoiceCount: clientRows.reduce((sum, row) => sum + row.invoiceCount, 0)
  };
}

function buildCashflowEntries(input: {
  purchases: PurchaseRecord[];
  receivables: ReceivableRecord[];
  sales: SaleRecord[];
  supplierPayables: SupplierPayableRecord[];
  supplierPayments: SupplierPaymentRecord[];
}): CashflowEntry[] {
  const entries: CashflowEntry[] = [];

  input.sales.forEach((sale) => {
    if (sale.paymentStatus === "paid") {
      const occurredAt = new Date(sale.occurredAtMs);
      entries.push({
        dateLabel: formatDateLabel(occurredAt),
        dateSortMs: sale.occurredAtMs,
        id: `cashflow-sale-${sale.id}`,
        inflowMinor: sale.totalMinor,
        netMinor: sale.totalMinor,
        originLabel: "Venta pagada",
        outflowMinor: 0,
        partyName: sale.customerName,
        type: "real",
        typeLabel: "Real"
      });
    }
  });

  input.purchases.forEach((purchase) => {
    if (purchase.paymentStatus === "paid") {
      const occurredAt = new Date(purchase.occurredAtMs);
      entries.push({
        dateLabel: formatDateLabel(occurredAt),
        dateSortMs: purchase.occurredAtMs,
        id: `cashflow-purchase-${purchase.id}`,
        inflowMinor: 0,
        netMinor: -purchase.totalMinor,
        originLabel: "Compra pagada",
        outflowMinor: purchase.totalMinor,
        partyName: purchase.supplierName,
        type: "real",
        typeLabel: "Real"
      });
    }
  });

  input.supplierPayments.forEach((payment) => {
    const paidAt = new Date(payment.paidAtMs);
    entries.push({
      dateLabel: formatDateLabel(paidAt),
      dateSortMs: payment.paidAtMs,
      id: payment.id,
      inflowMinor: 0,
      netMinor: -payment.amountMinor,
      originLabel: "Abono proveedor",
      outflowMinor: payment.amountMinor,
      partyName: payment.supplierName,
      type: "real",
      typeLabel: "Real"
    });
  });

  input.receivables.forEach((receivable) => {
    const dueAtMs = parseLocalDate(receivable.dueAt)?.getTime() ?? Number.POSITIVE_INFINITY;
    entries.push({
      dateLabel: formatLocalDateLabel(receivable.dueAt),
      dateSortMs: dueAtMs,
      id: `cashflow-receivable-${receivable.id}`,
      inflowMinor: receivable.amountMinor,
      netMinor: receivable.amountMinor,
      originLabel: "Cuenta por cobrar",
      outflowMinor: 0,
      partyName: receivable.customerName,
      type: "projected",
      typeLabel: "Proyectado"
    });
  });

  input.supplierPayables
    .filter((payable) => payable.balanceMinor > 0)
    .forEach((payable) => {
      const dueAtMs = parseLocalDate(payable.dueAt)?.getTime() ?? Number.POSITIVE_INFINITY;
      entries.push({
        dateLabel: formatLocalDateLabel(payable.dueAt),
        dateSortMs: dueAtMs,
        id: `cashflow-payable-${payable.id}`,
        inflowMinor: 0,
        netMinor: -payable.balanceMinor,
        originLabel: "Cuenta por pagar",
        outflowMinor: payable.balanceMinor,
        partyName: payable.supplierName,
        type: "projected",
        typeLabel: "Proyectado"
      });
    });

  return entries.sort((left, right) => left.dateSortMs - right.dateSortMs);
}

function buildCashflowSummary(entries: CashflowEntry[]): CashflowSummary {
  return entries.reduce<CashflowSummary>(
    (summary, entry) => {
      if (entry.type === "real") {
        summary.realInflowMinor += entry.inflowMinor;
        summary.realOutflowMinor += entry.outflowMinor;
        summary.realNetMinor += entry.netMinor;
      } else {
        summary.projectedInflowMinor += entry.inflowMinor;
        summary.projectedOutflowMinor += entry.outflowMinor;
        summary.projectedNetMinor += entry.netMinor;
      }

      return summary;
    },
    {
      projectedInflowMinor: 0,
      projectedNetMinor: 0,
      projectedOutflowMinor: 0,
      realInflowMinor: 0,
      realNetMinor: 0,
      realOutflowMinor: 0
    }
  );
}

function buildCashflowPeriodRows(entries: CashflowEntry[]): CashflowPeriodRow[] {
  const periodMap = new Map<string, CashflowPeriodRow>();

  entries.forEach((entry) => {
    const key = `${entry.dateSortMs}-${entry.dateLabel}`;
    const currentRow = periodMap.get(key) ?? {
      dateLabel: entry.dateLabel,
      dateSortMs: entry.dateSortMs,
      projectedInflowMinor: 0,
      projectedNetMinor: 0,
      projectedOutflowMinor: 0,
      realInflowMinor: 0,
      realNetMinor: 0,
      realOutflowMinor: 0
    };

    if (entry.type === "real") {
      currentRow.realInflowMinor += entry.inflowMinor;
      currentRow.realOutflowMinor += entry.outflowMinor;
      currentRow.realNetMinor += entry.netMinor;
    } else {
      currentRow.projectedInflowMinor += entry.inflowMinor;
      currentRow.projectedOutflowMinor += entry.outflowMinor;
      currentRow.projectedNetMinor += entry.netMinor;
    }

    periodMap.set(key, currentRow);
  });

  return [...periodMap.values()].sort((left, right) => left.dateSortMs - right.dateSortMs);
}

function buildUtilityPeriodRows(sales: SaleRecord[]): UtilityPeriodRow[] {
  const periodMap = new Map<string, UtilityPeriodRow>();

  sales.forEach((sale) => {
    const occurredAt = new Date(sale.occurredAtMs);
    const dateKey = formatDateKey(occurredAt);
    const dateSortMs = new Date(
      occurredAt.getFullYear(),
      occurredAt.getMonth(),
      occurredAt.getDate()
    ).getTime();
    const costMinor = sale.lines.reduce((sum, line) => sum + line.costMinor, 0);
    const marginMinor = sale.lines.reduce((sum, line) => sum + line.marginMinor, 0);
    const currentRow = periodMap.get(dateKey) ?? {
      costMinor: 0,
      dateKey,
      dateLabel: formatDateLabel(occurredAt),
      dateSortMs,
      marginMinor: 0,
      marginPercent: 0,
      revenueMinor: 0,
      salesCount: 0
    };

    currentRow.salesCount += 1;
    currentRow.revenueMinor += sale.totalMinor;
    currentRow.costMinor += costMinor;
    currentRow.marginMinor += marginMinor;
    currentRow.marginPercent =
      currentRow.revenueMinor > 0
        ? (currentRow.marginMinor / currentRow.revenueMinor) * 100
        : 0;

    periodMap.set(dateKey, currentRow);
  });

  return [...periodMap.values()].sort((left, right) => left.dateSortMs - right.dateSortMs);
}

function buildUtilitySummary(periodRows: UtilityPeriodRow[]): UtilitySummary {
  if (periodRows.length === 0) {
    return {
      averageMarginMinor: 0,
      bestPeriodLabel: "-",
      bestPeriodMarginMinor: 0,
      totalMarginMinor: 0,
      worstPeriodLabel: "-",
      worstPeriodMarginMinor: 0
    };
  }

  const totalMarginMinor = periodRows.reduce((sum, row) => sum + row.marginMinor, 0);
  const bestPeriod = [...periodRows].sort((left, right) => right.marginMinor - left.marginMinor)[0]!;
  const worstPeriod = [...periodRows].sort((left, right) => left.marginMinor - right.marginMinor)[0]!;

  return {
    averageMarginMinor: totalMarginMinor / periodRows.length,
    bestPeriodLabel: bestPeriod.dateLabel,
    bestPeriodMarginMinor: bestPeriod.marginMinor,
    totalMarginMinor,
    worstPeriodLabel: worstPeriod.dateLabel,
    worstPeriodMarginMinor: worstPeriod.marginMinor
  };
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
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [receivables, setReceivables] = useState<ReceivableRecord[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [supplierPayables, setSupplierPayables] = useState<SupplierPayableRecord[]>([]);
  const [supplierPayments, setSupplierPayments] = useState<SupplierPaymentRecord[]>([]);
  const [productFormVisible, setProductFormVisible] = useState(false);
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
      currentProducts.map((product) =>
        lines.some((line) => line.productId === product.id)
          ? {
              ...product,
              stock:
                product.stock +
                lines
                  .filter((line) => line.productId === product.id)
                  .reduce((total, line) => total + line.quantity, 0)
            }
          : product
      )
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
          {activeSection.primaryAction ? (
            <button
              className="primary-action"
              onClick={handlePrimaryAction}
            >
              {activeSection.primaryAction}
            </button>
          ) : null}
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
            supplierPayments={supplierPayments}
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
    invoiceNumber: string;
    issuedAt: string;
    dueAt: string;
    lines: Array<{
      product: ProductRecord;
      quantity: number;
      unitCostMinor: number;
    }>;
    paymentStatus: PurchasePaymentStatus;
  }) => void;
  onRegisterPaidSale: (input: {
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
  }) => string | null;
  onRegisterPendingSale: (input: {
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
  }) => string | null;
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
  supplierPayments: SupplierPaymentRecord[];
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
  supplierPayments,
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
    return (
      <CarteraDashboardSection
        onRegisterSupplierPayment={onRegisterSupplierPayment}
        receivables={receivables}
        supplierPayables={supplierPayables}
      />
    );
  }

  if (section.id === "suppliers") {
    return (
      <SuppliersSection
        onRegisterSupplierPayment={onRegisterSupplierPayment}
        supplierPayables={supplierPayables}
      />
    );
  }

  if (section.id === "reports") {
    return (
      <ReportsSection
        purchases={purchases}
        receivables={receivables}
        sales={sales}
        supplierPayables={supplierPayables}
        supplierPayments={supplierPayments}
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
    invoiceNumber: string;
    issuedAt: string;
    dueAt: string;
    lines: Array<{
      product: ProductRecord;
      quantity: number;
      unitCostMinor: number;
    }>;
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
  const [purchaseLines, setPurchaseLines] = useState<PurchaseDraftLine[]>([]);

  const selectedSupplier =
    suppliers.find((supplier) => supplier.id === form.supplierId) ?? null;
  const selectedProduct =
    products.find((product) => product.id === form.productId) ?? null;
  const quantity = parseNonNegativeInteger(form.quantity) ?? 0;
  const unitCost = parseNonNegativeInteger(form.unitCost) ?? 0;
  const draftLineTotalMinor = quantity * unitCost;
  const purchaseLinesTotalMinor = purchaseLines.reduce(
    (total, line) => total + line.totalMinor,
    0
  );
  const totalMinor = purchaseLinesTotalMinor + draftLineTotalMinor;

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

  function validateDraftLine(): {
    errors: PurchaseFormErrors;
    parsedQuantity: number | null;
    parsedUnitCost: number | null;
  } {
    const nextErrors: PurchaseFormErrors = {};
    const parsedQuantity = parseNonNegativeInteger(form.quantity);
    const parsedUnitCost = parseNonNegativeInteger(form.unitCost);

    if (!selectedProduct) {
      nextErrors.productId = "Debes seleccionar un producto.";
    }
    if (parsedQuantity === null || parsedQuantity <= 0) {
      nextErrors.quantity = "La cantidad debe ser un entero mayor a cero.";
    }
    if (parsedUnitCost === null) {
      nextErrors.unitCost = "El costo unitario debe ser cero o mayor.";
    }

    return { errors: nextErrors, parsedQuantity, parsedUnitCost };
  }

  function addPurchaseLine() {
    const validation = validateDraftLine();

    setErrors((currentErrors) => ({
      ...currentErrors,
      productId: validation.errors.productId,
      quantity: validation.errors.quantity,
      unitCost: validation.errors.unitCost
    }));

    if (
      Object.keys(validation.errors).length > 0 ||
      !selectedProduct ||
      validation.parsedQuantity === null ||
      validation.parsedQuantity <= 0 ||
      validation.parsedUnitCost === null
    ) {
      return;
    }

    const parsedQuantity = validation.parsedQuantity;
    const parsedUnitCost = validation.parsedUnitCost;

    setPurchaseLines((currentLines) => [
      ...currentLines,
      {
        id: `purchase-line-${Date.now()}`,
        product: selectedProduct,
        quantity: parsedQuantity,
        totalMinor: parsedQuantity * parsedUnitCost,
        unitCostMinor: parsedUnitCost
      }
    ]);
    setForm((currentForm) => ({
      ...currentForm,
      productId: "",
      quantity: "",
      unitCost: ""
    }));
    setErrors((currentErrors) => ({
      ...currentErrors,
      productId: undefined,
      quantity: undefined,
      unitCost: undefined
    }));
  }

  function submitPurchase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: PurchaseFormErrors = {};
    const lineValidation = validateDraftLine();
    const hasDraftLine =
      selectedProduct ||
      form.quantity.trim() !== "" ||
      form.unitCost.trim() !== "";
    const linesToRegister =
      purchaseLines.length > 0 && !hasDraftLine
        ? purchaseLines
        : [
            ...purchaseLines,
            ...(lineValidation.parsedQuantity !== null &&
            lineValidation.parsedQuantity > 0 &&
            lineValidation.parsedUnitCost !== null &&
            selectedProduct
              ? [
                  {
                    id: `purchase-line-${Date.now()}`,
                    product: selectedProduct,
                    quantity: lineValidation.parsedQuantity,
                    totalMinor:
                      lineValidation.parsedQuantity *
                      lineValidation.parsedUnitCost,
                    unitCostMinor: lineValidation.parsedUnitCost
                  }
                ]
              : [])
          ];

    if (!selectedSupplier) {
      nextErrors.supplierId = "Debes seleccionar un proveedor.";
    }
    if (form.invoiceNumber.trim() === "") {
      nextErrors.invoiceNumber = "El numero de factura es obligatorio.";
    }
    if (form.issuedAt.trim() === "") {
      nextErrors.issuedAt = "La fecha de emision es obligatoria.";
    }
    if (purchaseLines.length === 0 || hasDraftLine) {
      Object.assign(nextErrors, lineValidation.errors);
    }

    setErrors(nextErrors);

    if (
      Object.keys(nextErrors).length > 0 ||
      !selectedSupplier ||
      linesToRegister.length === 0
    ) {
      return;
    }

    onRegisterPurchase({
      dueAt: form.dueAt.trim(),
      invoiceNumber: form.invoiceNumber.trim(),
      issuedAt: form.issuedAt.trim(),
      lines: linesToRegister.map((line) => ({
        product: line.product,
        quantity: line.quantity,
        unitCostMinor: line.unitCostMinor
      })),
      paymentStatus: form.paymentStatus,
      supplier: selectedSupplier
    });
    setErrors({});
    setPurchaseLines([]);
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
            type="date"
            value={form.issuedAt}
          />
          <TextField
            error={errors.dueAt}
            label="Fecha vencimiento"
            onChange={(value) => updateField("dueAt", value)}
            type="date"
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
          <div className="inline-action-group">
            <button type="button" onClick={addPurchaseLine}>
              Agregar producto
            </button>
          </div>
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

        {purchaseLines.length > 0 ? (
          <table className="data-table purchase-lines-table" aria-label="Productos de la compra">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Costo unitario</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {purchaseLines.map((line) => (
                <tr key={line.id}>
                  <td>{line.product.name}</td>
                  <td>{line.quantity}</td>
                  <td>{formatCurrency(line.unitCostMinor)}</td>
                  <td>{formatCurrency(line.totalMinor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
          <span>Productos agregados {purchaseLines.length}</span>
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
      <PayablesTable
        onRegisterSupplierPayment={onRegisterSupplierPayment}
        supplierPayables={supplierPayables}
        tableLabel="Cuentas por pagar"
      />
    </section>
  );
}

type CarteraView = "receivables" | "payables";

type CarteraAlertItem = {
  id: string;
  partyName: string;
  reference: string;
  dueAt: string;
  balanceMinor: number;
  directionLabel: string;
  metadata: DueMetadata;
};

function getOpenPayables(payables: SupplierPayableRecord[]): SupplierPayableRecord[] {
  return payables.filter((payable) => payable.balanceMinor > 0);
}

type CarteraDashboardSectionProps = {
  onRegisterSupplierPayment: (input: {
    payableId: string;
    amountMinor: number;
  }) => void;
  receivables: ReceivableRecord[];
  supplierPayables: SupplierPayableRecord[];
};

function CarteraDashboardSection({
  onRegisterSupplierPayment,
  receivables,
  supplierPayables
}: CarteraDashboardSectionProps) {
  const [activeView, setActiveView] = useState<CarteraView>("receivables");
  const openPayables = getOpenPayables(supplierPayables);
  const sortedReceivables = [...receivables].sort((left, right) =>
    compareDueDates(left.dueAt, right.dueAt)
  );
  const sortedPayables = [...openPayables].sort((left, right) =>
    compareDueDates(left.dueAt, right.dueAt)
  );
  const receivablesTotal = receivables.reduce(
    (total, receivable) => total + receivable.amountMinor,
    0
  );
  const payablesTotal = openPayables.reduce(
    (total, payable) => total + payable.balanceMinor,
    0
  );
  const alertItems: CarteraAlertItem[] = [
    ...receivables.map((receivable) => ({
      balanceMinor: receivable.amountMinor,
      directionLabel: "Por cobrar",
      dueAt: receivable.dueAt,
      id: receivable.id,
      metadata: getDueMetadata(receivable.dueAt),
      partyName: receivable.customerName,
      reference: receivable.saleId
    })),
    ...openPayables.map((payable) => ({
      balanceMinor: payable.balanceMinor,
      directionLabel: "Por pagar",
      dueAt: payable.dueAt,
      id: payable.id,
      metadata: getDueMetadata(payable.dueAt),
      partyName: payable.supplierName,
      reference: payable.invoiceNumber
    }))
  ]
    .filter(
      (item) =>
        item.metadata.alert === "overdue" || item.metadata.alert === "upcoming"
    )
    .sort((left, right) => compareDueDates(left.dueAt, right.dueAt));
  const overdueCount = alertItems.filter(
    (item) => item.metadata.alert === "overdue"
  ).length;
  const upcomingCount = alertItems.filter(
    (item) => item.metadata.alert === "upcoming"
  ).length;

  return (
    <section className="section-panel cartera-dashboard">
      <div className="cartera-summary" aria-label="Resumen de cartera">
        <div className="summary-card">
          <span>Total por cobrar</span>
          <strong>{formatCurrency(receivablesTotal)}</strong>
        </div>
        <div className="summary-card">
          <span>Total por pagar</span>
          <strong>{formatCurrency(payablesTotal)}</strong>
        </div>
        <div className="summary-card">
          <span>Facturas vencidas</span>
          <strong>{String(overdueCount)}</strong>
        </div>
        <div className="summary-card">
          <span>Proximas a vencer</span>
          <strong>{String(upcomingCount)}</strong>
        </div>
      </div>

      <CarteraAlerts items={alertItems} />

      <div className="view-switch" aria-label="Vistas de cartera">
        <button
          aria-selected={activeView === "receivables"}
          className={activeView === "receivables" ? "active" : ""}
          onClick={() => setActiveView("receivables")}
          type="button"
        >
          Por cobrar
        </button>
        <button
          aria-selected={activeView === "payables"}
          className={activeView === "payables" ? "active" : ""}
          onClick={() => setActiveView("payables")}
          type="button"
        >
          Por pagar
        </button>
      </div>

      {activeView === "receivables" ? (
        <ReceivablesTable receivables={sortedReceivables} />
      ) : (
        <PayablesTable
          onRegisterSupplierPayment={onRegisterSupplierPayment}
          supplierPayables={sortedPayables}
        />
      )}
    </section>
  );
}

function CarteraAlerts({ items }: { items: CarteraAlertItem[] }) {
  if (items.length === 0) {
    return (
      <div className="cartera-alerts" aria-label="Alertas de cartera">
        <strong>Sin alertas de cartera</strong>
        <span>No hay facturas vencidas ni proximas a vencer.</span>
      </div>
    );
  }

  return (
    <div className="cartera-alerts" aria-label="Alertas de cartera">
      <strong>Alertas automaticas</strong>
      <ul>
        {items.map((item) => (
          <li key={`${item.directionLabel}-${item.id}`}>
            <span>{item.metadata.alertLabel}</span>
            <strong>{item.partyName}</strong>
            <span>{item.directionLabel}</span>
            <span>{item.reference}</span>
            <span>{item.dueAt || "Sin vencimiento"}</span>
            <span>{formatCurrency(item.balanceMinor)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

type ReceivablesTableProps = {
  receivables: ReceivableRecord[];
};

function ReceivablesTable({ receivables }: ReceivablesTableProps) {
  if (receivables.length === 0) {
    return (
      <div className="empty-state section-empty">
        <strong>Sin cartera por cobrar</strong>
        <span>Las ventas pendientes de pago apareceran aqui.</span>
      </div>
    );
  }

  return (
    <table className="data-table" aria-label="Cartera por cobrar">
      <thead>
        <tr>
          <th>Cliente</th>
          <th>Venta</th>
          <th>Vence</th>
          <th>Saldo</th>
          <th>Rango</th>
          <th>Alerta</th>
          <th>Estado</th>
        </tr>
      </thead>
      <tbody>
        {receivables.map((receivable) => {
          const dueMetadata = getDueMetadata(receivable.dueAt);

          return (
            <tr key={receivable.id}>
              <td>{receivable.customerName}</td>
              <td>{receivable.saleId}</td>
              <td>{receivable.dueAt || "Sin vencimiento"}</td>
              <td>{formatCurrency(receivable.amountMinor)}</td>
              <td>{dueMetadata.bucketLabel}</td>
              <td>{dueMetadata.alertLabel}</td>
              <td>Pendiente</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

type PayablesTableProps = {
  onRegisterSupplierPayment: (input: {
    payableId: string;
    amountMinor: number;
  }) => void;
  supplierPayables: SupplierPayableRecord[];
  tableLabel?: string;
};

function PayablesTable({
  onRegisterSupplierPayment,
  supplierPayables,
  tableLabel = "Cartera por pagar"
}: PayablesTableProps) {
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
      <div className="empty-state section-empty">
        <strong>Sin cartera por pagar</strong>
        <span>Las facturas pendientes de proveedor apareceran aqui.</span>
      </div>
    );
  }

  return (
    <>
      <table className="data-table" aria-label={tableLabel}>
        <thead>
          <tr>
            <th>Proveedor</th>
            <th>Factura</th>
            <th>Vence</th>
            <th>Original</th>
            <th>Abonado</th>
            <th>Saldo</th>
            <th>Rango</th>
            <th>Alerta</th>
            <th>Estado</th>
            <th>Accion</th>
          </tr>
        </thead>
        <tbody>
          {supplierPayables.map((payable) => {
            const dueMetadata = getDueMetadata(payable.dueAt);

            return (
              <tr key={payable.id}>
                <td>{payable.supplierName}</td>
                <td>{payable.invoiceNumber}</td>
                <td>{payable.dueAt || "Sin vencimiento"}</td>
                <td>{formatCurrency(payable.originalAmountMinor)}</td>
                <td>{formatCurrency(payable.paidAmountMinor)}</td>
                <td>{formatCurrency(payable.balanceMinor)}</td>
                <td>{dueMetadata.bucketLabel}</td>
                <td>{dueMetadata.alertLabel}</td>
                <td>{formatPayableStatus(payable.status)}</td>
                <td>
                  {payable.balanceMinor > 0 ? (
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
            );
          })}
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
    </>
  );
}

type ReportsSectionProps = {
  purchases: PurchaseRecord[];
  receivables: ReceivableRecord[];
  sales: SaleRecord[];
  supplierPayables: SupplierPayableRecord[];
  supplierPayments: SupplierPaymentRecord[];
};

function ReportsSection({
  purchases,
  receivables,
  sales,
  supplierPayables,
  supplierPayments
}: ReportsSectionProps) {
  const [activeReportTab, setActiveReportTab] = useState<ReportTab>("profitability");
  const [activeProfitabilityTab, setActiveProfitabilityTab] =
    useState<ProfitabilityTab>("overview");
  const [detailView, setDetailView] = useState<ReportDetailView>(null);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);

  const summary = buildMarginSummary(sales);
  const productRows = buildProductMarginRows(sales);
  const customerRows = buildCustomerMarginRows(sales);
  const saleRows = buildSaleMarginRows(sales);
  const productMaxMargin = productRows[0]?.marginMinor ?? 0;
  const customerMaxMargin = customerRows[0]?.marginMinor ?? 0;
  const saleMaxMargin = saleRows[0]?.marginMinor ?? 0;
  const selectedSale = selectedSaleId
    ? sales.find((sale) => sale.id === selectedSaleId) ?? null
    : null;
  const dsoSummary = buildDsoSummary({ receivables, sales });
  const dsoClientRows = buildDsoClientRows({ receivables, sales });
  const cashflowEntries = buildCashflowEntries({
    purchases,
    receivables,
    sales,
    supplierPayables,
    supplierPayments
  });
  const cashflowSummary = buildCashflowSummary(cashflowEntries);
  const cashflowPeriodRows = buildCashflowPeriodRows(cashflowEntries);
  const cashflowMaxNet = Math.max(
    1,
    ...cashflowPeriodRows.flatMap((row) => [
      Math.abs(row.realNetMinor),
      Math.abs(row.projectedNetMinor)
    ])
  );
  const utilityPeriodRows = buildUtilityPeriodRows(sales);
  const utilitySummary = buildUtilitySummary(utilityPeriodRows);
  const utilityMaxMargin = Math.max(1, ...utilityPeriodRows.map((row) => Math.abs(row.marginMinor)));
  const netMarginMinor = summary.marginMinor;
  const topCustomerRows = customerRows.slice(0, 10);
  const topProductRows = productRows.slice(0, 10);
  const topSaleRows = saleRows.slice(0, 10);

  const reportTabs: Array<{ id: ReportTab; label: string; title: string }> = [
    { id: "profitability", label: "Rentabilidad", title: "Rentabilidad" },
    { id: "dso", label: "DSO", title: "DSO" },
    { id: "cashflow", label: "Flujo de caja", title: "Flujo de caja" },
    { id: "variance", label: "Utilidades", title: "Utilidades" }
  ];

  const profitabilityTabs: Array<{ id: ProfitabilityTab; label: string }> = [
    { id: "overview", label: "Dashboard general" },
    { id: "customer", label: "Clientes" },
    { id: "product", label: "Producto" },
    { id: "sales", label: "Ventas" }
  ];

  function selectReportTab(tab: ReportTab) {
    setActiveReportTab(tab);
    setDetailView(null);
    setSelectedSaleId(null);
  }

  function selectProfitabilityTab(tab: ProfitabilityTab) {
    setActiveProfitabilityTab(tab);
    setDetailView(null);
    setSelectedSaleId(null);
  }

  function renderProfitabilitySummary() {
    return (
      <div className="cartera-summary" aria-label="Resumen rentabilidad general">
        <div className="summary-card">
          <span>Ingresos totales</span>
          <strong>{formatCurrency(summary.revenueMinor)}</strong>
        </div>
        <div className="summary-card">
          <span>Costo de ventas</span>
          <strong>{formatCurrency(summary.costMinor)}</strong>
        </div>
        <div className="summary-card">
          <span>Margen bruto</span>
          <strong>{formatCurrency(summary.marginMinor)}</strong>
        </div>
        <div className="summary-card">
          <span>Margen neto</span>
          <strong>{formatCurrency(netMarginMinor)}</strong>
        </div>
        <div className="summary-card">
          <span>% margen</span>
          <strong>{formatPercent(summary.marginPercent)}</strong>
        </div>
      </div>
    );
  }

  function renderReportTabs() {
    return (
      <div className="reports-submenu" aria-label="Tipos de reportes">
        {reportTabs.map((tab) => (
          <button
            aria-selected={activeReportTab === tab.id}
            className={activeReportTab === tab.id ? "active" : ""}
            key={tab.id}
            onClick={() => selectReportTab(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>
    );
  }

  function renderProfitabilityTabs() {
    return (
      <div className="reports-submenu" aria-label="Tipos de rentabilidad">
        {profitabilityTabs.map((tab) => (
          <button
            aria-selected={activeProfitabilityTab === tab.id}
            className={activeProfitabilityTab === tab.id ? "active" : ""}
            key={tab.id}
            onClick={() => selectProfitabilityTab(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>
    );
  }

  if (activeReportTab === "dso") {
    return (
      <section className="reports-layout">
        {renderReportTabs()}
        <div className="cartera-summary" aria-label="Resumen DSO">
          <div className="summary-card">
            <span>DSO global</span>
            <strong>{formatDays(dsoSummary.dsoDays)}</strong>
          </div>
          <div className="summary-card">
            <span>Cartera abierta</span>
            <strong>{formatCurrency(dsoSummary.activeReceivablesMinor)}</strong>
          </div>
          <div className="summary-card">
            <span>Clientes con saldo</span>
            <strong>{String(dsoSummary.clientCount)}</strong>
          </div>
          <div className="summary-card">
            <span>Facturas abiertas</span>
            <strong>{String(dsoSummary.openInvoiceCount)}</strong>
          </div>
        </div>

        {dsoClientRows.length === 0 ? (
          <div className="empty-state section-empty">
            <strong>Sin cartera pendiente para DSO</strong>
            <span>Las ventas pendientes de cobro apareceran aqui para medir dias de recaudo.</span>
          </div>
        ) : (
          <section className="report-detail-panel">
            <div className="report-detail-header">
              <div>
                <h2>DSO</h2>
                <p>Top clientes que mas empujan el promedio actual de cobro.</p>
              </div>
            </div>

            <table className="data-table" aria-label="Impacto DSO por cliente">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Saldo pendiente</th>
                  <th>Participacion</th>
                  <th>DSO cliente</th>
                  <th>Facturas abiertas</th>
                </tr>
              </thead>
              <tbody>
                {dsoClientRows.map((row) => (
                  <tr key={row.customerId}>
                    <td>{row.customerName}</td>
                    <td>{formatCurrency(row.receivableMinor)}</td>
                    <td>{formatPercent(row.participationPercent)}</td>
                    <td>{formatDays(row.averageOutstandingDays)}</td>
                    <td>{row.invoiceCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </section>
    );
  }

  if (activeReportTab === "cashflow") {
    return (
      <section className="reports-layout">
        {renderReportTabs()}
        <div className="cartera-summary" aria-label="Resumen flujo de caja">
          <div className="summary-card">
            <span>Entradas reales</span>
            <strong>{formatCurrency(cashflowSummary.realInflowMinor)}</strong>
          </div>
          <div className="summary-card">
            <span>Salidas reales</span>
            <strong>{formatCurrency(cashflowSummary.realOutflowMinor)}</strong>
          </div>
          <div className="summary-card">
            <span>Flujo neto real</span>
            <strong>{formatCurrency(cashflowSummary.realNetMinor)}</strong>
          </div>
          <div className="summary-card">
            <span>Flujo neto proyectado</span>
            <strong>{formatCurrency(cashflowSummary.projectedNetMinor)}</strong>
          </div>
        </div>

        {cashflowEntries.length === 0 ? (
          <div className="empty-state section-empty">
            <strong>Sin movimientos para flujo de caja</strong>
            <span>Registra ventas, compras o cartera pendiente para activar este reporte.</span>
          </div>
        ) : (
          <>
            <section className="report-detail-panel">
              <div className="report-detail-header">
                <div>
                  <h2>Flujo de caja</h2>
                  <p>Comparativo entre movimientos reales y compromisos proyectados por fecha.</p>
                </div>
              </div>

              <div className="report-chart report-chart-detail" aria-label="Grafico flujo de caja comparativo">
                {cashflowPeriodRows.map((row) => (
                  <div className="cashflow-chart-row" key={`${row.dateSortMs}-${row.dateLabel}`}>
                    <span>{row.dateLabel}</span>
                    <div className="cashflow-chart-bars">
                      <div className="cashflow-bar-group">
                        <small>Real</small>
                        <div className="report-bar-track">
                          <div
                            className={`report-bar-fill ${row.realNetMinor < 0 ? "report-bar-fill-negative" : ""}`}
                            style={{ width: `${(Math.abs(row.realNetMinor) / cashflowMaxNet) * 100}%` }}
                          />
                        </div>
                        <strong>{formatCurrency(row.realNetMinor)}</strong>
                      </div>
                      <div className="cashflow-bar-group">
                        <small>Proyectado</small>
                        <div className="report-bar-track">
                          <div
                            className={`report-bar-fill ${row.projectedNetMinor < 0 ? "report-bar-fill-negative" : ""}`}
                            style={{
                              width: `${(Math.abs(row.projectedNetMinor) / cashflowMaxNet) * 100}%`
                            }}
                          />
                        </div>
                        <strong>{formatCurrency(row.projectedNetMinor)}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <table className="data-table" aria-label="Detalle flujo de caja">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Origen</th>
                  <th>Tercero</th>
                  <th>Entrada</th>
                  <th>Salida</th>
                  <th>Neto</th>
                </tr>
              </thead>
              <tbody>
                {cashflowEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.dateLabel}</td>
                    <td>{entry.typeLabel}</td>
                    <td>{entry.originLabel}</td>
                    <td>{entry.partyName}</td>
                    <td>{formatCurrency(entry.inflowMinor)}</td>
                    <td>{formatCurrency(entry.outflowMinor)}</td>
                    <td>{formatCurrency(entry.netMinor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>
    );
  }

  if (activeReportTab === "variance") {
    return (
      <section className="reports-layout">
        {renderReportTabs()}
        <div className="cartera-summary" aria-label="Resumen utilidades">
          <div className="summary-card">
            <span>Utilidad total</span>
            <strong>{formatCurrency(utilitySummary.totalMarginMinor)}</strong>
          </div>
          <div className="summary-card">
            <span>Promedio por periodo</span>
            <strong>{formatCurrency(utilitySummary.averageMarginMinor)}</strong>
          </div>
          <div className="summary-card">
            <span>Mejor periodo</span>
            <strong>
              {utilitySummary.bestPeriodLabel} · {formatCurrency(utilitySummary.bestPeriodMarginMinor)}
            </strong>
          </div>
          <div className="summary-card">
            <span>Peor periodo</span>
            <strong>
              {utilitySummary.worstPeriodLabel} · {formatCurrency(utilitySummary.worstPeriodMarginMinor)}
            </strong>
          </div>
        </div>

        {utilityPeriodRows.length === 0 ? (
          <div className="empty-state section-empty">
            <strong>Sin utilidades para analizar</strong>
            <span>Registra ventas para construir la utilidad por periodo.</span>
          </div>
        ) : (
          <>
            <section className="report-detail-panel">
              <div className="report-detail-header">
                <div>
                  <h2>Utilidades</h2>
                  <p>Utilidad total por dia con ventas, costo y margen consolidado.</p>
                </div>
              </div>

              <div className="report-chart report-chart-detail" aria-label="Grafico utilidades por periodo">
                {utilityPeriodRows.map((row) => (
                  <div className="report-bar-row report-bar-row-detail" key={row.dateKey}>
                    <span>{row.dateLabel}</span>
                    <div className="report-bar-track">
                      <div
                        className="report-bar-fill"
                        style={{ width: `${(Math.abs(row.marginMinor) / utilityMaxMargin) * 100}%` }}
                      />
                    </div>
                    <strong>{formatCurrency(row.marginMinor)}</strong>
                  </div>
                ))}
              </div>
            </section>

            <table className="data-table" aria-label="Detalle utilidades por periodo">
              <thead>
                <tr>
                  <th>Periodo</th>
                  <th>Ventas</th>
                  <th>Costo</th>
                  <th>Utilidad</th>
                  <th>% margen</th>
                  <th>Numero de ventas</th>
                </tr>
              </thead>
              <tbody>
                {utilityPeriodRows.map((row) => (
                  <tr key={row.dateKey}>
                    <td>{row.dateLabel}</td>
                    <td>{formatCurrency(row.revenueMinor)}</td>
                    <td>{formatCurrency(row.costMinor)}</td>
                    <td>{formatCurrency(row.marginMinor)}</td>
                    <td>{formatPercent(row.marginPercent)}</td>
                    <td>{row.salesCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>
    );
  }

  if (activeReportTab !== "profitability") {
    const selectedTab = reportTabs.find((tab) => tab.id === activeReportTab) ?? reportTabs[0]!;

    return (
      <section className="reports-layout">
        {renderReportTabs()}
        <section className="report-placeholder-panel">
          <h2>{selectedTab.title}</h2>
          <strong>Proximamente</strong>
          <span>Este reporte aparecera aqui cuando terminemos su implementacion.</span>
        </section>
      </section>
    );
  }

  if (sales.length === 0) {
    return (
      <section className="reports-layout">
        {renderReportTabs()}
        {renderProfitabilityTabs()}
        <div className="empty-state section-empty">
          <strong>Sin ventas para analizar</strong>
          <span>Registra ventas para habilitar los reportes de rentabilidad.</span>
        </div>
      </section>
    );
  }

  if (detailView === "product") {
    return (
      <section className="reports-layout">
        {renderReportTabs()}
        {renderProfitabilityTabs()}
        {renderProfitabilitySummary()}

        <section className="report-detail-panel">
          <div className="report-detail-header">
            <button className="table-action" onClick={() => setDetailView(null)} type="button">
              Volver a resumen
            </button>
            <div>
              <h2>Margen por producto</h2>
              <p>Utilidad agregada por producto vendida en el periodo analizado.</p>
            </div>
          </div>

          <div className="report-chart report-chart-detail" aria-label="Grafico detalle margen por producto">
            {productRows.map((row) => (
              <div className="report-bar-row report-bar-row-detail" key={row.productId}>
                <span>{row.productName}</span>
                <div className="report-bar-track">
                  <div
                    className="report-bar-fill"
                    style={{
                      width: `${productMaxMargin > 0 ? (row.marginMinor / productMaxMargin) * 100 : 0}%`
                    }}
                  />
                </div>
                <strong>{formatCurrency(row.marginMinor)}</strong>
              </div>
            ))}
          </div>

          <table className="data-table" aria-label="Detalle margen por producto">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Unidades</th>
                <th>Ventas</th>
                <th>Costo</th>
                <th>Utilidad</th>
                <th>% margen</th>
              </tr>
            </thead>
            <tbody>
              {productRows.map((row) => (
                <tr key={row.productId}>
                  <td>{row.productName}</td>
                  <td>{row.quantity}</td>
                  <td>{formatCurrency(row.revenueMinor)}</td>
                  <td>{formatCurrency(row.costMinor)}</td>
                  <td>{formatCurrency(row.marginMinor)}</td>
                  <td>{formatPercent(row.marginPercent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </section>
    );
  }

  if (detailView === "customer") {
    return (
      <section className="reports-layout">
        {renderReportTabs()}
        {renderProfitabilityTabs()}
        {renderProfitabilitySummary()}

        <section className="report-detail-panel">
          <div className="report-detail-header">
            <button className="table-action" onClick={() => setDetailView(null)} type="button">
              Volver a resumen
            </button>
            <div>
              <h2>Margen por cliente</h2>
              <p>Utilidad consolidada por cliente para comparar variacion comercial.</p>
            </div>
          </div>

          <div className="report-chart report-chart-detail" aria-label="Grafico detalle margen por cliente">
            {customerRows.map((row) => (
              <div className="report-bar-row report-bar-row-detail" key={row.customerId}>
                <span>{row.customerName}</span>
                <div className="report-bar-track">
                  <div
                    className="report-bar-fill"
                    style={{
                      width: `${customerMaxMargin > 0 ? (row.marginMinor / customerMaxMargin) * 100 : 0}%`
                    }}
                  />
                </div>
                <strong>{formatCurrency(row.marginMinor)}</strong>
              </div>
            ))}
          </div>

          <table className="data-table" aria-label="Detalle margen por cliente">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Ventas</th>
                <th>Costo</th>
                <th>Utilidad</th>
                <th>% margen</th>
                <th>Compras</th>
              </tr>
            </thead>
            <tbody>
              {customerRows.map((row) => (
                <tr key={row.customerId}>
                  <td>{row.customerName}</td>
                  <td>{formatCurrency(row.revenueMinor)}</td>
                  <td>{formatCurrency(row.costMinor)}</td>
                  <td>{formatCurrency(row.marginMinor)}</td>
                  <td>{formatPercent(row.marginPercent)}</td>
                  <td>{row.purchaseCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </section>
    );
  }

  if (detailView === "sales") {
    return (
      <section className="reports-layout">
        {renderReportTabs()}
        {renderProfitabilityTabs()}
        {renderProfitabilitySummary()}

        <section className="report-detail-panel">
          <div className="report-detail-header">
            <button className="table-action" onClick={() => setDetailView(null)} type="button">
              Volver a resumen
            </button>
            <div>
              <h2>Margen por venta</h2>
              <p>Rentabilidad total por venta y acceso al detalle por producto de cada factura.</p>
            </div>
          </div>

          <table className="data-table" aria-label="Detalle margen por venta">
            <thead>
              <tr>
                <th>Venta</th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Estado</th>
                <th>Ventas</th>
                <th>Costo</th>
                <th>Utilidad</th>
                <th>% margen</th>
                <th>Accion</th>
              </tr>
            </thead>
            <tbody>
              {saleRows.map((row) => (
                <tr key={row.saleId}>
                  <td>{row.saleId}</td>
                  <td>{row.occurredAtLabel}</td>
                  <td>{row.customerName}</td>
                  <td>{row.paymentStatus === "paid" ? "Pagada" : "Pendiente"}</td>
                  <td>{formatCurrency(row.revenueMinor)}</td>
                  <td>{formatCurrency(row.costMinor)}</td>
                  <td>{formatCurrency(row.marginMinor)}</td>
                  <td>{formatPercent(row.marginPercent)}</td>
                  <td>
                    <button
                      aria-label={`Ver detalle de venta ${row.saleId}`}
                      className="table-action"
                      onClick={() => {
                        setSelectedSaleId(row.saleId);
                        setDetailView("sale");
                      }}
                      type="button"
                    >
                      Ver detalle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </section>
    );
  }

  if (detailView === "sale" && selectedSale) {
    const selectedSaleCostMinor = selectedSale.lines.reduce((sum, line) => sum + line.costMinor, 0);
    const selectedSaleMarginMinor = selectedSale.lines.reduce(
      (sum, line) => sum + line.marginMinor,
      0
    );
    const selectedSaleMarginPercent =
      selectedSale.totalMinor > 0 ? (selectedSaleMarginMinor / selectedSale.totalMinor) * 100 : 0;

    return (
      <section className="reports-layout">
        {renderReportTabs()}
        {renderProfitabilityTabs()}
        {renderProfitabilitySummary()}

        <section className="report-detail-panel">
          <div className="report-detail-header">
            <button
              className="table-action"
              onClick={() => {
                setDetailView("sales");
                setSelectedSaleId(null);
              }}
              type="button"
            >
              Volver a resumen
            </button>
            <div>
              <h2>Margen por venta</h2>
              <p>
                {selectedSale.customerName} · {selectedSale.id} · {selectedSale.occurredAtLabel}
              </p>
            </div>
          </div>

          <div className="report-sale-summary">
            <div className="summary-card">
              <span>Cliente</span>
              <strong>{selectedSale.customerName}</strong>
            </div>
            <div className="summary-card">
              <span>Venta total</span>
              <strong>{formatCurrency(selectedSale.totalMinor)}</strong>
            </div>
            <div className="summary-card">
              <span>Costo total</span>
              <strong>{formatCurrency(selectedSaleCostMinor)}</strong>
            </div>
            <div className="summary-card">
              <span>Margen total</span>
              <strong>{formatCurrency(selectedSaleMarginMinor)}</strong>
            </div>
            <div className="summary-card">
              <span>% margen</span>
              <strong>{formatPercent(selectedSaleMarginPercent)}</strong>
            </div>
          </div>

          <table className="data-table" aria-label="Detalle margen por producto de la venta">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Precio venta</th>
                <th>Ventas</th>
                <th>Costo</th>
                <th>Utilidad</th>
                <th>% margen</th>
              </tr>
            </thead>
            <tbody>
              {selectedSale.lines.map((line) => (
                <tr key={line.id}>
                  <td>{line.productName}</td>
                  <td>{line.quantity}</td>
                  <td>{formatCurrency(line.unitPriceMinor)}</td>
                  <td>{formatCurrency(line.totalMinor)}</td>
                  <td>{formatCurrency(line.costMinor)}</td>
                  <td>{formatCurrency(line.marginMinor)}</td>
                  <td>{formatPercent(line.marginPercent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </section>
    );
  }

  if (activeProfitabilityTab === "customer") {
    return (
      <section className="reports-layout">
        {renderReportTabs()}
        {renderProfitabilityTabs()}
        <section className="report-panel report-panel-single">
          <div className="report-panel-header">
            <div>
              <h2>Margen por cliente</h2>
              <p>Top clientes ordenados por utilidad real acumulada.</p>
            </div>
            <button
              className="table-action"
              onClick={() => setDetailView("customer")}
              type="button"
            >
              Ver detalle
            </button>
          </div>
          <button
            aria-label="Abrir detalle de margen por cliente"
            className="report-chart-button"
            onClick={() => setDetailView("customer")}
            type="button"
          >
            <div className="report-chart" aria-label="Grafico margen por cliente">
              {topCustomerRows.map((row) => (
                <div className="report-bar-row" key={row.customerId}>
                  <span>{row.customerName}</span>
                  <div className="report-bar-track">
                    <div
                      className="report-bar-fill"
                      style={{
                        width: `${customerMaxMargin > 0 ? (row.marginMinor / customerMaxMargin) * 100 : 0}%`
                      }}
                    />
                  </div>
                  <strong>{formatCurrency(row.marginMinor)}</strong>
                </div>
              ))}
            </div>
          </button>
        </section>
      </section>
    );
  }

  if (activeProfitabilityTab === "product") {
    return (
      <section className="reports-layout">
        {renderReportTabs()}
        {renderProfitabilityTabs()}
        <section className="report-panel report-panel-single">
          <div className="report-panel-header">
            <div>
              <h2>Margen por producto</h2>
              <p>Productos ordenados por utilidad y volumen vendido.</p>
            </div>
            <button
              className="table-action"
              onClick={() => setDetailView("product")}
              type="button"
            >
              Ver detalle
            </button>
          </div>
          <button
            aria-label="Abrir detalle de margen por producto"
            className="report-chart-button"
            onClick={() => setDetailView("product")}
            type="button"
          >
            <div className="report-chart" aria-label="Grafico margen por producto">
              {topProductRows.map((row) => (
                <div className="report-bar-row" key={row.productId}>
                  <span>{row.productName}</span>
                  <div className="report-bar-track">
                    <div
                      className="report-bar-fill"
                      style={{
                        width: `${productMaxMargin > 0 ? (row.marginMinor / productMaxMargin) * 100 : 0}%`
                      }}
                    />
                  </div>
                  <strong>{formatCurrency(row.marginMinor)}</strong>
                </div>
              ))}
            </div>
          </button>
        </section>
      </section>
    );
  }

  if (activeProfitabilityTab === "sales") {
    return (
      <section className="reports-layout">
        {renderReportTabs()}
        {renderProfitabilityTabs()}
        <section className="report-panel report-panel-single">
          <div className="report-panel-header">
            <div>
              <h2>Margen por venta</h2>
              <p>Rentabilidad por venta completa, con acceso al desglose por linea.</p>
            </div>
            <button
              className="table-action"
              onClick={() => setDetailView("sales")}
              type="button"
            >
              Ver detalle
            </button>
          </div>
          <button
            aria-label="Abrir detalle de margen por venta"
            className="report-chart-button"
            onClick={() => setDetailView("sales")}
            type="button"
          >
            <div className="report-chart" aria-label="Grafico margen por venta">
              {topSaleRows.map((row) => (
                <div className="report-bar-row" key={row.saleId}>
                  <span>{row.customerName}</span>
                  <div className="report-bar-track">
                    <div
                      className="report-bar-fill"
                      style={{
                        width: `${saleMaxMargin > 0 ? (row.marginMinor / saleMaxMargin) * 100 : 0}%`
                      }}
                    />
                  </div>
                  <strong>{formatCurrency(row.marginMinor)}</strong>
                </div>
              ))}
            </div>
          </button>
        </section>
      </section>
    );
  }

  return (
    <section className="reports-layout">
      {renderReportTabs()}
      {renderProfitabilityTabs()}
      {renderProfitabilitySummary()}

      <section className="report-detail-panel">
        <div className="report-detail-header">
          <div>
            <h2>Estado de perdidas y ganancias</h2>
            <p>Vista macro de ingresos, costo de ventas y utilidad final del periodo analizado.</p>
          </div>
        </div>

        <div className="report-waterfall" aria-label="Grafico cascada de utilidad">
          <div className="report-waterfall-step">
            <span>Ingresos</span>
            <strong>{formatCurrency(summary.revenueMinor)}</strong>
          </div>
          <div className="report-waterfall-step report-waterfall-step-negative">
            <span>Costo de ventas</span>
            <strong>{formatCurrency(summary.costMinor)}</strong>
          </div>
          <div className="report-waterfall-step">
            <span>Utilidad bruta</span>
            <strong>{formatCurrency(summary.marginMinor)}</strong>
          </div>
          <div className="report-waterfall-step">
            <span>Utilidad neta</span>
            <strong>{formatCurrency(netMarginMinor)}</strong>
          </div>
        </div>
      </section>
    </section>
  );
}

type SalesSectionProps = {
  customers: CustomerRecord[];
  onCreateCustomer: (input: CustomerFormState) => CustomerRecord;
  onRegisterPaidSale: (input: {
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
  }) => string | null;
  onRegisterPendingSale: (input: {
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
  }) => string | null;
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
  const [saleLines, setSaleLines] = useState<SaleDraftLine[]>([]);

  const selectedCustomer =
    customers.find((customer) => customer.id === form.customerId) ?? null;
  const selectedProduct =
    products.find((product) => product.id === form.productId) ?? null;
  const quantity = parseNonNegativeInteger(form.quantity) ?? 0;
  const unitPriceMinor = parseNonNegativeInteger(form.unitPrice) ?? 0;
  const draftLineTotalMinor = unitPriceMinor * quantity;
  const saleLinesTotalMinor = saleLines.reduce(
    (total, line) => total + line.totalMinor,
    0
  );
  const totalMinor = saleLinesTotalMinor + draftLineTotalMinor;

  useEffect(() => {
    if (!selectedProduct) {
      return;
    }

    setForm((currentForm) =>
      currentForm.productId === selectedProduct.id &&
      currentForm.unitPrice.trim() === ""
        ? {
            ...currentForm,
            unitPrice: formatIntegerInput(String(selectedProduct.salePriceMinor))
          }
        : currentForm
    );
  }, [selectedProduct]);

  function updateField(field: keyof SalesFormState, value: string) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
    setErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
  }

  function validateDraftLine(): {
    errors: SalesFormErrors;
    parsedQuantity: number | null;
    parsedUnitPrice: number | null;
  } {
    const nextErrors: SalesFormErrors = {};
    const parsedQuantity = parseNonNegativeInteger(form.quantity);
    const parsedUnitPrice = parseNonNegativeInteger(form.unitPrice);

    if (!selectedProduct) {
      nextErrors.productId = "Debes seleccionar un producto.";
    }
    if (parsedQuantity === null || parsedQuantity <= 0) {
      nextErrors.quantity = "La cantidad debe ser un entero mayor a cero.";
    }
    if (parsedUnitPrice === null || parsedUnitPrice <= 0) {
      nextErrors.unitPrice = "El precio de venta debe ser un entero mayor a cero.";
    }

    return { errors: nextErrors, parsedQuantity, parsedUnitPrice };
  }

  function addSaleLine() {
    const validation = validateDraftLine();

    setErrors((currentErrors) => ({
      ...currentErrors,
      productId: validation.errors.productId,
      quantity: validation.errors.quantity,
      unitPrice: validation.errors.unitPrice
    }));

    if (
      Object.keys(validation.errors).length > 0 ||
      !selectedProduct ||
      validation.parsedQuantity === null ||
      validation.parsedQuantity <= 0 ||
      validation.parsedUnitPrice === null ||
      validation.parsedUnitPrice <= 0
    ) {
      return;
    }

    const parsedQuantity = validation.parsedQuantity;
    const parsedUnitPrice = validation.parsedUnitPrice;

    setSaleLines((currentLines) => [
      ...currentLines,
      buildSaleLineSnapshot({
        product: selectedProduct,
        quantity: parsedQuantity,
        unitPriceMinor: parsedUnitPrice
      })
    ]);
    setForm((currentForm) => ({
      ...currentForm,
      productId: "",
      quantity: "",
      unitPrice: ""
    }));
    setErrors((currentErrors) => ({
      ...currentErrors,
      productId: undefined,
      quantity: undefined,
      unitPrice: undefined
    }));
  }

  function submitSale(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: SalesFormErrors = {};
    const lineValidation = validateDraftLine();
    const hasDraftLine = selectedProduct || form.quantity.trim() !== "";
    const linesToRegister =
      saleLines.length > 0 && !hasDraftLine
        ? saleLines
        : [
            ...saleLines,
            ...(lineValidation.parsedQuantity !== null &&
            lineValidation.parsedQuantity > 0 &&
            lineValidation.parsedUnitPrice !== null &&
            lineValidation.parsedUnitPrice > 0 &&
            selectedProduct
              ? [
                  buildSaleLineSnapshot({
                    product: selectedProduct,
                    quantity: lineValidation.parsedQuantity,
                    unitPriceMinor: lineValidation.parsedUnitPrice
                  })
                ]
              : [])
          ];

    if (!selectedCustomer) {
      nextErrors.customerId = "Debes seleccionar un cliente.";
    }
    if (form.paymentStatus === "pending" && form.dueAt.trim() === "") {
      nextErrors.dueAt =
        "La fecha de vencimiento es obligatoria para ventas pendientes.";
    }
    if (saleLines.length === 0 || hasDraftLine) {
      Object.assign(nextErrors, lineValidation.errors);
    }

    setErrors(nextErrors);

    if (
      Object.keys(nextErrors).length > 0 ||
      !selectedCustomer ||
      linesToRegister.length === 0
    ) {
      return;
    }

    const registerInput = {
      customer: selectedCustomer,
      lines: linesToRegister.map((line) => ({
        costMinor: line.costMinor,
        marginMinor: line.marginMinor,
        marginPercent: line.marginPercent,
        product: line.product,
        quantity: line.quantity,
        totalMinor: line.totalMinor,
        unitCostMinorAtSale: line.unitCostMinorAtSale,
        unitPriceMinor: line.unitPriceMinor
      }))
    };
    let submitError: string | null = null;

    if (form.paymentStatus === "paid") {
      submitError = onRegisterPaidSale(registerInput);
    } else {
      submitError = onRegisterPendingSale({
        ...registerInput,
        dueAt: form.dueAt.trim()
      });
    }

    if (submitError) {
      setErrors({ submit: submitError });
      return;
    }

    setErrors({});
    setSaleLines([]);
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

  async function generateInvoiceForSale(sale: SaleRecord) {
    try {
      const { generateInvoicePdf } = await import("./invoice-pdf");
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
          description: sale.lines[0]?.productName ?? sale.productName,
          quantity: sale.lines[0]?.quantity ?? sale.quantity,
          totalMinor: sale.lines[0]?.totalMinor ?? sale.totalMinor,
          unitPriceMinor: sale.lines[0]?.unitPriceMinor ?? sale.unitPriceMinor
        },
        items: sale.lines.map((line) => ({
          description: line.productName,
          quantity: line.quantity,
          totalMinor: line.totalMinor,
          unitPriceMinor: line.unitPriceMinor
        })),
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
                updateField("customerId", event.target.value);
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
                updateField("productId", event.target.value);
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
              updateField("quantity", value);
            }}
            value={form.quantity}
          />
          <TextField
            error={errors.unitPrice}
            inputMode="numeric"
            label="Precio venta unitario"
            onChange={(value) => {
              updateField("unitPrice", formatIntegerInput(value));
            }}
            value={form.unitPrice}
          />
          <div className="inline-action-group">
            <button type="button" onClick={addSaleLine}>
              Agregar producto
            </button>
          </div>
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
                updateField("paymentStatus", "paid")
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
                updateField("paymentStatus", "pending")
              }
              type="radio"
            />
            Pendiente
          </label>
        </div>

        {form.paymentStatus === "pending" ? (
          <TextField
            error={errors.dueAt}
            label="Fecha vencimiento venta"
            onChange={(value) => {
              updateField("dueAt", value);
            }}
            type="date"
            value={form.dueAt}
          />
        ) : null}

        {saleLines.length > 0 ? (
          <table className="data-table purchase-lines-table" aria-label="Productos de la venta">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Precio unitario</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {saleLines.map((line) => (
                <tr key={line.id}>
                  <td>{line.product.name}</td>
                  <td>{line.quantity}</td>
                  <td>{formatCurrency(line.unitPriceMinor)}</td>
                  <td>{formatCurrency(line.totalMinor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}

        <div className="summary-card">
          <span>
            Precio unitario {unitPriceMinor > 0 ? formatCurrency(unitPriceMinor) : formatCurrency(0)}
          </span>
          <span>Productos agregados {saleLines.length}</span>
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
                      onClick={() => {
                        void generateInvoiceForSale(sale);
                      }}
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

type TextFieldProps = {
  error?: string | undefined;
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
  label: string;
  onChange: (value: string) => void;
  type?: HTMLInputTypeAttribute;
  value: string;
};

function TextField({
  error,
  inputMode,
  label,
  onChange,
  type = "text",
  value
}: TextFieldProps) {
  const id = label.toLowerCase().replace(/\s+/g, "-");

  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <input
        aria-invalid={Boolean(error)}
        id={id}
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        type={type}
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

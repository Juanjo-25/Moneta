export type SectionId =
  | "dashboard"
  | "products"
  | "purchases"
  | "sales"
  | "customers"
  | "suppliers"
  | "receivables"
  | "reports"
  | "settings";

export type SectionConfig = {
  id: SectionId;
  label: string;
  title: string;
  description: string;
  primaryAction?: string | undefined;
  emptyTitle: string;
  emptyBody: string;
};

export type ProductRecord = {
  id: string;
  sku: string;
  name: string;
  costMinor: number;
  salePriceMinor: number;
  minimumStock: number;
  stock: number;
  active: boolean;
};

export type CustomerRecord = {
  id: string;
  name: string;
  document: string;
  address: string;
  active: boolean;
  city: string;
  email: string;
};

export type CustomerFormState = {
  name: string;
  document: string;
  address: string;
  city: string;
  email: string;
};

export type CustomerFormErrors = Partial<Record<keyof CustomerFormState, string>>;

export type CustomerValidationOptions = {
  customers: CustomerRecord[];
  currentCustomerId?: string | undefined;
};

export type SaleLineRecord = {
  id: string;
  productId: string;
  productName: string;
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
};

export type SaleRecord = {
  id: string;
  customer: CustomerRecord;
  customerId: string;
  customerName: string;
  branch: string;
  prefix: string;
  invoiceNumber: string;
  seller: string;
  currency: "COP";
  concept: string;
  issuedAt: string;
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

export type ReceivableRecord = {
  id: string;
  customerId: string;
  customerName: string;
  saleId: string;
  amountMinor: number;
  dueAt: string;
  status: "pending";
};

export type PurchasePaymentStatus = "paid" | "pending";

export type PurchaseLineRecord = {
  id: string;
  productId: string;
  productName: string;
  unit: string;
  quantity: number;
  unitCostMinor: number;
  discountPercent: number;
  discountMinor: number;
  taxPercent: number;
  taxMinor: number;
  subtotalMinor: number;
  totalMinor: number;
};

export type PurchaseRecord = {
  id: string;
  supplierId: string;
  supplierName: string;
  branch: string;
  prefix: string;
  seller: string;
  currency: "COP";
  concept: string;
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

export type SupplierRecord = {
  id: string;
  active: boolean;
  address: string;
  city: string;
  department: string;
  document: string;
  email: string;
  name: string;
  phone: string;
};

export type SupplierFormState = {
  address: string;
  city: string;
  department: string;
  document: string;
  email: string;
  name: string;
  phone: string;
};

export type SupplierFormErrors = Partial<Record<keyof SupplierFormState, string>>;

export type SupplierPayableStatus = "pending" | "partial" | "paid";

export type SupplierPayableRecord = {
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

export type SupplierPaymentRecord = {
  id: string;
  payableId: string;
  purchaseId: string;
  supplierId: string;
  supplierName: string;
  amountMinor: number;
  paidAtMs: number;
  paidAtLabel: string;
};

export type CompanySettings = {
  name: string;
  document: string;
  address: string;
  city: string;
  email: string;
  phone: string;
  logoDataUri: string;
};

export type InvoiceDesignSettings = {
  accentColor: string;
  title: string;
  legalNote: string;
  observations: string;
};

export type AppSettings = {
  company: CompanySettings;
  invoice: InvoiceDesignSettings;
};

export type SectionId =
  | "dashboard"
  | "products"
  | "purchases"
  | "sales"
  | "customers"
  | "suppliers"
  | "credit-notes"
  | "cash-receipts"
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
  originalAmountMinor: number;
  paidAmountMinor: number;
  balanceMinor: number;
  dueAt: string;
  status: "pending" | "partial";
};

export type CustomerReceiptRecord = {
  active: boolean;
  id: string;
  number: string;
  receivableId: string;
  receivableOriginalAmountMinor: number;
  receivablePaidAmountMinorBefore: number;
  receivableBalanceMinorBefore: number;
  receivableDueAt: string;
  saleId: string;
  customerId: string;
  customerName: string;
  amountMinor: number;
  concept: string;
  receivedAt: string;
  receivedAtMs: number;
  receivedAtLabel: string;
  voidedAtLabel: string;
  voidedAtMs: number;
};

export type CreditNoteLineRecord = {
  id: string;
  saleLineId: string;
  productId: string;
  productName: string;
  unit: string;
  quantity: number;
  unitPriceMinor: number;
  discountPercent: number;
  taxPercent: number;
  costMinor: number;
  marginMinor: number;
  marginPercent: number;
  totalMinor: number;
};

export type CreditNoteAdjustmentType = "return" | "discount";
export type CreditNoteStatus = "draft" | "confirmed" | "void";

export type CreditNoteRecord = {
  adjustmentType: CreditNoteAdjustmentType;
  confirmedAtLabel: string;
  confirmedAtMs: number;
  id: string;
  number: string;
  saleId: string;
  invoiceNumber: string;
  customer: CustomerRecord;
  customerId: string;
  customerName: string;
  issuedAt: string;
  reason: string;
  receivableDueAt: string;
  status: CreditNoteStatus;
  totalMinor: number;
  lines: CreditNoteLineRecord[];
  occurredAtMs: number;
  occurredAtLabel: string;
  voidedAtLabel: string;
  voidedAtMs: number;
};

export type PurchasePaymentStatus = "paid" | "pending";
export type PurchaseExpenseCategory =
  | "inventory"
  | "services"
  | "payroll"
  | "rent"
  | "transport"
  | "taxes"
  | "other";

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
  expenseCategory: PurchaseExpenseCategory;
  branch: string;
  prefix: string;
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
  expenseCategory: PurchaseExpenseCategory;
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
  expenseCategory: PurchaseExpenseCategory;
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
  sellers: string[];
};

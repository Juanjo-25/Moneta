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
  quantity: number;
  unitCostMinorAtSale: number;
  unitPriceMinor: number;
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

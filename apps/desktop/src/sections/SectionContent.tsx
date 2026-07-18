import type { Dispatch, SetStateAction } from "react";
import { EmptyState } from "../components/EmptyState";
import { PayablesTable } from "../components/PayablesTable";
import type { DueMetadata } from "../lib/dates";
import { CarteraDashboardSection } from "./cartera/CarteraDashboardSection";
import { CashReceiptsSection } from "./cash-receipts/CashReceiptsSection";
import { CreditNotesSection } from "./credit-notes/CreditNotesSection";
import { CustomersSection } from "./customers/CustomersSection";
import { ProductsSection } from "./products/ProductsSection";
import { PurchasesSection } from "./purchases/PurchasesSection";
import { ReportsSection } from "./reports/ReportsSection";
import {
  SalesSection,
  type SalesDraftState
} from "./sales/SalesSection";
import { SettingsSection } from "./settings/SettingsSection";
import { SuppliersSection } from "./suppliers/SuppliersSection";
import type {
  AppSettings,
  CustomerFormErrors,
  CustomerFormState,
  CustomerReceiptRecord,
  CreditNoteAdjustmentType,
  CreditNoteStatus,
  CustomerRecord,
  CreditNoteRecord,
  InventoryAdjustmentRecord,
  InventoryAdjustmentType,
  ProductRecord,
  PurchaseExpenseCategory,
  PurchasePaymentStatus,
  PurchaseRecord,
  ReceivableRecord,
  SaleRecord,
  SectionConfig,
  SupplierFormState,
  SupplierPayableRecord,
  SupplierPayableStatus,
  SupplierPaymentRecord,
  SupplierRecord
} from "../types";

type CustomerSummary = {
  lastSaleLabel: string;
  pendingReceivableMinor: number;
  saleCount: number;
  totalSoldMinor: number;
};

type SectionContentProps = {
  buildCustomerSummary: (input: {
    customer: CustomerRecord;
    receivables: ReceivableRecord[];
    sales: SaleRecord[];
  }) => CustomerSummary;
  compareDueDates: (leftDueAt: string, rightDueAt: string) => number;
  creditNotes: CreditNoteRecord[];
  customerReceipts: CustomerReceiptRecord[];
  customers: CustomerRecord[];
  formatCurrency: (minor: number) => string;
  formatIntegerInput: (value: string) => string;
  formatPayableStatus: (status: SupplierPayableStatus) => string;
  getDueMetadata: (dueAt: string) => DueMetadata;
  inventoryAdjustments: InventoryAdjustmentRecord[];
  isLowStock: (product: ProductRecord) => boolean;
  onCreateCustomer: (input: CustomerFormState) => Promise<CustomerRecord | null>;
  onCreateProduct: (product: ProductRecord) => Promise<boolean>;
  onUpdateProduct: (product: ProductRecord) => Promise<boolean>;
  onCreateSupplier: (input: SupplierFormState) => Promise<SupplierRecord | null>;
  onUpdateSupplier: (
    supplierId: string,
    input: SupplierFormState
  ) => Promise<boolean>;
  onSetSupplierActive: (supplierId: string, active: boolean) => Promise<boolean>;
  onRegisterPurchase: (input: {
    supplier: SupplierRecord;
    branch: string;
    prefix: string;
    concept: string;
    invoiceNumber: string;
    issuedAt: string;
    dueAt: string;
    expenseCategory: PurchaseExpenseCategory;
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
  }) => Promise<boolean>;
  onRegisterPaidSale: (input: {
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
  }) => Promise<string | null>;
  onRegisterPendingSale: (input: {
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
  }) => Promise<string | null>;
  onRegisterCreditNote: (input: {
    sale: SaleRecord;
    adjustmentType: CreditNoteAdjustmentType;
    issuedAt: string;
    reason: string;
    lines: Array<{
      amountMinor: number;
      saleLineId: string;
      quantity: number;
    }>;
  }) => Promise<string | null>;
  onRegisterCustomerReceipt: (input: {
    receivableId: string;
    amountMinor: number;
    concept: string;
    receivedAt: string;
  }) => Promise<string | null>;
  onRegisterInventoryAdjustment: (input: {
    productId: string;
    adjustmentType: InventoryAdjustmentType;
    quantity: number;
    reason: string;
  }) => Promise<string | null>;
  onVoidCustomerReceipt: (receiptId: string) => Promise<string | null>;
  onSetCreditNoteStatus: (
    creditNoteId: string,
    status: CreditNoteStatus
  ) => Promise<void>;
  onUpdateSale: (input: { sale: SaleRecord; dueAt: string }) => Promise<string | null>;
  onDeleteSale: (saleId: string) => Promise<string | null>;
  onRegisterSupplierPayment: (input: {
    payableId: string;
    amountMinor: number;
  }) => Promise<boolean>;
  onValidateCustomer: (
    input: CustomerFormState,
    currentCustomerId?: string | undefined
  ) => CustomerFormErrors;
  onUpdateCustomer: (
    customerId: string,
    input: CustomerFormState
  ) => Promise<boolean>;
  onSetCustomerActive: (customerId: string, active: boolean) => Promise<boolean>;
  onCloseProductForm: () => void;
  onCloseSupplierForm: () => void;
  onSalesDraftChange: Dispatch<SetStateAction<SalesDraftState>>;
  onSettingsChange: (settings: AppSettings) => void;
  parseNonNegativeInteger: (value: string) => number | null;
  productFormVisible: boolean;
  supplierFormVisible: boolean;
  products: ProductRecord[];
  purchases: PurchaseRecord[];
  receivables: ReceivableRecord[];
  sales: SaleRecord[];
  salesDraft: SalesDraftState;
  section: SectionConfig;
  supplierPayables: SupplierPayableRecord[];
  supplierPayments: SupplierPaymentRecord[];
  suppliers: SupplierRecord[];
  settings: AppSettings;
};

export function SectionContent({
  buildCustomerSummary,
  compareDueDates,
  creditNotes,
  customerReceipts,
  customers,
  formatCurrency,
  formatIntegerInput,
  formatPayableStatus,
  getDueMetadata,
  inventoryAdjustments,
  isLowStock,
  onCreateCustomer,
  onCreateProduct,
  onUpdateProduct,
  onCreateSupplier,
  onUpdateSupplier,
  onSetSupplierActive,
  onRegisterPurchase,
  onRegisterPaidSale,
  onRegisterPendingSale,
  onRegisterCreditNote,
  onRegisterCustomerReceipt,
  onRegisterInventoryAdjustment,
  onVoidCustomerReceipt,
  onSetCreditNoteStatus,
  onUpdateSale,
  onDeleteSale,
  onRegisterSupplierPayment,
  onValidateCustomer,
  onUpdateCustomer,
  onSetCustomerActive,
  onCloseProductForm,
  onCloseSupplierForm,
  onSalesDraftChange,
  onSettingsChange,
  parseNonNegativeInteger,
  productFormVisible,
  supplierFormVisible,
  products,
  purchases,
  receivables,
  sales,
  salesDraft,
  section,
  supplierPayables,
  supplierPayments,
  suppliers,
  settings
}: SectionContentProps) {
  if (section.id === "products") {
    return (
      <ProductsSection
        creditNotes={creditNotes}
        formatCurrency={formatCurrency}
        formatIntegerInput={formatIntegerInput}
        formVisible={productFormVisible}
        inventoryAdjustments={inventoryAdjustments}
        isLowStock={isLowStock}
        onCloseForm={onCloseProductForm}
        onCreateProduct={onCreateProduct}
        onRegisterInventoryAdjustment={onRegisterInventoryAdjustment}
        onUpdateProduct={onUpdateProduct}
        parseNonNegativeInteger={parseNonNegativeInteger}
        products={products}
        purchases={purchases}
        sales={sales}
      />
    );
  }

  if (section.id === "purchases") {
    return (
      <PurchasesSection
        formatCurrency={formatCurrency}
        formatIntegerInput={formatIntegerInput}
        onCreateProduct={onCreateProduct}
        onCreateSupplier={onCreateSupplier}
        onRegisterPurchase={onRegisterPurchase}
        parseNonNegativeInteger={parseNonNegativeInteger}
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
        formatCurrency={formatCurrency}
        formatIntegerInput={formatIntegerInput}
        onCreateCustomer={onCreateCustomer}
        onRegisterPaidSale={onRegisterPaidSale}
        onRegisterPendingSale={onRegisterPendingSale}
        onUpdateSale={onUpdateSale}
        onDeleteSale={onDeleteSale}
        onValidateCustomer={onValidateCustomer}
        parseNonNegativeInteger={parseNonNegativeInteger}
        products={products}
        receivables={receivables}
        sales={sales}
        salesDraft={salesDraft}
        onSalesDraftChange={onSalesDraftChange}
        settings={settings}
      />
    );
  }

  if (section.id === "customers") {
    return (
      <CustomersSection
        buildCustomerSummary={buildCustomerSummary}
        customers={customers}
        formatCurrency={formatCurrency}
        onCreateCustomer={onCreateCustomer}
        onSetCustomerActive={onSetCustomerActive}
        onUpdateCustomer={onUpdateCustomer}
        onValidateCustomer={onValidateCustomer}
        receivables={receivables}
        sales={sales}
      />
    );
  }

  if (section.id === "credit-notes") {
    return (
      <CreditNotesSection
        creditNotes={creditNotes}
        formatCurrency={formatCurrency}
        formatIntegerInput={formatIntegerInput}
        onRegisterCreditNote={onRegisterCreditNote}
        onSetCreditNoteStatus={onSetCreditNoteStatus}
        parseNonNegativeInteger={parseNonNegativeInteger}
        sales={sales}
      />
    );
  }

  if (section.id === "cash-receipts") {
    return (
      <CashReceiptsSection
        customerReceipts={customerReceipts}
        formatCurrency={formatCurrency}
        formatIntegerInput={formatIntegerInput}
        onRegisterCustomerReceipt={onRegisterCustomerReceipt}
        onVoidCustomerReceipt={onVoidCustomerReceipt}
        parseNonNegativeInteger={parseNonNegativeInteger}
        receivables={receivables}
      />
    );
  }

  if (section.id === "receivables") {
    return (
      <CarteraDashboardSection
        compareDueDates={compareDueDates}
        formatCurrency={formatCurrency}
        formatIntegerInput={formatIntegerInput}
        formatPayableStatus={formatPayableStatus}
        getDueMetadata={getDueMetadata}
        onRegisterSupplierPayment={onRegisterSupplierPayment}
        parseNonNegativeInteger={parseNonNegativeInteger}
        receivables={receivables}
        supplierPayables={supplierPayables}
      />
    );
  }

  if (section.id === "suppliers") {
    return (
      <SuppliersSection
        formVisible={supplierFormVisible}
        onCloseForm={onCloseSupplierForm}
        onCreateSupplier={onCreateSupplier}
        onSetSupplierActive={onSetSupplierActive}
        onUpdateSupplier={onUpdateSupplier}
        renderPayablesTable={({ supplierPayables, tableLabel }) => (
          <PayablesTable
            formatCurrency={formatCurrency}
            formatIntegerInput={formatIntegerInput}
            formatPayableStatus={formatPayableStatus}
            getDueMetadata={getDueMetadata}
            onRegisterSupplierPayment={onRegisterSupplierPayment}
            parseNonNegativeInteger={parseNonNegativeInteger}
            supplierPayables={supplierPayables}
            tableLabel={tableLabel}
          />
        )}
        supplierPayables={supplierPayables}
        suppliers={suppliers}
      />
    );
  }

  if (section.id === "reports") {
    return (
      <ReportsSection
        creditNotes={creditNotes.filter((creditNote) => creditNote.status === "confirmed")}
        customerReceipts={customerReceipts}
        formatCurrency={formatCurrency}
        purchases={purchases}
        receivables={receivables}
        sales={sales}
        supplierPayables={supplierPayables}
        supplierPayments={supplierPayments}
      />
    );
  }

  if (section.id === "settings") {
    return (
      <SettingsSection
        onSettingsChange={onSettingsChange}
        settings={settings}
      />
    );
  }

  return (
    <section className="section-panel">
      <EmptyState
        body={section.emptyBody}
        className="section-empty"
        title={section.emptyTitle}
      />
    </section>
  );
}

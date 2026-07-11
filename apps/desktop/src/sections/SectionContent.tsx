import type { Dispatch, SetStateAction } from "react";
import { EmptyState } from "../components/EmptyState";
import { PayablesTable } from "../components/PayablesTable";
import type { DueMetadata } from "../lib/dates";
import { CarteraDashboardSection } from "./cartera/CarteraDashboardSection";
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
  CustomerRecord,
  ProductRecord,
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
  customers: CustomerRecord[];
  formatCurrency: (minor: number) => string;
  formatIntegerInput: (value: string) => string;
  formatPayableStatus: (status: SupplierPayableStatus) => string;
  getDueMetadata: (dueAt: string) => DueMetadata;
  isLowStock: (product: ProductRecord) => boolean;
  onCreateCustomer: (input: CustomerFormState) => CustomerRecord;
  onCreateProduct: (product: ProductRecord) => void;
  onCreateSupplier: (input: SupplierFormState) => SupplierRecord;
  onUpdateSupplier: (supplierId: string, input: SupplierFormState) => void;
  onSetSupplierActive: (supplierId: string, active: boolean) => void;
  onRegisterPurchase: (input: {
    supplier: SupplierRecord;
    branch: string;
    prefix: string;
    seller: string;
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
  }) => void;
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
  }) => string | null;
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
  }) => string | null;
  onUpdateSale: (input: { sale: SaleRecord; dueAt: string }) => string | null;
  onDeleteSale: (saleId: string) => void;
  onRegisterSupplierPayment: (input: {
    payableId: string;
    amountMinor: number;
  }) => void;
  onValidateCustomer: (
    input: CustomerFormState,
    currentCustomerId?: string | undefined
  ) => CustomerFormErrors;
  onUpdateCustomer: (customerId: string, input: CustomerFormState) => void;
  onSetCustomerActive: (customerId: string, active: boolean) => void;
  onCloseProductForm: () => void;
  onCloseSupplierForm: () => void;
  onSalesDraftChange: Dispatch<SetStateAction<SalesDraftState>>;
  onSettingsChange: Dispatch<SetStateAction<AppSettings>>;
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
  customers,
  formatCurrency,
  formatIntegerInput,
  formatPayableStatus,
  getDueMetadata,
  isLowStock,
  onCreateCustomer,
  onCreateProduct,
  onCreateSupplier,
  onUpdateSupplier,
  onSetSupplierActive,
  onRegisterPurchase,
  onRegisterPaidSale,
  onRegisterPendingSale,
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
        formatCurrency={formatCurrency}
        formatIntegerInput={formatIntegerInput}
        formVisible={productFormVisible}
        isLowStock={isLowStock}
        onCloseForm={onCloseProductForm}
        onCreateProduct={onCreateProduct}
        parseNonNegativeInteger={parseNonNegativeInteger}
        products={products}
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

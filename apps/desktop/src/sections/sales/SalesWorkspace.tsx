import type { ComponentProps } from "react";
import { SubmenuSwitch } from "../../components/SubmenuSwitch";
import { SalesSection } from "./SalesSection";
import {
  QuotationsSection,
  type QuotationsSectionProps
} from "./QuotationsSection";

type SalesWorkspaceProps = ComponentProps<typeof SalesSection> &
  Pick<
    QuotationsSectionProps,
    | "quotations"
    | "onSaveQuotation"
    | "onDeleteQuotation"
    | "quotationDraft"
    | "onQuotationDraftChange"
  > & {
    salesView: "sales" | "quotations";
    onSalesViewChange: (view: "sales" | "quotations") => void;
  };

export function SalesWorkspace({
  quotations,
  onSaveQuotation,
  onDeleteQuotation,
  quotationDraft,
  onQuotationDraftChange,
  salesView,
  onSalesViewChange,
  ...salesProps
}: SalesWorkspaceProps) {
  return (
    <div className="sales-workspace">
      <SubmenuSwitch
        ariaLabel="Apartados de ventas"
        selectedValue={salesView}
        onSelect={onSalesViewChange}
        items={[
          { value: "sales", label: "Ventas" },
          { value: "quotations", label: "Cotizaciones" }
        ]}
      />
      {salesView === "sales" ? (
        <SalesSection {...salesProps} />
      ) : (
        <QuotationsSection
          customers={salesProps.customers}
          products={salesProps.products}
          settings={salesProps.settings}
          quotations={quotations}
          onSaveQuotation={onSaveQuotation}
          onDeleteQuotation={onDeleteQuotation}
          onCreateCustomer={salesProps.onCreateCustomer}
          onValidateCustomer={salesProps.onValidateCustomer}
          quotationDraft={quotationDraft}
          onQuotationDraftChange={onQuotationDraftChange}
        />
      )}
    </div>
  );
}

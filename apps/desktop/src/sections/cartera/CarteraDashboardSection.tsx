import { useState } from "react";
import { DataTable } from "../../components/DataTable";
import { DataTableHeader } from "../../components/DataTableHeader";
import { EmptyState } from "../../components/EmptyState";
import { PayablesTable } from "../../components/PayablesTable";
import { SummaryCard } from "../../components/SummaryCard";
import type { DueMetadata } from "../../lib/dates";
import type {
  ReceivableRecord,
  SupplierPayableRecord,
  SupplierPayableStatus
} from "../../types";

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

type CarteraDashboardSectionProps = {
  compareDueDates: (leftDueAt: string, rightDueAt: string) => number;
  formatCurrency: (minor: number) => string;
  formatIntegerInput: (value: string) => string;
  formatPayableStatus: (status: SupplierPayableStatus) => string;
  getDueMetadata: (dueAt: string) => DueMetadata;
  onRegisterSupplierPayment: (input: {
    payableId: string;
    amountMinor: number;
  }) => void;
  parseNonNegativeInteger: (value: string) => number | null;
  receivables: ReceivableRecord[];
  supplierPayables: SupplierPayableRecord[];
};

function getOpenPayables(payables: SupplierPayableRecord[]): SupplierPayableRecord[] {
  return payables.filter((payable) => payable.balanceMinor > 0);
}

export function CarteraDashboardSection({
  compareDueDates,
  formatCurrency,
  formatIntegerInput,
  formatPayableStatus,
  getDueMetadata,
  onRegisterSupplierPayment,
  parseNonNegativeInteger,
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
        <SummaryCard
          label="Total por cobrar"
          value={formatCurrency(receivablesTotal)}
        />
        <SummaryCard label="Total por pagar" value={formatCurrency(payablesTotal)} />
        <SummaryCard label="Facturas vencidas" value={String(overdueCount)} />
        <SummaryCard label="Proximas a vencer" value={String(upcomingCount)} />
      </div>

      <CarteraAlerts formatCurrency={formatCurrency} items={alertItems} />

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
        <ReceivablesTable
          formatCurrency={formatCurrency}
          getDueMetadata={getDueMetadata}
          receivables={sortedReceivables}
        />
      ) : (
        <PayablesTable
          formatCurrency={formatCurrency}
          formatIntegerInput={formatIntegerInput}
          formatPayableStatus={formatPayableStatus}
          getDueMetadata={getDueMetadata}
          onRegisterSupplierPayment={onRegisterSupplierPayment}
          parseNonNegativeInteger={parseNonNegativeInteger}
          supplierPayables={sortedPayables}
        />
      )}
    </section>
  );
}

function CarteraAlerts({
  formatCurrency,
  items
}: {
  formatCurrency: (minor: number) => string;
  items: CarteraAlertItem[];
}) {
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
  formatCurrency: (minor: number) => string;
  getDueMetadata: (dueAt: string) => DueMetadata;
  receivables: ReceivableRecord[];
};

function ReceivablesTable({
  formatCurrency,
  getDueMetadata,
  receivables
}: ReceivablesTableProps) {
  if (receivables.length === 0) {
    return (
      <EmptyState
        body="Las ventas pendientes de pago apareceran aqui."
        className="section-empty"
        title="Sin cartera por cobrar"
      />
    );
  }

  return (
    <DataTable ariaLabel="Cartera por cobrar">
      <DataTableHeader
        labels={["Cliente", "Venta", "Vence", "Saldo", "Rango", "Alerta", "Estado"]}
      />
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
    </DataTable>
  );
}

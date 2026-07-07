import { useState, type FormEvent } from "react";
import { DataTable } from "./DataTable";
import { DataTableHeader } from "./DataTableHeader";
import { EmptyState } from "./EmptyState";
import { SecondaryActionButton } from "./SecondaryActionButton";
import { SummaryCard } from "./SummaryCard";
import { TextField } from "./TextField";
import type { DueMetadata } from "../lib/dates";
import type { SupplierPayableRecord, SupplierPayableStatus } from "../types";

type SupplierPaymentFormState = {
  payableId: string;
  amount: string;
};

type SupplierPaymentFormErrors = {
  amount?: string | undefined;
};

type PayablesTableProps = {
  formatCurrency: (minor: number) => string;
  formatIntegerInput: (value: string) => string;
  formatPayableStatus: (status: SupplierPayableStatus) => string;
  getDueMetadata: (dueAt: string) => DueMetadata;
  onRegisterSupplierPayment: (input: {
    payableId: string;
    amountMinor: number;
  }) => void;
  parseNonNegativeInteger: (value: string) => number | null;
  supplierPayables: SupplierPayableRecord[];
  tableLabel?: string;
};

export function PayablesTable({
  formatCurrency,
  formatIntegerInput,
  formatPayableStatus,
  getDueMetadata,
  onRegisterSupplierPayment,
  parseNonNegativeInteger,
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
      <EmptyState
        body="Las facturas pendientes de proveedor apareceran aqui."
        className="section-empty"
        title="Sin cartera por pagar"
      />
    );
  }

  return (
    <>
      <DataTable ariaLabel={tableLabel}>
        <DataTableHeader
          labels={[
            "Proveedor",
            "Factura",
            "Vence",
            "Original",
            "Abonado",
            "Saldo",
            "Rango",
            "Alerta",
            "Estado",
            "Accion"
          ]}
        />
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
                    <SecondaryActionButton
                      onClick={() => openPaymentForm(payable.id)}
                      variant="compact"
                    >
                      Registrar abono
                    </SecondaryActionButton>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </DataTable>

      {selectedPayable ? (
        <form className="supplier-payment-form" onSubmit={submitPayment}>
          <SummaryCard compact>
            <span>{selectedPayable.supplierName}</span>
            <strong>Saldo {formatCurrency(selectedPayable.balanceMinor)}</strong>
          </SummaryCard>
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

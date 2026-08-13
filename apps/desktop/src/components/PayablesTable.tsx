import { useState, type FormEvent } from "react";
import { DataTable } from "./DataTable";
import { DataTableHeader } from "./DataTableHeader";
import { EmptyState } from "./EmptyState";
import { FormActions } from "./FormActions";
import { PrimaryActionButton } from "./PrimaryActionButton";
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

type SupplierPayableDeleteNotice = {
  kind: "error" | "success";
  message: string;
};

type PayablesTableProps = {
  formatCurrency: (minor: number) => string;
  formatIntegerInput: (value: string) => string;
  formatPayableStatus: (status: SupplierPayableStatus) => string;
  getDueMetadata: (dueAt: string) => DueMetadata;
  onDeleteSupplierPayable?: ((payableId: string) => Promise<string | null>) | undefined;
  onRegisterSupplierPayment: (input: {
    payableId: string;
    amountMinor: number;
  }) => Promise<boolean>;
  parseNonNegativeInteger: (value: string) => number | null;
  supplierPayables: SupplierPayableRecord[];
  tableLabel?: string;
};

export function PayablesTable({
  formatCurrency,
  formatIntegerInput,
  formatPayableStatus,
  getDueMetadata,
  onDeleteSupplierPayable,
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
  const [deleteCandidate, setDeleteCandidate] =
    useState<SupplierPayableRecord | null>(null);
  const [deleteNotice, setDeleteNotice] =
    useState<SupplierPayableDeleteNotice | null>(null);
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

  async function submitPayment(event: FormEvent<HTMLFormElement>) {
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

    const saved = await onRegisterSupplierPayment({
      amountMinor: amount,
      payableId: selectedPayable.id
    });
    if (!saved) {
      setErrors({ amount: "No se pudo guardar el abono." });
      return;
    }

    setForm({ amount: "", payableId: "" });
    setErrors({});
  }

  async function confirmPayableDeletion() {
    if (!deleteCandidate || !onDeleteSupplierPayable) {
      return;
    }

    const deletedPayable = deleteCandidate;
    const deleteError = await onDeleteSupplierPayable(deletedPayable.id);

    if (deleteError) {
      setDeleteNotice({ kind: "error", message: deleteError });
      return;
    }

    setDeleteCandidate(null);
    setDeleteNotice({
      kind: "success",
      message: `Cuenta por pagar ${deletedPayable.invoiceNumber} eliminada.`
    });

    if (form.payableId === deletedPayable.id) {
      setForm({ amount: "", payableId: "" });
      setErrors({});
    }
  }

  if (supplierPayables.length === 0) {
    return (
      <>
        {deleteNotice ? (
          <p
            className={deleteNotice.kind === "error" ? "form-error" : "form-success"}
            role={deleteNotice.kind === "error" ? "alert" : "status"}
          >
            {deleteNotice.message}
          </p>
        ) : null}
        <EmptyState
          body="Las facturas pendientes de proveedor apareceran aqui."
          className="section-empty"
          title="Sin cartera por pagar"
        />
      </>
    );
  }

  return (
    <>
      <DataTable ariaLabel={tableLabel} className="payables-table">
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
                <td className="payables-actions-cell">
                  <div className="table-inline-actions payables-row-actions">
                    {payable.balanceMinor > 0 ? (
                      <SecondaryActionButton
                        aria-label="Registrar abono"
                        onClick={() => openPaymentForm(payable.id)}
                        variant="compact"
                      >
                        Abonar
                      </SecondaryActionButton>
                    ) : null}
                    {onDeleteSupplierPayable ? (
                      <SecondaryActionButton
                        aria-label="Eliminar cartera"
                        className="danger-action"
                        onClick={() => {
                          setDeleteCandidate(payable);
                          setDeleteNotice(null);
                        }}
                        variant="compact"
                      >
                        Eliminar
                      </SecondaryActionButton>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </DataTable>

      {deleteNotice ? (
        <p
          className={deleteNotice.kind === "error" ? "form-error" : "form-success"}
          role={deleteNotice.kind === "error" ? "alert" : "status"}
        >
          {deleteNotice.message}
        </p>
      ) : null}

      {deleteCandidate ? (
        <section
          aria-label="Confirmar eliminacion de cuenta por pagar"
          className="product-delete-confirmation section-surface"
        >
          <div>
            <h2>Confirmar eliminacion</h2>
            <p>
              Se quitara la factura {deleteCandidate.invoiceNumber} de cartera por
              pagar. Si ya tiene abonos registrados, no se eliminara.
            </p>
          </div>
          <FormActions>
            <SecondaryActionButton
              onClick={() => setDeleteCandidate(null)}
              type="button"
              variant="compact"
            >
              Cancelar
            </SecondaryActionButton>
            <PrimaryActionButton onClick={confirmPayableDeletion} type="button">
              Confirmar eliminacion
            </PrimaryActionButton>
          </FormActions>
        </section>
      ) : null}

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
          <FormActions>
            <PrimaryActionButton type="submit">Guardar abono</PrimaryActionButton>
          </FormActions>
        </form>
      ) : null}
    </>
  );
}

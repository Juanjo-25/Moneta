import { Fragment, useState, type FormEvent } from "react";
import { DataTable } from "../../components/DataTable";
import { DataTableHeader } from "../../components/DataTableHeader";
import { EmptyState } from "../../components/EmptyState";
import { FormActions } from "../../components/FormActions";
import { PrimaryActionButton } from "../../components/PrimaryActionButton";
import { SecondaryActionButton } from "../../components/SecondaryActionButton";
import { SummaryCard } from "../../components/SummaryCard";
import { TextField } from "../../components/TextField";
import type { CustomerReceiptRecord, ReceivableRecord } from "../../types";

type CashReceiptFormState = {
  amount: string;
  concept: string;
  receivableId: string;
  receivedAt: string;
};

type CashReceiptFormErrors = {
  amount?: string | undefined;
  receivableId?: string | undefined;
  receivedAt?: string | undefined;
  submit?: string | undefined;
};

type CashReceiptsSectionProps = {
  customerReceipts: CustomerReceiptRecord[];
  formatCurrency: (minor: number) => string;
  formatIntegerInput: (value: string) => string;
  onRegisterCustomerReceipt: (input: {
    receivableId: string;
    amountMinor: number;
    concept: string;
    receivedAt: string;
  }) => Promise<string | null>;
  onVoidCustomerReceipt: (receiptId: string) => Promise<string | null>;
  parseNonNegativeInteger: (value: string) => number | null;
  receivables: ReceivableRecord[];
};

const emptyReceiptForm: CashReceiptFormState = {
  amount: "",
  concept: "Abono cartera cliente",
  receivableId: "",
  receivedAt: getTodayInputValue()
};

export function CashReceiptsSection({
  customerReceipts,
  formatCurrency,
  formatIntegerInput,
  onRegisterCustomerReceipt,
  onVoidCustomerReceipt,
  parseNonNegativeInteger,
  receivables
}: CashReceiptsSectionProps) {
  const [form, setForm] = useState<CashReceiptFormState>(emptyReceiptForm);
  const [errors, setErrors] = useState<CashReceiptFormErrors>({});
  const [receiptActionError, setReceiptActionError] = useState<string | null>(null);
  const selectedReceivable =
    receivables.find((receivable) => receivable.id === form.receivableId) ?? null;
  const openReceivablesTotal = receivables.reduce(
    (total, receivable) => total + receivable.balanceMinor,
    0
  );
  const activeReceipts = customerReceipts.filter((receipt) => receipt.active);
  const receiptsTotal = activeReceipts.reduce(
    (total, receipt) => total + receipt.amountMinor,
    0
  );

  function updateField(field: keyof CashReceiptFormState, value: string) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: field === "amount" ? formatIntegerInput(value) : value
    }));
    setErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
  }

  async function submitReceipt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const amountMinor = parseNonNegativeInteger(form.amount);
    const nextErrors: CashReceiptFormErrors = {};

    if (!selectedReceivable) {
      nextErrors.receivableId = "Debes seleccionar una cuenta por cobrar.";
    }
    if (form.receivedAt.trim() === "") {
      nextErrors.receivedAt = "La fecha del recibo es obligatoria.";
    }
    if (amountMinor === null || amountMinor <= 0) {
      nextErrors.amount = "El valor recibido debe ser mayor a cero.";
    } else if (selectedReceivable && amountMinor > selectedReceivable.balanceMinor) {
      nextErrors.amount = "El recibo no puede superar el saldo pendiente.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0 || amountMinor === null) {
      return;
    }

    const submitError = await onRegisterCustomerReceipt({
      amountMinor,
      concept: form.concept,
      receivableId: form.receivableId,
      receivedAt: form.receivedAt
    });

    if (submitError) {
      setErrors({ submit: submitError });
      return;
    }

    setForm(emptyReceiptForm);
    setErrors({});
  }

  async function voidReceipt(receiptId: string) {
    setReceiptActionError(null);
    const actionError = await onVoidCustomerReceipt(receiptId);

    if (actionError) {
      setReceiptActionError(actionError);
    }
  }

  return (
    <section className="cash-receipts-layout">
      <section className="metric-grid" aria-label="Resumen recibos de caja">
        <SummaryCard
          label="Cartera abierta"
          value={formatCurrency(openReceivablesTotal)}
        />
        <SummaryCard
          label="Recibos activos"
          value={String(activeReceipts.length)}
        />
        <SummaryCard
          label="Total recibido"
          value={formatCurrency(receiptsTotal)}
        />
      </section>

      <section className="section-panel">
        <form className="document-form" onSubmit={submitReceipt}>
          <label className="field" htmlFor="cash-receipt-receivable">
            <span>Cuenta por cobrar</span>
            <select
              aria-label="Cuenta por cobrar"
              id="cash-receipt-receivable"
              onChange={(event) => updateField("receivableId", event.target.value)}
              value={form.receivableId}
            >
              <option value="">Selecciona una cuenta</option>
              {receivables.map((receivable) => (
                <option key={receivable.id} value={receivable.id}>
                  {receivable.customerName} - {receivable.saleId} -{" "}
                  {formatCurrency(receivable.balanceMinor)}
                </option>
              ))}
            </select>
            {errors.receivableId ? (
              <small className="field-error">{errors.receivableId}</small>
            ) : null}
          </label>

          <TextField
            error={errors.receivedAt}
            label="Fecha recibo"
            onChange={(value) => updateField("receivedAt", value)}
            type="date"
            value={form.receivedAt}
          />
          <TextField
            error={errors.amount}
            inputMode="numeric"
            label="Valor recibido"
            onChange={(value) => updateField("amount", value)}
            value={form.amount}
          />
          <TextField
            label="Concepto"
            onChange={(value) => updateField("concept", value)}
            value={form.concept}
          />

          {selectedReceivable ? (
            <SummaryCard compact>
              <span>{selectedReceivable.customerName}</span>
              <strong>Saldo {formatCurrency(selectedReceivable.balanceMinor)}</strong>
            </SummaryCard>
          ) : null}

          {errors.submit ? <p className="form-error">{errors.submit}</p> : null}

          <FormActions>
            <PrimaryActionButton type="submit">Guardar recibo</PrimaryActionButton>
          </FormActions>
        </form>
      </section>

      <OpenReceivablesTable
        formatCurrency={formatCurrency}
        receivables={receivables}
      />
      <CashReceiptsTable
        customerReceipts={customerReceipts}
        formatCurrency={formatCurrency}
        onVoidReceipt={voidReceipt}
        receiptActionError={receiptActionError}
      />
    </section>
  );
}

function OpenReceivablesTable({
  formatCurrency,
  receivables
}: {
  formatCurrency: (minor: number) => string;
  receivables: ReceivableRecord[];
}) {
  if (receivables.length === 0) {
    return (
      <EmptyState
        body="No hay cuentas por cobrar abiertas para aplicar recibos."
        className="section-empty"
        title="Sin cartera abierta"
      />
    );
  }

  return (
    <DataTable ariaLabel="Cartera abierta para recibos">
      <DataTableHeader
        labels={["Cliente", "Venta", "Original", "Recibido", "Saldo", "Vence"]}
      />
      <tbody>
        {receivables.map((receivable) => (
          <tr key={receivable.id}>
            <td>{receivable.customerName}</td>
            <td>{receivable.saleId}</td>
            <td>{formatCurrency(receivable.originalAmountMinor)}</td>
            <td>{formatCurrency(receivable.paidAmountMinor)}</td>
            <td>{formatCurrency(receivable.balanceMinor)}</td>
            <td>{receivable.dueAt || "Sin vencimiento"}</td>
          </tr>
        ))}
      </tbody>
    </DataTable>
  );
}

function CashReceiptsTable({
  customerReceipts,
  formatCurrency,
  onVoidReceipt,
  receiptActionError
}: {
  customerReceipts: CustomerReceiptRecord[];
  formatCurrency: (minor: number) => string;
  onVoidReceipt: (receiptId: string) => Promise<void>;
  receiptActionError: string | null;
}) {
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);

  if (customerReceipts.length === 0) {
    return (
      <EmptyState
        body="Los pagos registrados por clientes quedaran disponibles para consulta."
        className="section-empty"
        title="Sin recibos de caja"
      />
    );
  }

  return (
    <>
      {receiptActionError ? <p className="form-error">{receiptActionError}</p> : null}
      <DataTable ariaLabel="Recibos de caja registrados">
        <DataTableHeader
          labels={[
            "Recibo",
            "Fecha",
            "Cliente",
            "Venta",
            "Concepto",
            "Estado",
            "Valor",
            "Accion"
          ]}
        />
        <tbody>
          {customerReceipts.map((receipt) => {
            const isSelected = selectedReceiptId === receipt.id;

            return (
              <Fragment key={receipt.id}>
                <tr>
                  <td>{receipt.number}</td>
                  <td>{receipt.receivedAt}</td>
                  <td>{receipt.customerName}</td>
                  <td>{receipt.saleId}</td>
                  <td>{receipt.concept}</td>
                  <td>
                    {receipt.active ? "Activo" : `Anulado ${receipt.voidedAtLabel}`}
                  </td>
                  <td>{formatCurrency(receipt.amountMinor)}</td>
                  <td>
                    <SecondaryActionButton
                      onClick={() =>
                        setSelectedReceiptId(isSelected ? null : receipt.id)
                      }
                      variant="compact"
                    >
                      Detalle
                    </SecondaryActionButton>
                    {receipt.active ? (
                      <SecondaryActionButton
                        onClick={() => void onVoidReceipt(receipt.id)}
                        variant="compact"
                      >
                        Anular
                      </SecondaryActionButton>
                    ) : null}
                  </td>
                </tr>
                {isSelected ? (
                  <tr className="cash-receipt-detail-row">
                    <td colSpan={8}>
                      <CashReceiptDetailPanel
                        formatCurrency={formatCurrency}
                        onClose={() => setSelectedReceiptId(null)}
                        receipt={receipt}
                      />
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </DataTable>
    </>
  );
}

function CashReceiptDetailPanel({
  formatCurrency,
  onClose,
  receipt
}: {
  formatCurrency: (minor: number) => string;
  onClose: () => void;
  receipt: CustomerReceiptRecord;
}) {
  const balanceAfterReceipt = Math.max(
    receipt.receivableBalanceMinorBefore - receipt.amountMinor,
    0
  );

  return (
    <section
      aria-label={`Detalle historico ${receipt.number}`}
      className="cash-receipt-detail"
    >
      <div className="credit-note-review-heading">
        <div>
          <span>Detalle historico</span>
          <strong>{receipt.number}</strong>
        </div>
        <div className="credit-note-review-actions">
          <SecondaryActionButton onClick={onClose} variant="compact">
            Cerrar
          </SecondaryActionButton>
        </div>
      </div>

      <div className="credit-note-impact-grid">
        <div>
          <span>Estado</span>
          <strong>{receipt.active ? "Activo" : "Anulado"}</strong>
          <small>{receipt.active ? receipt.receivedAtLabel : receipt.voidedAtLabel}</small>
        </div>
        <div>
          <span>Cliente</span>
          <strong>{receipt.customerName}</strong>
          <small>{receipt.saleId}</small>
        </div>
        <div>
          <span>Valor recibido</span>
          <strong>{formatCurrency(receipt.amountMinor)}</strong>
          <small>{receipt.receivedAt}</small>
        </div>
        <div>
          <span>Cartera antes</span>
          <strong>{formatCurrency(receipt.receivableBalanceMinorBefore)}</strong>
          <small>Pagado antes {formatCurrency(receipt.receivablePaidAmountMinorBefore)}</small>
        </div>
        <div>
          <span>Cartera despues</span>
          <strong>
            {receipt.active
              ? formatCurrency(balanceAfterReceipt)
              : formatCurrency(receipt.receivableBalanceMinorBefore)}
          </strong>
          <small>
            {receipt.active
              ? "Saldo aplicado por el recibo."
              : "Saldo restaurado por anulacion."}
          </small>
        </div>
        <div>
          <span>Concepto</span>
          <strong>{receipt.concept}</strong>
          <small>{receipt.receivableDueAt || "Sin vencimiento"}</small>
        </div>
      </div>
    </section>
  );
}

function getTodayInputValue(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

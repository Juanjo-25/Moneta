import {
  Fragment,
  useEffect,
  useMemo,
  useState,
  type FormEvent
} from "react";
import { DataTable } from "../../components/DataTable";
import { DataTableHeader } from "../../components/DataTableHeader";
import { EmptyState } from "../../components/EmptyState";
import { FormActions } from "../../components/FormActions";
import { PrimaryActionButton } from "../../components/PrimaryActionButton";
import { SecondaryActionButton } from "../../components/SecondaryActionButton";
import { SummaryCard } from "../../components/SummaryCard";
import { TextField } from "../../components/TextField";
import type {
  CreditNoteAdjustmentType,
  CreditNoteRecord,
  CreditNoteStatus,
  SaleLineRecord,
  SaleRecord
} from "../../types";

type CreditNotesSectionProps = {
  creditNotes: CreditNoteRecord[];
  formatCurrency: (minor: number) => string;
  formatIntegerInput: (value: string) => string;
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
  }) => string | null;
  onSetCreditNoteStatus: (
    creditNoteId: string,
    status: CreditNoteStatus
  ) => void;
  parseNonNegativeInteger: (value: string) => number | null;
  sales: SaleRecord[];
};

type CreditNoteFormState = {
  adjustmentType: CreditNoteAdjustmentType;
  issuedAt: string;
  reason: string;
  saleId: string;
};

type CreditNoteFormErrors = {
  issuedAt?: string | undefined;
  lines?: string | undefined;
  saleId?: string | undefined;
  submit?: string | undefined;
};

const creditNoteReasonsByType: Record<CreditNoteAdjustmentType, string[]> = {
  discount: [
    "Rebaja o descuento parcial o total",
    "Ajuste de precio",
    "Descuento comercial por pronto pago",
    "Descuento comercial por volumen de ventas"
  ],
  return: [
    "Devolución de parte de los bienes; no aceptación de partes del servicio"
  ]
};

const emptyCreditNoteForm: CreditNoteFormState = {
  adjustmentType: "return",
  issuedAt: getTodayInputValue(),
  reason: creditNoteReasonsByType.return[0]!,
  saleId: ""
};

export function CreditNotesSection({
  creditNotes,
  formatCurrency,
  formatIntegerInput,
  onRegisterCreditNote,
  onSetCreditNoteStatus,
  parseNonNegativeInteger,
  sales
}: CreditNotesSectionProps) {
  const [form, setForm] = useState<CreditNoteFormState>(emptyCreditNoteForm);
  const [lineAmounts, setLineAmounts] = useState<Record<string, string>>({});
  const [lineQuantities, setLineQuantities] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<CreditNoteFormErrors>({});
  const [reviewCreditNoteId, setReviewCreditNoteId] = useState<string | null>(null);
  const selectedSale = sales.find((sale) => sale.id === form.saleId) ?? null;
  const creditBalanceByLine = useMemo(
    () => buildCreditBalanceByLine(creditNotes, selectedSale?.id ?? ""),
    [creditNotes, selectedSale?.id]
  );
  const availableLines =
    selectedSale?.lines.map((line) => {
      const creditedAmountMinor = creditBalanceByLine.amountByLine.get(line.id) ?? 0;
      const creditedQuantity = creditBalanceByLine.quantityByLine.get(line.id) ?? 0;
      const availableAmountMinor = line.totalMinor - creditedAmountMinor;
      const unitTotalMinor = line.totalMinor / line.quantity;

      return {
        ...line,
        availableAmountMinor,
        availableQuantity: Math.min(
          line.quantity - creditedQuantity,
          Math.floor(availableAmountMinor / unitTotalMinor)
        ),
        creditedAmountMinor,
        creditedQuantity
      };
    }) ?? [];
  const selectedCreditLines = selectedSale
    ? availableLines
        .map((line) => {
          if (form.adjustmentType === "discount") {
            const amountMinor = parseNonNegativeInteger(lineAmounts[line.id] ?? "");

            return amountMinor && amountMinor > 0
              ? {
                  amountMinor,
                  line,
                  quantity: 0,
                  totalMinor: amountMinor
                }
              : null;
          }

          const quantity = parseNonNegativeInteger(lineQuantities[line.id] ?? "");

          return quantity && quantity > 0
            ? {
                amountMinor: calculateCreditLineTotal(line, quantity),
                line,
                quantity,
                totalMinor: calculateCreditLineTotal(line, quantity)
              }
            : null;
        })
        .filter((line): line is NonNullable<typeof line> => line !== null)
    : [];
  const creditTotalMinor = selectedCreditLines.reduce(
    (total, line) => total + line.totalMinor,
    0
  );
  const totalCreditedMinor = creditNotes.reduce(
    (total, creditNote) => total + creditNote.totalMinor,
    0
  );
  const reasonOptions = creditNoteReasonsByType[form.adjustmentType];

  useEffect(() => {
    setLineAmounts({});
    setLineQuantities({});
    setErrors({});
  }, [form.adjustmentType, form.saleId]);

  function updateField(field: keyof CreditNoteFormState, value: string) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
    setErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
  }

  function updateAdjustmentType(adjustmentType: CreditNoteAdjustmentType) {
    setForm((currentForm) => ({
      ...currentForm,
      adjustmentType,
      reason: creditNoteReasonsByType[adjustmentType][0]!
    }));
    setErrors((currentErrors) => ({ ...currentErrors, lines: undefined }));
  }

  function updateLineQuantity(lineId: string, value: string) {
    setLineQuantities((currentQuantities) => ({
      ...currentQuantities,
      [lineId]: formatIntegerInput(value)
    }));
    setErrors((currentErrors) => ({
      ...currentErrors,
      lines: undefined,
      submit: undefined
    }));
  }

  function updateLineAmount(lineId: string, value: string) {
    setLineAmounts((currentAmounts) => ({
      ...currentAmounts,
      [lineId]: formatIntegerInput(value)
    }));
    setErrors((currentErrors) => ({
      ...currentErrors,
      lines: undefined,
      submit: undefined
    }));
  }

  function submitCreditNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: CreditNoteFormErrors = {};

    if (!selectedSale) {
      nextErrors.saleId = "Debes seleccionar una venta.";
    }
    if (form.issuedAt.trim() === "") {
      nextErrors.issuedAt = "La fecha de la nota credito es obligatoria.";
    }
    if (selectedCreditLines.length === 0) {
      nextErrors.lines =
        form.adjustmentType === "discount"
          ? "Debes acreditar al menos un valor."
          : "Debes acreditar al menos una cantidad.";
    }

    const invalidLine = selectedCreditLines.find(({ amountMinor, line, quantity }) =>
      form.adjustmentType === "discount"
        ? amountMinor > line.availableAmountMinor
        : quantity > line.availableQuantity
    );

    if (invalidLine) {
      nextErrors.lines =
        form.adjustmentType === "discount"
          ? "El valor a acreditar supera lo disponible."
          : "La cantidad a acreditar supera lo disponible.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0 || !selectedSale) {
      return;
    }

    const submitError = onRegisterCreditNote({
      adjustmentType: form.adjustmentType,
      issuedAt: form.issuedAt.trim(),
      lines: selectedCreditLines.map(({ amountMinor, line, quantity }) => ({
        amountMinor,
        quantity,
        saleLineId: line.id
      })),
      reason: form.reason.trim(),
      sale: selectedSale
    });

    if (submitError) {
      setErrors({ submit: submitError });
      return;
    }

    setForm(emptyCreditNoteForm);
    setLineQuantities({});
    setErrors({});
  }

  return (
    <section className="credit-notes-layout">
      <section className="cartera-summary-shell" aria-label="Resumen notas credito">
        <div className="cartera-summary">
          <SummaryCard
            label="Notas emitidas"
            value={String(creditNotes.length)}
          />
          <SummaryCard
            label="Confirmadas"
            value={String(
              creditNotes.filter((creditNote) => creditNote.status === "confirmed")
                .length
            )}
          />
          <SummaryCard
            label="Total acreditado"
            value={formatCurrency(
              creditNotes
                .filter((creditNote) => creditNote.status === "confirmed")
                .reduce((total, creditNote) => total + creditNote.totalMinor, 0)
            )}
          />
          <SummaryCard
            label="Total de esta nota"
            value={formatCurrency(creditTotalMinor)}
          />
        </div>
      </section>

      <form className="credit-note-form" onSubmit={submitCreditNote}>
        <section className="document-header" aria-label="Encabezado nota credito">
          <div className="document-header-grid">
            <label className="field" htmlFor="venta-nota-credito">
              <span>Venta acreditada</span>
              <select
                aria-invalid={Boolean(errors.saleId)}
                id="venta-nota-credito"
                onChange={(event) => updateField("saleId", event.target.value)}
                value={form.saleId}
              >
                <option value="">Selecciona una venta</option>
                {sales.map((sale) => (
                  <option key={sale.id} value={sale.id}>
                    {sale.invoiceNumber} - {sale.customerName}
                  </option>
                ))}
              </select>
              {errors.saleId ? <small>{errors.saleId}</small> : null}
            </label>
            <TextField
              error={errors.issuedAt}
              label="Fecha nota credito"
              onChange={(value) => updateField("issuedAt", value)}
              type="date"
              value={form.issuedAt}
            />
            <label className="field" htmlFor="tipo-nota-credito">
              <span>Tipo de ajuste</span>
              <select
                id="tipo-nota-credito"
                onChange={(event) =>
                  updateAdjustmentType(event.target.value as CreditNoteAdjustmentType)
                }
                value={form.adjustmentType}
              >
                <option value="return">Devolución de productos</option>
                <option value="discount">Descuento / ajuste de valor</option>
              </select>
            </label>
            <label className="field" htmlFor="motivo-nota-credito">
              <span>Motivo</span>
              <select
                id="motivo-nota-credito"
                onChange={(event) => updateField("reason", event.target.value)}
                value={form.reason}
              >
                {reasonOptions.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
            </label>
            <TextField
              label="Cliente"
              onChange={() => undefined}
              placeholder="Se completa al elegir la venta"
              readOnly
              value={selectedSale?.customerName ?? ""}
            />
          </div>
        </section>

        <section className="document-lines" aria-label="Detalle nota credito">
          <div className="document-lines-heading">
            <h2>Detalle a acreditar</h2>
            <span>
              {form.adjustmentType === "discount"
                ? "Ingresa el valor que reduce la venta sin mover inventario."
                : "Selecciona las cantidades que regresan al inventario."}
            </span>
          </div>

          {selectedSale ? (
            <DataTable ariaLabel="Lineas disponibles para nota credito">
              <DataTableHeader
                labels={[
                  "Producto",
                  "Vendido",
                  "Acreditado",
                  "Disponible",
                  form.adjustmentType === "discount" ? "Valor nota" : "Cantidad nota",
                  "Total nota"
                ]}
              />
              <tbody>
                {availableLines.map((line) => {
                  const parsedQuantity =
                    parseNonNegativeInteger(lineQuantities[line.id] ?? "") ?? 0;

                  return (
                    <tr key={line.id}>
                      <td>{line.productName}</td>
                      <td>{line.quantity}</td>
                      <td>
                        {form.adjustmentType === "discount"
                          ? formatCurrency(line.creditedAmountMinor)
                          : line.creditedQuantity}
                      </td>
                      <td>
                        {form.adjustmentType === "discount"
                          ? formatCurrency(line.availableAmountMinor)
                          : line.availableQuantity}
                      </td>
                      <td>
                        {form.adjustmentType === "discount" ? (
                          <input
                            aria-label={`Valor a acreditar ${line.productName}`}
                            inputMode="numeric"
                            onChange={(event) =>
                              updateLineAmount(line.id, event.target.value)
                            }
                            value={lineAmounts[line.id] ?? ""}
                          />
                        ) : (
                          <input
                            aria-label={`Cantidad a acreditar ${line.productName}`}
                            inputMode="numeric"
                            onChange={(event) =>
                              updateLineQuantity(line.id, event.target.value)
                            }
                            value={lineQuantities[line.id] ?? ""}
                          />
                        )}
                      </td>
                      <td>
                        {formatCurrency(
                          form.adjustmentType === "discount"
                            ? parseNonNegativeInteger(lineAmounts[line.id] ?? "") ?? 0
                            : calculateCreditLineTotal(line, parsedQuantity)
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </DataTable>
          ) : (
            <EmptyState
              body="Selecciona una venta para ver sus productos disponibles."
              className="section-empty"
              title="Sin venta seleccionada"
            />
          )}

          {errors.lines ? <p className="form-error">{errors.lines}</p> : null}
          {errors.submit ? <p className="form-error">{errors.submit}</p> : null}
        </section>

        <SummaryCard compact>
          <span>Lineas acreditadas {selectedCreditLines.length}</span>
          <span>
            {form.adjustmentType === "discount"
              ? "Sin movimiento de inventario"
              : "Devuelve inventario"}
          </span>
          <strong>Total nota {formatCurrency(creditTotalMinor)}</strong>
        </SummaryCard>

        <FormActions>
          <PrimaryActionButton type="submit">Registrar nota credito</PrimaryActionButton>
        </FormActions>
      </form>

      {creditNotes.length > 0 ? (
        <DataTable ariaLabel="Notas credito registradas">
          <DataTableHeader
            labels={[
              "Fecha",
              "Numero",
              "Venta",
              "Cliente",
              "Motivo",
              "Tipo",
              "Estado",
              "Lineas",
              "Total",
              "Acciones"
            ]}
          />
          <tbody>
            {creditNotes.map((creditNote) => {
              const relatedSale =
                sales.find((sale) => sale.id === creditNote.saleId) ?? null;
              const isReviewing = reviewCreditNoteId === creditNote.id;

              return (
                <Fragment key={creditNote.id}>
                  <tr>
                    <td>{creditNote.occurredAtLabel}</td>
                    <td>{creditNote.number}</td>
                    <td>{creditNote.invoiceNumber}</td>
                    <td>{creditNote.customerName}</td>
                    <td>{creditNote.reason}</td>
                    <td>
                      {creditNote.adjustmentType === "discount"
                        ? "Descuento"
                        : "Devolución"}
                    </td>
                    <td>{formatCreditNoteStatus(creditNote.status)}</td>
                    <td>{creditNote.lines.length}</td>
                    <td>{formatCurrency(creditNote.totalMinor)}</td>
                    <td>
                      {creditNote.status === "draft" ? (
                        <PrimaryActionButton
                          onClick={() =>
                            setReviewCreditNoteId(isReviewing ? null : creditNote.id)
                          }
                        >
                          Revisar
                        </PrimaryActionButton>
                      ) : null}
                      {creditNote.status === "confirmed" ? (
                        <SecondaryActionButton
                          onClick={() => onSetCreditNoteStatus(creditNote.id, "void")}
                          variant="compact"
                        >
                          Anular
                        </SecondaryActionButton>
                      ) : null}
                    </td>
                  </tr>
                  {isReviewing ? (
                    <tr className="credit-note-review-row">
                      <td colSpan={10}>
                        <CreditNoteReviewPanel
                          creditNote={creditNote}
                          formatCurrency={formatCurrency}
                          onCancel={() => setReviewCreditNoteId(null)}
                          onConfirm={() => {
                            onSetCreditNoteStatus(creditNote.id, "confirmed");
                            setReviewCreditNoteId(null);
                          }}
                          salePaymentStatus={relatedSale?.paymentStatus ?? "paid"}
                        />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </DataTable>
      ) : (
        <EmptyState
          body="Las devoluciones registradas apareceran aqui."
          className="section-empty"
          title="Sin notas credito"
        />
      )}
    </section>
  );
}

type CreditNoteReviewPanelProps = {
  creditNote: CreditNoteRecord;
  formatCurrency: (minor: number) => string;
  onCancel: () => void;
  onConfirm: () => void;
  salePaymentStatus: SaleRecord["paymentStatus"];
};

function CreditNoteReviewPanel({
  creditNote,
  formatCurrency,
  onCancel,
  onConfirm,
  salePaymentStatus
}: CreditNoteReviewPanelProps) {
  const totalReturnedQuantity = creditNote.lines.reduce(
    (total, line) => total + line.quantity,
    0
  );

  return (
    <section
      aria-label={`Resumen antes de confirmar ${creditNote.number}`}
      className="credit-note-review"
    >
      <div className="credit-note-review-heading">
        <div>
          <span>Resumen antes de confirmar</span>
          <strong>{creditNote.number}</strong>
        </div>
        <div className="credit-note-review-actions">
          <SecondaryActionButton onClick={onCancel} variant="compact">
            Cancelar
          </SecondaryActionButton>
          <PrimaryActionButton onClick={onConfirm}>Confirmar nota</PrimaryActionButton>
        </div>
      </div>

      <div className="credit-note-impact-grid">
        <div>
          <span>Venta afectada</span>
          <strong>{creditNote.invoiceNumber}</strong>
          <small>{creditNote.customerName}</small>
        </div>
        <div>
          <span>Total acreditado</span>
          <strong>{formatCurrency(creditNote.totalMinor)}</strong>
          <small>{formatCreditNoteAdjustmentType(creditNote.adjustmentType)}</small>
        </div>
        <div>
          <span>Inventario</span>
          <strong>
            {creditNote.adjustmentType === "return"
              ? `Entran ${totalReturnedQuantity} unidades`
              : "Sin movimiento"}
          </strong>
          <small>
            {creditNote.adjustmentType === "return"
              ? "Se suma stock al confirmar."
              : "Solo reduce el valor de la venta."}
          </small>
        </div>
        <div>
          <span>Cartera</span>
          <strong>
            {salePaymentStatus === "pending"
              ? `Reduce ${formatCurrency(creditNote.totalMinor)}`
              : "Sin saldo por cobrar"}
          </strong>
          <small>
            {salePaymentStatus === "pending"
              ? "Se descuenta de cartera al confirmar."
              : "Queda como ajuste de venta pagada."}
          </small>
        </div>
      </div>

      <DataTable ariaLabel={`Lineas del resumen ${creditNote.number}`}>
        <DataTableHeader
          labels={[
            "Producto",
            "Cantidad",
            "Valor unitario",
            "Total acreditado"
          ]}
        />
        <tbody>
          {creditNote.lines.map((line) => (
            <tr key={line.id}>
              <td>{line.productName}</td>
              <td>
                {creditNote.adjustmentType === "return"
                  ? `${line.quantity} ${line.unit}`
                  : "Sin movimiento"}
              </td>
              <td>{formatCurrency(line.unitPriceMinor)}</td>
              <td>{formatCurrency(line.totalMinor)}</td>
            </tr>
          ))}
        </tbody>
      </DataTable>
    </section>
  );
}

function buildCreditBalanceByLine(
  creditNotes: CreditNoteRecord[],
  saleId: string
): {
  amountByLine: Map<string, number>;
  quantityByLine: Map<string, number>;
} {
  return creditNotes.reduce(
    (totals, creditNote) => {
      if (creditNote.saleId !== saleId || creditNote.status === "void") {
        return totals;
      }

      creditNote.lines.forEach((line) => {
        totals.amountByLine.set(
          line.saleLineId,
          (totals.amountByLine.get(line.saleLineId) ?? 0) + line.totalMinor
        );
        totals.quantityByLine.set(
          line.saleLineId,
          (totals.quantityByLine.get(line.saleLineId) ?? 0) + line.quantity
        );
      });

      return totals;
    },
    {
      amountByLine: new Map<string, number>(),
      quantityByLine: new Map<string, number>()
    }
  );
}

function formatCreditNoteStatus(status: CreditNoteStatus): string {
  if (status === "confirmed") {
    return "Confirmada";
  }

  if (status === "void") {
    return "Anulada";
  }

  return "Borrador";
}

function formatCreditNoteAdjustmentType(
  adjustmentType: CreditNoteAdjustmentType
): string {
  return adjustmentType === "discount"
    ? "Descuento / ajuste de valor"
    : "Devolución de productos";
}

function calculateCreditLineTotal(line: SaleLineRecord, quantity: number): number {
  if (quantity <= 0) {
    return 0;
  }

  return Math.round((line.totalMinor / line.quantity) * quantity);
}

function getTodayInputValue(): string {
  const today = new Date();
  const offsetMs = today.getTimezoneOffset() * 60_000;
  return new Date(today.getTime() - offsetMs).toISOString().slice(0, 10);
}

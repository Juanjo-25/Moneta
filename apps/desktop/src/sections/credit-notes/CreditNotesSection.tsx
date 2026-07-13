import {
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
import { SummaryCard } from "../../components/SummaryCard";
import { TextField } from "../../components/TextField";
import type {
  CreditNoteRecord,
  SaleLineRecord,
  SaleRecord
} from "../../types";

type CreditNotesSectionProps = {
  creditNotes: CreditNoteRecord[];
  formatCurrency: (minor: number) => string;
  formatIntegerInput: (value: string) => string;
  onRegisterCreditNote: (input: {
    sale: SaleRecord;
    issuedAt: string;
    reason: string;
    lines: Array<{
      saleLineId: string;
      quantity: number;
    }>;
  }) => string | null;
  parseNonNegativeInteger: (value: string) => number | null;
  sales: SaleRecord[];
};

type CreditNoteFormState = {
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

const emptyCreditNoteForm: CreditNoteFormState = {
  issuedAt: getTodayInputValue(),
  reason: "Devolucion de producto",
  saleId: ""
};

export function CreditNotesSection({
  creditNotes,
  formatCurrency,
  formatIntegerInput,
  onRegisterCreditNote,
  parseNonNegativeInteger,
  sales
}: CreditNotesSectionProps) {
  const [form, setForm] = useState<CreditNoteFormState>(emptyCreditNoteForm);
  const [lineQuantities, setLineQuantities] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<CreditNoteFormErrors>({});
  const selectedSale = sales.find((sale) => sale.id === form.saleId) ?? null;
  const creditedQuantityByLine = useMemo(
    () => buildCreditedQuantityByLine(creditNotes, selectedSale?.id ?? ""),
    [creditNotes, selectedSale?.id]
  );
  const availableLines =
    selectedSale?.lines.map((line) => ({
      ...line,
      creditedQuantity: creditedQuantityByLine.get(line.id) ?? 0,
      availableQuantity: line.quantity - (creditedQuantityByLine.get(line.id) ?? 0)
    })) ?? [];
  const selectedCreditLines = selectedSale
    ? availableLines
        .map((line) => {
          const quantity = parseNonNegativeInteger(lineQuantities[line.id] ?? "");

          return quantity && quantity > 0
            ? {
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

  useEffect(() => {
    setLineQuantities({});
    setErrors({});
  }, [form.saleId]);

  function updateField(field: keyof CreditNoteFormState, value: string) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
    setErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
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
      nextErrors.lines = "Debes acreditar al menos una cantidad.";
    }

    const invalidLine = selectedCreditLines.find(
      ({ line, quantity }) => quantity > line.availableQuantity
    );

    if (invalidLine) {
      nextErrors.lines = "La cantidad a acreditar supera lo disponible.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0 || !selectedSale) {
      return;
    }

    const submitError = onRegisterCreditNote({
      issuedAt: form.issuedAt.trim(),
      lines: selectedCreditLines.map(({ line, quantity }) => ({
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
            label="Total acreditado"
            value={formatCurrency(totalCreditedMinor)}
          />
          <SummaryCard
            label="Ventas disponibles"
            value={String(sales.length)}
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
            <TextField
              label="Motivo"
              onChange={(value) => updateField("reason", value)}
              value={form.reason}
            />
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
            <span>Selecciona las cantidades que regresan al inventario.</span>
          </div>

          {selectedSale ? (
            <DataTable ariaLabel="Lineas disponibles para nota credito">
              <DataTableHeader
                labels={[
                  "Producto",
                  "Vendido",
                  "Acreditado",
                  "Disponible",
                  "Cantidad nota",
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
                      <td>{line.creditedQuantity}</td>
                      <td>{line.availableQuantity}</td>
                      <td>
                        <input
                          aria-label={`Cantidad a acreditar ${line.productName}`}
                          inputMode="numeric"
                          onChange={(event) =>
                            updateLineQuantity(line.id, event.target.value)
                          }
                          value={lineQuantities[line.id] ?? ""}
                        />
                      </td>
                      <td>
                        {formatCurrency(calculateCreditLineTotal(line, parsedQuantity))}
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
              "Productos",
              "Total"
            ]}
          />
          <tbody>
            {creditNotes.map((creditNote) => (
              <tr key={creditNote.id}>
                <td>{creditNote.occurredAtLabel}</td>
                <td>{creditNote.number}</td>
                <td>{creditNote.invoiceNumber}</td>
                <td>{creditNote.customerName}</td>
                <td>{creditNote.reason}</td>
                <td>{creditNote.lines.length}</td>
                <td>{formatCurrency(creditNote.totalMinor)}</td>
              </tr>
            ))}
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

function buildCreditedQuantityByLine(
  creditNotes: CreditNoteRecord[],
  saleId: string
): Map<string, number> {
  return creditNotes.reduce((totals, creditNote) => {
    if (creditNote.saleId !== saleId) {
      return totals;
    }

    creditNote.lines.forEach((line) => {
      totals.set(line.saleLineId, (totals.get(line.saleLineId) ?? 0) + line.quantity);
    });

    return totals;
  }, new Map<string, number>());
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

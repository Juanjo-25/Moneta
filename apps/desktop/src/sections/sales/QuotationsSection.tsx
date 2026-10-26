import {
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction
} from "react";
import { DataTable } from "../../components/DataTable";
import { DataTableHeader } from "../../components/DataTableHeader";
import { EmptyState } from "../../components/EmptyState";
import { FormActions } from "../../components/FormActions";
import { PrimaryActionButton } from "../../components/PrimaryActionButton";
import { SecondaryActionButton } from "../../components/SecondaryActionButton";
import { TextField } from "../../components/TextField";
import { formatCurrency, formatIntegerInput } from "../../lib/formatters";
import {
  calculateQuotationLine,
  nextQuotationNumber,
  validateQuotation
} from "../../lib/quotations";
import { ProductPicker } from "./ProductPicker";
import type { InvoicePdfResult } from "../../invoice-pdf";
import type {
  AppSettings,
  CustomerFormErrors,
  CustomerFormState,
  CustomerRecord,
  ProductRecord,
  QuotationLineRecord,
  QuotationRecord
} from "../../types";

export type QuotationsSectionProps = {
  customers: CustomerRecord[];
  products: ProductRecord[];
  quotations: QuotationRecord[];
  settings: AppSettings;
  onSaveQuotation: (quotation: QuotationRecord) => Promise<string | null>;
  onDeleteQuotation: (quotationId: string) => Promise<string | null>;
  onCreateCustomer: (
    customer: CustomerFormState
  ) => Promise<CustomerRecord | null>;
  onValidateCustomer: (customer: CustomerFormState) => CustomerFormErrors;
  quotationDraft: QuotationDraftState;
  onQuotationDraftChange: Dispatch<SetStateAction<QuotationDraftState>>;
};

function dateInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function emptyForm() {
  const today = new Date();
  const validUntil = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 15
  );
  return {
    customerId: "",
    issuedAt: dateInput(today),
    validUntil: dateInput(validUntil),
    seller: "",
    observations: ""
  };
}

const emptyLine = {
  productId: "",
  quantity: "",
  unitPrice: "",
  discountPercent: "0",
  taxPercent: "0"
};

export type QuotationDraftState = {
  form: ReturnType<typeof emptyForm>;
  lineForm: typeof emptyLine;
  lines: QuotationLineRecord[];
  editing: QuotationRecord | null;
  editingLineId: string | null;
};

export function createEmptyQuotationDraft(): QuotationDraftState {
  return {
    form: emptyForm(),
    lineForm: emptyLine,
    lines: [],
    editing: null,
    editingLineId: null
  };
}

export function QuotationsSection({
  customers,
  products,
  quotations,
  settings,
  onSaveQuotation,
  onDeleteQuotation,
  onCreateCustomer,
  onValidateCustomer,
  quotationDraft,
  onQuotationDraftChange
}: QuotationsSectionProps) {
  const { form, lineForm, lines, editing, editingLineId } = quotationDraft;
  function updateDraft<K extends keyof QuotationDraftState>(
    key: K,
    action: SetStateAction<QuotationDraftState[K]>
  ) {
    onQuotationDraftChange((current) => ({
      ...current,
      [key]:
        typeof action === "function"
          ? (
              action as (
                value: QuotationDraftState[K]
              ) => QuotationDraftState[K]
            )(current[key])
          : action
    }));
  }
  const setForm = (value: SetStateAction<QuotationDraftState["form"]>) =>
    updateDraft("form", value);
  const setLineForm = (
    value: SetStateAction<QuotationDraftState["lineForm"]>
  ) => updateDraft("lineForm", value);
  const setLines = (value: SetStateAction<QuotationDraftState["lines"]>) =>
    updateDraft("lines", value);
  const setEditing = (value: SetStateAction<QuotationDraftState["editing"]>) =>
    updateDraft("editing", value);
  const setEditingLineId = (
    value: SetStateAction<QuotationDraftState["editingLineId"]>
  ) => updateDraft("editingLineId", value);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<InvoicePdfResult | null>(null);
  const [search, setSearch] = useState("");
  const [customerForm, setCustomerForm] = useState<CustomerFormState | null>(
    null
  );
  const [customerErrors, setCustomerErrors] = useState<CustomerFormErrors>({});
  const selectedCustomer =
    editing?.customer.id === form.customerId
      ? editing.customer
      : customers.find(
          (customer) => customer.id === form.customerId && customer.active
        );
  const customerOptions = customers.filter((customer) => customer.active);
  if (
    editing &&
    !customerOptions.some((customer) => customer.id === editing.customer.id)
  )
    customerOptions.push(editing.customer);
  const selectedProduct = products.find(
    (product) => product.id === lineForm.productId
  );
  const quotationNumber =
    editing?.quotationNumber ?? nextQuotationNumber(quotations);
  const totals = lines.reduce(
    (sum, line) => ({
      subtotalMinor: sum.subtotalMinor + line.subtotalMinor,
      discountMinor: sum.discountMinor + line.discountMinor,
      taxMinor: sum.taxMinor + line.taxMinor,
      totalMinor: sum.totalMinor + line.totalMinor
    }),
    { subtotalMinor: 0, discountMinor: 0, taxMinor: 0, totalMinor: 0 }
  );
  const filteredQuotations = quotations.filter((quotation) => {
    const normalize = (value: string) =>
      value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase();
    const text = normalize(
      `${quotation.quotationNumber} ${quotation.customer.name} ${quotation.customer.document}`
    );
    return normalize(search)
      .trim()
      .split(/\s+/)
      .every((term) => text.includes(term));
  });

  function reset() {
    setForm(emptyForm());
    setLines([]);
    setLineForm(emptyLine);
    setEditing(null);
    setEditingLineId(null);
    setError(null);
  }

  function addLine() {
    const parse = (value: string) =>
      /^\d+(?:\.\d{3})*$/.test(value) ? Number(value.replace(/\./g, "")) : NaN;
    const quantity = parse(lineForm.quantity);
    const unitPriceMinor = parse(lineForm.unitPrice);
    const discountPercent = Number(lineForm.discountPercent);
    const taxPercent = Number(lineForm.taxPercent);
    if (
      !selectedProduct ||
      (!selectedProduct.active && !editingLineId) ||
      !Number.isSafeInteger(quantity) ||
      quantity <= 0 ||
      !Number.isSafeInteger(unitPriceMinor) ||
      unitPriceMinor <= 0 ||
      !/^\d+$/.test(lineForm.discountPercent) ||
      discountPercent > 100 ||
      !/^\d+$/.test(lineForm.taxPercent) ||
      taxPercent > 100
    ) {
      setError(
        "Selecciona un producto y revisa cantidad y precio (mayores a cero), descuento e impuesto (entre 0 y 100)."
      );
      return;
    }
    const amounts = calculateQuotationLine({
      quantity,
      unitPriceMinor,
      discountPercent,
      taxPercent
    });
    if (!Object.values(amounts).every(Number.isSafeInteger)) {
      setError("El importe del producto es demasiado grande.");
      return;
    }
    const originalLine = lines.find((line) => line.id === editingLineId);
    const line: QuotationLineRecord = {
      id: editingLineId ?? crypto.randomUUID(),
      productId: selectedProduct.id,
      productName:
        originalLine?.productId === selectedProduct.id
          ? originalLine.productName
          : selectedProduct.name,
      unit:
        originalLine?.productId === selectedProduct.id
          ? originalLine.unit
          : selectedProduct.unit,
      quantity,
      unitPriceMinor,
      discountPercent,
      taxPercent,
      ...amounts
    };
    setLines((current) =>
      editingLineId
        ? current.map((item) => (item.id === editingLineId ? line : item))
        : [...current, line]
    );
    setLineForm(emptyLine);
    setEditingLineId(null);
    setError(null);
    setMessage(null);
  }

  function editLine(line: QuotationLineRecord) {
    setEditingLineId(line.id);
    setLineForm({
      productId: line.productId,
      quantity: String(line.quantity),
      unitPrice: formatIntegerInput(String(line.unitPriceMinor)),
      discountPercent: String(line.discountPercent),
      taxPercent: String(line.taxPercent)
    });
    setError(null);
    document
      .getElementById("quotation-products")
      ?.scrollIntoView?.({ behavior: "smooth", block: "center" });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setMessage(null);
    if (!selectedCustomer) {
      setError(
        "Selecciona un cliente activo. Puedes crearlo en el apartado Clientes."
      );
      return;
    }
    if (
      lineForm.productId ||
      lineForm.quantity ||
      lineForm.unitPrice ||
      editingLineId
    ) {
      setError(
        "Agrega o cancela el producto que estás preparando antes de guardar la cotización."
      );
      return;
    }
    const quotation: QuotationRecord = {
      id: editing?.id ?? crypto.randomUUID(),
      quotationNumber,
      customer: { ...selectedCustomer },
      issuedAt: form.issuedAt,
      validUntil: form.validUntil,
      seller: form.seller,
      observations: form.observations,
      lines: lines.map((line) => ({ ...line })),
      totalMinor: totals.totalMinor,
      createdAtMs: editing?.createdAtMs ?? Date.now()
    };
    const validation = validateQuotation(quotation);
    if (validation) {
      setError(validation);
      return;
    }
    setBusy(true);
    try {
      const saveError = await onSaveQuotation(quotation);
      if (saveError) {
        setError(saveError);
        return;
      }
      reset();
      setPreview(null);
      setMessage(`Cotización ${quotation.quotationNumber} guardada.`);
    } catch {
      setError("No se pudo guardar la cotización. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  function edit(quotation: QuotationRecord) {
    setEditing(quotation);
    setForm({
      customerId: quotation.customer.id,
      issuedAt: quotation.issuedAt,
      validUntil: quotation.validUntil,
      seller: quotation.seller,
      observations: quotation.observations
    });
    setLines(quotation.lines.map((line) => ({ ...line })));
    setLineForm(emptyLine);
    setEditingLineId(null);
    setError(null);
    setMessage(null);
    document
      .getElementById("quotation-form")
      ?.scrollIntoView?.({ behavior: "smooth" });
  }

  async function createCustomer() {
    if (!customerForm || busy) return;
    const errors = onValidateCustomer(customerForm);
    setCustomerErrors(errors);
    if (Object.keys(errors).length) return;
    setBusy(true);
    try {
      const customer = await onCreateCustomer(customerForm);
      if (!customer) {
        setError("No se pudo guardar el cliente. Intenta de nuevo.");
        return;
      }
      setForm((current) => ({ ...current, customerId: customer.id }));
      setCustomerForm(null);
      setCustomerErrors({});
      setError(null);
    } catch {
      setError("No se pudo guardar el cliente.");
    } finally {
      setBusy(false);
    }
  }

  async function generatePdf(quotation: QuotationRecord) {
    try {
      const { generateQuotationPdf } = await import("../../quotation-pdf");
      setPreview(generateQuotationPdf({ quotation, settings }));
      setError(null);
    } catch {
      setPreview(null);
      setError("No se pudo generar el PDF de la cotización.");
    }
  }

  async function remove() {
    if (!deletingId || busy) return;
    setBusy(true);
    try {
      const deleteError = await onDeleteQuotation(deletingId);
      if (deleteError) {
        setError(deleteError);
        return;
      }
      if (editing?.id === deletingId) reset();
      setPreview(null);
      setDeletingId(null);
      setMessage("Cotización eliminada.");
    } catch {
      setError("No se pudo eliminar la cotización.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="sales-layout quotations-layout"
      aria-label="Cotizaciones"
    >
      <div className="quotation-intro">
        <div>
          <h2>Cotizaciones</h2>
          <p>
            Prepara propuestas comerciales y genera su PDF para imprimir o
            compartir.
          </p>
        </div>
        <SecondaryActionButton
          disabled={busy}
          onClick={() => {
            reset();
            setMessage(null);
          }}
        >
          Nueva cotización
        </SecondaryActionButton>
      </div>
      <form className="sales-form" id="quotation-form" onSubmit={submit}>
        <fieldset className="quotation-fieldset" disabled={busy}>
          <section
            className="document-header"
            aria-label="Encabezado de la cotización"
          >
            <div className="document-header-grid">
              <TextField
                label="Número de cotización"
                onChange={() => undefined}
                readOnly
                value={quotationNumber}
              />
              <label className="field" htmlFor="quotation-customer">
                <span>Cliente</span>
                <select
                  id="quotation-customer"
                  value={form.customerId}
                  onChange={(event) =>
                    setForm({ ...form, customerId: event.target.value })
                  }
                >
                  <option value="">Selecciona un cliente</option>
                  {customerOptions.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} - {customer.document}
                    </option>
                  ))}
                </select>
              </label>
              <TextField
                label="Fecha de elaboración"
                type="date"
                value={form.issuedAt}
                onChange={(issuedAt) => setForm({ ...form, issuedAt })}
              />
              <TextField
                label="Válida hasta"
                type="date"
                value={form.validUntil}
                onChange={(validUntil) => setForm({ ...form, validUntil })}
              />
              <TextField
                label="Vendedor"
                value={form.seller}
                onChange={(seller) => setForm({ ...form, seller })}
              />
              <TextField
                label="Dirección del cliente"
                readOnly
                value={selectedCustomer?.address ?? ""}
                onChange={() => undefined}
              />
            </div>
            <FormActions>
              <SecondaryActionButton
                onClick={() => {
                  setCustomerForm({
                    name: "",
                    document: "",
                    address: "",
                    city: "",
                    email: ""
                  });
                  setCustomerErrors({});
                }}
              >
                Nuevo cliente
              </SecondaryActionButton>
            </FormActions>
          </section>
          {customerForm ? (
            <section
              className="quotation-customer-form"
              aria-label="Nuevo cliente de cotización"
            >
              <h3>Nuevo cliente</h3>
              <div className="document-header-grid">
                {(
                  [
                    ["name", "Razón social"],
                    ["document", "NIT o C.C."],
                    ["address", "Dirección"],
                    ["city", "Ciudad"],
                    ["email", "Email"]
                  ] as const
                ).map(([field, label]) => (
                  <TextField
                    key={field}
                    label={label}
                    error={customerErrors[field]}
                    value={customerForm[field]}
                    onChange={(value) => {
                      setCustomerForm({ ...customerForm, [field]: value });
                      setCustomerErrors((current) => ({
                        ...current,
                        [field]: undefined
                      }));
                    }}
                  />
                ))}
              </div>
              <FormActions>
                <SecondaryActionButton onClick={() => void createCustomer()}>
                  Guardar cliente
                </SecondaryActionButton>
                <SecondaryActionButton onClick={() => setCustomerForm(null)}>
                  Cancelar cliente
                </SecondaryActionButton>
              </FormActions>
            </section>
          ) : null}
          <section
            className="sales-line-section"
            id="quotation-products"
            aria-label="Producto de la cotización"
          >
            <div className="document-section-heading">
              <h3>{editingLineId ? "Editar producto" : "Agregar productos"}</h3>
              <p>Puedes cotizar cantidades superiores al stock disponible.</p>
            </div>
            <div className="sales-line-editor">
              <ProductPicker
                products={products}
                formatCurrency={formatCurrency}
                value={lineForm.productId}
                onSelect={(product) =>
                  setLineForm((current) => ({
                    ...current,
                    productId: product?.id ?? "",
                    unitPrice: product
                      ? formatIntegerInput(String(product.salePriceMinor))
                      : ""
                  }))
                }
              />
              <div className="quotation-line-fields">
                <TextField
                  label="Cantidad"
                  inputMode="numeric"
                  value={lineForm.quantity}
                  onChange={(quantity) =>
                    setLineForm({
                      ...lineForm,
                      quantity: quantity.replace(/[^0-9]/g, "")
                    })
                  }
                />
                <TextField
                  label="Precio unitario"
                  inputMode="numeric"
                  value={lineForm.unitPrice}
                  onChange={(unitPrice) =>
                    setLineForm({
                      ...lineForm,
                      unitPrice: formatIntegerInput(unitPrice)
                    })
                  }
                />
                <TextField
                  label="Descuento %"
                  inputMode="numeric"
                  value={lineForm.discountPercent}
                  onChange={(discountPercent) =>
                    setLineForm({
                      ...lineForm,
                      discountPercent: discountPercent.replace(/[^0-9]/g, "")
                    })
                  }
                />
                <label className="field" htmlFor="quotation-tax">
                  <span>Impuesto</span>
                  <select
                    id="quotation-tax"
                    value={lineForm.taxPercent}
                    onChange={(event) =>
                      setLineForm({
                        ...lineForm,
                        taxPercent: event.target.value
                      })
                    }
                  >
                    <option value="0">Sin IVA</option>
                    <option value="5">IVA 5%</option>
                    <option value="19">IVA 19%</option>
                  </select>
                </label>
              </div>
              <FormActions>
                <SecondaryActionButton onClick={addLine}>
                  {editingLineId ? "Actualizar producto" : "Agregar producto"}
                </SecondaryActionButton>
                {lineForm.productId ||
                lineForm.quantity ||
                lineForm.unitPrice ||
                editingLineId ? (
                  <SecondaryActionButton
                    onClick={() => {
                      setLineForm(emptyLine);
                      setEditingLineId(null);
                      setError(null);
                    }}
                  >
                    Cancelar producto
                  </SecondaryActionButton>
                ) : null}
              </FormActions>
            </div>
          </section>
          {lines.length ? (
            <DataTable
              ariaLabel="Productos de la cotización"
              className="purchase-lines-table"
            >
              <DataTableHeader
                labels={[
                  "Producto",
                  "Unidad",
                  "Cantidad",
                  "Precio unitario",
                  "Dto.",
                  "IVA",
                  "Total",
                  "Acciones"
                ]}
              />
              <tbody>
                {lines.map((line) => (
                  <tr key={line.id}>
                    <td>{line.productName}</td>
                    <td>{line.unit}</td>
                    <td>{line.quantity}</td>
                    <td>{formatCurrency(line.unitPriceMinor)}</td>
                    <td>{line.discountPercent}%</td>
                    <td>{line.taxPercent}%</td>
                    <td>{formatCurrency(line.totalMinor)}</td>
                    <td>
                      <div className="quotation-row-actions">
                        <SecondaryActionButton
                          aria-label={`Editar ${line.productName}`}
                          onClick={() => editLine(line)}
                        >
                          Editar
                        </SecondaryActionButton>
                        <SecondaryActionButton
                          aria-label={`Quitar ${line.productName}`}
                          onClick={() => {
                            setLines((current) =>
                              current.filter((item) => item.id !== line.id)
                            );
                            if (editingLineId === line.id) {
                              setEditingLineId(null);
                              setLineForm(emptyLine);
                            }
                          }}
                        >
                          Quitar
                        </SecondaryActionButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          ) : (
            <p className="quotation-hint">
              Agrega los productos que deseas incluir en la propuesta.
            </p>
          )}
          <div className="quotation-footer">
            <label className="field" htmlFor="quotation-observations">
              <span>Observaciones y condiciones</span>
              <textarea
                id="quotation-observations"
                rows={4}
                value={form.observations}
                onChange={(event) =>
                  setForm({ ...form, observations: event.target.value })
                }
                placeholder="Condiciones de entrega, pago o información adicional"
              />
            </label>
            <dl className="quotation-totals">
              <div>
                <dt>Subtotal</dt>
                <dd>{formatCurrency(totals.subtotalMinor)}</dd>
              </div>
              <div>
                <dt>Descuentos</dt>
                <dd>{formatCurrency(totals.discountMinor)}</dd>
              </div>
              <div>
                <dt>Impuestos</dt>
                <dd>{formatCurrency(totals.taxMinor)}</dd>
              </div>
              <div>
                <dt>Total cotizado</dt>
                <dd>{formatCurrency(totals.totalMinor)}</dd>
              </div>
            </dl>
          </div>
          <FormActions>
            <PrimaryActionButton
              disabled={Boolean(editingLineId)}
              type="submit"
            >
              {busy
                ? "Guardando…"
                : editing
                  ? "Guardar cambios"
                  : "Guardar cotización"}
            </PrimaryActionButton>
            {editing ? (
              <SecondaryActionButton onClick={reset}>
                Cancelar edición
              </SecondaryActionButton>
            ) : null}
          </FormActions>
        </fieldset>
      </form>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="quotation-message" role="status">
          {message}
        </p>
      ) : null}
      <section className="section-panel" aria-label="Historial de cotizaciones">
        <div className="quotation-intro">
          <div>
            <h2>Cotizaciones guardadas</h2>
            <p>Consulta, edita o imprime tus propuestas.</p>
          </div>
          <TextField
            label="Buscar cotizaciones"
            value={search}
            onChange={setSearch}
            placeholder="Número, cliente o documento"
          />
        </div>
        {filteredQuotations.length ? (
          <DataTable ariaLabel="Cotizaciones guardadas">
            <DataTableHeader
              labels={[
                "Número",
                "Cliente",
                "Elaboración",
                "Válida hasta",
                "Total",
                "Acciones"
              ]}
            />
            <tbody>
              {filteredQuotations.map((quotation) => (
                <tr key={quotation.id}>
                  <td>{quotation.quotationNumber}</td>
                  <td>{quotation.customer.name}</td>
                  <td>{quotation.issuedAt}</td>
                  <td>{quotation.validUntil}</td>
                  <td>{formatCurrency(quotation.totalMinor)}</td>
                  <td>
                    <div className="quotation-row-actions">
                      <SecondaryActionButton
                        disabled={busy}
                        onClick={() => void generatePdf(quotation)}
                        aria-label={`Generar PDF ${quotation.quotationNumber}`}
                      >
                        PDF imprimible
                      </SecondaryActionButton>
                      <SecondaryActionButton
                        disabled={busy}
                        onClick={() => edit(quotation)}
                        aria-label={`Editar ${quotation.quotationNumber}`}
                      >
                        Editar
                      </SecondaryActionButton>
                      <SecondaryActionButton
                        disabled={busy}
                        onClick={() => setDeletingId(quotation.id)}
                        aria-label={`Eliminar ${quotation.quotationNumber}`}
                      >
                        Eliminar
                      </SecondaryActionButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        ) : (
          <EmptyState
            title={
              quotations.length
                ? "Sin coincidencias"
                : "Sin cotizaciones guardadas"
            }
            body={
              quotations.length
                ? "Prueba con otro número o cliente."
                : "Crea tu primera cotización con el formulario superior."
            }
          />
        )}
        {deletingId ? (
          <div
            className="quotation-delete-confirm"
            role="group"
            aria-label="Confirmar eliminación de cotización"
          >
            <p>
              ¿Eliminar{" "}
              {
                quotations.find((quotation) => quotation.id === deletingId)
                  ?.quotationNumber
              }
              ? Esta acción no se puede deshacer.
            </p>
            <FormActions>
              <SecondaryActionButton
                disabled={busy}
                onClick={() => void remove()}
              >
                Confirmar eliminación
              </SecondaryActionButton>
              <SecondaryActionButton
                disabled={busy}
                onClick={() => setDeletingId(null)}
              >
                Cancelar eliminación
              </SecondaryActionButton>
            </FormActions>
          </div>
        ) : null}
      </section>
      {preview ? (
        <section
          className="invoice-preview"
          aria-label="Cotización PDF generada"
        >
          <div className="invoice-preview-header">
            <strong>Cotización lista para imprimir</strong>
            <a download={preview.fileName} href={preview.dataUri}>
              Descargar PDF
            </a>
            <SecondaryActionButton onClick={() => setPreview(null)}>
              Cerrar vista previa
            </SecondaryActionButton>
          </div>
          <iframe
            title="Vista previa de cotización PDF"
            src={preview.dataUri}
          />
        </section>
      ) : null}
    </section>
  );
}

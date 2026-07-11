import {
  useEffect,
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction
} from "react";
import { DataTable } from "../../components/DataTable";
import { DataTableHeader } from "../../components/DataTableHeader";
import { EmptyState } from "../../components/EmptyState";
import { FormActions } from "../../components/FormActions";
import { InlineActionGroup } from "../../components/InlineActionGroup";
import { InlineFormSection } from "../../components/InlineFormSection";
import { PrimaryActionButton } from "../../components/PrimaryActionButton";
import { SecondaryActionButton } from "../../components/SecondaryActionButton";
import { SummaryCard } from "../../components/SummaryCard";
import { TextField } from "../../components/TextField";
import type { InvoicePdfResult } from "../../invoice-pdf";
import type {
  CustomerFormErrors,
  CustomerFormState,
  CustomerRecord,
  ProductRecord,
  SaleRecord
} from "../../types";

type SaleDraftLine = {
  id: string;
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
};

type SalesFormState = {
  branch: string;
  prefix: string;
  issuedAt: string;
  seller: string;
  concept: string;
  customerId: string;
  dueAt: string;
  productId: string;
  unit: string;
  quantity: string;
  unitPrice: string;
  discountPercent: string;
  taxPercent: string;
  paymentStatus: "paid" | "pending";
};

type SalesFormErrors = {
  customerId?: string | undefined;
  dueAt?: string | undefined;
  issuedAt?: string | undefined;
  productId?: string | undefined;
  quantity?: string | undefined;
  unitPrice?: string | undefined;
  discountPercent?: string | undefined;
  taxPercent?: string | undefined;
  submit?: string | undefined;
};

export type SalesDraftState = {
  form: SalesFormState;
  saleLines: SaleDraftLine[];
};

const emptySalesForm: SalesFormState = {
  branch: "Principal",
  prefix: "",
  issuedAt: getTodayInputValue(),
  seller: "",
  concept: "Factura de venta",
  customerId: "",
  dueAt: "",
  productId: "",
  unit: "Unidad",
  quantity: "",
  unitPrice: "",
  discountPercent: "0",
  taxPercent: "0",
  paymentStatus: "paid"
};

export const emptySalesDraft: SalesDraftState = {
  form: emptySalesForm,
  saleLines: []
};

const emptyCustomerForm: CustomerFormState = {
  address: "",
  city: "",
  document: "",
  email: "",
  name: ""
};

type SalesSectionProps = {
  customers: CustomerRecord[];
  formatCurrency: (minor: number) => string;
  formatIntegerInput: (value: string) => string;
  onCreateCustomer: (input: CustomerFormState) => CustomerRecord;
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
  onValidateCustomer: (
    input: CustomerFormState,
    currentCustomerId?: string | undefined
  ) => CustomerFormErrors;
  onSalesDraftChange: Dispatch<SetStateAction<SalesDraftState>>;
  parseNonNegativeInteger: (value: string) => number | null;
  products: ProductRecord[];
  sales: SaleRecord[];
  salesDraft: SalesDraftState;
};

export function SalesSection({
  customers,
  formatCurrency,
  formatIntegerInput,
  onCreateCustomer,
  onRegisterPaidSale,
  onRegisterPendingSale,
  onValidateCustomer,
  onSalesDraftChange,
  parseNonNegativeInteger,
  products,
  sales,
  salesDraft
}: SalesSectionProps) {
  const { form, saleLines } = salesDraft;
  const [errors, setErrors] = useState<SalesFormErrors>({});
  const [customerFormVisible, setCustomerFormVisible] = useState(false);
  const [customerForm, setCustomerForm] =
    useState<CustomerFormState>(emptyCustomerForm);
  const [customerErrors, setCustomerErrors] = useState<CustomerFormErrors>({});
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [invoicePreview, setInvoicePreview] = useState<InvoicePdfResult | null>(null);

  const activeCustomers = customers.filter((customer) => customer.active);
  const selectedCustomer =
    customers.find((customer) => customer.id === form.customerId) ?? null;
  const selectedProduct =
    products.find((product) => product.id === form.productId) ?? null;
  const quantity = parseNonNegativeInteger(form.quantity) ?? 0;
  const unitPriceMinor = parseNonNegativeInteger(form.unitPrice) ?? 0;
  const discountPercent = parsePercentage(form.discountPercent);
  const taxPercent = parsePercentage(form.taxPercent);
  const draftLineTotalMinor = calculateDocumentLine({
    quantity,
    unitAmountMinor: unitPriceMinor,
    discountPercent,
    taxPercent
  }).totalMinor;
  const saleLinesTotalMinor = saleLines.reduce(
    (total, line) => total + line.totalMinor,
    0
  );
  const totalMinor = saleLinesTotalMinor + draftLineTotalMinor;
  const nextInvoiceNumber = String(sales.length + 1).padStart(3, "0");
  const documentNumber = formatDocumentNumber(form.prefix, nextInvoiceNumber);

  useEffect(() => {
    if (!selectedProduct) {
      return;
    }

    setForm((currentForm) =>
      currentForm.productId === selectedProduct.id &&
      currentForm.unitPrice.trim() === ""
        ? {
            ...currentForm,
            unitPrice: formatIntegerInput(String(selectedProduct.salePriceMinor))
          }
        : currentForm
    );
  }, [selectedProduct]);

  function setForm(action: SetStateAction<SalesFormState>) {
    onSalesDraftChange((currentDraft) => ({
      ...currentDraft,
      form:
        typeof action === "function"
          ? (action as (currentForm: SalesFormState) => SalesFormState)(
              currentDraft.form
            )
          : action
    }));
  }

  function setSaleLines(action: SetStateAction<SaleDraftLine[]>) {
    onSalesDraftChange((currentDraft) => ({
      ...currentDraft,
      saleLines:
        typeof action === "function"
          ? (action as (currentLines: SaleDraftLine[]) => SaleDraftLine[])(
              currentDraft.saleLines
            )
          : action
    }));
  }

  function updateField(field: keyof SalesFormState, value: string) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
    setErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
  }

  function updatePercentageField(
    field: "discountPercent" | "taxPercent",
    value: string
  ) {
    updateField(field, value.replace(/[^0-9]/g, ""));
  }

  function validateDraftLine(): {
    errors: SalesFormErrors;
    parsedQuantity: number | null;
    parsedUnitPrice: number | null;
    parsedDiscountPercent: number | null;
    parsedTaxPercent: number | null;
  } {
    const nextErrors: SalesFormErrors = {};
    const parsedQuantity = parseNonNegativeInteger(form.quantity);
    const parsedUnitPrice = parseNonNegativeInteger(form.unitPrice);
    const parsedDiscountPercent = parsePercentage(form.discountPercent);
    const parsedTaxPercent = parsePercentage(form.taxPercent);

    if (!selectedProduct) {
      nextErrors.productId = "Debes seleccionar un producto.";
    }
    if (parsedQuantity === null || parsedQuantity <= 0) {
      nextErrors.quantity = "La cantidad debe ser un entero mayor a cero.";
    }
    if (parsedUnitPrice === null || parsedUnitPrice <= 0) {
      nextErrors.unitPrice = "El precio de venta debe ser un entero mayor a cero.";
    }

    if (parsedDiscountPercent === null || parsedDiscountPercent > 100) {
      nextErrors.discountPercent = "El descuento debe estar entre 0 y 100.";
    }
    if (parsedTaxPercent === null || parsedTaxPercent > 100) {
      nextErrors.taxPercent = "El impuesto debe estar entre 0 y 100.";
    }

    return {
      errors: nextErrors,
      parsedQuantity,
      parsedUnitPrice,
      parsedDiscountPercent,
      parsedTaxPercent
    };
  }

  function addSaleLine() {
    const validation = validateDraftLine();

    setErrors((currentErrors) => ({
      ...currentErrors,
      productId: validation.errors.productId,
      quantity: validation.errors.quantity,
      unitPrice: validation.errors.unitPrice
    }));

    if (
      Object.keys(validation.errors).length > 0 ||
      !selectedProduct ||
      validation.parsedQuantity === null ||
      validation.parsedQuantity <= 0 ||
      validation.parsedUnitPrice === null ||
      validation.parsedUnitPrice <= 0 ||
      validation.parsedDiscountPercent === null ||
      validation.parsedTaxPercent === null
    ) {
      return;
    }

    const parsedQuantity = validation.parsedQuantity;
    const parsedUnitPrice = validation.parsedUnitPrice;
    const parsedDiscountPercent = validation.parsedDiscountPercent!;
    const parsedTaxPercent = validation.parsedTaxPercent!;

    setSaleLines((currentLines) => [
      ...currentLines,
      buildSaleLineSnapshot({
        product: selectedProduct,
        quantity: parsedQuantity,
        unit: form.unit,
        unitPriceMinor: parsedUnitPrice,
        discountPercent: parsedDiscountPercent,
        taxPercent: parsedTaxPercent
      })
    ]);
    setForm((currentForm) => ({
      ...currentForm,
      productId: "",
      unit: "Unidad",
      quantity: "",
      unitPrice: "",
      discountPercent: "0",
      taxPercent: "0"
    }));
    setErrors((currentErrors) => ({
      ...currentErrors,
      productId: undefined,
      quantity: undefined,
      unitPrice: undefined,
      discountPercent: undefined,
      taxPercent: undefined
    }));
  }

  function submitSale(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: SalesFormErrors = {};
    const lineValidation = validateDraftLine();
    const hasDraftLine = selectedProduct || form.quantity.trim() !== "";
    const linesToRegister =
      saleLines.length > 0 && !hasDraftLine
        ? saleLines
        : [
            ...saleLines,
            ...(lineValidation.parsedQuantity !== null &&
            lineValidation.parsedQuantity > 0 &&
            lineValidation.parsedUnitPrice !== null &&
            lineValidation.parsedUnitPrice > 0 &&
            lineValidation.parsedDiscountPercent !== null &&
            lineValidation.parsedTaxPercent !== null &&
            selectedProduct
              ? [
                  buildSaleLineSnapshot({
                    product: selectedProduct,
                    quantity: lineValidation.parsedQuantity,
                    unit: form.unit,
                    unitPriceMinor: lineValidation.parsedUnitPrice,
                    discountPercent: lineValidation.parsedDiscountPercent,
                    taxPercent: lineValidation.parsedTaxPercent
                  })
                ]
              : [])
          ];

    if (!selectedCustomer) {
      nextErrors.customerId = "Debes seleccionar un cliente.";
    } else if (!selectedCustomer.active) {
      nextErrors.customerId =
        "El cliente seleccionado esta inactivo. Reactivalo para registrar nuevas ventas.";
    }
    if (form.issuedAt.trim() === "") {
      nextErrors.issuedAt = "La fecha de elaboracion es obligatoria.";
    }
    if (form.paymentStatus === "pending" && form.dueAt.trim() === "") {
      nextErrors.dueAt =
        "La fecha de vencimiento es obligatoria para ventas pendientes.";
    }
    if (saleLines.length === 0 || hasDraftLine) {
      Object.assign(nextErrors, lineValidation.errors);
    }

    setErrors(nextErrors);

    if (
      Object.keys(nextErrors).length > 0 ||
      !selectedCustomer ||
      linesToRegister.length === 0
    ) {
      return;
    }

    const registerInput = {
      branch: form.branch.trim() || "Principal",
      concept: form.concept.trim() || "Factura de venta",
      customer: selectedCustomer,
      invoiceNumber: documentNumber,
      issuedAt: form.issuedAt.trim(),
      prefix: form.prefix.trim(),
      seller: form.seller.trim() || "Sin asignar",
      lines: linesToRegister.map((line) => ({
        costMinor: line.costMinor,
        discountMinor: line.discountMinor,
        discountPercent: line.discountPercent,
        marginMinor: line.marginMinor,
        marginPercent: line.marginPercent,
        product: line.product,
        quantity: line.quantity,
        subtotalMinor: line.subtotalMinor,
        taxMinor: line.taxMinor,
        taxPercent: line.taxPercent,
        totalMinor: line.totalMinor,
        unit: line.unit,
        unitCostMinorAtSale: line.unitCostMinorAtSale,
        unitPriceMinor: line.unitPriceMinor
      }))
    };
    let submitError: string | null = null;

    if (form.paymentStatus === "paid") {
      submitError = onRegisterPaidSale(registerInput);
    } else {
      submitError = onRegisterPendingSale({
        ...registerInput,
        dueAt: form.dueAt.trim()
      });
    }

    if (submitError) {
      setErrors({ submit: submitError });
      return;
    }

    setErrors({});
    setSaleLines([]);
    setForm(emptySalesForm);
  }

  function updateCustomerField(field: keyof CustomerFormState, value: string) {
    setCustomerForm((currentForm) => ({ ...currentForm, [field]: value }));
    setCustomerErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
  }

  function submitCustomer() {
    const nextErrors = onValidateCustomer(customerForm);

    setCustomerErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const customer = onCreateCustomer(customerForm);

    setForm((currentForm) => ({ ...currentForm, customerId: customer.id }));
    setCustomerForm(emptyCustomerForm);
    setCustomerErrors({});
    setCustomerFormVisible(false);
  }

  async function generateInvoiceForSale(sale: SaleRecord) {
    try {
      const { generateInvoicePdf } = await import("../../invoice-pdf");
      const invoice = generateInvoicePdf({
        customer: {
          address: sale.customer.address,
          city: sale.customer.city,
          document: sale.customer.document,
          email: sale.customer.email,
          name: sale.customer.name
        },
        invoiceNumber: sale.invoiceNumber,
        issueDate: sale.issuedAt,
        item: {
          description: sale.lines[0]?.productName ?? sale.productName,
          quantity: sale.lines[0]?.quantity ?? sale.quantity,
          totalMinor: sale.lines[0]?.totalMinor ?? sale.totalMinor,
          unitPriceMinor: sale.lines[0]?.unitPriceMinor ?? sale.unitPriceMinor
        },
        items: sale.lines.map((line) => ({
          description: line.productName,
          quantity: line.quantity,
          totalMinor: line.totalMinor,
          unitPriceMinor: line.unitPriceMinor
        })),
        paymentStatus: sale.paymentStatus
      });
      setInvoicePreview(invoice);
      setInvoiceError(null);
    } catch {
      setInvoicePreview(null);
      setInvoiceError("No se pudo generar la factura PDF.");
    }
  }

  return (
    <section className="sales-layout">
      <form className="sales-form" onSubmit={submitSale}>
        <section className="document-header" aria-label="Encabezado de la venta">
          <div className="document-header-grid">
            <TextField
              label="Sucursal"
              onChange={(value) => updateField("branch", value)}
              value={form.branch}
            />
            <TextField
              label="Prefijo"
              onChange={(value) => updateField("prefix", value)}
              placeholder="Sin prefijo"
              value={form.prefix}
            />
            <TextField label="Numero" onChange={() => undefined} readOnly value={documentNumber} />

            <label className="field" htmlFor="cliente">
              <span>Cliente</span>
              <select
                aria-invalid={Boolean(errors.customerId)}
                id="cliente"
                onChange={(event) => updateField("customerId", event.target.value)}
                value={form.customerId}
              >
                <option value="">Selecciona un cliente</option>
                {activeCustomers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} - {customer.document}
                  </option>
                ))}
              </select>
              {errors.customerId ? <small>{errors.customerId}</small> : null}
            </label>
            <TextField
              label="Direccion del cliente"
              onChange={() => undefined}
              placeholder="Se completa al elegir el cliente"
              readOnly
              value={selectedCustomer?.address ?? ""}
            />
            <TextField
              error={errors.issuedAt}
              label="Fecha de elaboracion"
              onChange={(value) => updateField("issuedAt", value)}
              type="date"
              value={form.issuedAt}
            />
            {form.paymentStatus === "pending" ? (
              <TextField
                error={errors.dueAt}
                label="Fecha vencimiento venta"
                onChange={(value) => updateField("dueAt", value)}
                type="date"
                value={form.dueAt}
              />
            ) : null}
            <TextField
              label="Vendedor"
              onChange={(value) => updateField("seller", value)}
              placeholder="Sin asignar"
              value={form.seller}
            />
            <div className="field">
              <span>Forma de pago</span>
              <div aria-label="Estado de pago" className="payment-status-group" role="radiogroup">
                <label htmlFor="estado-pagada"><input checked={form.paymentStatus === "paid"} id="estado-pagada" name="payment-status" onChange={() => updateField("paymentStatus", "paid")} type="radio" />Pagada</label>
                <label htmlFor="estado-pendiente"><input checked={form.paymentStatus === "pending"} id="estado-pendiente" name="payment-status" onChange={() => updateField("paymentStatus", "pending")} type="radio" />Pendiente</label>
              </div>
            </div>
            <TextField label="Moneda" onChange={() => undefined} readOnly value="Peso colombiano (COP)" />
            <TextField
              label="Concepto"
              onChange={(value) => updateField("concept", value)}
              value={form.concept}
            />
          </div>
          <InlineActionGroup>
            <SecondaryActionButton onClick={() => setCustomerFormVisible((visible) => !visible)}>
              Nuevo cliente
            </SecondaryActionButton>
          </InlineActionGroup>
        </section>

        <section className="document-lines" aria-label="Detalle de facturacion">
          <div className="document-lines-heading">
            <h2>Detalle de facturacion</h2>
            <span>Agrega los productos y sus valores antes de registrar la venta.</span>
          </div>
          <div className="sales-grid">
          <label className="field" htmlFor="producto-venta">
            <span>Producto</span>
            <select
              aria-invalid={Boolean(errors.productId)}
              id="producto-venta"
              onChange={(event) => {
                updateField("productId", event.target.value);
              }}
              value={form.productId}
            >
              <option value="">Selecciona un producto</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
            {errors.productId ? <small>{errors.productId}</small> : null}
          </label>

          <label className="field" htmlFor="unidad-venta">
            <span>Unidad</span>
            <select id="unidad-venta" onChange={(event) => updateField("unit", event.target.value)} value={form.unit}>
              <option>Unidad</option><option>Kg</option><option>Libra</option><option>Caja</option><option>Paquete</option>
            </select>
          </label>

          <TextField
            error={errors.quantity}
            inputMode="numeric"
            label="Cantidad"
            onChange={(value) => {
              updateField("quantity", value);
            }}
            value={form.quantity}
          />
          <TextField
            error={errors.unitPrice}
            inputMode="numeric"
            label="Precio venta unitario"
            onChange={(value) => {
              updateField("unitPrice", formatIntegerInput(value));
            }}
            value={form.unitPrice}
          />
          <TextField error={errors.discountPercent} inputMode="numeric" label="Descuento %" onChange={(value) => updatePercentageField("discountPercent", value)} value={form.discountPercent} />
          <label className="field" htmlFor="impuesto-venta"><span>Impuesto</span><select aria-invalid={Boolean(errors.taxPercent)} id="impuesto-venta" onChange={(event) => updateField("taxPercent", event.target.value)} value={form.taxPercent}><option value="0">Sin IVA</option><option value="5">IVA 5%</option><option value="19">IVA 19%</option></select>{errors.taxPercent ? <small>{errors.taxPercent}</small> : null}</label>
          <TextField label="Total linea" onChange={() => undefined} readOnly value={formatCurrency(draftLineTotalMinor)} />
          <InlineActionGroup>
            <SecondaryActionButton onClick={addSaleLine}>
              Agregar producto
            </SecondaryActionButton>
          </InlineActionGroup>
        </div>
        </section>

        {customerFormVisible ? (
          <InlineFormSection className="inline-customer-form">
            <TextField
              error={customerErrors.name}
              label="Nombre o razon social"
              onChange={(value) => updateCustomerField("name", value)}
              value={customerForm.name}
            />
            <TextField
              error={customerErrors.document}
              label="NIT o C.C."
              onChange={(value) => updateCustomerField("document", value)}
              value={customerForm.document}
            />
            <TextField
              error={customerErrors.address}
              label="Direccion"
              onChange={(value) => updateCustomerField("address", value)}
              value={customerForm.address}
            />
            <TextField
              error={customerErrors.city}
              label="Ciudad"
              onChange={(value) => updateCustomerField("city", value)}
              value={customerForm.city}
            />
            <TextField
              error={customerErrors.email}
              label="Email"
              onChange={(value) => updateCustomerField("email", value)}
              value={customerForm.email}
            />
            <SecondaryActionButton onClick={submitCustomer}>
              Guardar cliente
            </SecondaryActionButton>
          </InlineFormSection>
        ) : null}

        {saleLines.length > 0 ? (
          <DataTable ariaLabel="Productos de la venta" className="purchase-lines-table">
            <DataTableHeader
              labels={["Producto", "Unidad", "Cantidad", "Precio unitario", "Descuento", "Impuesto", "Total"]}
            />
            <tbody>
              {saleLines.map((line) => (
                <tr key={line.id}>
                  <td>{line.product.name}</td>
                  <td>{line.unit}</td>
                  <td>{line.quantity}</td>
                  <td>{formatCurrency(line.unitPriceMinor)}</td>
                  <td>{line.discountPercent}%</td>
                  <td>{line.taxPercent}%</td>
                  <td>{formatCurrency(line.totalMinor)}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        ) : null}

        <SummaryCard compact>
          <span>
            Precio unitario {unitPriceMinor > 0 ? formatCurrency(unitPriceMinor) : formatCurrency(0)}
          </span>
          <span>Productos agregados {saleLines.length}</span>
          <strong>Total {formatCurrency(totalMinor)}</strong>
        </SummaryCard>

        {errors.submit ? <p className="form-error">{errors.submit}</p> : null}

        <FormActions>
          <PrimaryActionButton type="submit">Registrar venta</PrimaryActionButton>
        </FormActions>
      </form>

      {sales.length > 0 ? (
        <>
          <DataTable ariaLabel="Ventas registradas">
            <DataTableHeader
              labels={[
                "Fecha",
                "Numero",
                "Cliente",
                "Vendedor",
                "Producto",
                "Cantidad",
                "Estado",
                "Total",
                "Factura"
              ]}
            />
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id}>
                  <td>{sale.occurredAtLabel}</td>
                  <td>{sale.invoiceNumber}</td>
                  <td>{sale.customerName}</td>
                  <td>{sale.seller}</td>
                  <td>{sale.productName}</td>
                  <td>{sale.quantity}</td>
                  <td>{sale.paymentStatus === "paid" ? "Pagada" : "Pendiente"}</td>
                  <td>{formatCurrency(sale.totalMinor)}</td>
                  <td>
                    <SecondaryActionButton
                      onClick={() => {
                        void generateInvoiceForSale(sale);
                      }}
                      variant="compact"
                    >
                      Generar factura PDF
                    </SecondaryActionButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
          {invoicePreview ? (
            <section className="invoice-preview" aria-label="Factura PDF generada">
              <div className="invoice-preview-header">
                <strong>Factura generada</strong>
                <a download={invoicePreview.fileName} href={invoicePreview.dataUri}>
                  Descargar PDF
                </a>
              </div>
              <iframe
                src={invoicePreview.dataUri}
                title="Vista previa de factura PDF"
              />
            </section>
          ) : null}
          {invoiceError ? <p className="form-error">{invoiceError}</p> : null}
        </>
      ) : (
        <EmptyState
          body="Registra ventas para actualizar inventario y cartera."
          className="section-empty"
          title="Sin ventas registradas"
        />
      )}
    </section>
  );
}

function buildSaleLineSnapshot(input: {
  product: ProductRecord;
  quantity: number;
  unit: string;
  unitPriceMinor: number;
  discountPercent: number;
  taxPercent: number;
}): SaleDraftLine {
  const calculation = calculateDocumentLine({
    quantity: input.quantity,
    unitAmountMinor: input.unitPriceMinor,
    discountPercent: input.discountPercent,
    taxPercent: input.taxPercent
  });
  const totalMinor = calculation.totalMinor;
  const costMinor = input.quantity * input.product.costMinor;
  const marginMinor = calculation.taxableMinor - costMinor;
  const marginPercent =
    calculation.taxableMinor > 0
      ? (marginMinor / calculation.taxableMinor) * 100
      : 0;

  return {
    costMinor,
    discountMinor: calculation.discountMinor,
    discountPercent: input.discountPercent,
    id: `sale-line-${Date.now()}`,
    marginMinor,
    marginPercent,
    product: input.product,
    quantity: input.quantity,
    subtotalMinor: calculation.subtotalMinor,
    taxMinor: calculation.taxMinor,
    taxPercent: input.taxPercent,
    totalMinor,
    unit: input.unit,
    unitCostMinorAtSale: input.product.costMinor,
    unitPriceMinor: input.unitPriceMinor
  };
}

function parsePercentage(value: string): number | null {
  if (value.trim() === "") {
    return 0;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function calculateDocumentLine(input: {
  quantity: number;
  unitAmountMinor: number;
  discountPercent: number | null;
  taxPercent: number | null;
}) {
  const subtotalMinor = input.quantity * input.unitAmountMinor;
  const discountPercent = input.discountPercent ?? 0;
  const taxPercent = input.taxPercent ?? 0;
  const discountMinor = Math.round((subtotalMinor * discountPercent) / 100);
  const taxableMinor = subtotalMinor - discountMinor;
  const taxMinor = Math.round((taxableMinor * taxPercent) / 100);

  return {
    subtotalMinor,
    discountMinor,
    taxableMinor,
    taxMinor,
    totalMinor: taxableMinor + taxMinor
  };
}

function formatDocumentNumber(prefix: string, number: string): string {
  const normalizedPrefix = prefix.trim().toUpperCase();
  return normalizedPrefix === "" ? number : `${normalizedPrefix}-${number}`;
}

function getTodayInputValue(): string {
  const today = new Date();
  const offsetMs = today.getTimezoneOffset() * 60_000;
  return new Date(today.getTime() - offsetMs).toISOString().slice(0, 10);
}

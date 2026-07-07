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
  quantity: number;
  unitCostMinorAtSale: number;
  unitPriceMinor: number;
  costMinor: number;
  marginMinor: number;
  marginPercent: number;
  totalMinor: number;
};

type SalesFormState = {
  customerId: string;
  dueAt: string;
  productId: string;
  quantity: string;
  unitPrice: string;
  paymentStatus: "paid" | "pending";
};

type SalesFormErrors = {
  customerId?: string | undefined;
  dueAt?: string | undefined;
  productId?: string | undefined;
  quantity?: string | undefined;
  unitPrice?: string | undefined;
  submit?: string | undefined;
};

export type SalesDraftState = {
  form: SalesFormState;
  saleLines: SaleDraftLine[];
};

const emptySalesForm: SalesFormState = {
  customerId: "",
  dueAt: "",
  productId: "",
  quantity: "",
  unitPrice: "",
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
    lines: Array<{
      product: ProductRecord;
      quantity: number;
      unitCostMinorAtSale: number;
      unitPriceMinor: number;
      costMinor: number;
      marginMinor: number;
      marginPercent: number;
      totalMinor: number;
    }>;
  }) => string | null;
  onRegisterPendingSale: (input: {
    customer: CustomerRecord;
    dueAt: string;
    lines: Array<{
      product: ProductRecord;
      quantity: number;
      unitCostMinorAtSale: number;
      unitPriceMinor: number;
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
  const draftLineTotalMinor = unitPriceMinor * quantity;
  const saleLinesTotalMinor = saleLines.reduce(
    (total, line) => total + line.totalMinor,
    0
  );
  const totalMinor = saleLinesTotalMinor + draftLineTotalMinor;

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

  function validateDraftLine(): {
    errors: SalesFormErrors;
    parsedQuantity: number | null;
    parsedUnitPrice: number | null;
  } {
    const nextErrors: SalesFormErrors = {};
    const parsedQuantity = parseNonNegativeInteger(form.quantity);
    const parsedUnitPrice = parseNonNegativeInteger(form.unitPrice);

    if (!selectedProduct) {
      nextErrors.productId = "Debes seleccionar un producto.";
    }
    if (parsedQuantity === null || parsedQuantity <= 0) {
      nextErrors.quantity = "La cantidad debe ser un entero mayor a cero.";
    }
    if (parsedUnitPrice === null || parsedUnitPrice <= 0) {
      nextErrors.unitPrice = "El precio de venta debe ser un entero mayor a cero.";
    }

    return { errors: nextErrors, parsedQuantity, parsedUnitPrice };
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
      validation.parsedUnitPrice <= 0
    ) {
      return;
    }

    const parsedQuantity = validation.parsedQuantity;
    const parsedUnitPrice = validation.parsedUnitPrice;

    setSaleLines((currentLines) => [
      ...currentLines,
      buildSaleLineSnapshot({
        product: selectedProduct,
        quantity: parsedQuantity,
        unitPriceMinor: parsedUnitPrice
      })
    ]);
    setForm((currentForm) => ({
      ...currentForm,
      productId: "",
      quantity: "",
      unitPrice: ""
    }));
    setErrors((currentErrors) => ({
      ...currentErrors,
      productId: undefined,
      quantity: undefined,
      unitPrice: undefined
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
            selectedProduct
              ? [
                  buildSaleLineSnapshot({
                    product: selectedProduct,
                    quantity: lineValidation.parsedQuantity,
                    unitPriceMinor: lineValidation.parsedUnitPrice
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
      customer: selectedCustomer,
      lines: linesToRegister.map((line) => ({
        costMinor: line.costMinor,
        marginMinor: line.marginMinor,
        marginPercent: line.marginPercent,
        product: line.product,
        quantity: line.quantity,
        totalMinor: line.totalMinor,
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
        invoiceNumber: `FE-${sale.id}`,
        issueDate: sale.occurredAtLabel,
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
        <div className="sales-grid">
          <label className="field" htmlFor="cliente">
            <span>Cliente</span>
            <select
              aria-invalid={Boolean(errors.customerId)}
              id="cliente"
              onChange={(event) => {
                updateField("customerId", event.target.value);
              }}
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

          <InlineActionGroup>
            <SecondaryActionButton
              onClick={() => setCustomerFormVisible((visible) => !visible)}
            >
              Nuevo cliente
            </SecondaryActionButton>
          </InlineActionGroup>

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
          <InlineActionGroup>
            <SecondaryActionButton onClick={addSaleLine}>
              Agregar producto
            </SecondaryActionButton>
          </InlineActionGroup>
        </div>

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

        <div
          aria-label="Estado de pago"
          className="payment-status-group"
          role="radiogroup"
        >
          <label htmlFor="estado-pagada">
            <input
              checked={form.paymentStatus === "paid"}
              id="estado-pagada"
              name="payment-status"
              onChange={() => updateField("paymentStatus", "paid")}
              type="radio"
            />
            Pagada
          </label>
          <label htmlFor="estado-pendiente">
            <input
              checked={form.paymentStatus === "pending"}
              id="estado-pendiente"
              name="payment-status"
              onChange={() => updateField("paymentStatus", "pending")}
              type="radio"
            />
            Pendiente
          </label>
        </div>

        {form.paymentStatus === "pending" ? (
          <TextField
            error={errors.dueAt}
            label="Fecha vencimiento venta"
            onChange={(value) => {
              updateField("dueAt", value);
            }}
            type="date"
            value={form.dueAt}
          />
        ) : null}

        {saleLines.length > 0 ? (
          <DataTable ariaLabel="Productos de la venta" className="purchase-lines-table">
            <DataTableHeader
              labels={["Producto", "Cantidad", "Precio unitario", "Total"]}
            />
            <tbody>
              {saleLines.map((line) => (
                <tr key={line.id}>
                  <td>{line.product.name}</td>
                  <td>{line.quantity}</td>
                  <td>{formatCurrency(line.unitPriceMinor)}</td>
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
                "Cliente",
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
                  <td>{sale.customerName}</td>
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
  unitPriceMinor: number;
}): SaleDraftLine {
  const totalMinor = input.quantity * input.unitPriceMinor;
  const costMinor = input.quantity * input.product.costMinor;
  const marginMinor = totalMinor - costMinor;
  const marginPercent = totalMinor > 0 ? (marginMinor / totalMinor) * 100 : 0;

  return {
    costMinor,
    id: `sale-line-${Date.now()}`,
    marginMinor,
    marginPercent,
    product: input.product,
    quantity: input.quantity,
    totalMinor,
    unitCostMinorAtSale: input.product.costMinor,
    unitPriceMinor: input.unitPriceMinor
  };
}

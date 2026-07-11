import { useState, type FormEvent } from "react";
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
import type {
  ProductRecord,
  PurchasePaymentStatus,
  PurchaseRecord,
  SupplierFormErrors,
  SupplierFormState,
  SupplierRecord
} from "../../types";

type PurchaseDraftLine = {
  id: string;
  product: ProductRecord;
  unit: string;
  quantity: number;
  unitCostMinor: number;
  discountPercent: number;
  discountMinor: number;
  taxPercent: number;
  taxMinor: number;
  subtotalMinor: number;
  totalMinor: number;
};

type PurchaseFormState = {
  branch: string;
  prefix: string;
  seller: string;
  concept: string;
  supplierId: string;
  invoiceNumber: string;
  issuedAt: string;
  dueAt: string;
  productId: string;
  unit: string;
  quantity: string;
  unitCost: string;
  discountPercent: string;
  taxPercent: string;
  paymentStatus: PurchasePaymentStatus;
};

type PurchaseFormErrors = {
  dueAt?: string | undefined;
  invoiceNumber?: string | undefined;
  issuedAt?: string | undefined;
  paymentStatus?: string | undefined;
  productId?: string | undefined;
  quantity?: string | undefined;
  submit?: string | undefined;
  supplierId?: string | undefined;
  unitCost?: string | undefined;
  discountPercent?: string | undefined;
  taxPercent?: string | undefined;
};

type PurchaseProductFormState = {
  sku: string;
  name: string;
  cost: string;
  salePrice: string;
  minimumStock: string;
};

type PurchaseProductFormErrors = {
  cost?: string | undefined;
  minimumStock?: string | undefined;
  name?: string | undefined;
  salePrice?: string | undefined;
  sku?: string | undefined;
};

type PurchasesSectionProps = {
  formatCurrency: (minor: number) => string;
  formatIntegerInput: (value: string) => string;
  onCreateProduct: (product: ProductRecord) => void;
  onCreateSupplier: (input: SupplierFormState) => SupplierRecord;
  onRegisterPurchase: (input: {
    supplier: SupplierRecord;
    branch: string;
    prefix: string;
    seller: string;
    concept: string;
    invoiceNumber: string;
    issuedAt: string;
    dueAt: string;
    lines: Array<{
      product: ProductRecord;
      unit: string;
      quantity: number;
      unitCostMinor: number;
      discountPercent: number;
      discountMinor: number;
      taxPercent: number;
      taxMinor: number;
      subtotalMinor: number;
    }>;
    paymentStatus: PurchasePaymentStatus;
  }) => void;
  parseNonNegativeInteger: (value: string) => number | null;
  products: ProductRecord[];
  purchases: PurchaseRecord[];
  suppliers: SupplierRecord[];
};

const emptySupplierForm: SupplierFormState = {
  address: "",
  city: "",
  department: "Antioquia",
  document: "",
  email: "",
  name: "",
  phone: ""
};

const emptyPurchaseForm: PurchaseFormState = {
  branch: "Principal",
  prefix: "",
  seller: "",
  concept: "Factura de compra",
  dueAt: "",
  invoiceNumber: "",
  issuedAt: "",
  paymentStatus: "paid",
  productId: "",
  unit: "Unidad",
  quantity: "",
  supplierId: "",
  unitCost: "",
  discountPercent: "0",
  taxPercent: "0"
};

const emptyPurchaseProductForm: PurchaseProductFormState = {
  cost: "",
  minimumStock: "",
  name: "",
  salePrice: "",
  sku: ""
};

export function PurchasesSection({
  formatCurrency,
  formatIntegerInput,
  onCreateProduct,
  onCreateSupplier,
  onRegisterPurchase,
  parseNonNegativeInteger,
  products,
  purchases,
  suppliers
}: PurchasesSectionProps) {
  const [form, setForm] = useState<PurchaseFormState>(emptyPurchaseForm);
  const [errors, setErrors] = useState<PurchaseFormErrors>({});
  const [supplierFormVisible, setSupplierFormVisible] = useState(false);
  const [supplierForm, setSupplierForm] =
    useState<SupplierFormState>(emptySupplierForm);
  const [supplierErrors, setSupplierErrors] = useState<SupplierFormErrors>({});
  const [productFormVisible, setProductFormVisible] = useState(false);
  const [productForm, setProductForm] =
    useState<PurchaseProductFormState>(emptyPurchaseProductForm);
  const [productErrors, setProductErrors] = useState<PurchaseProductFormErrors>({});
  const [purchaseLines, setPurchaseLines] = useState<PurchaseDraftLine[]>([]);

  const selectedSupplier =
    suppliers.find((supplier) => supplier.id === form.supplierId) ?? null;
  const activeSuppliers = suppliers.filter((supplier) => supplier.active);
  const selectedProduct =
    products.find((product) => product.id === form.productId) ?? null;
  const quantity = parseNonNegativeInteger(form.quantity) ?? 0;
  const unitCost = parseNonNegativeInteger(form.unitCost) ?? 0;
  const discountPercent = parsePercentage(form.discountPercent);
  const taxPercent = parsePercentage(form.taxPercent);
  const draftLineTotalMinor = calculateDocumentLine({
    quantity,
    unitAmountMinor: unitCost,
    discountPercent,
    taxPercent
  }).totalMinor;
  const purchaseLinesTotalMinor = purchaseLines.reduce(
    (total, line) => total + line.totalMinor,
    0
  );
  const totalMinor = purchaseLinesTotalMinor + draftLineTotalMinor;
  const nextInvoiceNumber = String(purchases.length + 1).padStart(3, "0");
  const nextProductSku = String(products.length + 1).padStart(3, "0");
  const documentNumber = formatDocumentNumber(form.prefix, nextInvoiceNumber);

  function updateField(field: keyof PurchaseFormState, value: string) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
      ...(field === "paymentStatus" && value === "paid" ? { dueAt: "" } : {})
    }));
    setErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
  }

  function updateMoneyField(value: string) {
    setForm((currentForm) => ({
      ...currentForm,
      unitCost: formatIntegerInput(value)
    }));
    setErrors((currentErrors) => ({ ...currentErrors, unitCost: undefined }));
  }

  function updatePercentageField(
    field: "discountPercent" | "taxPercent",
    value: string
  ) {
    updateField(field, value.replace(/[^0-9]/g, ""));
  }

  function updateProductField(
    field: keyof PurchaseProductFormState,
    value: string
  ) {
    setProductForm((currentForm) => ({
      ...currentForm,
      [field]:
        field === "cost" || field === "salePrice" || field === "minimumStock"
          ? formatIntegerInput(value)
          : value
    }));
    setProductErrors((currentErrors) => ({
      ...currentErrors,
      [field]: undefined
    }));
  }

  function submitSupplier() {
    const nextErrors: SupplierFormErrors = {};

    if (supplierForm.name.trim() === "") {
      nextErrors.name = "El nombre del proveedor es obligatorio.";
    }

    setSupplierErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const supplier = onCreateSupplier(supplierForm);

    setForm((currentForm) => ({ ...currentForm, supplierId: supplier.id }));
    setSupplierForm(emptySupplierForm);
    setSupplierErrors({});
    setSupplierFormVisible(false);
  }

  function submitProduct() {
    const nextErrors: PurchaseProductFormErrors = {};
    const minimumStock = parseNonNegativeInteger(productForm.minimumStock);

    if (productForm.name.trim() === "") {
      nextErrors.name = "El nombre es obligatorio.";
    }
    if (minimumStock === null) {
      nextErrors.minimumStock = "El stock minimo debe ser cero o mayor.";
    }

    setProductErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0 || minimumStock === null) {
      return;
    }

    const product = {
      active: true,
      costMinor: 0,
      id: `product-${Date.now()}`,
      minimumStock,
      name: productForm.name.trim(),
      salePriceMinor: 0,
      sku: nextProductSku,
      stock: 0
    };

    onCreateProduct(product);
    setForm((currentForm) => ({ ...currentForm, productId: product.id }));
    setProductForm(emptyPurchaseProductForm);
    setProductErrors({});
    setProductFormVisible(false);
  }

  function validateDraftLine(): {
    errors: PurchaseFormErrors;
    parsedQuantity: number | null;
    parsedUnitCost: number | null;
    parsedDiscountPercent: number | null;
    parsedTaxPercent: number | null;
  } {
    const nextErrors: PurchaseFormErrors = {};
    const parsedQuantity = parseNonNegativeInteger(form.quantity);
    const parsedUnitCost = parseNonNegativeInteger(form.unitCost);
    const parsedDiscountPercent = parsePercentage(form.discountPercent);
    const parsedTaxPercent = parsePercentage(form.taxPercent);

    if (!selectedProduct) {
      nextErrors.productId = "Debes seleccionar un producto.";
    }
    if (parsedQuantity === null || parsedQuantity <= 0) {
      nextErrors.quantity = "La cantidad debe ser un entero mayor a cero.";
    }
    if (parsedUnitCost === null) {
      nextErrors.unitCost = "El costo unitario debe ser cero o mayor.";
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
      parsedUnitCost,
      parsedDiscountPercent,
      parsedTaxPercent
    };
  }

  function addPurchaseLine() {
    const validation = validateDraftLine();

    setErrors((currentErrors) => ({
      ...currentErrors,
      productId: validation.errors.productId,
      quantity: validation.errors.quantity,
      unitCost: validation.errors.unitCost
    }));

    if (
      Object.keys(validation.errors).length > 0 ||
      !selectedProduct ||
      validation.parsedQuantity === null ||
      validation.parsedQuantity <= 0 ||
      validation.parsedUnitCost === null
      || validation.parsedDiscountPercent === null
      || validation.parsedTaxPercent === null
    ) {
      return;
    }

    const parsedQuantity = validation.parsedQuantity;
    const parsedUnitCost = validation.parsedUnitCost;
    const parsedDiscountPercent = validation.parsedDiscountPercent!;
    const parsedTaxPercent = validation.parsedTaxPercent!;
    const calculation = calculateDocumentLine({
      quantity: parsedQuantity,
      unitAmountMinor: parsedUnitCost,
      discountPercent: parsedDiscountPercent,
      taxPercent: parsedTaxPercent
    });

    setPurchaseLines((currentLines) => [
      ...currentLines,
      {
        id: `purchase-line-${Date.now()}`,
        product: selectedProduct,
        unit: form.unit,
        quantity: parsedQuantity,
        totalMinor: calculation.totalMinor,
        unitCostMinor: parsedUnitCost,
        discountPercent: parsedDiscountPercent,
        discountMinor: calculation.discountMinor,
        taxPercent: parsedTaxPercent,
        taxMinor: calculation.taxMinor,
        subtotalMinor: calculation.subtotalMinor
      }
    ]);
    setForm((currentForm) => ({
      ...currentForm,
      productId: "",
      unit: "Unidad",
      quantity: "",
      unitCost: "",
      discountPercent: "0",
      taxPercent: "0"
    }));
    setErrors((currentErrors) => ({
      ...currentErrors,
      productId: undefined,
      quantity: undefined,
      unitCost: undefined,
      discountPercent: undefined,
      taxPercent: undefined
    }));
  }

  function submitPurchase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: PurchaseFormErrors = {};
    const lineValidation = validateDraftLine();
    const hasDraftLine =
      selectedProduct ||
      form.quantity.trim() !== "" ||
      form.unitCost.trim() !== "";
    const linesToRegister =
      purchaseLines.length > 0 && !hasDraftLine
        ? purchaseLines
        : [
            ...purchaseLines,
            ...(lineValidation.parsedQuantity !== null &&
            lineValidation.parsedQuantity > 0 &&
            lineValidation.parsedUnitCost !== null &&
            lineValidation.parsedDiscountPercent !== null &&
            lineValidation.parsedTaxPercent !== null &&
            selectedProduct
              ? [
                  (() => {
                    const calculation = calculateDocumentLine({
                      quantity: lineValidation.parsedQuantity,
                      unitAmountMinor: lineValidation.parsedUnitCost,
                      discountPercent: lineValidation.parsedDiscountPercent,
                      taxPercent: lineValidation.parsedTaxPercent
                    });

                    return {
                    id: `purchase-line-${Date.now()}`,
                    product: selectedProduct,
                    unit: form.unit,
                    quantity: lineValidation.parsedQuantity,
                    totalMinor: calculation.totalMinor,
                    unitCostMinor: lineValidation.parsedUnitCost,
                    discountPercent: lineValidation.parsedDiscountPercent,
                    discountMinor: calculation.discountMinor,
                    taxPercent: lineValidation.parsedTaxPercent,
                    taxMinor: calculation.taxMinor,
                    subtotalMinor: calculation.subtotalMinor
                    };
                  })()
                ]
              : [])
          ];

    if (!selectedSupplier) {
      nextErrors.supplierId = "Debes seleccionar un proveedor.";
    }
    if (form.issuedAt.trim() === "") {
      nextErrors.issuedAt = "La fecha de emision es obligatoria.";
    }
    if (form.paymentStatus === "pending" && form.dueAt.trim() === "") {
      nextErrors.dueAt =
        "La fecha de vencimiento es obligatoria para compras pendientes.";
    }
    if (purchaseLines.length === 0 || hasDraftLine) {
      Object.assign(nextErrors, lineValidation.errors);
    }

    setErrors(nextErrors);

    if (
      Object.keys(nextErrors).length > 0 ||
      !selectedSupplier ||
      linesToRegister.length === 0
    ) {
      return;
    }

    onRegisterPurchase({
      branch: form.branch.trim() || "Principal",
      concept: form.concept.trim() || "Factura de compra",
      dueAt: form.paymentStatus === "pending" ? form.dueAt.trim() : "",
      invoiceNumber: documentNumber,
      issuedAt: form.issuedAt.trim(),
      lines: linesToRegister.map((line) => ({
        discountMinor: line.discountMinor,
        discountPercent: line.discountPercent,
        product: line.product,
        quantity: line.quantity,
        subtotalMinor: line.subtotalMinor,
        taxMinor: line.taxMinor,
        taxPercent: line.taxPercent,
        unit: line.unit,
        unitCostMinor: line.unitCostMinor
      })),
      paymentStatus: form.paymentStatus,
      prefix: form.prefix.trim(),
      seller: form.seller.trim() || "Sin asignar",
      supplier: selectedSupplier
    });
    setErrors({});
    setPurchaseLines([]);
    setForm(emptyPurchaseForm);
  }

  return (
    <section className="purchases-layout">
      <form className="purchase-form section-form-shell" onSubmit={submitPurchase}>
        <section className="document-header" aria-label="Encabezado de la compra">
          <div className="document-header-grid">
            <TextField label="Sucursal" onChange={(value) => updateField("branch", value)} value={form.branch} />
            <TextField label="Prefijo" onChange={(value) => updateField("prefix", value)} placeholder="Sin prefijo" value={form.prefix} />
            <TextField error={errors.invoiceNumber} label="Numero" onChange={() => undefined} readOnly value={documentNumber} />
            <label className="field" htmlFor="proveedor-compra"><span>Proveedor</span><select aria-invalid={Boolean(errors.supplierId)} id="proveedor-compra" onChange={(event) => updateField("supplierId", event.target.value)} value={form.supplierId}><option value="">Selecciona un proveedor</option>{activeSuppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select>{errors.supplierId ? <small>{errors.supplierId}</small> : null}</label>
            <TextField label="Direccion del proveedor" onChange={() => undefined} placeholder="Se completa al elegir el proveedor" readOnly value={selectedSupplier?.address ?? ""} />
            <TextField error={errors.issuedAt} label="Fecha emision" onChange={(value) => updateField("issuedAt", value)} type="date" value={form.issuedAt} />
            {form.paymentStatus === "pending" ? <TextField error={errors.dueAt} label="Fecha vencimiento" onChange={(value) => updateField("dueAt", value)} type="date" value={form.dueAt} /> : null}
            <TextField label="Vendedor" onChange={(value) => updateField("seller", value)} placeholder="Sin asignar" value={form.seller} />
            <div className="field"><span>Forma de pago</span><div aria-label="Estado de factura compra" className="payment-status-group" role="radiogroup"><label htmlFor="compra-pagada"><input checked={form.paymentStatus === "paid"} id="compra-pagada" name="purchase-payment-status" onChange={() => updateField("paymentStatus", "paid")} type="radio" />Pagada</label><label htmlFor="compra-pendiente"><input checked={form.paymentStatus === "pending"} id="compra-pendiente" name="purchase-payment-status" onChange={() => updateField("paymentStatus", "pending")} type="radio" />Pendiente</label></div></div>
            <TextField label="Moneda" onChange={() => undefined} readOnly value="Peso colombiano (COP)" />
            <TextField label="Concepto" onChange={(value) => updateField("concept", value)} value={form.concept} />
          </div>
          <InlineActionGroup><SecondaryActionButton onClick={() => setSupplierFormVisible((visible) => !visible)}>Nuevo proveedor</SecondaryActionButton></InlineActionGroup>
        </section>
        <section className="document-lines" aria-label="Detalle de facturacion">
          <div className="document-lines-heading"><h2>Detalle de facturacion</h2><span>Registra los productos recibidos y sus valores.</span></div>
        <div className="purchase-grid">
          <label className="field" htmlFor="producto-compra">
            <span>Producto</span>
            <select
              aria-invalid={Boolean(errors.productId)}
              id="producto-compra"
              onChange={(event) => updateField("productId", event.target.value)}
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
          <label className="field" htmlFor="unidad-compra"><span>Unidad</span><select id="unidad-compra" onChange={(event) => updateField("unit", event.target.value)} value={form.unit}><option>Unidad</option><option>Kg</option><option>Libra</option><option>Caja</option><option>Paquete</option></select></label>
          <InlineActionGroup>
            <SecondaryActionButton
              onClick={() => setProductFormVisible((visible) => !visible)}
            >
              Nuevo producto
            </SecondaryActionButton>
          </InlineActionGroup>
          <TextField
            error={errors.quantity}
            inputMode="numeric"
            label="Cantidad compra"
            onChange={(value) => updateField("quantity", value)}
            value={form.quantity}
          />
          <TextField
            error={errors.unitCost}
            inputMode="numeric"
            label="Costo unitario"
            onChange={updateMoneyField}
            value={form.unitCost}
          />
          <TextField error={errors.discountPercent} inputMode="numeric" label="Descuento %" onChange={(value) => updatePercentageField("discountPercent", value)} value={form.discountPercent} />
          <label className="field" htmlFor="impuesto-compra"><span>Impuesto</span><select aria-invalid={Boolean(errors.taxPercent)} id="impuesto-compra" onChange={(event) => updateField("taxPercent", event.target.value)} value={form.taxPercent}><option value="0">Sin IVA</option><option value="5">IVA 5%</option><option value="19">IVA 19%</option></select>{errors.taxPercent ? <small>{errors.taxPercent}</small> : null}</label>
          <TextField label="Total linea" onChange={() => undefined} readOnly value={formatCurrency(draftLineTotalMinor)} />
          <InlineActionGroup>
            <SecondaryActionButton onClick={addPurchaseLine}>
              Agregar producto
            </SecondaryActionButton>
          </InlineActionGroup>
        </div>
        </section>

        {supplierFormVisible ? (
          <InlineFormSection className="inline-supplier-form">
            <TextField
              error={supplierErrors.name}
              label="Nombre proveedor"
              onChange={(value) => {
                setSupplierForm((currentForm) => ({ ...currentForm, name: value }));
                setSupplierErrors({});
              }}
              value={supplierForm.name}
            />
            <SecondaryActionButton onClick={submitSupplier}>
              Guardar proveedor
            </SecondaryActionButton>
          </InlineFormSection>
        ) : null}

        {productFormVisible ? (
          <InlineFormSection className="inline-purchase-product-form">
            <TextField
              error={productErrors.name}
              label="Nombre producto"
              onChange={(value) => updateProductField("name", value)}
              value={productForm.name}
            />
            <TextField
              error={productErrors.minimumStock}
              inputMode="numeric"
              label="Stock minimo producto"
              onChange={(value) => updateProductField("minimumStock", value)}
              value={productForm.minimumStock}
            />
            <SecondaryActionButton onClick={submitProduct}>
              Guardar producto compra
            </SecondaryActionButton>
          </InlineFormSection>
        ) : null}

        {purchaseLines.length > 0 ? (
          <DataTable ariaLabel="Productos de la compra" className="purchase-lines-table">
            <DataTableHeader
              labels={["Producto", "Unidad", "Cantidad", "Costo unitario", "Descuento", "Impuesto", "Total"]}
            />
            <tbody>
              {purchaseLines.map((line) => (
                <tr key={line.id}>
                  <td>{line.product.name}</td>
                  <td>{line.unit}</td>
                  <td>{line.quantity}</td>
                  <td>{formatCurrency(line.unitCostMinor)}</td>
                  <td>{line.discountPercent}%</td>
                  <td>{line.taxPercent}%</td>
                  <td>{formatCurrency(line.totalMinor)}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        ) : null}

        <SummaryCard compact>
          <span>Productos agregados {purchaseLines.length}</span>
          <strong>Total factura {formatCurrency(totalMinor)}</strong>
        </SummaryCard>

        <FormActions>
          <PrimaryActionButton type="submit">Registrar compra</PrimaryActionButton>
        </FormActions>
      </form>

      {purchases.length > 0 ? (
        <DataTable ariaLabel="Compras registradas">
          <DataTableHeader
            labels={[
              "Fecha",
              "Proveedor",
              "Factura",
              "Vendedor",
              "Producto",
              "Cantidad",
              "Estado",
              "Total"
            ]}
          />
          <tbody>
            {purchases.map((purchase) => (
              <tr key={purchase.id}>
                <td>{purchase.occurredAtLabel}</td>
                <td>{purchase.supplierName}</td>
                <td>{purchase.invoiceNumber}</td>
                <td>{purchase.seller}</td>
                <td>{purchase.productName}</td>
                <td>{purchase.quantity}</td>
                <td>{purchase.paymentStatus === "paid" ? "Pagada" : "Pendiente"}</td>
                <td>{formatCurrency(purchase.totalMinor)}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      ) : (
        <EmptyState
          body="Las compras confirmadas aumentaran el inventario."
          className="section-empty"
          title="Sin compras registradas"
        />
      )}
    </section>
  );
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
  const discountMinor = Math.round(
    (subtotalMinor * (input.discountPercent ?? 0)) / 100
  );
  const taxableMinor = subtotalMinor - discountMinor;
  const taxMinor = Math.round((taxableMinor * (input.taxPercent ?? 0)) / 100);

  return {
    subtotalMinor,
    discountMinor,
    taxMinor,
    totalMinor: taxableMinor + taxMinor
  };
}

function formatDocumentNumber(prefix: string, number: string): string {
  const normalizedPrefix = prefix.trim().toUpperCase();
  return normalizedPrefix === "" ? number : `${normalizedPrefix}-${number}`;
}

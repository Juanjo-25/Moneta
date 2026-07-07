import { useState, type FormEvent } from "react";
import { DataTable } from "../../components/DataTable";
import { DataTableHeader } from "../../components/DataTableHeader";
import { EmptyState } from "../../components/EmptyState";
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
  quantity: number;
  unitCostMinor: number;
  totalMinor: number;
};

type PurchaseFormState = {
  supplierId: string;
  invoiceNumber: string;
  issuedAt: string;
  dueAt: string;
  productId: string;
  quantity: string;
  unitCost: string;
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
    invoiceNumber: string;
    issuedAt: string;
    dueAt: string;
    lines: Array<{
      product: ProductRecord;
      quantity: number;
      unitCostMinor: number;
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
  dueAt: "",
  invoiceNumber: "",
  issuedAt: "",
  paymentStatus: "paid",
  productId: "",
  quantity: "",
  supplierId: "",
  unitCost: ""
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
  const draftLineTotalMinor = quantity * unitCost;
  const purchaseLinesTotalMinor = purchaseLines.reduce(
    (total, line) => total + line.totalMinor,
    0
  );
  const totalMinor = purchaseLinesTotalMinor + draftLineTotalMinor;
  const nextInvoiceNumber = String(purchases.length + 1).padStart(3, "0");
  const nextProductSku = String(products.length + 1).padStart(3, "0");

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
  } {
    const nextErrors: PurchaseFormErrors = {};
    const parsedQuantity = parseNonNegativeInteger(form.quantity);
    const parsedUnitCost = parseNonNegativeInteger(form.unitCost);

    if (!selectedProduct) {
      nextErrors.productId = "Debes seleccionar un producto.";
    }
    if (parsedQuantity === null || parsedQuantity <= 0) {
      nextErrors.quantity = "La cantidad debe ser un entero mayor a cero.";
    }
    if (parsedUnitCost === null) {
      nextErrors.unitCost = "El costo unitario debe ser cero o mayor.";
    }

    return { errors: nextErrors, parsedQuantity, parsedUnitCost };
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
    ) {
      return;
    }

    const parsedQuantity = validation.parsedQuantity;
    const parsedUnitCost = validation.parsedUnitCost;

    setPurchaseLines((currentLines) => [
      ...currentLines,
      {
        id: `purchase-line-${Date.now()}`,
        product: selectedProduct,
        quantity: parsedQuantity,
        totalMinor: parsedQuantity * parsedUnitCost,
        unitCostMinor: parsedUnitCost
      }
    ]);
    setForm((currentForm) => ({
      ...currentForm,
      productId: "",
      quantity: "",
      unitCost: ""
    }));
    setErrors((currentErrors) => ({
      ...currentErrors,
      productId: undefined,
      quantity: undefined,
      unitCost: undefined
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
            selectedProduct
              ? [
                  {
                    id: `purchase-line-${Date.now()}`,
                    product: selectedProduct,
                    quantity: lineValidation.parsedQuantity,
                    totalMinor:
                      lineValidation.parsedQuantity *
                      lineValidation.parsedUnitCost,
                    unitCostMinor: lineValidation.parsedUnitCost
                  }
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
      dueAt: form.paymentStatus === "pending" ? form.dueAt.trim() : "",
      invoiceNumber: nextInvoiceNumber,
      issuedAt: form.issuedAt.trim(),
      lines: linesToRegister.map((line) => ({
        product: line.product,
        quantity: line.quantity,
        unitCostMinor: line.unitCostMinor
      })),
      paymentStatus: form.paymentStatus,
      supplier: selectedSupplier
    });
    setErrors({});
    setPurchaseLines([]);
    setForm(emptyPurchaseForm);
  }

  return (
    <section className="purchases-layout">
      <form className="purchase-form" onSubmit={submitPurchase}>
        <div className="purchase-grid">
          <label className="field" htmlFor="proveedor-compra">
            <span>Proveedor</span>
            <select
              aria-invalid={Boolean(errors.supplierId)}
              id="proveedor-compra"
              onChange={(event) => updateField("supplierId", event.target.value)}
              value={form.supplierId}
            >
              <option value="">Selecciona un proveedor</option>
              {activeSuppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
            {errors.supplierId ? <small>{errors.supplierId}</small> : null}
          </label>

          <div className="inline-action-group">
            <button
              type="button"
              onClick={() => setSupplierFormVisible((visible) => !visible)}
            >
              Nuevo proveedor
            </button>
          </div>

          <TextField
            error={errors.invoiceNumber}
            label="Numero factura"
            onChange={() => undefined}
            readOnly
            value={nextInvoiceNumber}
          />
          <TextField
            error={errors.issuedAt}
            label="Fecha emision"
            onChange={(value) => updateField("issuedAt", value)}
            type="date"
            value={form.issuedAt}
          />
          {form.paymentStatus === "pending" ? (
            <TextField
              error={errors.dueAt}
              label="Fecha vencimiento"
              onChange={(value) => updateField("dueAt", value)}
              type="date"
              value={form.dueAt}
            />
          ) : null}
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
          <div className="inline-action-group">
            <button
              type="button"
              onClick={() => setProductFormVisible((visible) => !visible)}
            >
              Nuevo producto
            </button>
          </div>
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
          <div className="inline-action-group">
            <button type="button" onClick={addPurchaseLine}>
              Agregar producto
            </button>
          </div>
        </div>

        {supplierFormVisible ? (
          <div className="inline-supplier-form">
            <TextField
              error={supplierErrors.name}
              label="Nombre proveedor"
              onChange={(value) => {
                setSupplierForm((currentForm) => ({ ...currentForm, name: value }));
                setSupplierErrors({});
              }}
              value={supplierForm.name}
            />
            <button type="button" onClick={submitSupplier}>
              Guardar proveedor
            </button>
          </div>
        ) : null}

        {productFormVisible ? (
          <div className="inline-purchase-product-form">
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
            <button type="button" onClick={submitProduct}>
              Guardar producto compra
            </button>
          </div>
        ) : null}

        {purchaseLines.length > 0 ? (
          <DataTable ariaLabel="Productos de la compra" className="purchase-lines-table">
            <DataTableHeader
              labels={["Producto", "Cantidad", "Costo unitario", "Total"]}
            />
            <tbody>
              {purchaseLines.map((line) => (
                <tr key={line.id}>
                  <td>{line.product.name}</td>
                  <td>{line.quantity}</td>
                  <td>{formatCurrency(line.unitCostMinor)}</td>
                  <td>{formatCurrency(line.totalMinor)}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        ) : null}

        <div
          aria-label="Estado de factura compra"
          className="payment-status-group"
          role="radiogroup"
        >
          <label htmlFor="compra-pagada">
            <input
              checked={form.paymentStatus === "paid"}
              id="compra-pagada"
              name="purchase-payment-status"
              onChange={() => updateField("paymentStatus", "paid")}
              type="radio"
            />
            Pagada
          </label>
          <label htmlFor="compra-pendiente">
            <input
              checked={form.paymentStatus === "pending"}
              id="compra-pendiente"
              name="purchase-payment-status"
              onChange={() => updateField("paymentStatus", "pending")}
              type="radio"
            />
            Pendiente
          </label>
        </div>

        <SummaryCard compact>
          <span>Productos agregados {purchaseLines.length}</span>
          <strong>Total factura {formatCurrency(totalMinor)}</strong>
        </SummaryCard>

        <div className="form-actions">
          <button type="submit">Registrar compra</button>
        </div>
      </form>

      {purchases.length > 0 ? (
        <DataTable ariaLabel="Compras registradas">
          <DataTableHeader
            labels={[
              "Fecha",
              "Proveedor",
              "Factura",
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

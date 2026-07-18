import { useState, type FormEvent } from "react";
import { DataTable } from "../../components/DataTable";
import { DataTableHeader } from "../../components/DataTableHeader";
import { EmptyState } from "../../components/EmptyState";
import { FormActions } from "../../components/FormActions";
import { PrimaryActionButton } from "../../components/PrimaryActionButton";
import { SecondaryActionButton } from "../../components/SecondaryActionButton";
import { StatusBadge } from "../../components/StatusBadge";
import { TextField } from "../../components/TextField";
import type {
  InventoryAdjustmentRecord,
  InventoryAdjustmentType,
  ProductRecord
} from "../../types";

type ProductFormState = {
  sku: string;
  name: string;
  unit: string;
  quantity: string;
  cost: string;
  salePrice: string;
  minimumStock: string;
};

type ProductFormErrors = Partial<Record<keyof ProductFormState, string>>;
type ProductEditFormState = Omit<ProductFormState, "quantity">;
type ProductEditFormErrors = Partial<Record<keyof ProductEditFormState, string>>;
type InventoryAdjustmentFormState = {
  productId: string;
  adjustmentType: InventoryAdjustmentType;
  quantity: string;
  reason: string;
};
type InventoryAdjustmentFormErrors = Partial<
  Record<keyof InventoryAdjustmentFormState, string>
>;

const emptyProductForm: ProductFormState = {
  sku: "",
  name: "",
  unit: "Unidad",
  quantity: "",
  cost: "",
  salePrice: "",
  minimumStock: ""
};

const productUnitOptions = ["Unidad", "Kg", "Libra", "Metro", "Caja", "Paquete"];

const emptyInventoryAdjustmentForm: InventoryAdjustmentFormState = {
  adjustmentType: "entry",
  productId: "",
  quantity: "",
  reason: ""
};

const inventoryAdjustmentLabels: Record<InventoryAdjustmentType, string> = {
  entry: "Entrada",
  exit: "Salida",
  set: "Conteo fisico"
};

type ProductsSectionProps = {
  formVisible: boolean;
  formatCurrency: (minor: number) => string;
  formatIntegerInput: (value: string) => string;
  inventoryAdjustments: InventoryAdjustmentRecord[];
  isLowStock: (product: ProductRecord) => boolean;
  onCloseForm: () => void;
  onCreateProduct: (product: ProductRecord) => Promise<boolean>;
  onRegisterInventoryAdjustment: (input: {
    productId: string;
    adjustmentType: InventoryAdjustmentType;
    quantity: number;
    reason: string;
  }) => Promise<string | null>;
  onUpdateProduct: (product: ProductRecord) => Promise<boolean>;
  parseNonNegativeInteger: (value: string) => number | null;
  products: ProductRecord[];
};

export function ProductsSection({
  formVisible,
  formatCurrency,
  formatIntegerInput,
  inventoryAdjustments,
  isLowStock,
  onCloseForm,
  onCreateProduct,
  onRegisterInventoryAdjustment,
  onUpdateProduct,
  parseNonNegativeInteger,
  products
}: ProductsSectionProps) {
  const [form, setForm] = useState<ProductFormState>(emptyProductForm);
  const [errors, setErrors] = useState<ProductFormErrors>({});
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ProductEditFormState | null>(null);
  const [editErrors, setEditErrors] = useState<ProductEditFormErrors>({});
  const [adjustmentForm, setAdjustmentForm] = useState<InventoryAdjustmentFormState>(
    emptyInventoryAdjustmentForm
  );
  const [adjustmentErrors, setAdjustmentErrors] =
    useState<InventoryAdjustmentFormErrors>({});
  const [adjustmentMessage, setAdjustmentMessage] = useState("");
  const editingProduct =
    products.find((product) => product.id === editingProductId) ?? null;
  const activeProducts = products.filter((product) => product.active);
  const selectedAdjustmentProduct =
    products.find((product) => product.id === adjustmentForm.productId) ?? null;
  const adjustmentQuantity = parseNonNegativeInteger(adjustmentForm.quantity);
  const previewNextStock =
    selectedAdjustmentProduct && adjustmentQuantity !== null
      ? adjustmentForm.adjustmentType === "entry"
        ? selectedAdjustmentProduct.stock + adjustmentQuantity
        : adjustmentForm.adjustmentType === "exit"
          ? selectedAdjustmentProduct.stock - adjustmentQuantity
          : adjustmentQuantity
      : null;

  function updateField(
    field: "sku" | "name" | "unit" | "quantity" | "minimumStock",
    value: string
  ) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
    setErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
  }

  function updateMoneyField(field: "cost" | "salePrice", value: string) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: formatIntegerInput(value)
    }));
    setErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
  }

  function updateEditField(
    field: "sku" | "name" | "unit" | "minimumStock",
    value: string
  ) {
    setEditForm((currentForm) =>
      currentForm ? { ...currentForm, [field]: value } : currentForm
    );
    setEditErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
  }

  function updateEditMoneyField(field: "cost" | "salePrice", value: string) {
    setEditForm((currentForm) =>
      currentForm ? { ...currentForm, [field]: formatIntegerInput(value) } : currentForm
    );
    setEditErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
  }

  function updateAdjustmentField(
    field: keyof InventoryAdjustmentFormState,
    value: string
  ) {
    setAdjustmentForm((currentForm) => ({ ...currentForm, [field]: value }));
    setAdjustmentErrors((currentErrors) => ({
      ...currentErrors,
      [field]: undefined
    }));
    setAdjustmentMessage("");
  }

  function validateEditForm(input: ProductEditFormState): {
    cost: number | null;
    errors: ProductEditFormErrors;
    minimumStock: number | null;
    salePrice: number | null;
  } {
    const nextErrors: ProductEditFormErrors = {};
    const cost = parseNonNegativeInteger(input.cost);
    const salePrice = parseNonNegativeInteger(input.salePrice);
    const minimumStock = parseNonNegativeInteger(input.minimumStock);

    if (input.sku.trim() === "") {
      nextErrors.sku = "El codigo es obligatorio.";
    }
    if (input.name.trim() === "") {
      nextErrors.name = "El nombre es obligatorio.";
    }
    if (input.unit.trim() === "") {
      nextErrors.unit = "La unidad de medida es obligatoria.";
    }
    if (cost === null) {
      nextErrors.cost = "El costo debe ser cero o mayor.";
    }
    if (salePrice === null) {
      nextErrors.salePrice = "El precio de venta debe ser cero o mayor.";
    }
    if (minimumStock === null) {
      nextErrors.minimumStock = "El stock minimo debe ser cero o mayor.";
    }

    return { cost, errors: nextErrors, minimumStock, salePrice };
  }

  function startEditProduct(product: ProductRecord) {
    setEditingProductId(product.id);
    setEditForm({
      cost: formatIntegerInput(String(product.costMinor)),
      minimumStock: String(product.minimumStock),
      name: product.name,
      salePrice: formatIntegerInput(String(product.salePriceMinor)),
      sku: product.sku,
      unit: product.unit
    });
    setEditErrors({});
  }

  async function submitEditProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingProduct || !editForm) {
      return;
    }

    const validation = validateEditForm(editForm);
    setEditErrors(validation.errors);

    if (
      Object.keys(validation.errors).length > 0 ||
      validation.cost === null ||
      validation.salePrice === null ||
      validation.minimumStock === null
    ) {
      return;
    }

    const saved = await onUpdateProduct({
      ...editingProduct,
      costMinor: validation.cost,
      minimumStock: validation.minimumStock,
      name: editForm.name.trim(),
      salePriceMinor: validation.salePrice,
      sku: editForm.sku.trim(),
      unit: editForm.unit
    });

    if (!saved) {
      return;
    }

    setEditingProductId(null);
    setEditForm(null);
    setEditErrors({});
  }

  async function setProductActive(product: ProductRecord, active: boolean) {
    await onUpdateProduct({ ...product, active });
  }

  async function submitProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: ProductFormErrors = {};
    const quantity = parseNonNegativeInteger(form.quantity);
    const cost = parseNonNegativeInteger(form.cost);
    const salePrice = parseNonNegativeInteger(form.salePrice);
    const minimumStock = parseNonNegativeInteger(form.minimumStock);

    if (form.sku.trim() === "") {
      nextErrors.sku = "El codigo es obligatorio.";
    }
    if (form.name.trim() === "") {
      nextErrors.name = "El nombre es obligatorio.";
    }
    if (form.unit.trim() === "") {
      nextErrors.unit = "La unidad de medida es obligatoria.";
    }
    if (quantity === null) {
      nextErrors.quantity = "La cantidad inicial debe ser cero o mayor.";
    }
    if (cost === null) {
      nextErrors.cost = "El costo debe ser cero o mayor.";
    }
    if (salePrice === null) {
      nextErrors.salePrice = "El precio de venta debe ser cero o mayor.";
    }
    if (minimumStock === null) {
      nextErrors.minimumStock = "El stock minimo debe ser cero o mayor.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const created = await onCreateProduct({
      active: true,
      costMinor: cost!,
      id: `product-${Date.now()}`,
      minimumStock: minimumStock!,
      name: form.name.trim(),
      salePriceMinor: salePrice!,
      sku: form.sku.trim(),
      stock: quantity!,
      unit: form.unit
    });

    if (!created) {
      return;
    }

    setForm(emptyProductForm);
    onCloseForm();
  }

  async function submitInventoryAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: InventoryAdjustmentFormErrors = {};
    const quantity = parseNonNegativeInteger(adjustmentForm.quantity);

    if (adjustmentForm.productId === "") {
      nextErrors.productId = "Selecciona un producto activo.";
    }
    if (quantity === null) {
      nextErrors.quantity = "La cantidad debe ser cero o mayor.";
    } else if (adjustmentForm.adjustmentType !== "set" && quantity <= 0) {
      nextErrors.quantity = "La cantidad debe ser mayor a cero.";
    }
    if (adjustmentForm.reason.trim() === "") {
      nextErrors.reason = "El motivo es obligatorio.";
    }
    if (
      selectedAdjustmentProduct &&
      quantity !== null &&
      adjustmentForm.adjustmentType === "exit" &&
      quantity > selectedAdjustmentProduct.stock
    ) {
      nextErrors.quantity = "La salida no puede superar el stock actual.";
    }

    setAdjustmentErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0 || quantity === null) {
      return;
    }

    const error = await onRegisterInventoryAdjustment({
      adjustmentType: adjustmentForm.adjustmentType,
      productId: adjustmentForm.productId,
      quantity,
      reason: adjustmentForm.reason
    });

    if (error) {
      setAdjustmentMessage(error);
      return;
    }

    setAdjustmentForm(emptyInventoryAdjustmentForm);
    setAdjustmentErrors({});
    setAdjustmentMessage("");
  }

  return (
    <section className="products-layout">
      {formVisible ? (
        <form className="product-form section-form-shell" onSubmit={submitProduct}>
          <div className="form-grid">
            <TextField
              error={errors.sku}
              label="Codigo"
              onChange={(value) => updateField("sku", value)}
              value={form.sku}
            />
            <TextField
              error={errors.name}
              label="Producto"
              onChange={(value) => updateField("name", value)}
              value={form.name}
            />
            <label className="field" htmlFor="unidad-medida-producto">
              <span>Unidad</span>
              <select
                aria-invalid={Boolean(errors.unit)}
                id="unidad-medida-producto"
                onChange={(event) => updateField("unit", event.target.value)}
                value={form.unit}
              >
                {productUnitOptions.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
              {errors.unit ? <small>{errors.unit}</small> : null}
            </label>
            <TextField
              error={errors.quantity}
              inputMode="numeric"
              label="Cantidad inicial"
              onChange={(value) => updateField("quantity", value)}
              value={form.quantity}
            />
            <TextField
              error={errors.cost}
              inputMode="numeric"
              label="Costo"
              onChange={(value) => updateMoneyField("cost", value)}
              value={form.cost}
            />
            <TextField
              error={errors.salePrice}
              inputMode="numeric"
              label="Precio venta"
              onChange={(value) => updateMoneyField("salePrice", value)}
              value={form.salePrice}
            />
            <TextField
              error={errors.minimumStock}
              inputMode="numeric"
              label="Stock minimo"
              onChange={(value) => updateField("minimumStock", value)}
              value={form.minimumStock}
            />
          </div>
          <FormActions>
            <PrimaryActionButton type="submit">Guardar producto</PrimaryActionButton>
          </FormActions>
        </form>
      ) : null}

      {editingProduct && editForm ? (
        <form className="product-form section-form-shell" onSubmit={submitEditProduct}>
          <div className="form-grid">
            <TextField
              error={editErrors.sku}
              label="Codigo"
              onChange={(value) => updateEditField("sku", value)}
              value={editForm.sku}
            />
            <TextField
              error={editErrors.name}
              label="Producto"
              onChange={(value) => updateEditField("name", value)}
              value={editForm.name}
            />
            <label className="field" htmlFor="unidad-edicion-producto">
              <span>Unidad</span>
              <select
                aria-invalid={Boolean(editErrors.unit)}
                id="unidad-edicion-producto"
                onChange={(event) => updateEditField("unit", event.target.value)}
                value={editForm.unit}
              >
                {productUnitOptions.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
              {editErrors.unit ? <small>{editErrors.unit}</small> : null}
            </label>
            <TextField
              label="Stock actual"
              onChange={() => undefined}
              readOnly
              value={String(editingProduct.stock)}
            />
            <TextField
              error={editErrors.cost}
              inputMode="numeric"
              label="Costo"
              onChange={(value) => updateEditMoneyField("cost", value)}
              value={editForm.cost}
            />
            <TextField
              error={editErrors.salePrice}
              inputMode="numeric"
              label="Precio venta"
              onChange={(value) => updateEditMoneyField("salePrice", value)}
              value={editForm.salePrice}
            />
            <TextField
              error={editErrors.minimumStock}
              inputMode="numeric"
              label="Stock minimo"
              onChange={(value) => updateEditField("minimumStock", value)}
              value={editForm.minimumStock}
            />
          </div>
          <FormActions>
            <SecondaryActionButton
              onClick={() => {
                setEditingProductId(null);
                setEditForm(null);
                setEditErrors({});
              }}
            >
              Cancelar
            </SecondaryActionButton>
            <PrimaryActionButton type="submit">Guardar cambios</PrimaryActionButton>
          </FormActions>
        </form>
      ) : null}

      <form className="product-form section-form-shell" onSubmit={submitInventoryAdjustment}>
        <div className="form-grid">
          <label className="field" htmlFor="producto-ajuste-inventario">
            <span>Producto a ajustar</span>
            <select
              aria-invalid={Boolean(adjustmentErrors.productId)}
              id="producto-ajuste-inventario"
              onChange={(event) =>
                updateAdjustmentField("productId", event.target.value)
              }
              value={adjustmentForm.productId}
            >
              <option value="">Seleccionar producto</option>
              {activeProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
            {adjustmentErrors.productId ? (
              <small>{adjustmentErrors.productId}</small>
            ) : null}
          </label>
          <label className="field" htmlFor="tipo-ajuste-inventario">
            <span>Tipo de ajuste</span>
            <select
              id="tipo-ajuste-inventario"
              onChange={(event) =>
                updateAdjustmentField(
                  "adjustmentType",
                  event.target.value as InventoryAdjustmentType
                )
              }
              value={adjustmentForm.adjustmentType}
            >
              <option value="entry">Entrada</option>
              <option value="exit">Salida</option>
              <option value="set">Conteo fisico</option>
            </select>
          </label>
          <TextField
            error={adjustmentErrors.quantity}
            inputMode="numeric"
            label={adjustmentForm.adjustmentType === "set" ? "Nuevo stock" : "Cantidad"}
            onChange={(value) => updateAdjustmentField("quantity", value)}
            value={adjustmentForm.quantity}
          />
          <TextField
            error={adjustmentErrors.reason}
            label="Motivo"
            onChange={(value) => updateAdjustmentField("reason", value)}
            value={adjustmentForm.reason}
          />
        </div>
        <div className="product-adjustment-preview">
          <span>
            Stock actual:{" "}
            <strong>
              {selectedAdjustmentProduct
                ? `${selectedAdjustmentProduct.stock} ${selectedAdjustmentProduct.unit}`
                : "-"}
            </strong>
          </span>
          <span>
            Stock despues:{" "}
            <strong>
              {previewNextStock === null || !selectedAdjustmentProduct
                ? "-"
                : `${Math.max(previewNextStock, 0)} ${selectedAdjustmentProduct.unit}`}
            </strong>
          </span>
        </div>
        {adjustmentMessage ? <p className="form-error">{adjustmentMessage}</p> : null}
        <FormActions>
          <PrimaryActionButton type="submit">Registrar ajuste</PrimaryActionButton>
        </FormActions>
      </form>

      {products.length > 0 ? (
        <>
          <ProductTable
            formatCurrency={formatCurrency}
            isLowStock={isLowStock}
            onEditProduct={startEditProduct}
            onSetProductActive={setProductActive}
            products={products}
          />
          <InventoryAdjustmentTable adjustments={inventoryAdjustments} />
        </>
      ) : (
        <EmptyState
          body="Crea productos para empezar a controlar inventario."
          className="section-empty"
          title="Sin productos registrados"
        />
      )}
    </section>
  );
}

type InventoryAdjustmentTableProps = {
  adjustments: InventoryAdjustmentRecord[];
};

function InventoryAdjustmentTable({ adjustments }: InventoryAdjustmentTableProps) {
  if (adjustments.length === 0) {
    return null;
  }

  return (
    <DataTable ariaLabel="Ajustes de inventario">
      <DataTableHeader
        labels={[
          "Fecha",
          "Producto",
          "Tipo",
          "Cantidad",
          "Stock anterior",
          "Stock nuevo",
          "Motivo"
        ]}
      />
      <tbody>
        {adjustments.slice(0, 12).map((adjustment) => (
          <tr key={adjustment.id}>
            <td>{adjustment.occurredAtLabel}</td>
            <td>{adjustment.productName}</td>
            <td>{inventoryAdjustmentLabels[adjustment.adjustmentType]}</td>
            <td>
              {formatInventoryAdjustmentQuantity(adjustment)} {adjustment.unit}
            </td>
            <td>{adjustment.previousStock}</td>
            <td>{adjustment.nextStock}</td>
            <td>{adjustment.reason}</td>
          </tr>
        ))}
      </tbody>
    </DataTable>
  );
}

function formatInventoryAdjustmentQuantity(
  adjustment: InventoryAdjustmentRecord
): string {
  if (adjustment.adjustmentType === "entry") {
    return `+${adjustment.quantity}`;
  }

  if (adjustment.adjustmentType === "exit") {
    return `-${adjustment.quantity}`;
  }

  return String(adjustment.quantity);
}

type ProductTableProps = {
  formatCurrency: (minor: number) => string;
  isLowStock: (product: ProductRecord) => boolean;
  onEditProduct: (product: ProductRecord) => void;
  onSetProductActive: (product: ProductRecord, active: boolean) => void;
  products: ProductRecord[];
};

function ProductTable({
  formatCurrency,
  isLowStock,
  onEditProduct,
  onSetProductActive,
  products
}: ProductTableProps) {
  return (
    <DataTable ariaLabel="Productos registrados">
      <DataTableHeader
        labels={[
          "Codigo",
          "Producto",
          "Unidad",
          "Costo",
          "Precio venta",
          "Stock",
          "Minimo",
          "Estado",
          "Acciones"
        ]}
      />
      <tbody>
        {products.map((product) => (
          <tr key={product.id}>
            <td>{product.sku}</td>
            <td>{product.name}</td>
            <td>{product.unit}</td>
            <td>{formatCurrency(product.costMinor)}</td>
            <td>{formatCurrency(product.salePriceMinor)}</td>
            <td>{product.stock}</td>
            <td>{product.minimumStock}</td>
            <td>
              <StatusBadge
                tone={!product.active ? "inactive" : isLowStock(product) ? "warning" : "ok"}
              >
                {!product.active
                  ? "Inactivo"
                  : isLowStock(product)
                    ? "Bajo stock"
                    : "Disponible"}
              </StatusBadge>
            </td>
            <td>
              <SecondaryActionButton
                onClick={() => onEditProduct(product)}
                variant="compact"
              >
                Editar
              </SecondaryActionButton>
              <SecondaryActionButton
                onClick={() => onSetProductActive(product, !product.active)}
                variant="compact"
              >
                {product.active ? "Inactivar" : "Reactivar"}
              </SecondaryActionButton>
            </td>
          </tr>
        ))}
      </tbody>
    </DataTable>
  );
}

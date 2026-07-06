import { useState, type FormEvent } from "react";
import { EmptyState } from "../../components/EmptyState";
import { StatusBadge } from "../../components/StatusBadge";
import { TextField } from "../../components/TextField";
import type { ProductRecord } from "../../types";

type ProductFormState = {
  sku: string;
  name: string;
  quantity: string;
  cost: string;
  salePrice: string;
  minimumStock: string;
};

type ProductFormErrors = Partial<Record<keyof ProductFormState, string>>;

const emptyProductForm: ProductFormState = {
  sku: "",
  name: "",
  quantity: "",
  cost: "",
  salePrice: "",
  minimumStock: ""
};

type ProductsSectionProps = {
  formVisible: boolean;
  formatCurrency: (minor: number) => string;
  formatIntegerInput: (value: string) => string;
  isLowStock: (product: ProductRecord) => boolean;
  onCloseForm: () => void;
  onCreateProduct: (product: ProductRecord) => void;
  parseNonNegativeInteger: (value: string) => number | null;
  products: ProductRecord[];
};

export function ProductsSection({
  formVisible,
  formatCurrency,
  formatIntegerInput,
  isLowStock,
  onCloseForm,
  onCreateProduct,
  parseNonNegativeInteger,
  products
}: ProductsSectionProps) {
  const [form, setForm] = useState<ProductFormState>(emptyProductForm);
  const [errors, setErrors] = useState<ProductFormErrors>({});

  function updateField(
    field: "sku" | "name" | "quantity" | "minimumStock",
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

  function submitProduct(event: FormEvent<HTMLFormElement>) {
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
    if (quantity === null) {
      nextErrors.quantity = "La unidad debe ser cero o mayor.";
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

    onCreateProduct({
      active: true,
      costMinor: cost!,
      id: `product-${Date.now()}`,
      minimumStock: minimumStock!,
      name: form.name.trim(),
      salePriceMinor: salePrice!,
      sku: form.sku.trim(),
      stock: quantity!
    });
    setForm(emptyProductForm);
    onCloseForm();
  }

  return (
    <section className="products-layout">
      {formVisible ? (
        <form className="product-form" onSubmit={submitProduct}>
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
            <TextField
              error={errors.quantity}
              inputMode="numeric"
              label="Unidad"
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
          <div className="form-actions">
            <button type="submit">Guardar producto</button>
          </div>
        </form>
      ) : null}

      {products.length > 0 ? (
        <ProductTable
          formatCurrency={formatCurrency}
          isLowStock={isLowStock}
          products={products}
        />
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

type ProductTableProps = {
  formatCurrency: (minor: number) => string;
  isLowStock: (product: ProductRecord) => boolean;
  products: ProductRecord[];
};

function ProductTable({
  formatCurrency,
  isLowStock,
  products
}: ProductTableProps) {
  return (
    <table className="data-table" aria-label="Productos registrados">
      <thead>
        <tr>
          <th>Codigo</th>
          <th>Producto</th>
          <th>Costo</th>
          <th>Precio venta</th>
          <th>Stock</th>
          <th>Minimo</th>
          <th>Estado</th>
        </tr>
      </thead>
      <tbody>
        {products.map((product) => (
          <tr key={product.id}>
            <td>{product.sku}</td>
            <td>{product.name}</td>
            <td>{formatCurrency(product.costMinor)}</td>
            <td>{formatCurrency(product.salePriceMinor)}</td>
            <td>{product.stock}</td>
            <td>{product.minimumStock}</td>
            <td>
              <StatusBadge tone={isLowStock(product) ? "warning" : "ok"}>
                {isLowStock(product) ? "Bajo stock" : "Disponible"}
              </StatusBadge>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

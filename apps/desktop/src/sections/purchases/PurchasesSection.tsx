import { Fragment, useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { parseLocalDate } from "../../lib/dates";
import type { InvoicePdfResult } from "../../invoice-pdf";
import { DataTable } from "../../components/DataTable";
import { DataTableHeader } from "../../components/DataTableHeader";
import { EmptyState } from "../../components/EmptyState";
import { FormActions } from "../../components/FormActions";
import { InlineActionGroup } from "../../components/InlineActionGroup";
import { InlineFormSection } from "../../components/InlineFormSection";
import { PrimaryActionButton } from "../../components/PrimaryActionButton";
import { PurchaseDetails } from "../../components/PurchaseDetails";
import { PurchasePrintDocument } from "../../components/PurchasePrintDocument";
import { SecondaryActionButton } from "../../components/SecondaryActionButton";
import { SummaryCard } from "../../components/SummaryCard";
import { TextField } from "../../components/TextField";
import type {
  AppSettings,
  ProductRecord,
  PurchaseExpenseCategory,
  PurchasePaymentStatus,
  PurchaseRecord,
  SupplierFormErrors,
  SupplierFormState,
  SupplierRecord,
  SupplierPayableRecord
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
  expenseCategory: PurchaseExpenseCategory;
  prefix: string;
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

type PurchaseLineFormState = Pick<
  PurchaseFormState,
  "productId" | "unit" | "quantity" | "unitCost" | "discountPercent" | "taxPercent"
>;

type PurchaseProductFormState = {
  sku: string;
  name: string;
  unit: string;
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
  onCreateProduct: (product: ProductRecord) => Promise<boolean>;
  onCreateSupplier: (input: SupplierFormState) => Promise<SupplierRecord | null>;
  onDeletePurchase: (purchaseId: string) => Promise<string | null>;
  onUpdatePurchase: (purchase: PurchaseRecord) => Promise<string | null>;
  settings?: AppSettings | undefined;
  onRegisterPurchase: (input: {
    supplier: SupplierRecord;
    branch: string;
    prefix: string;
    concept: string;
    invoiceNumber: string;
    issuedAt: string;
    dueAt: string;
    expenseCategory: PurchaseExpenseCategory;
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
  }) => Promise<boolean>;
  parseNonNegativeInteger: (value: string) => number | null;
  products: ProductRecord[];
  purchases: PurchaseRecord[];
  suppliers: SupplierRecord[];
  supplierPayables: SupplierPayableRecord[];
};

type PurchaseDeleteNotice = {
  kind: "error" | "success";
  message: string;
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
  concept: "Factura de compra",
  dueAt: "",
  expenseCategory: "inventory",
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
  sku: "",
  unit: "Unidad"
};

const productUnitOptions = ["Unidad", "Kg", "Libra", "Metro", "Caja", "Paquete"];

const expenseCategoryOptions: Array<{
  label: string;
  value: PurchaseExpenseCategory;
}> = [
  { label: "Inventario / proveedores", value: "inventory" },
  { label: "Servicios", value: "services" },
  { label: "Nomina", value: "payroll" },
  { label: "Arriendo", value: "rent" },
  { label: "Transporte", value: "transport" },
  { label: "Impuestos", value: "taxes" },
  { label: "Otros", value: "other" }
];

function formatExpenseCategory(category: PurchaseExpenseCategory): string {
  return (
    expenseCategoryOptions.find((option) => option.value === category)?.label ??
    "Otros"
  );
}

export function PurchasesSection({
  formatCurrency,
  formatIntegerInput,
  onCreateProduct,
  onCreateSupplier,
  onDeletePurchase,
  onUpdatePurchase,
  onRegisterPurchase,
  settings,
  parseNonNegativeInteger,
  products,
  purchases,
  suppliers,
  supplierPayables
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
  const [editingDraftLine, setEditingDraftLine] = useState<{
    id: string;
    form: PurchaseLineFormState;
    errors: PurchaseFormErrors;
  } | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<PurchaseRecord | null>(null);
  const [deleteNotice, setDeleteNotice] = useState<PurchaseDeleteNotice | null>(null);
  const [detailPurchaseId, setDetailPurchaseId] = useState<string | null>(null);
  const [editingPurchase, setEditingPurchase] = useState<PurchaseRecord | null>(null);
  const [draftBeforeEdit, setDraftBeforeEdit] = useState<{ form: PurchaseFormState; lines: PurchaseDraftLine[] } | null>(null);
  const [saving, setSaving] = useState(false);
  const [printPurchase, setPrintPurchase] = useState<PurchaseRecord | null>(null);
  const [invoicePreview, setInvoicePreview] = useState<InvoicePdfResult | null>(null);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);

  const selectedSupplier =
    suppliers.find((supplier) => supplier.id === form.supplierId) ?? null;
  const activeSuppliers = suppliers.filter((supplier) => supplier.active || supplier.id === editingPurchase?.supplierId);
  const activeProducts = products.filter((product) => product.active || (editingPurchase && purchaseLines.some((line) => line.product.id === product.id)));
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
  const documentNumber = editingPurchase ? form.invoiceNumber : formatDocumentNumber(form.prefix, nextInvoiceNumber);

  useEffect(() => {
    if (!printPurchase) return;
    const finishPrinting = () => setPrintPurchase(null);
    window.addEventListener("afterprint", finishPrinting);
    const frame = requestAnimationFrame(() => window.print());
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("afterprint", finishPrinting);
    };
  }, [printPurchase]);

  function beginPurchaseEdit(purchase: PurchaseRecord) {
    const sourceLines = purchase.lines.length > 0 ? purchase.lines : [{
      id: `${purchase.id}-legacy-line`, productId: purchase.productId, productName: purchase.productName,
      unit: products.find((product) => product.id === purchase.productId)?.unit ?? "Unidad",
      quantity: purchase.quantity, unitCostMinor: purchase.unitCostMinor,
      discountPercent: 0, discountMinor: 0, taxPercent: 0, taxMinor: 0,
      subtotalMinor: purchase.totalMinor, totalMinor: purchase.totalMinor
    }];
    if (sourceLines.some((line) => !products.some((product) => product.id === line.productId))) {
      setDeleteNotice({ kind: "error", message: "Uno de los productos de la compra ya no esta disponible." });
      return;
    }
    if (!editingPurchase) setDraftBeforeEdit({ form, lines: purchaseLines });
    setEditingPurchase(purchase);
    setForm({
      ...emptyPurchaseForm, branch: purchase.branch, prefix: purchase.prefix, concept: purchase.concept,
      supplierId: purchase.supplierId, invoiceNumber: purchase.invoiceNumber,
      issuedAt: purchase.issuedAt || new Date(purchase.occurredAtMs).toLocaleDateString("en-CA"),
      dueAt: supplierPayables.find((payable) => payable.purchaseId === purchase.id)?.dueAt || purchase.dueAt,
      expenseCategory: purchase.expenseCategory, paymentStatus: purchase.paymentStatus
    });
    setPurchaseLines(sourceLines.map((line) => ({ ...line, product: { ...products.find((product) => product.id === line.productId)!, name: line.productName } })));
    setEditingDraftLine(null);
    setErrors({});
    setDeleteNotice(null);
    document.querySelector(".purchase-form")?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }

  function finishPurchaseEdit() {
    setEditingPurchase(null);
    setEditingDraftLine(null);
    setForm(draftBeforeEdit?.form ?? emptyPurchaseForm);
    setPurchaseLines(draftBeforeEdit?.lines ?? []);
    setDraftBeforeEdit(null);
    setErrors({});
  }

  async function generatePurchasePdf(purchase: PurchaseRecord) {
    try {
      const { generatePurchasePdf } = await import("../../purchase-pdf");
      setInvoicePreview(generatePurchasePdf({
        purchase, settings,
        supplier: suppliers.find((supplier) => supplier.id === purchase.supplierId),
        payable: supplierPayables.find((payable) => payable.purchaseId === purchase.id)
      }));
      setInvoiceError(null);
    } catch {
      setInvoicePreview(null);
      setInvoiceError("No se pudo generar el PDF de la compra.");
    }
  }

  useEffect(() => {
    if (!selectedProduct) {
      return;
    }

    setForm((currentForm) =>
      currentForm.productId === selectedProduct.id
        ? { ...currentForm, unit: selectedProduct.unit }
        : currentForm
    );
  }, [selectedProduct]);

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

  async function submitSupplier() {
    const nextErrors: SupplierFormErrors = {};

    if (supplierForm.name.trim() === "") {
      nextErrors.name = "El nombre del proveedor es obligatorio.";
    }

    setSupplierErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const supplier = await onCreateSupplier(supplierForm);

    if (!supplier) {
      return;
    }

    setForm((currentForm) => ({ ...currentForm, supplierId: supplier.id }));
    setSupplierForm(emptySupplierForm);
    setSupplierErrors({});
    setSupplierFormVisible(false);
  }

  async function submitProduct() {
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
      stock: 0,
      unit: productForm.unit
    };

    const created = await onCreateProduct(product);

    if (!created) {
      return;
    }

    setForm((currentForm) => ({ ...currentForm, productId: product.id }));
    setProductForm(emptyPurchaseProductForm);
    setProductErrors({});
    setProductFormVisible(false);
  }

  function validateDraftLine(draft: PurchaseLineFormState = form): {
    errors: PurchaseFormErrors;
    parsedQuantity: number | null;
    parsedUnitCost: number | null;
    parsedDiscountPercent: number | null;
    parsedTaxPercent: number | null;
  } {
    const nextErrors: PurchaseFormErrors = {};
    const parsedQuantity = parseNonNegativeInteger(draft.quantity);
    const parsedUnitCost = parseNonNegativeInteger(draft.unitCost);
    const parsedDiscountPercent = parsePercentage(draft.discountPercent);
    const parsedTaxPercent = parsePercentage(draft.taxPercent);

    if (!activeProducts.some((product) => product.id === draft.productId)) {
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

  function beginDraftLineEdit(line: PurchaseDraftLine) {
    setEditingDraftLine({
      id: line.id,
      form: {
        productId: line.product.id,
        unit: line.unit,
        quantity: String(line.quantity),
        unitCost: formatIntegerInput(String(line.unitCostMinor)),
        discountPercent: String(line.discountPercent),
        taxPercent: String(line.taxPercent)
      },
      errors: {}
    });
    setErrors((currentErrors) => ({ ...currentErrors, submit: undefined }));
  }

  function updateDraftLineField(field: keyof PurchaseLineFormState, value: string) {
    setEditingDraftLine((current) => {
      if (!current) {
        return current;
      }

      const product = field === "productId"
        ? products.find((candidate) => candidate.id === value)
        : null;

      return {
        ...current,
        form: {
          ...current.form,
          [field]: value,
          ...(product ? { unit: product.unit } : {})
        },
        errors: { ...current.errors, [field]: undefined }
      };
    });
  }

  function finishDraftLineEdit() {
    setEditingDraftLine(null);
    setErrors((currentErrors) => ({ ...currentErrors, submit: undefined }));
  }

  function saveDraftLineEdit() {
    if (!editingDraftLine) {
      return;
    }

    const validation = validateDraftLine(editingDraftLine.form);
    const product = products.find((candidate) => candidate.id === editingDraftLine.form.productId);

    if (
      Object.keys(validation.errors).length > 0 ||
      !product ||
      validation.parsedQuantity === null ||
      validation.parsedUnitCost === null ||
      validation.parsedDiscountPercent === null ||
      validation.parsedTaxPercent === null
    ) {
      setEditingDraftLine({ ...editingDraftLine, errors: validation.errors });
      return;
    }

    const calculation = calculateDocumentLine({
      quantity: validation.parsedQuantity,
      unitAmountMinor: validation.parsedUnitCost,
      discountPercent: validation.parsedDiscountPercent,
      taxPercent: validation.parsedTaxPercent
    });
    const updatedLine: PurchaseDraftLine = {
      id: editingDraftLine.id,
      product,
      unit: editingDraftLine.form.unit,
      quantity: validation.parsedQuantity,
      unitCostMinor: validation.parsedUnitCost,
      discountPercent: validation.parsedDiscountPercent,
      discountMinor: calculation.discountMinor,
      taxPercent: validation.parsedTaxPercent,
      taxMinor: calculation.taxMinor,
      subtotalMinor: calculation.subtotalMinor,
      totalMinor: calculation.totalMinor
    };

    setPurchaseLines((currentLines) => currentLines.map((line) =>
      line.id === updatedLine.id ? updatedLine : line
    ));
    finishDraftLineEdit();
  }

  function removeDraftLine(lineId: string) {
    setPurchaseLines((currentLines) => currentLines.filter((line) => line.id !== lineId));
    if (editingDraftLine?.id === lineId) {
      finishDraftLineEdit();
    }
    setErrors((currentErrors) => ({ ...currentErrors, submit: undefined }));
  }

  function addPurchaseLine() {
    const validation = validateDraftLine();

    setErrors((currentErrors) => ({
      ...currentErrors,
      productId: validation.errors.productId,
      quantity: validation.errors.quantity,
      unitCost: validation.errors.unitCost,
      discountPercent: validation.errors.discountPercent,
      taxPercent: validation.errors.taxPercent
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
        id: `purchase-line-${crypto.randomUUID()}`,
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

  async function submitPurchase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    if (editingDraftLine) {
      setErrors({ submit: "Guarda o cancela la edicion del producto antes de registrar la compra." });
      return;
    }

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
    if (!parseLocalDate(form.issuedAt)) {
      nextErrors.issuedAt = "La fecha de emision es obligatoria.";
    }
    if (form.paymentStatus === "pending" && !parseLocalDate(form.dueAt)) {
      nextErrors.dueAt =
        "La fecha de vencimiento es obligatoria para compras pendientes.";
    }
    if (purchaseLines.length === 0 || hasDraftLine) {
      Object.assign(nextErrors, lineValidation.errors);
    }
    if (editingPurchase && !documentNumber.trim()) {
      nextErrors.invoiceNumber = "El numero de factura es obligatorio.";
    }

    setErrors(nextErrors);

    if (
      Object.keys(nextErrors).length > 0 ||
      !selectedSupplier ||
      linesToRegister.length === 0
    ) {
      return;
    }

    setSaving(true);
    try {
      if (editingPurchase) {
        const lines = linesToRegister.map((line) => ({
          id: line.id, productId: line.product.id, productName: line.product.name, unit: line.unit,
          quantity: line.quantity, unitCostMinor: line.unitCostMinor, discountPercent: line.discountPercent,
          discountMinor: line.discountMinor, taxPercent: line.taxPercent, taxMinor: line.taxMinor,
          subtotalMinor: line.subtotalMinor, totalMinor: line.totalMinor
        }));
        const firstLine = lines[0]!;
        const updateError = await onUpdatePurchase({
          ...editingPurchase,
          branch: form.branch.trim() || "Principal", prefix: form.prefix.trim(),
          concept: form.concept.trim() || "Factura de compra", invoiceNumber: documentNumber.trim(),
          supplierId: selectedSupplier.id, supplierName: selectedSupplier.name,
          issuedAt: form.issuedAt, dueAt: form.paymentStatus === "pending" ? form.dueAt : "",
          paymentStatus: form.paymentStatus, expenseCategory: form.expenseCategory, lines,
          productId: firstLine.productId, productName: lines.length === 1 ? firstLine.productName : `${lines.length} productos`,
          quantity: lines.reduce((total, line) => total + line.quantity, 0),
          unitCostMinor: firstLine.unitCostMinor, totalMinor: lines.reduce((total, line) => total + line.totalMinor, 0)
        });
        if (updateError) { setErrors({ submit: updateError }); return; }
        finishPurchaseEdit();
        setInvoicePreview(null);
        setDeleteNotice({ kind: "success", message: "Factura de compra actualizada." });
        return;
      }
      const registered = await onRegisterPurchase({
        branch: form.branch.trim() || "Principal",
        concept: form.concept.trim() || "Factura de compra",
        dueAt: form.paymentStatus === "pending" ? form.dueAt.trim() : "",
        expenseCategory: form.expenseCategory,
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
        supplier: selectedSupplier
      });

      if (!registered) {
        return;
      }

      setErrors({});
      setPurchaseLines([]);
      setForm(emptyPurchaseForm);
    } catch {
      setErrors({ submit: "No se pudo guardar la factura de compra." });
    } finally {
      setSaving(false);
    }
  }

  async function confirmPurchaseDeletion() {
    if (!deleteCandidate) {
      return;
    }

    const deletedPurchase = deleteCandidate;
    const deleteError = await onDeletePurchase(deletedPurchase.id);

    if (deleteError) {
      setDeleteNotice({ kind: "error", message: deleteError });
      return;
    }

    setDeleteCandidate(null);
    if (editingPurchase?.id === deletedPurchase.id) finishPurchaseEdit();
    setInvoicePreview(null);
    setDeleteNotice({
      kind: "success",
      message: `Compra ${deletedPurchase.invoiceNumber} eliminada.`
    });
  }

  return (
    <section className="purchases-layout">
      <form className="purchase-form section-form-shell" onSubmit={submitPurchase}>
        {editingPurchase && <div className="document-lines-heading"><h2>Editar compra {editingPurchase.invoiceNumber}</h2><span>Al guardar se ajustaran el inventario y la cuenta por pagar.</span></div>}
        <section className="document-header" aria-label="Encabezado de la compra">
          <div className="document-header-grid">
            <TextField label="Sucursal" onChange={(value) => updateField("branch", value)} value={form.branch} />
            <TextField label="Prefijo" onChange={(value) => updateField("prefix", value)} placeholder="Sin prefijo" value={form.prefix} />
            <TextField error={errors.invoiceNumber} label="Numero" onChange={(value) => updateField("invoiceNumber", value)} readOnly={!editingPurchase} value={documentNumber} />
            <label className="field" htmlFor="proveedor-compra"><span>Proveedor</span><select aria-invalid={Boolean(errors.supplierId)} id="proveedor-compra" onChange={(event) => updateField("supplierId", event.target.value)} value={form.supplierId}><option value="">Selecciona un proveedor</option>{activeSuppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select>{errors.supplierId ? <small>{errors.supplierId}</small> : null}</label>
            <TextField label="Direccion del proveedor" onChange={() => undefined} placeholder="Se completa al elegir el proveedor" readOnly value={selectedSupplier?.address ?? ""} />
            <TextField error={errors.issuedAt} label="Fecha emision" onChange={(value) => updateField("issuedAt", value)} type="date" value={form.issuedAt} />
            {form.paymentStatus === "pending" ? <TextField error={errors.dueAt} label="Fecha vencimiento" onChange={(value) => updateField("dueAt", value)} type="date" value={form.dueAt} /> : null}
            <div className="field"><span>Forma de pago</span><div aria-label="Estado de factura compra" className="payment-status-group" role="radiogroup"><label htmlFor="compra-pagada"><input checked={form.paymentStatus === "paid"} id="compra-pagada" name="purchase-payment-status" onChange={() => updateField("paymentStatus", "paid")} type="radio" />Pagada</label><label htmlFor="compra-pendiente"><input checked={form.paymentStatus === "pending"} id="compra-pendiente" name="purchase-payment-status" onChange={() => updateField("paymentStatus", "pending")} type="radio" />Pendiente</label></div></div>
            <label className="field" htmlFor="categoria-egreso-compra"><span>Categoria egreso</span><select id="categoria-egreso-compra" onChange={(event) => updateField("expenseCategory", event.target.value as PurchaseExpenseCategory)} value={form.expenseCategory}>{expenseCategoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
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
              {activeProducts.map((product) => (
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
              label="Razón social"
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
            <label className="field" htmlFor="unidad-producto-compra">
              <span>Unidad producto</span>
              <select
                id="unidad-producto-compra"
                onChange={(event) => updateProductField("unit", event.target.value)}
                value={productForm.unit}
              >
                {productUnitOptions.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </label>
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
              labels={["Producto", "Unidad", "Cantidad", "Costo unitario", "Descuento", "Impuesto", "Total", "Acciones"]}
            />
            <tbody>
              {purchaseLines.map((line) => (
                <Fragment key={line.id}>
                  <tr>
                    <td>{line.product.name}</td>
                    <td>{line.unit}</td>
                    <td>{line.quantity}</td>
                    <td>{formatCurrency(line.unitCostMinor)}</td>
                    <td>{line.discountPercent}%</td>
                    <td>{line.taxPercent}%</td>
                    <td>{formatCurrency(line.totalMinor)}</td>
                    <td>
                      <InlineActionGroup className="table-inline-actions">
                        <SecondaryActionButton
                          aria-label={`Editar ${line.product.name}`}
                          disabled={editingDraftLine !== null}
                          onClick={() => beginDraftLineEdit(line)}
                          variant="compact"
                        >
                          Editar
                        </SecondaryActionButton>
                        <SecondaryActionButton
                          aria-label={`Eliminar ${line.product.name}`}
                          className="danger-action"
                          onClick={() => removeDraftLine(line.id)}
                          variant="compact"
                        >
                          Eliminar
                        </SecondaryActionButton>
                      </InlineActionGroup>
                    </td>
                  </tr>
                  {editingDraftLine?.id === line.id ? (
                    <tr>
                      <td colSpan={8}>
                        <section aria-label={`Editar producto ${line.product.name}`} className="sales-grid">
                          <label className="field" htmlFor="producto-linea-compra">
                            <span>Producto de la linea</span>
                            <select
                              aria-invalid={Boolean(editingDraftLine.errors.productId)}
                              id="producto-linea-compra"
                              onChange={(event) => updateDraftLineField("productId", event.target.value)}
                              value={editingDraftLine.form.productId}
                            >
                              {activeProducts.map((product) => (
                                <option key={product.id} value={product.id}>{product.name}</option>
                              ))}
                            </select>
                            {editingDraftLine.errors.productId ? <small>{editingDraftLine.errors.productId}</small> : null}
                          </label>
                          <label className="field" htmlFor="unidad-linea-compra">
                            <span>Unidad del producto</span>
                            <select id="unidad-linea-compra" onChange={(event) => updateDraftLineField("unit", event.target.value)} value={editingDraftLine.form.unit}>
                              <option>Unidad</option><option>Kg</option><option>Libra</option><option>Metro</option><option>Caja</option><option>Paquete</option>
                            </select>
                          </label>
                          <TextField
                            error={editingDraftLine.errors.quantity}
                            inputMode="numeric"
                            label="Cantidad del producto"
                            onChange={(value) => updateDraftLineField("quantity", value)}
                            value={editingDraftLine.form.quantity}
                          />
                          <TextField
                            error={editingDraftLine.errors.unitCost}
                            inputMode="numeric"
                            label="Costo unitario del producto"
                            onChange={(value) => updateDraftLineField("unitCost", formatIntegerInput(value))}
                            value={editingDraftLine.form.unitCost}
                          />
                          <TextField
                            error={editingDraftLine.errors.discountPercent}
                            inputMode="numeric"
                            label="Descuento del producto %"
                            onChange={(value) => updateDraftLineField("discountPercent", value.replace(/[^0-9]/g, ""))}
                            value={editingDraftLine.form.discountPercent}
                          />
                          <label className="field" htmlFor="impuesto-linea-compra">
                            <span>Impuesto del producto</span>
                            <select aria-invalid={Boolean(editingDraftLine.errors.taxPercent)} id="impuesto-linea-compra" onChange={(event) => updateDraftLineField("taxPercent", event.target.value)} value={editingDraftLine.form.taxPercent}>
                              <option value="0">Sin IVA</option><option value="5">IVA 5%</option><option value="19">IVA 19%</option>
                            </select>
                            {editingDraftLine.errors.taxPercent ? <small>{editingDraftLine.errors.taxPercent}</small> : null}
                          </label>
                          <InlineActionGroup>
                            <SecondaryActionButton onClick={saveDraftLineEdit}>Guardar producto</SecondaryActionButton>
                            <SecondaryActionButton onClick={finishDraftLineEdit}>Cancelar edicion</SecondaryActionButton>
                          </InlineActionGroup>
                        </section>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </DataTable>
        ) : null}

        <SummaryCard compact>
          <span>Productos agregados {purchaseLines.length}</span>
          <strong>Total factura {formatCurrency(totalMinor)}</strong>
        </SummaryCard>

        {errors.submit ? <p className="form-error" role="alert">{errors.submit}</p> : null}

        <FormActions>
          {editingPurchase && <SecondaryActionButton disabled={saving} onClick={finishPurchaseEdit}>Cancelar edicion de compra</SecondaryActionButton>}
          <PrimaryActionButton disabled={saving} type="submit">{saving ? "Guardando..." : editingPurchase ? "Guardar cambios de compra" : "Registrar compra"}</PrimaryActionButton>
        </FormActions>
      </form>

      {deleteNotice ? (
        <p
          className={deleteNotice.kind === "error" ? "form-error" : "form-success"}
          role={deleteNotice.kind === "error" ? "alert" : "status"}
        >
          {deleteNotice.message}
        </p>
      ) : null}

      {deleteCandidate ? (
        <section
          aria-label="Confirmar eliminacion de compra"
          className="product-delete-confirmation section-surface"
        >
          <div>
            <h2>Confirmar eliminacion</h2>
            <p>
              Se eliminara la compra {deleteCandidate.invoiceNumber} y se
              descontara del inventario lo que ingreso con esta factura. Si ya
              tiene abonos de proveedor, no se eliminara.
            </p>
          </div>
          <FormActions>
            <SecondaryActionButton
              onClick={() => setDeleteCandidate(null)}
              type="button"
              variant="compact"
            >
              Cancelar
            </SecondaryActionButton>
            <PrimaryActionButton onClick={confirmPurchaseDeletion} type="button">
              Confirmar eliminacion
            </PrimaryActionButton>
          </FormActions>
        </section>
      ) : null}

      {purchases.length > 0 ? (
        <DataTable ariaLabel="Compras registradas">
          <DataTableHeader
            labels={[
              "Fecha",
              "Proveedor",
              "Factura",
              "Categoria",
              "Producto",
              "Cantidad",
              "Estado",
              "Total",
              "Acciones"
            ]}
          />
          <tbody>
            {purchases.map((purchase) => (
              <Fragment key={purchase.id}>
                <tr>
                  <td>{purchase.occurredAtLabel}</td>
                  <td>{purchase.supplierName}</td>
                  <td>{purchase.invoiceNumber}</td>
                  <td>{formatExpenseCategory(purchase.expenseCategory)}</td>
                  <td>{purchase.productName}</td>
                  <td>{purchase.quantity}</td>
                  <td>{purchase.paymentStatus === "paid" ? "Pagada" : "Pendiente"}</td>
                  <td>{formatCurrency(purchase.totalMinor)}</td>
                  <td>
                    <InlineActionGroup className="table-inline-actions">
                      <SecondaryActionButton
                        className="document-detail-trigger"
                        variant="compact"
                        aria-label={`${detailPurchaseId === purchase.id ? "Ocultar" : "Ver"} detalle de compra ${purchase.invoiceNumber}`}
                        aria-expanded={detailPurchaseId === purchase.id}
                        aria-controls={`purchase-detail-${purchase.id}`}
                        onClick={() => setDetailPurchaseId((current) => current === purchase.id ? null : purchase.id)}
                      >
                        {detailPurchaseId === purchase.id ? "Ocultar detalle" : "Ver detalle"}
                      </SecondaryActionButton>
                      <SecondaryActionButton
                        disabled={saving}
                        onClick={() => beginPurchaseEdit(purchase)}
                        variant="compact"
                      >Editar compra</SecondaryActionButton>
                      <SecondaryActionButton
                        onClick={() => { setPrintPurchase({ ...purchase }); void generatePurchasePdf(purchase); }}
                        variant="compact"
                      >Imprimir</SecondaryActionButton>
                      <SecondaryActionButton
                        className="danger-action"
                        onClick={() => {
                          setDeleteCandidate(purchase);
                          setDeleteNotice(null);
                        }}
                        variant="compact"
                      >
                        Eliminar
                      </SecondaryActionButton>
                    </InlineActionGroup>
                  </td>
                </tr>
                {detailPurchaseId === purchase.id && <tr className="document-detail-row" id={`purchase-detail-${purchase.id}`}>
                  <td colSpan={9}>
                    <PurchaseDetails purchase={purchase} payable={supplierPayables.find((record) => record.purchaseId === purchase.id)} categoryLabel={formatExpenseCategory(purchase.expenseCategory)} formatCurrency={formatCurrency} />
                  </td>
                </tr>}
              </Fragment>
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
      {invoicePreview && <section className="invoice-preview" aria-label="Factura de compra PDF generada">
        <div className="invoice-preview-header"><strong>Factura de compra para imprimir</strong><a download={invoicePreview.fileName} href={invoicePreview.dataUri}>Descargar PDF</a></div>
        <iframe src={invoicePreview.dataUri} title="Vista previa de factura de compra PDF" />
      </section>}
      {invoiceError && <p className="form-error" role="alert">{invoiceError}</p>}
      {printPurchase && createPortal(<PurchasePrintDocument purchase={printPurchase} settings={settings} supplier={suppliers.find((supplier) => supplier.id === printPurchase.supplierId)} payable={supplierPayables.find((payable) => payable.purchaseId === printPurchase.id)} formatCurrency={formatCurrency} />, document.body)}
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

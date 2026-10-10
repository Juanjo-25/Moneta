import { DataTable } from "./DataTable";
import { DataTableHeader } from "./DataTableHeader";
import { parseLocalDate } from "../lib/dates";
import type { PurchaseRecord, SupplierPayableRecord } from "../types";

type PurchaseDetailsProps = {
  purchase: PurchaseRecord;
  payable: SupplierPayableRecord | undefined;
  categoryLabel: string;
  formatCurrency: (minor: number) => string;
};

export function PurchaseDetails({ purchase, payable, categoryLabel, formatCurrency }: PurchaseDetailsProps) {
  const subtotal = purchase.lines.reduce((sum, line) => sum + line.subtotalMinor, 0);
  const discount = purchase.lines.reduce((sum, line) => sum + line.discountMinor, 0);
  const tax = purchase.lines.reduce((sum, line) => sum + line.taxMinor, 0);
  const issueDate = parseLocalDate(purchase.issuedAt) ?? new Date(purchase.occurredAtMs);
  const dueAt = payable?.dueAt || purchase.dueAt;
  const field = (label: string, value: string) => (
    <div><dt>{label}</dt><dd>{value.trim() || "Sin registrar"}</dd></div>
  );

  return (
    <section className="document-detail" aria-label={`Detalle de compra ${purchase.invoiceNumber || "sin número"}`}>
      <h3>Detalle de compra {purchase.invoiceNumber || "sin número"}</h3>
      <dl className="document-detail-fields">
        {field("Proveedor", purchase.supplierName)}
        {field("Fecha de emisión", issueDate.toLocaleDateString("es-CO"))}
        {field("Sucursal", purchase.branch)}
        {field("Categoría", categoryLabel)}
        {field("Concepto", purchase.concept)}
        {field("Moneda", purchase.currency)}
        {field("Condición de la compra", purchase.paymentStatus === "paid" ? "Pagada" : "Pendiente")}
        {dueAt && field("Fecha de vencimiento", parseLocalDate(dueAt)?.toLocaleDateString("es-CO") ?? "Sin registrar")}
      </dl>
      <div className="document-detail-table">
        <DataTable ariaLabel={`Productos de compra ${purchase.invoiceNumber}`}>
          <DataTableHeader labels={["Producto", "Unidad", "Cantidad", "Costo unitario", "Subtotal", "Descuento", "Impuesto", "Total"]} />
          <tbody>
            {purchase.lines.map((line) => (
              <tr key={line.id}>
                <td>{line.productName}</td>
                <td>{line.unit}</td>
                <td>{line.quantity}</td>
                <td>{formatCurrency(line.unitCostMinor)}</td>
                <td>{formatCurrency(line.subtotalMinor)}</td>
                <td>{formatCurrency(line.discountMinor)} <small>({line.discountPercent}%)</small></td>
                <td>{formatCurrency(line.taxMinor)} <small>({line.taxPercent}%)</small></td>
                <td>{formatCurrency(line.totalMinor)}</td>
              </tr>
            ))}
            {purchase.lines.length === 0 && <tr>
              <td>{purchase.productName}</td><td>Sin registrar</td><td>{purchase.quantity}</td>
              <td>{formatCurrency(purchase.unitCostMinor)}</td><td colSpan={3}>Desglose no disponible</td>
              <td>{formatCurrency(purchase.totalMinor)}</td>
            </tr>}
          </tbody>
        </DataTable>
      </div>
      <dl className="document-detail-totals">
        {purchase.lines.length > 0 && <>
          {field("Subtotal", formatCurrency(subtotal))}
          {field("Descuentos", formatCurrency(discount))}
          {field("Base después de descuentos", formatCurrency(subtotal - discount))}
          {field("Impuestos", formatCurrency(tax))}
        </>}
        {field("Total de la compra", formatCurrency(purchase.totalMinor))}
      </dl>
      <dl className="document-detail-fields document-detail-payment">
        {field("Estado de cuenta por pagar", payable ? ({ paid: "Pagada", partial: "Abonada", pending: "Pendiente" }[payable.status]) : purchase.paymentStatus === "paid" ? "Sin saldo pendiente" : "Sin cuenta por pagar registrada")}
        {payable && field("Abonos registrados", formatCurrency(payable.paidAmountMinor))}
        {field("Saldo pendiente", payable ? formatCurrency(payable.balanceMinor) : purchase.paymentStatus === "paid" ? formatCurrency(0) : "No disponible")}
      </dl>
    </section>
  );
}

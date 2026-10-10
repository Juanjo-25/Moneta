import { DataTable } from "./DataTable";
import { DataTableHeader } from "./DataTableHeader";
import { parseLocalDate } from "../lib/dates";
import type { ReceivableRecord, SaleRecord } from "../types";

type SaleDetailsProps = {
  sale: SaleRecord;
  formatCurrency: (minor: number) => string;
  receivables?: ReceivableRecord[] | undefined;
};

function formatDate(value: string) {
  return parseLocalDate(value)?.toLocaleDateString("es-CO") ?? "Sin registrar";
}

export function SaleDetails({ sale, formatCurrency, receivables }: SaleDetailsProps) {
  const subtotal = sale.lines.reduce((sum, line) => sum + line.subtotalMinor, 0);
  const discount = sale.lines.reduce((sum, line) => sum + line.discountMinor, 0);
  const tax = sale.lines.reduce((sum, line) => sum + line.taxMinor, 0);
  const receivable = receivables?.find((record) => record.saleId === sale.id);
  const field = (label: string, value: string) => (
    <div><dt>{label}</dt><dd>{value.trim() || "Sin registrar"}</dd></div>
  );

  return (
    <section className="document-detail" aria-label={`Detalle de venta ${sale.invoiceNumber || "sin número"}`}>
      <h3>Detalle de venta {sale.invoiceNumber || "sin número"}</h3>
      <dl className="document-detail-fields">
        {field("Cliente", sale.customerName)}
        {field("NIT o C.C.", sale.customer.document)}
        {field("Dirección", sale.customer.address)}
        {field("Ciudad", sale.customer.city)}
        {field("Correo", sale.customer.email)}
        {field("Fecha de elaboración", sale.issuedAt ? formatDate(sale.issuedAt) : new Date(sale.occurredAtMs).toLocaleDateString("es-CO"))}
        {field("Sucursal", sale.branch)}
        {field("Vendedor", sale.seller)}
        {field("Condición de la venta", sale.paymentStatus === "paid" ? "Pagada" : "Pendiente")}
        {field("Moneda", sale.currency)}
        {field("Concepto", sale.concept)}
      </dl>
      <div className="document-detail-table">
        <DataTable ariaLabel={`Productos de venta ${sale.invoiceNumber}`}>
          <DataTableHeader labels={["Producto", "Unidad", "Cantidad", "Precio unitario", "Subtotal", "Descuento", "Impuesto", "Total"]} />
          <tbody>
            {sale.lines.map((line) => (
              <tr key={line.id}>
                <td>{line.productName}</td>
                <td>{line.unit}</td>
                <td>{line.quantity}</td>
                <td>{formatCurrency(line.unitPriceMinor)}</td>
                <td>{formatCurrency(line.subtotalMinor)}</td>
                <td>{formatCurrency(line.discountMinor)} <small>({line.discountPercent}%)</small></td>
                <td>{formatCurrency(line.taxMinor)} <small>({line.taxPercent}%)</small></td>
                <td>{formatCurrency(line.totalMinor)}</td>
              </tr>
            ))}
            {sale.lines.length === 0 && <tr>
              <td>{sale.productName}</td><td>Sin registrar</td><td>{sale.quantity}</td>
              <td>{formatCurrency(sale.unitPriceMinor)}</td><td colSpan={3}>Desglose no disponible</td>
              <td>{formatCurrency(sale.totalMinor)}</td>
            </tr>}
          </tbody>
        </DataTable>
      </div>
      <dl className="document-detail-totals">
        {sale.lines.length > 0 && <>
          {field("Subtotal", formatCurrency(subtotal))}
          {field("Descuentos", formatCurrency(discount))}
          {field("Base después de descuentos", formatCurrency(subtotal - discount))}
          {field("Impuestos", formatCurrency(tax))}
        </>}
        {field("Total de la venta", formatCurrency(sale.totalMinor))}
      </dl>
      {receivables && <dl className="document-detail-fields document-detail-payment">
        {field("Estado de cartera", receivable ? (receivable.status === "partial" ? "Pago parcial" : "Pendiente") : "Sin saldo pendiente")}
        {receivable && field("Abonos registrados", formatCurrency(receivable.paidAmountMinor))}
        {field("Saldo pendiente", formatCurrency(receivable?.balanceMinor ?? 0))}
        {receivable && field("Fecha de vencimiento", formatDate(receivable.dueAt))}
      </dl>}
      <dl className="document-detail-notes">
        {field("Observaciones", sale.observations)}
        {field("Notas al pie", sale.footerNote)}
      </dl>
    </section>
  );
}

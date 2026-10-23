import type { CSSProperties } from "react";
import { parseLocalDate } from "../lib/dates";
import type { PurchasePdfInput } from "../purchase-pdf";

type PurchasePrintDocumentProps = PurchasePdfInput & {
  formatCurrency: (minor: number) => string;
};

export function PurchasePrintDocument({ purchase, supplier, payable, settings, formatCurrency }: PurchasePrintDocumentProps) {
  const date = (value: string) => parseLocalDate(value)?.toLocaleDateString("es-CO") ?? (value || "Sin registrar");
  const company = settings?.company;
  const lines = purchase.lines.length > 0 ? purchase.lines : [{
    id: `${purchase.id}-legacy`, productName: purchase.productName, unit: "Sin registrar",
    quantity: purchase.quantity, unitCostMinor: purchase.unitCostMinor,
    discountPercent: 0, discountMinor: 0, taxPercent: 0, taxMinor: 0, totalMinor: purchase.totalMinor
  }];
  const accent = /^#[0-9a-f]{6}$/i.test(settings?.invoice.accentColor ?? "") ? settings!.invoice.accentColor : "#475569";
  return <article className="purchase-print-sheet" style={{ "--purchase-print-accent": accent } as CSSProperties}>
    <header className="purchase-print-header">
      <div className="purchase-print-logo">{company?.logoDataUri ? <img src={company.logoDataUri} alt="Logo de la empresa" /> : <span>Logo</span>}</div>
      <div className="purchase-print-company">
        <h1>{company?.name || "Moneta"}</h1>
        {company?.document && <p>NIT / C.C.: {company.document}</p>}
        <p>{[company?.address, company?.city].filter(Boolean).join(" | ")}</p>
        <p>{[company?.phone, company?.email].filter(Boolean).join(" | ")}</p>
      </div>
      <div className="purchase-print-number"><h2>FACTURA DE COMPRA</h2><strong>{purchase.invoiceNumber || "Sin numero"}</strong></div>
    </header>
    <section className="purchase-print-supplier" aria-label="Datos del proveedor">
      <dl>
        {[
          ["PROVEEDOR", purchase.supplierName], ["NIT / C.C.", supplier?.document],
          ["DIRECCION", [supplier?.address, supplier?.city].filter(Boolean).join(" | ")],
          ["CONTACTO", [supplier?.phone, supplier?.email].filter(Boolean).join(" | ")]
        ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "Sin registrar"}</dd></div>)}
      </dl>
      <dl className="purchase-print-dates">
        <div><dt>FECHA DE EMISION</dt><dd>{date(purchase.issuedAt)}</dd></div>
        <div><dt>FECHA DE VENCIMIENTO</dt><dd>{purchase.paymentStatus === "paid" ? "No aplica" : date(payable?.dueAt || purchase.dueAt)}</dd></div>
      </dl>
    </section>
    <div className="purchase-print-meta"><p>Sucursal: {purchase.branch || "Principal"} | Moneda: {purchase.currency} | Compra {purchase.paymentStatus === "paid" ? "pagada" : "pendiente"}</p><p>Concepto: {purchase.concept || "Factura de compra"}</p></div>
    <table className="purchase-print-items" aria-label={`Factura de compra ${purchase.invoiceNumber}`}>
      <colgroup><col style={{ width: "46%" }} /><col style={{ width: "12%" }} /><col style={{ width: "9%" }} /><col style={{ width: "12%" }} /><col style={{ width: "10%" }} /><col style={{ width: "11%" }} /></colgroup>
      <thead><tr>{["Producto / unidad", "Costo unit.", "Cant.", "Descuento", "Impuesto", "Total"].map((label) => <th key={label}>{label}</th>)}</tr></thead>
      <tbody>{lines.map((line) => <tr key={line.id}>
        <td>{line.productName}<small>{line.unit}</small></td><td>{formatCurrency(line.unitCostMinor)}</td><td>{line.quantity}</td>
        <td>{purchase.lines.length > 0 ? <>{formatCurrency(line.discountMinor)}<small>{line.discountPercent}%</small></> : "Sin desglose"}</td>
        <td>{purchase.lines.length > 0 ? <>{formatCurrency(line.taxMinor)}<small>{line.taxPercent}%</small></> : "Sin desglose"}</td>
        <td>{formatCurrency(line.totalMinor)}</td>
      </tr>)}{lines.length < 9 && <tr className="purchase-print-spacer" aria-hidden="true" style={{ height: `${Math.max(0, 125 - lines.length * 14)}mm` }}>{Array.from({ length: 6 }, (_, index) => <td key={index} />)}</tr>}</tbody>
    </table>
    <div className="purchase-print-bottom"><section className="purchase-print-summary">
      <div className="purchase-print-payment"><h3>ESTADO DE LA COMPRA</h3><p>{purchase.paymentStatus === "paid" ? "Pagada" : "Pendiente"}</p>{payable && <><p>Abonos registrados: {formatCurrency(payable.paidAmountMinor)}</p><strong>Saldo pendiente: {formatCurrency(payable.balanceMinor)}</strong></>}</div>
      <dl className="purchase-print-totals">
        {purchase.lines.length > 0 && <>
          <div><dt>Subtotal</dt><dd>{formatCurrency(purchase.lines.reduce((sum, line) => sum + line.subtotalMinor, 0))}</dd></div>
          <div><dt>Descuentos</dt><dd>{formatCurrency(purchase.lines.reduce((sum, line) => sum + line.discountMinor, 0))}</dd></div>
          <div><dt>Impuestos</dt><dd>{formatCurrency(purchase.lines.reduce((sum, line) => sum + line.taxMinor, 0))}</dd></div>
        </>}
        <div className="purchase-print-total"><dt>Total compra</dt><dd>{formatCurrency(purchase.totalMinor)}</dd></div>
      </dl>
    </section>
    <footer className="purchase-print-signatures"><span>ELABORADO POR</span><span>RECIBIDO / VERIFICADO</span></footer></div>
  </article>;
}

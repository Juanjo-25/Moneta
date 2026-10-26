import type { CreditNoteRecord, SaleRecord } from "../types";

export function dailySale(
  id: string,
  issuedAt: string,
  totalMinor: number
): SaleRecord {
  return {
    id,
    issuedAt,
    totalMinor,
    invoiceNumber: `FV-${id}`,
    occurredAtMs: new Date(2026, 9, 1, 12).getTime(),
    occurredAtLabel: "1/10/2026",
    customer: {
      id: "customer-1",
      name: "Cliente de prueba",
      document: "123",
      address: "Calle 10",
      active: true,
      city: "Medellín",
      email: "cliente@example.com"
    },
    customerId: "customer-1",
    customerName: "Cliente de prueba",
    branch: "Principal",
    prefix: "FV",
    seller: "Ana",
    currency: "COP",
    concept: "Venta",
    observations: "",
    footerNote: "",
    productId: "product-1",
    productName: "Producto de prueba",
    quantity: 1,
    unitPriceMinor: totalMinor,
    paymentStatus: "paid",
    lines: []
  };
}

export function dailyCredit(
  id: string,
  issuedAt: string,
  totalMinor: number,
  status: CreditNoteRecord["status"] = "confirmed"
): CreditNoteRecord {
  return {
    id,
    issuedAt,
    totalMinor,
    status,
    number: `NC-${id}`,
    saleId: "october",
    invoiceNumber: "FV-october",
    customer: dailySale("", "", 0).customer,
    customerId: "customer-1",
    customerName: "Cliente de prueba",
    adjustmentType: "discount",
    reason: "Ajuste comercial",
    receivableDueAt: "",
    lines: [],
    occurredAtMs: new Date(2026, 9, 1).getTime(),
    occurredAtLabel: "",
    confirmedAtMs: 0,
    confirmedAtLabel: "",
    voidedAtMs: 0,
    voidedAtLabel: ""
  };
}

export const dailySalesFixture = [
  dailySale("august-1", "2026-08-13", 125000),
  dailySale("august-2", "2026-08-13", 75000),
  dailySale("september", "2026-09-13", 140000),
  dailySale("october", "2026-10-13", 300000)
];

export const dailyCreditsFixture = [
  dailyCredit("confirmed", "2026-10-13", 50000),
  dailyCredit("draft", "2026-10-13", 90000, "draft")
];

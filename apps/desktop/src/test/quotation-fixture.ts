import type { AppSettings, ProductRecord, QuotationRecord } from "../types";

export const quotationFixture: QuotationRecord = {
  id: "quotation-1",
  quotationNumber: "COT-0001",
  customer: {
    id: "customer-1",
    name: "Cliente de prueba",
    document: "123456",
    address: "Calle 10",
    active: true,
    city: "Medellin",
    email: "cliente@example.com"
  },
  issuedAt: "2026-10-26",
  validUntil: "2026-11-10",
  seller: "Ana",
  observations: "Entrega en cinco dias.",
  createdAtMs: 1,
  totalMinor: 10710,
  lines: [
    {
      id: "line-1",
      productId: "product-1",
      productName: "Arroz libra",
      unit: "Libra",
      quantity: 2,
      unitPriceMinor: 5000,
      discountPercent: 10,
      discountMinor: 1000,
      taxPercent: 19,
      taxMinor: 1710,
      subtotalMinor: 10000,
      totalMinor: 10710
    }
  ]
};

export const quotationProductFixture: ProductRecord = {
  id: "product-1",
  name: "Arroz libra",
  sku: "ARZ-001",
  unit: "Libra",
  costMinor: 3000,
  salePriceMinor: 5000,
  stock: 0,
  minimumStock: 1,
  active: true
};

export const quotationSettingsFixture: AppSettings = {
  company: {
    name: "Empresa de prueba",
    document: "900123456-7",
    address: "Calle 20",
    city: "Medellin",
    email: "empresa@example.com",
    phone: "3001234567",
    logoDataUri: ""
  },
  invoice: {
    title: "REMISION",
    accentColor: "#0f766e",
    legalNote: "Nota de factura",
    observations: "Observaciones de factura"
  },
  invoiceNumbering: { startingNumber: 200 },
  sellers: []
};

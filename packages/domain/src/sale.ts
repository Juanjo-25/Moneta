import { Money, addMoney, createMoney, multiplyMoney } from "./money";

export type SalePaymentStatus = "paid" | "pending";

export type SaleLine = {
  productId: string;
  quantity: number;
  unitPrice: Money;
};

export type SaleDraftInput = {
  id: string;
  customerId: string;
  occurredAt: Date;
  paymentStatus: SalePaymentStatus;
  lines: SaleLine[];
};

export type SaleDraft = SaleDraftInput & {
  total: Money;
};

export type Receivable = {
  id: string;
  customerId: string;
  saleId: string;
  originalAmount: Money;
  paidAmount: Money;
  status: "open" | "settled";
};

export type ConfirmedSale = {
  sale: SaleDraft;
  receivable: Receivable | null;
};

export function createSaleDraft(input: SaleDraftInput): SaleDraft {
  const total = addMoney(
    input.lines.map((line) => multiplyMoney(line.unitPrice, line.quantity))
  );

  return {
    ...input,
    total
  };
}

export function confirmSale(sale: SaleDraft): ConfirmedSale {
  if (sale.paymentStatus === "paid") {
    return { sale, receivable: null };
  }

  return {
    sale,
    receivable: {
      id: `receivable-${sale.id}`,
      customerId: sale.customerId,
      saleId: sale.id,
      originalAmount: sale.total,
      paidAmount: createMoney(0),
      status: "open"
    }
  };
}

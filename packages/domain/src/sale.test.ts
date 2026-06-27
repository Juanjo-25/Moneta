import { describe, expect, it } from "vitest";
import { createMoney } from "./money";
import { confirmSale, createSaleDraft } from "./sale";

describe("sales", () => {
  it("calculates sale totals from line quantities and prices", () => {
    const draft = createSaleDraft({
      id: "sale-1",
      customerId: "customer-1",
      occurredAt: new Date("2026-06-27T12:00:00.000Z"),
      paymentStatus: "paid",
      lines: [
        {
          productId: "product-1",
          quantity: 2,
          unitPrice: createMoney(4500)
        },
        {
          productId: "product-2",
          quantity: 1,
          unitPrice: createMoney(12000)
        }
      ]
    });

    expect(draft.total.minor).toBe(21000);
  });

  it("creates a receivable when a sale is confirmed as pending", () => {
    const draft = createSaleDraft({
      id: "sale-1",
      customerId: "customer-1",
      occurredAt: new Date("2026-06-27T12:00:00.000Z"),
      paymentStatus: "pending",
      lines: [
        {
          productId: "product-1",
          quantity: 2,
          unitPrice: createMoney(4500)
        }
      ]
    });

    const result = confirmSale(draft);

    expect(result.receivable).toEqual({
      id: "receivable-sale-1",
      customerId: "customer-1",
      saleId: "sale-1",
      originalAmount: createMoney(9000),
      paidAmount: createMoney(0),
      status: "open"
    });
  });
});

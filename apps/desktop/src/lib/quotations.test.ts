import { describe, expect, it } from "vitest";
import {
  calculateQuotationLine,
  nextQuotationNumber,
  validateQuotation
} from "./quotations";
import { quotationFixture } from "../test/quotation-fixture";

describe("quotations", () => {
  it("numbers quotations independently and continues the highest existing number", () => {
    expect(nextQuotationNumber([])).toBe("COT-0001");
    expect(
      nextQuotationNumber([
        quotationFixture,
        { ...quotationFixture, quotationNumber: "COT-0012" }
      ])
    ).toBe("COT-0013");
  });

  it("applies the discount before tax and rounds to whole pesos", () => {
    expect(
      calculateQuotationLine({
        quantity: 2,
        unitPriceMinor: 5000,
        discountPercent: 10,
        taxPercent: 19
      })
    ).toEqual({
      subtotalMinor: 10000,
      discountMinor: 1000,
      taxMinor: 1710,
      totalMinor: 10710
    });
    expect(
      calculateQuotationLine({
        quantity: 1,
        unitPriceMinor: 333,
        discountPercent: 5,
        taxPercent: 19
      })
    ).toEqual({
      subtotalMinor: 333,
      discountMinor: 17,
      taxMinor: 60,
      totalMinor: 376
    });
  });

  it("rejects invalid dates, empty documents, and tampered or unsafe totals", () => {
    expect(validateQuotation(quotationFixture)).toBeNull();
    for (const quotation of [
      { ...quotationFixture, validUntil: "2026-10-01" },
      { ...quotationFixture, issuedAt: "2026-02-30" },
      { ...quotationFixture, lines: [] },
      { ...quotationFixture, totalMinor: 1 },
      {
        ...quotationFixture,
        lines: [{ ...quotationFixture.lines[0]!, quantity: -1 }]
      },
      {
        ...quotationFixture,
        lines: [
          {
            ...quotationFixture.lines[0]!,
            subtotalMinor: Number.MAX_SAFE_INTEGER + 1
          }
        ]
      }
    ])
      expect(validateQuotation(quotation)).not.toBeNull();
  });
});

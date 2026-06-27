import {
  DomainError,
  Result,
  SaleDraftInput,
  applyInventoryMovement,
  confirmSale,
  createSaleDraft,
  err,
  ok
} from "@moneta/domain";
import { InventoryRepository, SaleRepository } from "./ports";

export type RegisterSaleDependencies = {
  inventory: InventoryRepository;
  sales: SaleRepository;
};

export function registerSale(deps: RegisterSaleDependencies) {
  return async (
    input: SaleDraftInput
  ): Promise<Result<{ saleId: string }, DomainError>> => {
    const movements = [];

    for (const line of input.lines) {
      const productStock = await deps.inventory.findProductStock(line.productId);

      if (!productStock) {
        return err({
          code: "INACTIVE_PRODUCT",
          message: "El producto no existe o no esta disponible."
        });
      }

      const movement = {
        id: `movement-${input.id}-${line.productId}`,
        productId: line.productId,
        type: "sale" as const,
        quantity: line.quantity,
        reason: `Venta ${input.id}`,
        occurredAt: input.occurredAt
      };

      const stockResult = applyInventoryMovement({
        product: productStock.product,
        currentStock: productStock.stock,
        movement
      });

      if (!stockResult.ok) {
        return stockResult;
      }

      movements.push(movement);
    }

    const sale = createSaleDraft(input);
    const confirmed = confirmSale(sale);

    for (const movement of movements) {
      await deps.inventory.recordMovement(movement);
    }

    await deps.sales.saveSale(confirmed.sale, confirmed.receivable);

    return ok({ saleId: input.id });
  };
}

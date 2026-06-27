import { DomainError } from "./domain-errors";
import { Product } from "./product";
import { Result, err, ok } from "./result";

export type InventoryMovementType =
  | "purchase"
  | "sale"
  | "adjustment_in"
  | "adjustment_out";

export type InventoryMovement = {
  id: string;
  productId: string;
  type: InventoryMovementType;
  quantity: number;
  reason: string;
  occurredAt: Date;
};

export type StockMovementInput = Pick<InventoryMovement, "type" | "quantity">;

export type ApplyInventoryMovementInput = {
  product: Product;
  currentStock: number;
  movement: InventoryMovement;
};

export type StockState = {
  stock: number;
};

export function getAvailableStock(movements: StockMovementInput[]): number {
  return movements.reduce((stock, movement) => {
    if (movement.type === "purchase" || movement.type === "adjustment_in") {
      return stock + movement.quantity;
    }

    return stock - movement.quantity;
  }, 0);
}

export function applyInventoryMovement(
  input: ApplyInventoryMovementInput
): Result<StockState, DomainError> {
  if (!input.product.active) {
    return err({
      code: "INACTIVE_PRODUCT",
      message: "No se puede mover inventario de un producto inactivo."
    });
  }

  if (!Number.isInteger(input.movement.quantity) || input.movement.quantity <= 0) {
    return err({
      code: "INVALID_QUANTITY",
      message: "La cantidad debe ser un entero positivo."
    });
  }

  const nextStock = getAvailableStock([
    { type: "purchase", quantity: input.currentStock },
    { type: input.movement.type, quantity: input.movement.quantity }
  ]);

  if (nextStock < 0) {
    return err({
      code: "INSUFFICIENT_STOCK",
      message: "No hay inventario suficiente para completar el movimiento."
    });
  }

  return ok({ stock: nextStock });
}

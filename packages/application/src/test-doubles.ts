import {
  InventoryMovement,
  Product,
  Receivable,
  SaleDraft,
  getAvailableStock
} from "@moneta/domain";
import { InventoryRepository, ProductStock, SaleRepository } from "./ports";

export class InMemoryInventoryRepository implements InventoryRepository {
  private readonly products = new Map<string, Product>();
  private readonly initialStock = new Map<string, number>();
  private readonly movements = new Map<string, InventoryMovement[]>();

  constructor(items: ProductStock[]) {
    for (const item of items) {
      this.products.set(item.product.id, item.product);
      this.initialStock.set(item.product.id, item.stock);
      this.movements.set(item.product.id, []);
    }
  }

  async findProductStock(productId: string): Promise<ProductStock | null> {
    const product = this.products.get(productId);

    if (!product) {
      return null;
    }

    return {
      product,
      stock: this.getStock(productId)
    };
  }

  async recordMovement(movement: InventoryMovement): Promise<void> {
    const existing = this.movements.get(movement.productId) ?? [];
    this.movements.set(movement.productId, [...existing, movement]);
  }

  getStock(productId: string): number {
    const startingStock = this.initialStock.get(productId) ?? 0;
    const movements = this.movements.get(productId) ?? [];

    return getAvailableStock([
      { type: "purchase", quantity: startingStock },
      ...movements.map((movement) => ({
        type: movement.type,
        quantity: movement.quantity
      }))
    ]);
  }
}

export class InMemorySaleRepository implements SaleRepository {
  readonly savedSales: Array<{
    sale: SaleDraft;
    receivable: Receivable | null;
  }> = [];

  async saveSale(sale: SaleDraft, receivable: Receivable | null): Promise<void> {
    this.savedSales.push({ sale, receivable });
  }
}

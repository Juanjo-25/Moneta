import {
  InventoryMovement,
  Product,
  Receivable,
  SaleDraft
} from "@moneta/domain";

export type ProductStock = {
  product: Product;
  stock: number;
};

export interface InventoryRepository {
  findProductStock(productId: string): Promise<ProductStock | null>;
  recordMovement(movement: InventoryMovement): Promise<void>;
  getStock(productId: string): number;
}

export interface SaleRepository {
  saveSale(sale: SaleDraft, receivable: Receivable | null): Promise<void>;
}

export type ProductProps = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  minimumStock: number;
  salePriceMinor: number;
  costMinor: number;
  active?: boolean;
};

export class Product {
  readonly id: string;
  readonly sku: string;
  readonly name: string;
  readonly unit: string;
  readonly minimumStock: number;
  readonly salePriceMinor: number;
  readonly costMinor: number;
  readonly active: boolean;

  private constructor(props: Required<ProductProps>) {
    this.id = props.id;
    this.sku = props.sku;
    this.name = props.name;
    this.unit = props.unit;
    this.minimumStock = props.minimumStock;
    this.salePriceMinor = props.salePriceMinor;
    this.costMinor = props.costMinor;
    this.active = props.active;
  }

  static create(props: ProductProps): Product {
    return new Product({
      ...props,
      active: props.active ?? true
    });
  }
}

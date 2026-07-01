# Purchase Inline Product Design

## Goal

Allow a new product to be created directly while registering a purchase invoice.

## Approved Behavior

- In `Compras`, the product selector keeps the existing inventory products.
- A `Nuevo producto` action appears next to the product selector.
- The inline product form captures the product data needed by the catalog: `Codigo`, `Producto`, `Costo`, `Precio venta`, and `Stock minimo`.
- The inline form does not ask for initial stock. The purchase invoice quantity is the inventory entry.
- Saving the inline product selects it for the current purchase.
- Registering the purchase increases the new product stock by the invoice quantity.
- The created product appears later in `Productos`.

## Validation

- Inline product creation reuses the existing required fields and non-negative numeric rules for product catalog data.
- The purchase still requires a selected product, invoice number, issue date, supplier, quantity, and unit cost.

## Testing

- Add a UI test that creates a supplier, creates a product inline from `Compras`, registers the purchase, and verifies the product appears in `Productos` with stock equal to the purchased quantity.

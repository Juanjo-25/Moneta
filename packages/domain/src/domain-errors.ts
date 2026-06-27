export type DomainErrorCode =
  | "INSUFFICIENT_STOCK"
  | "INVALID_QUANTITY"
  | "INACTIVE_PRODUCT"
  | "INVALID_MONEY";

export type DomainError = {
  code: DomainErrorCode;
  message: string;
};

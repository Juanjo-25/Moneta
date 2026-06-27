import { DomainError } from "./domain-errors";
import { Result, err, ok } from "./result";

export type Money = {
  minor: number;
  currency: "COP";
};

export function createMoney(minor: number): Money {
  if (!Number.isInteger(minor) || minor < 0) {
    throw new Error("Money must be a non-negative integer minor-unit amount.");
  }

  return { minor, currency: "COP" };
}

export function tryCreateMoney(minor: number): Result<Money, DomainError> {
  if (!Number.isInteger(minor) || minor < 0) {
    return err({
      code: "INVALID_MONEY",
      message: "El valor monetario debe ser un entero no negativo."
    });
  }

  return ok(createMoney(minor));
}

export function addMoney(values: Money[]): Money {
  return createMoney(values.reduce((total, value) => total + value.minor, 0));
}

export function multiplyMoney(value: Money, quantity: number): Money {
  return createMoney(value.minor * quantity);
}

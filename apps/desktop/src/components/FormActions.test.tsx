import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FormActions } from "./FormActions";
import { PrimaryActionButton } from "./PrimaryActionButton";

describe("FormActions", () => {
  it("wraps form CTAs with the shared action container", () => {
    render(
      <FormActions>
        <PrimaryActionButton type="submit">Guardar producto</PrimaryActionButton>
      </FormActions>
    );

    const button = screen.getByRole("button", { name: "Guardar producto" });
    const actions = button.closest(".form-actions");

    expect(actions).toBeTruthy();
    expect(button.className).toContain("primary-action");
  });
});

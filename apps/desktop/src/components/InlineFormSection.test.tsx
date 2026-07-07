import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InlineFormSection } from "./InlineFormSection";
import { SecondaryActionButton } from "./SecondaryActionButton";
import { TextField } from "./TextField";

describe("InlineFormSection", () => {
  it("applies the shared inline form wrapper while preserving specific layout classes", () => {
    render(
      <InlineFormSection className="inline-customer-form">
        <TextField label="Nombre cliente" onChange={() => undefined} value="" />
        <SecondaryActionButton>Guardar cliente</SecondaryActionButton>
      </InlineFormSection>
    );

    const button = screen.getByRole("button", { name: "Guardar cliente" });
    const wrapper = button.closest(".inline-form-section");

    expect(wrapper).toBeTruthy();
    expect(wrapper?.className).toContain("inline-customer-form");
  });
});

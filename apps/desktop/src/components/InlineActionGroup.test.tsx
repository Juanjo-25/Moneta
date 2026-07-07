import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InlineActionGroup } from "./InlineActionGroup";
import { SecondaryActionButton } from "./SecondaryActionButton";

describe("InlineActionGroup", () => {
  it("wraps inline secondary actions with the shared inline action class", () => {
    render(
      <InlineActionGroup>
        <SecondaryActionButton>Agregar producto</SecondaryActionButton>
      </InlineActionGroup>
    );

    const button = screen.getByRole("button", { name: "Agregar producto" });
    const wrapper = button.closest(".inline-action-group");

    expect(wrapper).toBeTruthy();
  });
});

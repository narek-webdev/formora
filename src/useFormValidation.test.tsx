import * as React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useFormValidation } from "./useFormValidation";

function TestForm() {
  const form = useFormValidation({
    initialValues: { name: "" },
    validateOn: "change",
  });

  return (
    <>
      <input
        aria-label="name"
        {...form.register("name", { required: "Name is required" })}
      />
      <div data-testid="error">{form.errors.name ?? ""}</div>
    </>
  );
}

describe("useFormValidation - required", () => {
  // it("sets error when value is empty and clears when non-empty", async () => {
  //   const user = userEvent.setup();
  //   render(<TestForm />);

  //   const input = screen.getByLabelText("name");

  //   // Explicitly fire a change to empty string
  //   await user.type(input, "X"); // make it non-empty first
  //   await user.clear(input); // now clear triggers change more reliably

  //   expect(screen.getByTestId("error")).toHaveTextContent("Name is required");

  //   // Type something
  //   await user.type(screen.getByLabelText("name"), "A");
  //   expect(screen.getByTestId("error")).toHaveTextContent("");
  // });

  // it("marks field as touched on blur", async () => {
  //   const user = userEvent.setup();

  //   function TestTouched() {
  //     const form = useFormValidation({
  //       initialValues: { name: "" },
  //     });

  //     return (
  //       <>
  //         <input aria-label="name" {...form.register("name")} />
  //         <div data-testid="touched">{form.touched.name ? "yes" : "no"}</div>
  //       </>
  //     );
  //   }

  //   render(<TestTouched />);

  //   expect(screen.getByTestId("touched")).toHaveTextContent("no");

  //   await user.click(screen.getByLabelText("name"));
  //   await user.tab(); // blur

  //   expect(screen.getByTestId("touched")).toHaveTextContent("yes");
  // });

  it("validates on blur when validateOn=blur", async () => {
    const user = userEvent.setup();

    function BlurForm() {
      const form = useFormValidation({
        initialValues: { name: "" },
        validateOn: "blur",
      });

      return (
        <>
          <input
            aria-label="name"
            {...form.register("name", { required: "Name is required" })}
          />
          <div data-testid="error">{form.errors.name ?? ""}</div>
        </>
      );
    }

    render(<BlurForm />);

    // No error yet (we haven't blurred)
    expect(screen.getByTestId("error")).toHaveTextContent("");

    // Focus then blur
    await user.click(screen.getByLabelText("name"));
    await user.tab();

    // Now it should validate and show the error
    expect(screen.getByTestId("error")).toHaveTextContent("Name is required");
  });
});

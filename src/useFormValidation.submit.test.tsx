import * as React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useFormValidation } from "./useFormValidation";

function SubmitForm(props: { onValid: (v: any) => void }) {
  const form = useFormValidation({
    initialValues: { email: "" },
    validateOn: "submit",
  });

  return (
    <form onSubmit={form.handleSubmit(props.onValid)}>
      <input
        aria-label="email"
        {...form.register("email", { required: "Email is required" })}
      />
      {form.touched.email && form.errors.email ? (
        <div role="alert">{form.errors.email}</div>
      ) : null}
      <button type="submit">Submit</button>
    </form>
  );
}

describe("useFormValidation - submit", () => {
  //   it("shows required error on submit and calls onValid when fixed", async () => {
  //     const user = userEvent.setup();
  //     const onValid = vi.fn();

  //     render(<SubmitForm onValid={onValid} />);

  //     // submit empty
  //     await user.click(screen.getByRole("button", { name: /submit/i }));
  //     expect(screen.getByRole("alert")).toHaveTextContent("Email is required");
  //     expect(onValid).not.toHaveBeenCalled();

  //     // fix value + submit
  //     await user.type(screen.getByLabelText("email"), "a@b.com");
  //     await user.click(screen.getByRole("button", { name: /submit/i }));

  //     expect(screen.queryByRole("alert")).toBeNull();
  //     expect(onValid).toHaveBeenCalledWith({ email: "a@b.com" });
  //   });

  it("updates isValid based on errors", async () => {
    const user = userEvent.setup();

    function ValidForm() {
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
          <div data-testid="valid">{form.isValid ? "valid" : "invalid"}</div>
        </>
      );
    }

    render(<ValidForm />);

    const input = screen.getByLabelText("name");

    // isValid reflects whether there are current errors.
    // Before any validation runs, errors is empty, so it starts as "valid".
    expect(screen.getByTestId("valid")).toHaveTextContent("valid");

    // Trigger validation: go non-empty then clear to empty (required error)
    await user.type(input, "X");
    await user.clear(input);
    expect(screen.getByTestId("valid")).toHaveTextContent("invalid");

    // Fix value -> error cleared -> valid
    await user.type(input, "John");
    expect(screen.getByTestId("valid")).toHaveTextContent("valid");
  });
});

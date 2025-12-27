import * as React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "./useForm";

function PasswordForm() {
  const form = useForm({
    initialValues: { password: "" },
    validateOn: "blur",
  });

  return (
    <>
      <input
        aria-label="password"
        {...form.register("password", {
          minLength: { value: 6, message: "Password is too short" },
        })}
      />
      <div data-testid="error">{form.errors.password ?? ""}</div>
    </>
  );
}

describe("useForm - minLength", () => {
  it("shows minLength error on blur for short value and clears when long enough", async () => {
    const user = userEvent.setup();
    render(<PasswordForm />);

    const input = screen.getByLabelText("password");

    // Too short
    await user.type(input, "123");
    await user.tab(); // blur
    expect(screen.getByTestId("error")).toHaveTextContent(
      "Password is too short"
    );

    // Long enough
    await user.click(input);
    await user.clear(input);
    await user.type(input, "123456");
    await user.tab();

    expect(screen.getByTestId("error")).toHaveTextContent("");
  });
});

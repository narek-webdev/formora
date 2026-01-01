import * as React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "../../index";

function EmailForm() {
  const form = useForm({
    initialValues: { email: "" },
    validateOn: "blur",
  });

  return (
    <>
      <input
        aria-label="email"
        {...form.register("email", {
          pattern: {
            value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            message: "Invalid email",
          },
        })}
      />
      <div data-testid="error">{form.errors.email ?? ""}</div>
    </>
  );
}

describe("useForm - pattern", () => {
  it("shows pattern error on blur for invalid value and clears for valid value", async () => {
    const user = userEvent.setup();
    render(<EmailForm />);

    const input = screen.getByLabelText("email");

    // Invalid email
    await user.type(input, "hello");
    await user.tab(); // blur
    expect(screen.getByTestId("error")).toHaveTextContent("Invalid email");

    // Fix to valid email
    await user.click(input);
    await user.clear(input);
    await user.type(input, "a@b.com");
    await user.tab();

    expect(screen.getByTestId("error")).toHaveTextContent("");
  });
});

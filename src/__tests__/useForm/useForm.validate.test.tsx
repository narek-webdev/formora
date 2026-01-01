import * as React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "../../index";

function UsernameForm() {
  const form = useForm({
    initialValues: { username: "" },
    validateOn: "blur",
  });

  return (
    <>
      <input
        aria-label="username"
        {...form.register("username", {
          validate: (value) =>
            value === "admin" ? "Username is reserved" : undefined,
        })}
      />
      <div data-testid="error">{form.errors.username ?? ""}</div>
    </>
  );
}

describe("useForm - custom validate", () => {
  it("supports custom validation function", async () => {
    const user = userEvent.setup();
    render(<UsernameForm />);

    const input = screen.getByLabelText("username");

    // Invalid
    await user.type(input, "admin");
    await user.tab();
    expect(screen.getByTestId("error")).toHaveTextContent(
      "Username is reserved"
    );

    // Valid
    await user.click(input);
    await user.clear(input);
    await user.type(input, "john");
    await user.tab();

    expect(screen.getByTestId("error")).toHaveTextContent("");
  });
});

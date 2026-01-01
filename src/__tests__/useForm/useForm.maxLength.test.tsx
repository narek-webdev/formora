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
          maxLength: { value: 5, message: "Username is too long" },
        })}
      />
      <div data-testid="error">{form.errors.username ?? ""}</div>
    </>
  );
}

describe("useForm - maxLength", () => {
  it("shows maxLength error on blur for long value and clears when short enough", async () => {
    const user = userEvent.setup();
    render(<UsernameForm />);

    const input = screen.getByLabelText("username");

    // Too long
    await user.type(input, "abcdef");
    await user.tab();
    expect(screen.getByTestId("error")).toHaveTextContent(
      "Username is too long"
    );

    // Short enough
    await user.click(input);
    await user.clear(input);
    await user.type(input, "abc");
    await user.tab();

    expect(screen.getByTestId("error")).toHaveTextContent("");
  });
});

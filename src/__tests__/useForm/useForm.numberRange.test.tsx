import * as React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "../../index";

function AgeForm() {
  const form = useForm({
    initialValues: { age: "" }, // string on purpose (like real <input type="number" />)
    validateOn: "blur",
  });

  return (
    <>
      <input
        aria-label="age"
        {...form.register("age", {
          min: { value: 18, message: "Too young" },
          max: { value: 65, message: "Too old" },
        })}
      />
      <div data-testid="error">{form.errors.age ?? ""}</div>
    </>
  );
}

describe("useForm - min/max (numbers)", () => {
  it("validates numeric range for numeric strings on blur", async () => {
    const user = userEvent.setup();
    render(<AgeForm />);

    const input = screen.getByLabelText("age");

    // Below min
    await user.type(input, "10");
    await user.tab();
    expect(screen.getByTestId("error")).toHaveTextContent("Too young");

    // Above max
    await user.click(input);
    await user.clear(input);
    await user.type(input, "70");
    await user.tab();
    expect(screen.getByTestId("error")).toHaveTextContent("Too old");

    // In range
    await user.click(input);
    await user.clear(input);
    await user.type(input, "30");
    await user.tab();
    expect(screen.getByTestId("error")).toHaveTextContent("");
  });
});

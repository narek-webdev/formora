import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { useForm } from "./useForm";

afterEach(() => {
  cleanup();
});

function ExtraDxForm() {
  const form = useForm({
    initialValues: { name: "", age: 0 },
    validateOn: "submit",
  });

  return (
    <div>
      <div data-testid="name-value">{String(form.values.name)}</div>
      <div data-testid="age-value">{String(form.values.age)}</div>

      <div data-testid="name-error">{form.errors.name ?? ""}</div>
      <div data-testid="age-error">{form.errors.age ?? ""}</div>

      <div data-testid="name-touched">{form.touched.name ? "yes" : "no"}</div>
      <div data-testid="age-touched">{form.touched.age ? "yes" : "no"}</div>

      <input
        aria-label="name"
        {...form.register("name", { required: "Name required" })}
      />
      <input
        aria-label="age"
        type="number"
        {...form.register("age", { min: { value: 18, message: "Too young" } })}
      />

      <button
        aria-label="set-values"
        onClick={() =>
          form.setValues(
            { name: "John", age: 25 },
            { shouldTouch: true, shouldValidate: true }
          )
        }
      >
        set-values
      </button>

      <button
        aria-label="set-error"
        onClick={() => form.setError("name", "Custom error")}
      >
        set-error
      </button>

      <button aria-label="clear-error" onClick={() => form.clearError("name")}>
        clear-error
      </button>

      <button aria-label="clear-errors" onClick={() => form.clearErrors()}>
        clear-errors
      </button>

      <button aria-label="touch-all" onClick={() => form.touchAll()}>
        touch-all
      </button>

      <button
        aria-label="untouch-name"
        onClick={() => form.setTouched("name", false)}
      >
        untouch-name
      </button>

      <button
        aria-label="set-invalid-values"
        onClick={() =>
          form.setValues(
            { name: "", age: 10 },
            { shouldTouch: true, shouldValidate: true }
          )
        }
      >
        set-invalid-values
      </button>
    </div>
  );
}

describe("useForm - DX helpers (extra)", () => {
  it("setValues sets multiple fields and can touch + validate explicitly", () => {
    render(<ExtraDxForm />);

    fireEvent.click(screen.getByLabelText("set-values"));

    expect(screen.getByTestId("name-value")).toHaveTextContent("John");
    expect(screen.getByTestId("age-value")).toHaveTextContent("25");

    expect(screen.getByTestId("name-touched")).toHaveTextContent("yes");
    expect(screen.getByTestId("age-touched")).toHaveTextContent("yes");

    // both are valid
    expect(screen.getByTestId("name-error")).toHaveTextContent("");
    expect(screen.getByTestId("age-error")).toHaveTextContent("");
  });

  it("setError sets a custom error and clearError removes it", () => {
    render(<ExtraDxForm />);

    fireEvent.click(screen.getByLabelText("set-error"));
    expect(screen.getByTestId("name-error")).toHaveTextContent("Custom error");

    fireEvent.click(screen.getByLabelText("clear-error"));
    expect(screen.getByTestId("name-error")).toHaveTextContent("");
  });

  it("clearErrors clears all field errors", () => {
    render(<ExtraDxForm />);

    // force errors via explicit validation
    fireEvent.click(screen.getByLabelText("set-invalid-values"));
    expect(screen.getByTestId("name-error")).toHaveTextContent("Name required");
    expect(screen.getByTestId("age-error")).toHaveTextContent("Too young");

    fireEvent.click(screen.getByLabelText("clear-errors"));
    expect(screen.getByTestId("name-error")).toHaveTextContent("");
    expect(screen.getByTestId("age-error")).toHaveTextContent("");
  });

  it("touchAll marks all registered fields as touched", () => {
    render(<ExtraDxForm />);

    expect(screen.getByTestId("name-touched")).toHaveTextContent("no");
    expect(screen.getByTestId("age-touched")).toHaveTextContent("no");

    fireEvent.click(screen.getByLabelText("touch-all"));

    expect(screen.getByTestId("name-touched")).toHaveTextContent("yes");
    expect(screen.getByTestId("age-touched")).toHaveTextContent("yes");
  });

  it("setTouched can toggle touched state for a field", () => {
    render(<ExtraDxForm />);

    // touch first
    fireEvent.click(screen.getByLabelText("touch-all"));
    expect(screen.getByTestId("name-touched")).toHaveTextContent("yes");

    // then untouch just name
    fireEvent.click(screen.getByLabelText("untouch-name"));
    expect(screen.getByTestId("name-touched")).toHaveTextContent("no");

    // age remains touched
    expect(screen.getByTestId("age-touched")).toHaveTextContent("yes");
  });
});

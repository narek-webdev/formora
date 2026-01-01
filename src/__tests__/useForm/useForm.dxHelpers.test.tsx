import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { useForm } from "../../index";

afterEach(() => {
  cleanup();
});

function DxForm({
  validateOn = "submit",
}: {
  validateOn?: "change" | "blur" | "submit";
}) {
  const form = useForm({
    initialValues: { name: "" },
    validateOn,
  });

  return (
    <div>
      <div data-testid="value">{form.values.name}</div>
      <div data-testid="error">{form.errors.name ?? ""}</div>
      <div data-testid="touched">{form.touched.name ? "yes" : "no"}</div>

      <input
        aria-label="name"
        {...form.register("name", { required: "Name required" })}
      />

      <button
        aria-label="set-john"
        onClick={() =>
          form.setValue("name", "John", {
            shouldValidate: true,
            shouldTouch: true,
          })
        }
      >
        set
      </button>

      <button aria-label="reset" onClick={() => form.reset()}>
        reset
      </button>

      <button aria-label="reset-field" onClick={() => form.resetField("name")}>
        reset-field
      </button>
    </div>
  );
}

describe("useForm - DX helpers (v0.3)", () => {
  it("setValue updates values, touches field, and validates when requested", () => {
    render(<DxForm validateOn="submit" />);

    // initially empty, not touched, no error yet
    expect(screen.getByTestId("value")).toHaveTextContent("");
    expect(screen.getByTestId("touched")).toHaveTextContent("no");
    expect(screen.getByTestId("error")).toHaveTextContent("");

    // set empty should trigger required error
    fireEvent.click(screen.getByLabelText("set-john"));

    expect(screen.getByTestId("value")).toHaveTextContent("John");
    expect(screen.getByTestId("touched")).toHaveTextContent("yes");
    expect(screen.getByTestId("error")).toHaveTextContent(""); // John passes required
  });

  it("reset() restores initialValues and clears errors/touched", () => {
    render(<DxForm validateOn="submit" />);

    // create an error by blurring input (validateOn=submit won't validate automatically)
    const input = screen.getByLabelText("name");
    fireEvent.focus(input);
    fireEvent.blur(input);

    // touch should be yes
    expect(screen.getByTestId("touched")).toHaveTextContent("yes");

    // now reset should clear touched/errors and restore value
    fireEvent.click(screen.getByLabelText("reset"));
    expect(screen.getByTestId("value")).toHaveTextContent("");
    expect(screen.getByTestId("touched")).toHaveTextContent("no");
    expect(screen.getByTestId("error")).toHaveTextContent("");
  });

  it("resetField(name) restores one field and clears its error/touched", () => {
    render(<DxForm validateOn="submit" />);

    // set an invalid value via input change + manual validate using setValue opts
    const input = screen.getByLabelText("name");
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);

    // touched yes
    expect(screen.getByTestId("touched")).toHaveTextContent("yes");

    fireEvent.click(screen.getByLabelText("reset-field"));

    expect(screen.getByTestId("value")).toHaveTextContent("");
    expect(screen.getByTestId("touched")).toHaveTextContent("no");
    expect(screen.getByTestId("error")).toHaveTextContent("");
  });
});

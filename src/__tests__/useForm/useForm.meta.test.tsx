import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "../../index";
import { describe, it, expect, afterEach } from "vitest";

afterEach(() => {
  cleanup();
});

function MetaForm() {
  const form = useForm({
    initialValues: { email: "" },
    validateOn: "blur",
  });

  const meta = form.getFieldMeta("email");

  return (
    <div>
      <input
        aria-label="email"
        {...form.register("email", {
          validate: (v) => (String(v).length > 0 ? undefined : "Required"),
        })}
      />

      <div data-testid="error">{meta.showError ? meta.error : ""}</div>

      <button onClick={form.handleSubmit(() => {})}>submit</button>
    </div>
  );
}

describe("useForm – field meta / shouldShowError", () => {
  it("does not show error before touch or submit", async () => {
    render(<MetaForm />);

    expect(screen.getByTestId("error")).toHaveTextContent("");
  });

  it("shows error after field is touched (blur)", async () => {
    const user = userEvent.setup();
    render(<MetaForm />);

    const input = screen.getByLabelText("email");

    await user.click(input);
    await user.tab(); // blur

    expect(await screen.findByTestId("error")).toHaveTextContent("Required");
  });

  it("shows error after submit even if field was not touched", async () => {
    const user = userEvent.setup();
    render(<MetaForm />);

    await user.click(screen.getByRole("button", { name: /submit/i }));

    expect(await screen.findByTestId("error")).toHaveTextContent("Required");
  });
});

function ResetMetaForm() {
  const form = useForm({
    initialValues: { email: "" },
    validateOn: "blur",
  });

  const meta = form.getFieldMeta("email");

  return (
    <div>
      <input
        aria-label="email"
        {...form.register("email", {
          validate: (v) => (String(v).length > 0 ? undefined : "Required"),
        })}
      />

      <div data-testid="error">{meta.showError ? meta.error : ""}</div>
      <div data-testid="rawError">
        {String((form as any).errors?.email ?? "")}
      </div>
      <div data-testid="values">
        {String((form as any).values?.email ?? "")}
      </div>
      <div data-testid="dirty">
        {JSON.stringify((form as any).dirty ?? null)}
      </div>
      <div data-testid="touched">
        {JSON.stringify((form as any).touched ?? null)}
      </div>

      <button onClick={() => (form as any).reset()}>reset</button>
      <button onClick={() => (form as any).reset({ keepErrors: true })}>
        resetKeepErrors
      </button>
      <button onClick={() => (form as any).resetField("email")}>
        resetField
      </button>
    </div>
  );
}

describe("useForm – reset / resetField", () => {
  it("reset clears values + errors + touched + dirty by default", async () => {
    const user = userEvent.setup();
    render(<ResetMetaForm />);

    const input = screen.getByLabelText("email");

    // cause error + touched
    await user.click(input);
    await user.tab();

    expect(await screen.findByTestId("error")).toHaveTextContent("Required");
    expect(screen.getByTestId("rawError")).toHaveTextContent("Required");

    // make it dirty
    await user.click(input);
    await user.type(input, "a");

    expect(screen.getByTestId("values")).toHaveTextContent("a");
    expect(screen.getByTestId("dirty")).not.toHaveTextContent("null");

    // reset
    await user.click(screen.getByRole("button", { name: /^reset$/i }));
    expect(screen.getByTestId("values")).toHaveTextContent("");
    expect(screen.getByTestId("rawError")).toHaveTextContent("");
    expect(screen.getByTestId("error")).toHaveTextContent("");

    // touched/dirty should be cleared
    expect(screen.getByTestId("touched")).toHaveTextContent("{}");
    expect(screen.getByTestId("dirty")).toHaveTextContent("{}");
  });

  it("reset({ keepErrors: true }) keeps errors but clears touched so showError is hidden", async () => {
    const user = userEvent.setup();
    render(<ResetMetaForm />);

    const input = screen.getByLabelText("email");

    await user.click(input);
    await user.tab();

    expect(await screen.findByTestId("error")).toHaveTextContent("Required");

    await user.click(
      screen.getByRole("button", { name: /^resetKeepErrors$/i })
    );
    // error remains in state...
    expect(screen.getByTestId("rawError")).toHaveTextContent("Required");
    // ...but meta.showError should be false because touched cleared
    expect(screen.getByTestId("error")).toHaveTextContent("");
    expect(screen.getByTestId("touched")).toHaveTextContent("{}");
  });

  it("resetField resets only that field and clears its meta branches", async () => {
    const user = userEvent.setup();
    render(<ResetMetaForm />);

    const input = screen.getByLabelText("email");

    // make dirty + touched + error
    await user.click(input);
    await user.type(input, "a");
    await user.clear(input);
    await user.tab();

    expect(await screen.findByTestId("rawError")).toHaveTextContent("Required");

    await user.click(screen.getByRole("button", { name: /^resetField$/i }));
    expect(screen.getByTestId("values")).toHaveTextContent("");
    expect(screen.getByTestId("rawError")).toHaveTextContent("");
    expect(screen.getByTestId("error")).toHaveTextContent("");

    // Should clear per-field branches
    expect(screen.getByTestId("touched")).not.toHaveTextContent("Required");
  });
});

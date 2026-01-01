import * as React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "../../index";

afterEach(() => {
  cleanup();
});

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function AsyncFieldForm(props: {
  validateOn: "blur" | "change";
  getDeferred: (value: string) => Deferred<string | undefined>;
  syncValidate?: (value: unknown, values: any) => string | undefined;
}) {
  const form = useForm({
    initialValues: { email: "" },
    validateOn: props.validateOn,
  });

  return (
    <>
      <input
        aria-label="email"
        {...form.register("email", {
          validate: props.syncValidate,
          validateAsync: (value) => {
            const v = String(value ?? "");
            return props.getDeferred(v).promise;
          },
        })}
      />
      <div data-testid="error">{form.errors.email ?? ""}</div>
      <div data-testid="validating">{form.isValidating ? "yes" : "no"}</div>
    </>
  );
}

describe("useForm - validateAsync", () => {
  it("sets async error result on blur", async () => {
    const user = userEvent.setup();
    const d = deferred<string | undefined>();

    render(<AsyncFieldForm validateOn="blur" getDeferred={() => d} />);

    const input = screen.getByLabelText("email");

    await user.type(input, "hello");
    await user.tab(); // blur triggers async

    // should be validating
    expect(screen.getByTestId("validating")).toHaveTextContent("yes");

    // resolve with an error
    d.resolve("Invalid email");

    await waitFor(() =>
      expect(screen.getByTestId("error")).toHaveTextContent("Invalid email")
    );

    await waitFor(() =>
      expect(screen.getByTestId("validating")).toHaveTextContent("no")
    );
  });

  it("does not run async validation when sync validation fails (sync-first short-circuit)", async () => {
    const user = userEvent.setup();
    let asyncCalls = 0;

    const d = deferred<string | undefined>();

    render(
      <AsyncFieldForm
        validateOn="change"
        getDeferred={(v) => {
          asyncCalls++;
          return d;
        }}
        syncValidate={(value) => {
          const v = String(value ?? "");
          return v.trim().length > 0 ? undefined : "Required";
        }}
      />
    );

    const input = screen.getByLabelText("email");

    // First make a real change so onChange pipeline is active
    await user.type(input, "a");

    // Reset counter so we only measure calls from the failing change below
    asyncCalls = 0;

    // Now change back to empty -> sync should fail and async must NOT run
    await user.keyboard("{Backspace}");

    // Sync error should be set
    await waitFor(() =>
      expect(screen.getByTestId("error")).toHaveTextContent("Required")
    );

    // Async must not be called for the failing change, and validating must be off
    expect(asyncCalls).toBe(0);
    expect(screen.getByTestId("validating")).toHaveTextContent("no");
  });

  it("is race-safe: older async results cannot override newer ones", async () => {
    const user = userEvent.setup();

    const map = new Map<string, Deferred<string | undefined>>();
    const getDeferred = (value: string) => {
      const existing = map.get(value);
      if (existing) return existing;
      const d = deferred<string | undefined>();
      map.set(value, d);
      return d;
    };

    render(<AsyncFieldForm validateOn="change" getDeferred={getDeferred} />);

    const input = screen.getByLabelText("email");

    // triggers request #1 for "a"
    await user.type(input, "a");

    // triggers request #2 for "ab"
    await user.type(input, "b");

    // Resolve the newer request first (valid)
    map.get("ab")!.resolve(undefined);

    await waitFor(() =>
      expect(screen.getByTestId("error")).toHaveTextContent("")
    );

    // Now resolve the older request later (invalid) - should be ignored
    map.get("a")!.resolve("Taken");

    // Give state a moment; error must remain empty
    await waitFor(() =>
      expect(screen.getByTestId("error")).toHaveTextContent("")
    );
  });
});

import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  render,
  screen,
  cleanup,
  fireEvent,
  act,
} from "@testing-library/react";
import { useForm } from "../../index";

function DebounceForm({
  validateOn = "change",
  asyncDebounceMs = 200,
  required = false,
  onSubmit,
}: {
  validateOn?: "change" | "blur" | "submit";
  asyncDebounceMs?: number;
  required?: boolean;
  onSubmit?: (values: any) => void;
}) {
  const form = useForm({
    initialValues: { email: "" },
    validateOn,
    asyncDebounceMs,
  });

  return (
    <div>
      <input
        aria-label="email"
        {...form.register("email", {
          required: required ? "Email required" : false,
          validateAsync: async (value) => {
            await new Promise((r) => setTimeout(r, 10));
            return String(value).includes("@") ? undefined : "Invalid email";
          },
        })}
      />

      <div data-testid="error">{form.errors.email ?? ""}</div>
      <div data-testid="validating">{form.validating.email ? "yes" : "no"}</div>

      <button
        onClick={form.handleSubmit((vals) => onSubmit?.(vals))}
        aria-label="submit"
      >
        Submit
      </button>
    </div>
  );
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("useForm - async debounce (v0.2 spec)", () => {
  it("debounces async validation: does not call validateAsync until debounce time passes", async () => {
    vi.useFakeTimers();

    const validateAsyncSpy = vi.fn(async (value: unknown) => {
      await new Promise((r) => setTimeout(r, 10));
      return String(value).includes("@") ? undefined : "Invalid email";
    });

    function SpyForm() {
      const form = useForm({
        initialValues: { email: "" },
        validateOn: "change",
        asyncDebounceMs: 200,
      });

      return (
        <div>
          <input
            aria-label="email"
            {...form.register("email", {
              validateAsync: validateAsyncSpy,
            })}
          />
          <div data-testid="error">{form.errors.email ?? ""}</div>
        </div>
      );
    }

    render(<SpyForm />);

    const input = screen.getByLabelText("email");
    fireEvent.change(input, { target: { value: "a" } });
    expect(validateAsyncSpy).toHaveBeenCalledTimes(0);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(199);
    });
    expect(validateAsyncSpy).toHaveBeenCalledTimes(0);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    // scheduled call should start now
    expect(validateAsyncSpy).toHaveBeenCalledTimes(1);
  });

  it("debounce cancels previous scheduled async call (latest wins)", async () => {
    vi.useFakeTimers();

    const validateAsyncSpy = vi.fn(async () => undefined);

    function SpyForm() {
      const form = useForm({
        initialValues: { email: "" },
        validateOn: "change",
        asyncDebounceMs: 200,
      });

      return (
        <input
          aria-label="email"
          {...form.register("email", {
            validateAsync: validateAsyncSpy,
          })}
        />
      );
    }

    render(<SpyForm />);

    const input = screen.getByLabelText("email");
    fireEvent.change(input, { target: { value: "a" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    fireEvent.change(input, { target: { value: "ab" } });

    // still nothing yet
    expect(validateAsyncSpy).toHaveBeenCalledTimes(0);

    // first schedule would have fired at t=200, but it was canceled by the second change
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    }); // reach t=200
    expect(validateAsyncSpy).toHaveBeenCalledTimes(0);

    // second schedule fires at t=300
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(validateAsyncSpy).toHaveBeenCalledTimes(1);
  });

  it("sets validating=true immediately when debounce is scheduled", async () => {
    vi.useFakeTimers();

    render(<DebounceForm validateOn="change" asyncDebounceMs={200} />);

    expect(screen.getByTestId("validating")).toHaveTextContent("no");

    const input = screen.getByLabelText("email");
    fireEvent.change(input, { target: { value: "a" } });

    // validating should become true immediately (scheduled)
    expect(screen.getByTestId("validating")).toHaveTextContent("yes");

    // after debounce + async resolve, validating should turn off
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20);
    });

    expect(screen.getByTestId("validating")).toHaveTextContent("no");
  });

  it("blur bypasses debounce (runs async immediately on blur)", async () => {
    vi.useFakeTimers();

    const validateAsyncSpy = vi.fn(async () => "Invalid email");

    function BlurForm() {
      const form = useForm({
        initialValues: { email: "" },
        validateOn: "blur",
        asyncDebounceMs: 500,
      });

      return (
        <div>
          <input
            aria-label="email"
            {...form.register("email", {
              validateAsync: validateAsyncSpy,
            })}
          />
          <div data-testid="error">{form.errors.email ?? ""}</div>
        </div>
      );
    }

    render(<BlurForm />);

    const input = screen.getByLabelText("email");
    fireEvent.change(input, { target: { value: "hello" } });
    fireEvent.blur(input);

    expect(validateAsyncSpy).toHaveBeenCalledTimes(1);
  });

  it("submit bypasses debounce (runs async immediately on submit)", async () => {
    vi.useFakeTimers();

    const validateAsyncSpy = vi.fn(async () => "Invalid email");

    function SubmitForm() {
      const form = useForm({
        initialValues: { email: "hello" },
        validateOn: "submit",
        asyncDebounceMs: 500,
      });

      return (
        <div>
          <input
            aria-label="email"
            {...form.register("email", {
              validateAsync: validateAsyncSpy,
            })}
          />
          <button onClick={form.handleSubmit(() => {})}>Submit</button>
        </div>
      );
    }

    render(<SubmitForm />);

    fireEvent.click(screen.getByText("Submit"));

    // should run immediately, not wait 500ms
    expect(validateAsyncSpy).toHaveBeenCalledTimes(1);
  });

  it("sync error prevents async validation (required failing stops validateAsync)", async () => {
    vi.useFakeTimers();

    const validateAsyncSpy = vi.fn(async () => undefined);

    function ReqForm() {
      const form = useForm({
        initialValues: { email: "" },
        validateOn: "blur",
        asyncDebounceMs: 200,
      });

      return (
        <div>
          <input
            aria-label="email"
            {...form.register("email", {
              required: "Email required",
              validateAsync: validateAsyncSpy,
            })}
          />
          <div data-testid="error">{form.errors.email ?? ""}</div>
        </div>
      );
    }

    render(<ReqForm />);

    const input = screen.getByLabelText("email");
    fireEvent.focus(input);
    fireEvent.blur(input);

    expect(screen.getByTestId("error")).toHaveTextContent("Email required");
    expect(validateAsyncSpy).toHaveBeenCalledTimes(0);
  });
});

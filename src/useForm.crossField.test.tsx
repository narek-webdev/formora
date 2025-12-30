import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Adjust this import if your project re-exports useForm from a different entry.
import { useForm } from "./useForm/useForm";

afterEach(() => {
  cleanup();
});

function ConfirmPasswordForm(props: {
  validateOn: "change" | "blur" | "submit";
}) {
  const form = useForm({
    initialValues: { password: "", confirmPassword: "" },
    validateOn: props.validateOn,
    asyncDebounceMs: 0,
    blockSubmitWhileValidating: false,
  });

  return (
    <form onSubmit={form.handleSubmit(() => undefined)}>
      <input
        aria-label="password"
        {...form.register("password", { required: "Password required" })}
      />

      <input
        aria-label="confirmPassword"
        {...form.register("confirmPassword", {
          required: "Confirm required",
          validate: (value, values) =>
            value !== values.password ? "Passwords do not match" : undefined,
        })}
      />

      <button type="submit">submit</button>

      <div aria-label="passwordError">{form.errors.password as any}</div>
      <div aria-label="confirmError">{form.errors.confirmPassword as any}</div>
    </form>
  );
}

function CompanyForm(props: { validateOn: "change" | "blur" | "submit" }) {
  const form = useForm({
    initialValues: { isCompany: false, companyName: "" },
    validateOn: props.validateOn,
    asyncDebounceMs: 0,
    blockSubmitWhileValidating: false,
  });

  return (
    <form onSubmit={form.handleSubmit(() => undefined)}>
      <input
        aria-label="isCompany"
        type="checkbox"
        checked={form.values.isCompany}
        onChange={(e) => form.setValue("isCompany", e.target.checked)}
      />

      <input
        aria-label="companyName"
        {...form.register("companyName", {
          validate: (value, values) =>
            values.isCompany && !value ? "Company name is required" : undefined,
        })}
      />

      <button type="submit">submit</button>
      <div aria-label="companyError">{form.errors.companyName as any}</div>
    </form>
  );
}

function DateRangeForm(props: { validateOn: "change" | "blur" | "submit" }) {
  const form = useForm({
    initialValues: { startDate: "", endDate: "" },
    validateOn: props.validateOn,
    asyncDebounceMs: 0,
    blockSubmitWhileValidating: false,
  });

  return (
    <form onSubmit={form.handleSubmit(() => undefined)}>
      <input aria-label="startDate" {...form.register("startDate")} />
      <input
        aria-label="endDate"
        {...form.register("endDate", {
          validate: (value, values) => {
            if (!value || !values.startDate) return undefined;
            const s = Date.parse(String(values.startDate));
            const e = Date.parse(String(value));
            return e <= s ? "End date must be after start date" : undefined;
          },
        })}
      />
      <button type="submit">submit</button>
      <div aria-label="endDateError">{form.errors.endDate as any}</div>
    </form>
  );
}

function AsyncCrossFieldForm() {
  const form = useForm({
    initialValues: { password: "", confirmPassword: "" },
    validateOn: "change",
    asyncDebounceMs: 50,
    blockSubmitWhileValidating: false,
  });

  return (
    <form onSubmit={form.handleSubmit(() => undefined)}>
      <input aria-label="password" {...form.register("password")} />
      <input
        aria-label="confirmPassword"
        {...form.register("confirmPassword", {
          // async cross-field validator must see latest values snapshot
          validateAsync: async (value, values) => {
            await new Promise((r) => setTimeout(r, 10));
            return value !== values.password
              ? "Passwords do not match"
              : undefined;
          },
        })}
      />
      <div aria-label="confirmError">{form.errors.confirmPassword as any}</div>
    </form>
  );
}

describe("useForm v0.4 - cross-field validation", () => {
  it("sync cross-field: confirmPassword compares against password (submit validates all registered fields)", async () => {
    const user = userEvent.setup();
    render(<ConfirmPasswordForm validateOn="submit" />);

    await user.type(screen.getByLabelText("password"), "secret");
    // Provide a non-empty confirmPassword so `required` doesn't mask the cross-field error
    await user.type(screen.getByLabelText("confirmPassword"), "nope");

    await user.click(screen.getByRole("button", { name: /submit/i }));

    expect(screen.getByLabelText("confirmError").textContent).toBe(
      "Passwords do not match"
    );
  });

  it("sync cross-field: conditional required (companyName required only when isCompany=true)", async () => {
    const user = userEvent.setup();
    render(<CompanyForm validateOn="submit" />);

    // Submit without company flag => ok
    await user.click(screen.getByRole("button", { name: /submit/i }));
    expect(screen.getByLabelText("companyError").textContent).toBe("");

    // Turn on company and submit => error
    await user.click(screen.getByLabelText("isCompany"));
    await user.click(screen.getByRole("button", { name: /submit/i }));
    expect(screen.getByLabelText("companyError").textContent).toBe(
      "Company name is required"
    );

    // Fill name and submit => clears
    await user.type(screen.getByLabelText("companyName"), "BoomTech");
    await user.click(screen.getByRole("button", { name: /submit/i }));
    expect(screen.getByLabelText("companyError").textContent).toBe("");
  });

  it("sync cross-field: date range validation (endDate after startDate)", async () => {
    const user = userEvent.setup();
    render(<DateRangeForm validateOn="blur" />);

    await user.type(screen.getByLabelText("startDate"), "2025-01-10");
    await user.type(screen.getByLabelText("endDate"), "2025-01-09");

    // validateOn blur => blur endDate
    await user.tab();

    expect(screen.getByLabelText("endDateError").textContent).toBe(
      "End date must be after start date"
    );
  });

  describe("async cross-field (debounced) uses latest values snapshot", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("debounced validateAsync sees updated password if it changes before the timer fires", async () => {
      render(<AsyncCrossFieldForm />);

      const password = screen.getByLabelText("password") as HTMLInputElement;
      const confirm = screen.getByLabelText(
        "confirmPassword"
      ) as HTMLInputElement;

      // Schedule async validation for confirmPassword (debounced 50ms)
      fireEvent.change(password, { target: { value: "a" } });
      fireEvent.change(confirm, { target: { value: "a" } });

      // Before debounce fires, password changes
      fireEvent.change(password, { target: { value: "b" } });

      // Let debounce fire + async settle
      await vi.advanceTimersByTimeAsync(60); // debounce
      await vi.advanceTimersByTimeAsync(20); // inner setTimeout(10) + microtasks

      expect(screen.getByLabelText("confirmError").textContent).toBe(
        "Passwords do not match"
      );
    });
  });
});

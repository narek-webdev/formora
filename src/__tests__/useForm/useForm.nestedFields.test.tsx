import { describe, test, expect, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useForm } from "../../index";

// Note: v0.5 supports nested OBJECT paths using dot notation only.
// Examples: "user.email", "profile.address.street"

describe("useForm - nested fields", () => {
  test("setValue/getValue works for dot paths", () => {
    const { result } = renderHook(() =>
      useForm({
        initialValues: { user: { email: "" } },
      })
    );

    act(() => {
      result.current.setValue("user.email", "a@b.com");
    });

    // values should be nested
    expect(result.current.values.user.email).toBe("a@b.com");

    // getValue is not part of public API (yet), so we assert via values
  });

  test("setValue works for deep nested object path (profile.address.street)", () => {
    const { result } = renderHook(() =>
      useForm({
        initialValues: { profile: { address: { street: "" } } },
      })
    );

    act(() => {
      result.current.setValue("profile.address.street", "Abovyan");
    });

    expect(result.current.values.profile.address.street).toBe("Abovyan");
  });

  test("register reads nested value", () => {
    const { result } = renderHook(() =>
      useForm({
        initialValues: { user: { email: "x@y.com" } },
      })
    );

    const props = result.current.register("user.email");
    expect(props.value).toBe("x@y.com");
  });

  test("required validation writes nested errors on submit", async () => {
    const onValid = vi.fn();
    const onInvalid = vi.fn();

    const { result } = renderHook(() =>
      useForm({
        initialValues: { user: { email: "" } },
      })
    );

    // register with required
    result.current.register("user.email", { required: true });

    await act(async () => {
      await result.current.handleSubmit(onValid, onInvalid)();
    });

    expect(onValid).not.toHaveBeenCalled();
    expect(onInvalid).toHaveBeenCalled();

    // errors should be nested
    expect(result.current.errors.user.email).toBeDefined();
  });

  test("touched is nested (user.email) after blur", () => {
    const { result } = renderHook(() =>
      useForm({
        initialValues: { user: { email: "" } },
        validateOn: "blur",
      })
    );

    const props = result.current.register("user.email", { required: true });

    act(() => {
      props.onBlur();
    });

    expect(result.current.touched.user?.email).toBe(true);
  });

  test("maxLength validates nested string on submit", async () => {
    const onValid = vi.fn();
    const onInvalid = vi.fn();

    const { result } = renderHook(() =>
      useForm({
        initialValues: { user: { email: "" } },
      })
    );

    result.current.register("user.email", {
      maxLength: { value: 3, message: "Too long" },
    });

    act(() => {
      result.current.setValue("user.email", "abcd");
    });

    await act(async () => {
      await result.current.handleSubmit(onValid, onInvalid)();
    });

    expect(onValid).not.toHaveBeenCalled();
    expect(onInvalid).toHaveBeenCalled();
    expect(result.current.errors.user.email).toBe("Too long");
  });

  test("min/max validates nested number on submit", async () => {
    const onValid = vi.fn();
    const onInvalid = vi.fn();

    const { result } = renderHook(() =>
      useForm({
        initialValues: { user: { age: 0 } },
      })
    );

    result.current.register("user.age", {
      min: { value: 18, message: "Too young" },
      max: { value: 60, message: "Too old" },
    });

    act(() => {
      result.current.setValue("user.age", 10);
    });

    await act(async () => {
      await result.current.handleSubmit(onValid, onInvalid)();
    });

    expect(onValid).not.toHaveBeenCalled();
    expect(onInvalid).toHaveBeenCalled();
    expect(result.current.errors.user.age).toBe("Too young");

    // Now set above max
    act(() => {
      result.current.setValue("user.age", 70);
    });

    await act(async () => {
      await result.current.handleSubmit(onValid, onInvalid)();
    });

    expect(result.current.errors.user.age).toBe("Too old");
  });

  test("submit runs validateAsync immediately for nested path (bypasses debounce)", async () => {
    const onValid = vi.fn();
    const onInvalid = vi.fn();

    const validateAsync = vi.fn(async (val: any) => {
      // Simulate async check
      await new Promise((r) => setTimeout(r, 5));
      return val === "taken" ? "Already taken" : undefined;
    });

    const { result } = renderHook(() =>
      useForm({
        initialValues: { user: { username: "" } },
        // even if global debounce exists, submit must bypass it
        asyncDebounceMs: 200,
      })
    );

    result.current.register("user.username", {
      validateAsync,
      asyncDebounceMs: 200,
    });

    act(() => {
      result.current.setValue("user.username", "taken");
    });

    await act(async () => {
      await result.current.handleSubmit(onValid, onInvalid)();
    });

    expect(onValid).not.toHaveBeenCalled();
    expect(onInvalid).toHaveBeenCalled();
    expect(validateAsync).toHaveBeenCalled();
    expect(result.current.errors.user.username).toBe("Already taken");
  });

  test("nested error clears when field becomes valid", async () => {
    const onValid = vi.fn();
    const onInvalid = vi.fn();

    const { result } = renderHook(() =>
      useForm({
        initialValues: { user: { email: "" } },
      })
    );

    result.current.register("user.email", { required: "Required" });

    // First submit invalid
    await act(async () => {
      await result.current.handleSubmit(onValid, onInvalid)();
    });

    expect(result.current.errors.user.email).toBe("Required");

    // Fix value and submit again
    act(() => {
      result.current.setValue("user.email", "ok");
    });

    await act(async () => {
      await result.current.handleSubmit(onValid, onInvalid)();
    });

    expect(result.current.errors.user).toBeUndefined();
    expect(onValid).toHaveBeenCalled();
  });
});

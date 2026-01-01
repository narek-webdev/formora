import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useForm } from "./useForm/useForm";

describe("useForm v0.6 - field arrays", () => {
  it("append adds a new item at the array root", () => {
    const { result } = renderHook(() =>
      useForm({
        initialValues: { items: [{ name: "" }] },
      })
    );

    expect(result.current.values.items).toHaveLength(1);

    act(() => {
      result.current.append("items", { name: "" });
    });

    expect(result.current.values.items).toHaveLength(2);
    expect(result.current.values.items[1]!.name).toBe("");
  });

  it("register supports dot-index paths (items.0.name)", () => {
    const { result } = renderHook(() =>
      useForm({
        initialValues: { items: [{ name: "" }] },
      })
    );

    const props = result.current.register("items.0.name");

    act(() => {
      props.onChange({
        target: { name: "items.0.name", value: "Bob" },
      } as any);
    });

    expect(result.current.values.items[0]!.name).toBe("Bob");
  });

  it("submit validates registered array fields (required)", async () => {
    const { result } = renderHook(() =>
      useForm({
        initialValues: { items: [{ name: "" }] },
        validateOn: "submit",
      })
    );

    // Register the field with rules (important: submit validates registered fields)
    result.current.register("items.0.name", {
      required: "Name required",
    });

    let invalidErrors: any = null;

    await act(async () => {
      await result.current.handleSubmit(
        () => {
          // should not be called
        },
        (errs) => {
          invalidErrors = errs;
        }
      )({ preventDefault() {} } as any);
    });

    expect(invalidErrors?.items?.[0]?.name).toBe("Name required");
    expect(result.current.errors.items?.[0]?.name).toBe("Name required");
  });

  it("remove shifts nested errors and touched for the array branch", () => {
    const { result } = renderHook(() =>
      useForm({
        initialValues: { items: [{ name: "A" }, { name: "B" }] },
      })
    );

    act(() => {
      result.current.setError("items.1.name", "Second item error");
      result.current.setTouched("items.1.name", true);
    });

    expect(result.current.errors.items?.[1]?.name).toBe("Second item error");
    expect(result.current.touched.items?.[1]?.name).toBe(true);

    act(() => {
      result.current.remove("items", 0);
    });

    // Former index 1 becomes index 0
    expect(result.current.values.items).toHaveLength(1);
    expect(result.current.values.items[0]!.name).toBe("B");

    expect(result.current.errors.items?.[0]?.name).toBe("Second item error");
    expect(result.current.touched.items?.[0]?.name).toBe(true);
  });

  it("remove out of bounds does nothing", () => {
    const { result } = renderHook(() =>
      useForm({
        initialValues: { items: [{ name: "A" }] },
      })
    );

    act(() => {
      result.current.setError("items.0.name", "Err");
    });

    act(() => {
      result.current.remove("items", 5);
    });

    expect(result.current.values.items).toHaveLength(1);
    expect(result.current.values.items[0]!.name).toBe("A");
    expect(result.current.errors.items?.[0]?.name).toBe("Err");
  });

  it("move reorders values and shifts nested errors/touched/dirty", () => {
    const { result } = renderHook(() =>
      useForm({
        initialValues: { items: [{ name: "A" }, { name: "B" }, { name: "C" }] },
      })
    );

    act(() => {
      result.current.setError("items.0.name", "ErrA");
      result.current.setTouched("items.0.name", true);
      // mark dirty by changing value
      result.current.setValue("items.0.name", "A!", { shouldValidate: false });
    });

    act(() => {
      result.current.move("items", 0, 2);
    });

    expect(result.current.values.items.map((x: any) => x.name)).toEqual([
      "B",
      "C",
      "A!",
    ]);

    // error/touched/dirty should follow the moved item to index 2
    expect(result.current.errors.items?.[2]?.name).toBe("ErrA");
    expect(result.current.touched.items?.[2]?.name).toBe(true);
    expect(result.current.dirty.items?.[2]?.name).toBe(true);
  });

  it("swap swaps values and shifts nested errors/touched", () => {
    const { result } = renderHook(() =>
      useForm({
        initialValues: { items: [{ name: "A" }, { name: "B" }] },
      })
    );

    act(() => {
      result.current.setError("items.0.name", "ErrA");
      result.current.setTouched("items.0.name", true);
    });

    act(() => {
      result.current.swap("items", 0, 1);
    });

    expect(result.current.values.items.map((x: any) => x.name)).toEqual([
      "B",
      "A",
    ]);

    expect(result.current.errors.items?.[1]?.name).toBe("ErrA");
    expect(result.current.touched.items?.[1]?.name).toBe(true);
  });

  it("move out of bounds does nothing", () => {
    const { result } = renderHook(() =>
      useForm({
        initialValues: { items: [{ name: "A" }, { name: "B" }] },
      })
    );

    act(() => {
      result.current.setError("items.0.name", "ErrA");
    });

    act(() => {
      result.current.move("items", 0, 5);
    });

    expect(result.current.values.items.map((x: any) => x.name)).toEqual([
      "A",
      "B",
    ]);
    expect(result.current.errors.items?.[0]?.name).toBe("ErrA");
  });

  it("swap with same indices does nothing", () => {
    const { result } = renderHook(() =>
      useForm({
        initialValues: { items: [{ name: "A" }, { name: "B" }] },
      })
    );

    act(() => {
      result.current.setError("items.0.name", "ErrA");
      result.current.setTouched("items.0.name", true);
    });

    act(() => {
      result.current.swap("items", 0, 0);
    });

    expect(result.current.values.items.map((x: any) => x.name)).toEqual([
      "A",
      "B",
    ]);
    expect(result.current.errors.items?.[0]?.name).toBe("ErrA");
    expect(result.current.touched.items?.[0]?.name).toBe(true);
  });

  it("insert inserts an item at index and shifts values", () => {
    const { result } = renderHook(() =>
      useForm({
        initialValues: { items: [{ name: "A" }, { name: "B" }] },
      })
    );

    act(() => {
      result.current.insert("items", 1, { name: "X" });
    });

    expect(result.current.values.items.map((x: any) => x.name)).toEqual([
      "A",
      "X",
      "B",
    ]);
  });

  it("insert shifts nested errors/touched/dirty to the right", () => {
    const { result } = renderHook(() =>
      useForm({
        initialValues: { items: [{ name: "A" }, { name: "B" }, { name: "C" }] },
      })
    );

    act(() => {
      result.current.setError("items.1.name", "ErrB");
      result.current.setTouched("items.1.name", true);
      result.current.setValue("items.1.name", "B!", { shouldValidate: false });
    });

    act(() => {
      result.current.insert("items", 1, { name: "X" });
    });

    expect(result.current.values.items.map((x: any) => x.name)).toEqual([
      "A",
      "X",
      "B!",
      "C",
    ]);

    // former index 1 should now be index 2
    expect(result.current.errors.items?.[2]?.name).toBe("ErrB");
    expect(result.current.touched.items?.[2]?.name).toBe(true);
    expect(result.current.dirty.items?.[2]?.name).toBe(true);
  });

  it("replace replaces an item at index without changing length", () => {
    const { result } = renderHook(() =>
      useForm({
        initialValues: { items: [{ name: "A" }, { name: "B" }] },
      })
    );

    act(() => {
      result.current.replace("items", 0, { name: "Z" });
    });

    expect(result.current.values.items.map((x: any) => x.name)).toEqual([
      "Z",
      "B",
    ]);
  });

  it("replace out of bounds does nothing", () => {
    const { result } = renderHook(() =>
      useForm({
        initialValues: { items: [{ name: "A" }] },
      })
    );

    act(() => {
      result.current.setError("items.0.name", "ErrA");
      result.current.replace("items", 5, { name: "X" });
    });

    expect(result.current.values.items.map((x: any) => x.name)).toEqual(["A"]);
    expect(result.current.errors.items?.[0]?.name).toBe("ErrA");
  });
});

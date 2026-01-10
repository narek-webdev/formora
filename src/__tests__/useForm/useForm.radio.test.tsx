import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useForm } from "../../index";

describe("useForm — radio", () => {
  it("sets value from radio input via register onChange", () => {
    const { result } = renderHook(() =>
      useForm<{ plan: string }>({
        initialValues: { plan: "" },
        validateOn: "change",
      })
    );

    // choose "basic"
    act(() => {
      result.current.register("plan").onChange({
        target: { type: "radio", value: "basic", checked: true },
      } as any);
    });
    expect(result.current.values.plan).toBe("basic");

    // switch to "pro"
    act(() => {
      result.current.register("plan").onChange({
        target: { type: "radio", value: "pro", checked: true },
      } as any);
    });
    expect(result.current.values.plan).toBe("pro");
  });

  it("ignores radio events when checked is false (safety)", () => {
    const { result } = renderHook(() =>
      useForm<{ plan: string }>({
        initialValues: { plan: "basic" },
        validateOn: "change",
      })
    );

    act(() => {
      result.current.register("plan").onChange({
        target: { type: "radio", value: "pro", checked: false },
      } as any);
    });

    // should stay the same
    expect(result.current.values.plan).toBe("basic");
  });
});

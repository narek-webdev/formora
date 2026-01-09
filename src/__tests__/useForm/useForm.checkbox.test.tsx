import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useForm } from "../../index";

describe("useForm — checkbox", () => {
  it("updates boolean values via register onChange", () => {
    const { result } = renderHook(() =>
      useForm<{ agree: boolean }>({
        initialValues: { agree: false },
        validateOn: "change",
      })
    );

    act(() => {
      result.current.register("agree").onChange({
        target: { type: "checkbox", checked: true },
      } as any);
    });
    expect(result.current.values.agree).toBe(true);

    act(() => {
      result.current.register("agree").onChange({
        target: { type: "checkbox", checked: false },
      } as any);
    });
    expect(result.current.values.agree).toBe(false);
  });
});

import { describe, it, expect } from "vitest";
import { useFormValidation } from "./useFormValidation";

describe("smoke", () => {
  it("exports useFormValidation", () => {
    expect(typeof useFormValidation).toBe("function");
  });
});

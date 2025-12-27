import { describe, it, expect } from "vitest";
import { useForm } from "./useForm";

describe("smoke", () => {
  it("exports useForm", () => {
    expect(typeof useForm).toBe("function");
  });
});

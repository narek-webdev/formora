import { describe, it, expect } from "vitest";
import { useForm } from "../index";

describe("smoke", () => {
  it("exports useForm", () => {
    expect(typeof useForm).toBe("function");
  });
});

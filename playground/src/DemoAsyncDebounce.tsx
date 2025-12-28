import React from "react";
import { useForm } from "formora"; // or your local import if playground links dist

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export default function DemoAsyncDebounce() {
  const form = useForm({
    initialValues: { email: "", age: 0 },
    validateOn: "change",
    asyncDebounceMs: 500, // 👈 debounce
    blockSubmitWhileValidating: true,
  });

  // async validator: slow + returns error for some values
  const validateEmailAsync = async (value: unknown) => {
    const v = String(value ?? "");
    await sleep(800); // 👈 slow so you can see validating
    if (!v) return undefined;
    if (!v.includes("@")) return "Email must include @";
    if (v.toLowerCase().includes("taken")) return "Email is already taken";
    return undefined;
  };

  return (
    <div
      style={{ maxWidth: 520, margin: "40px auto", fontFamily: "system-ui" }}
    >
      <h2>Formora Playground: Async Debounce + DX Helpers</h2>

      <label style={{ display: "block", marginTop: 16 }}>
        Email
        <input
          style={{ width: "100%", padding: 10, marginTop: 6 }}
          placeholder="try typing fast: a, ab, abc, abc@..."
          {...form.register("email", {
            required: "Email is required",
            validateAsync: validateEmailAsync,
            // you can override per-field:
            // asyncDebounceMs: 300,
          })}
        />
      </label>

      <div style={{ marginTop: 8 }}>
        <b>Error:</b> {form.errors.email ?? "(none)"}
      </div>
      <div style={{ marginTop: 6 }}>
        <b>validating.email:</b> {form.validating.email ? "yes" : "no"} |{" "}
        <b>isValidating:</b> {form.isValidating ? "yes" : "no"}
      </div>

      <label style={{ display: "block", marginTop: 16 }}>
        Age
        <input
          style={{ width: "100%", padding: 10, marginTop: 6 }}
          type="number"
          {...form.register("age", {
            min: { value: 18, message: "Must be 18+" },
            max: { value: 99, message: "Too old for this demo 😄" },
          })}
        />
      </label>

      <div
        style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}
      >
        {/* DX helpers */}
        <button
          onClick={() =>
            form.setValue("email", "taken@example.com", {
              shouldTouch: true,
              shouldValidate: true,
            })
          }
        >
          setValue(email=taken…)
        </button>

        <button
          onClick={() =>
            form.setValues(
              { email: "john@example.com", age: 25 },
              { shouldTouch: true, shouldValidate: true }
            )
          }
        >
          setValues(valid)
        </button>

        <button
          onClick={() =>
            form.setValues(
              { email: "bad", age: 10 },
              { shouldTouch: true, shouldValidate: true }
            )
          }
        >
          setValues(invalid)
        </button>

        <button onClick={() => form.setError("email", "Server says nope")}>
          setError(email)
        </button>

        <button onClick={() => form.clearError("email")}>
          clearError(email)
        </button>
        <button onClick={() => form.clearErrors()}>clearErrors()</button>

        <button onClick={() => form.touchAll()}>touchAll()</button>

        <button onClick={() => form.resetField("email")}>
          resetField(email)
        </button>
        <button onClick={() => form.reset()}>reset()</button>
      </div>

      <pre style={{ marginTop: 18, background: "#f6f6f6", padding: 12 }}>
        {JSON.stringify(
          {
            values: form.values,
            errors: form.errors,
            touched: form.touched,
            validating: form.validating,
            submitCount: form.submitCount,
            hasSubmitted: form.hasSubmitted,
            isValid: form.isValid,
            isValidating: form.isValidating,
          },
          null,
          2
        )}
      </pre>
    </div>
  );
}

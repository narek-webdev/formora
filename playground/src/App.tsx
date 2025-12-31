import React from "react";
import { useForm } from "../../src";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export default function App() {
  const form = useForm({
    initialValues: {
      user: {
        email: "",
        username: "",
        password: "",
        confirmPassword: "",
        age: 0,
      },
      profile: {
        bio: "",
        address: {
          street: "",
        },
      },
      items: [{ name: "" }],
    },
    // change this to "blur" or "submit" while testing
    validateOn: "change",

    // v0.2: async debounce
    asyncDebounceMs: 500,
    blockSubmitWhileValidating: true,
  });

  // v0.2: async validation (slow on purpose)
  const validateEmailAsync = async (value: unknown, _values: unknown) => {
    const v = String(value ?? "");
    if (!v) return undefined;

    // simulate network
    await sleep(800);

    if (!v.includes("@")) return "Email must include @";
    if (v.toLowerCase().includes("taken")) return "Email is already taken";
    return undefined;
  };

  const onSubmit = form.handleSubmit(
    async (values) => {
      // simulate a submit call
      await sleep(400);
      alert("✅ Submitted!\n\n" + JSON.stringify(values, null, 2));
    },
    async (errors) => {
      // simulate server-side error mapping
      await sleep(200);
      alert("❌ Invalid form.\n\n" + JSON.stringify(errors, null, 2));
    }
  );

  return (
    <div
      style={{
        maxWidth: 720,
        margin: "40px auto",
        padding: 16,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
        lineHeight: 1.4,
      }}
    >
      <h1 style={{ margin: 0 }}>Formora Playground</h1>
      <p style={{ marginTop: 8 }}>
        Test everything we built so far: sync rules, async validation
        (race-safe), debounced async validation, cross-field validation, v0.5
        nested fields, v0.6 field arrays, and DX helpers.
      </p>

      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          marginTop: 12,
          padding: 12,
          border: "1px solid #ddd",
          borderRadius: 10,
        }}
      >
        <div>
          <b>isValid:</b> {form.isValid ? "yes" : "no"}
        </div>
        <div>
          <b>isValidating:</b> {form.isValidating ? "yes" : "no"}
        </div>
        <div>
          <b>submitCount:</b> {form.submitCount}
        </div>
        <div>
          <b>hasSubmitted:</b> {form.hasSubmitted ? "yes" : "no"}
        </div>
      </div>

      {/* EMAIL (required + async + debounce) */}
      <section style={{ marginTop: 18 }}>
        <h2 style={{ margin: "12px 0 8px" }}>
          1) Email — required + async + debounce
        </h2>

        <label style={{ display: "block" }}>
          Email
          <input
            style={{ width: "100%", padding: 10, marginTop: 6 }}
            placeholder='Try: "taken@example.com" or type fast: a, ab, abc@...'
            {...form.register("user.email", {
              required: "Email is required",
              // v0.2 async validation
              validateAsync: validateEmailAsync,
              // You can override debounce per-field:
              // asyncDebounceMs: 300,
            })}
          />
        </label>

        <div style={{ marginTop: 8 }}>
          <b>email error:</b> {form.errors.user?.email ?? "(none)"}
        </div>
        <div style={{ marginTop: 6 }}>
          <b>validating.email:</b> {form.validating.user?.email ? "yes" : "no"}
        </div>

        <details style={{ marginTop: 8 }}>
          <summary>How to verify async debounce + race safety</summary>
          <ul>
            <li>
              Type quickly: the async validation should NOT fire on every
              keystroke. It runs after you stop typing for ~500ms.
            </li>
            <li>
              Race safety: type "taken" then quickly replace with
              "john@example.com" — the old "taken" result must NOT override the
              latest.
            </li>
            <li>
              Blur bypass: click outside the input — async validation should run
              immediately.
            </li>
          </ul>
        </details>
      </section>

      {/* USERNAME (pattern + minLength/maxLength) */}
      <section style={{ marginTop: 22 }}>
        <h2 style={{ margin: "12px 0 8px" }}>
          2) Username — pattern + minLength/maxLength
        </h2>

        <label style={{ display: "block" }}>
          Username
          <input
            style={{ width: "100%", padding: 10, marginTop: 6 }}
            placeholder="Only letters/numbers/underscore"
            {...form.register("user.username", {
              required: "Username is required",
              minLength: { value: 3, message: "Min 3 characters" },
              maxLength: { value: 15, message: "Max 15 characters" },
              pattern: {
                value: /^[a-zA-Z0-9_]+$/,
                message: "Use only letters, numbers, underscore",
              },
            })}
          />
        </label>

        <div style={{ marginTop: 8 }}>
          <b>username error:</b> {form.errors.user?.username ?? "(none)"}
        </div>
      </section>

      {/* PASSWORD (minLength + custom validate) */}
      <section style={{ marginTop: 22 }}>
        <h2 style={{ margin: "12px 0 8px" }}>
          3) Password — minLength + custom validate()
        </h2>

        <label style={{ display: "block" }}>
          Password
          <input
            type="password"
            style={{ width: "100%", padding: 10, marginTop: 6 }}
            placeholder="Try 'password' to see custom validation"
            {...form.register("user.password", {
              required: "Password is required",
              minLength: { value: 8, message: "Min 8 characters" },
              validate: (value) => {
                const v = String(value ?? "");
                if (!v) return undefined;
                if (v.toLowerCase().includes("password"))
                  return "Too weak (contains 'password')";
                return undefined;
              },
            })}
          />
        </label>

        <div style={{ marginTop: 8 }}>
          <b>password error:</b> {form.errors.user?.password ?? "(none)"}
        </div>
      </section>

      {/* CONFIRM PASSWORD (v0.4 cross-field validate) */}
      <section style={{ marginTop: 22 }}>
        <h2 style={{ margin: "12px 0 8px" }}>
          4) Confirm Password — cross-field validate() (v0.4)
        </h2>

        <label style={{ display: "block" }}>
          Confirm password
          <input
            type="password"
            style={{ width: "100%", padding: 10, marginTop: 6 }}
            placeholder="Must match password"
            {...form.register("user.confirmPassword", {
              required: "Confirm password is required",
              validate: (value, values) => {
                const v = String(value ?? "");
                if (!v) return undefined;
                const pass = String(values.user?.password ?? "");
                return v !== pass ? "Passwords do not match" : undefined;
              },
            })}
          />
        </label>

        <div style={{ marginTop: 8 }}>
          <b>confirmPassword error:</b>{" "}
          {form.errors.user?.confirmPassword ?? "(none)"}
        </div>

        <details style={{ marginTop: 8 }}>
          <summary>How to verify cross-field behavior</summary>
          <ul>
            <li>
              Type a password, then type a different confirm password — you
              should see “Passwords do not match”.
            </li>
            <li>Fix confirm password to match — the error should clear.</li>
            <li>
              Switch <code>validateOn</code> to <b>submit</b> and try submitting
              without touching confirm password — submit should still validate
              it.
            </li>
          </ul>
        </details>
      </section>

      {/* AGE (min/max numbers) */}
      <section style={{ marginTop: 22 }}>
        <h2 style={{ margin: "12px 0 8px" }}>5) Age — number min/max</h2>

        <label style={{ display: "block" }}>
          Age
          <input
            type="number"
            style={{ width: "100%", padding: 10, marginTop: 6 }}
            {...form.register("user.age", {
              min: { value: 18, message: "Must be 18+" },
              max: { value: 99, message: "Must be <= 99" },
            })}
          />
        </label>

        <div style={{ marginTop: 8 }}>
          <b>age error:</b> {form.errors.user?.age ?? "(none)"}
        </div>
      </section>

      {/* BIO (maxLength) */}
      <section style={{ marginTop: 22 }}>
        <h2 style={{ margin: "12px 0 8px" }}>6) Bio — maxLength</h2>

        <label style={{ display: "block" }}>
          Bio
          <textarea
            style={{ width: "100%", padding: 10, marginTop: 6, minHeight: 90 }}
            placeholder="Write something short…"
            {...form.register("profile.bio", {
              maxLength: { value: 50, message: "Max 50 characters" },
            })}
          />
        </label>

        <div style={{ marginTop: 8 }}>
          <b>bio error:</b> {form.errors.profile?.bio ?? "(none)"}
        </div>
      </section>

      {/* NESTED FIELDS (v0.5) */}
      <section style={{ marginTop: 22 }}>
        <h2 style={{ margin: "12px 0 8px" }}>
          7) Nested fields (v0.5) — profile.address.street
        </h2>

        <label style={{ display: "block" }}>
          Street
          <input
            style={{ width: "100%", padding: 10, marginTop: 6 }}
            placeholder="profile.address.street"
            {...form.register("profile.address.street", {
              required: "Street is required",
              minLength: { value: 3, message: "Min 3 characters" },
            })}
          />
        </label>

        <div style={{ marginTop: 8 }}>
          <b>street error:</b>{" "}
          {form.errors.profile?.address?.street ?? "(none)"}
        </div>
      </section>

      {/* FIELD ARRAYS (v0.6) */}
      <section style={{ marginTop: 22 }}>
        <h2 style={{ margin: "12px 0 8px" }}>
          8) Field arrays (v0.6) — items.${"{"}i{"}"}.name
        </h2>

        <p style={{ marginTop: 6, color: "#444" }}>
          Use <b>append</b> and <b>remove</b> to manage arrays. Validation uses
          dot-index paths like <code>items.0.name</code>.
        </p>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() =>
              form.append("items", { name: "" }, { shouldTouch: true })
            }
          >
            append item
          </button>

          <button
            type="button"
            onClick={() =>
              form.setValues(
                {
                  ...form.values,
                  items: [{ name: "" }, { name: "" }, { name: "" }],
                },
                { shouldTouch: true }
              )
            }
          >
            seed 3 items
          </button>
        </div>

        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          {form.values.items.map((item, i) => (
            <div
              key={i}
              style={{
                border: "1px solid #ddd",
                borderRadius: 10,
                padding: 12,
              }}
            >
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <label style={{ flex: 1 }}>
                  Item name #{i + 1}
                  <input
                    style={{ width: "100%", padding: 10, marginTop: 6 }}
                    placeholder={`items.${i}.name`}
                    {...form.register(`items.${i}.name`, {
                      required: "Item name is required",
                      minLength: { value: 2, message: "Min 2 characters" },
                    })}
                  />
                </label>

                <button type="button" onClick={() => form.remove("items", i)}>
                  remove
                </button>
              </div>

              <div style={{ marginTop: 8 }}>
                <b>item error:</b> {form.errors.items?.[i]?.name ?? "(none)"}
              </div>
              <div style={{ marginTop: 6 }}>
                <b>touched:</b> {form.touched.items?.[i]?.name ? "yes" : "no"}
              </div>
            </div>
          ))}
        </div>

        <details style={{ marginTop: 8 }}>
          <summary>How to verify shifting behavior</summary>
          <ul>
            <li>
              Click <b>seed 3 items</b>, then type only in the 2nd item.
            </li>
            <li>Remove the 1st item — the old 2nd item becomes the new 1st.</li>
            <li>
              Errors and touched state for that item should shift with it.
            </li>
          </ul>
        </details>
      </section>

      {/* DX HELPERS */}
      <section style={{ marginTop: 24 }}>
        <h2 style={{ margin: "12px 0 8px" }}>DX helpers (v0.3)</h2>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() =>
              form.setValue("user.email", "taken@example.com", {
                shouldTouch: true,
                shouldValidate: true,
              })
            }
          >
            setValue(email=taken…)
          </button>

          <button
            type="button"
            onClick={() =>
              form.setValues(
                {
                  user: {
                    email: "john@example.com",
                    username: "john_25",
                    password: "S3cretPass!",
                    confirmPassword: "S3cretPass!",
                    age: 25,
                  },
                  profile: {
                    bio: "Hello from Formora",
                    address: { street: "Abovyan" },
                  },
                },
                { shouldTouch: true, shouldValidate: true }
              )
            }
          >
            setValues(valid)
          </button>

          <button
            type="button"
            onClick={() =>
              form.setValues(
                {
                  user: {
                    email: "bad",
                    username: "??",
                    password: "password",
                    confirmPassword: "nope",
                    age: 10,
                  },
                  profile: {
                    bio: "This bio is definitely going to be longer than fifty characters. Too long!",
                    address: { street: "" },
                  },
                },
                { shouldTouch: true, shouldValidate: true }
              )
            }
          >
            setValues(invalid)
          </button>

          <button
            type="button"
            onClick={() => form.setError("user.email", "Server: email blocked")}
          >
            setError(email)
          </button>

          <button type="button" onClick={() => form.clearError("user.email")}>
            clearError(email)
          </button>

          <button type="button" onClick={() => form.clearErrors()}>
            clearErrors()
          </button>

          <button
            type="button"
            onClick={() => form.setTouched("user.email", true)}
          >
            setTouched(email=true)
          </button>

          <button type="button" onClick={() => form.touchAll()}>
            touchAll()
          </button>

          <button type="button" onClick={() => form.resetField("user.email")}>
            resetField(email)
          </button>

          <button type="button" onClick={() => form.reset()}>
            reset()
          </button>
        </div>

        <p style={{ marginTop: 10, color: "#444" }}>
          Tip: Use <b>setValues(invalid)</b> then try <b>clearErrors()</b> vs{" "}
          <b>reset()</b> to feel the difference.
        </p>
      </section>

      {/* SUBMIT */}
      <section style={{ marginTop: 24 }}>
        <h2 style={{ margin: "12px 0 8px" }}>Submit</h2>
        <form onSubmit={onSubmit}>
          <button type="submit">Submit</button>
        </form>
        <p style={{ marginTop: 8, color: "#444" }}>
          With <code>blockSubmitWhileValidating</code> enabled, submit waits for
          async validation.
        </p>
      </section>

      {/* DEBUG */}
      <section style={{ marginTop: 18 }}>
        <h2 style={{ margin: "12px 0 8px" }}>Debug state</h2>
        <pre
          style={{
            background: "#f6f6f6",
            padding: 12,
            borderRadius: 10,
            overflowX: "auto",
          }}
        >
          {JSON.stringify(
            {
              values: form.values,
              errors: form.errors,
              touched: form.touched,
              validating: form.validating,
              isValid: form.isValid,
              isValidating: form.isValidating,
              submitCount: form.submitCount,
              hasSubmitted: form.hasSubmitted,
            },
            null,
            2
          )}
        </pre>
      </section>
    </div>
  );
}

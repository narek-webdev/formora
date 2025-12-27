import { useForm } from "formora";

export default function App() {
  const form = useForm({
    initialValues: {
      email: "",
      username: "",
      age: "",
    },
    validateOn: "blur",
  });

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", maxWidth: 520 }}>
      <h1 style={{ marginBottom: 6 }}>Formora Playground</h1>
      <p style={{ marginTop: 0, opacity: 0.8 }}>
        Try blur/change/submit + async validation (race-safe).
      </p>

      <label style={{ display: "block", marginTop: 16 }}>
        Email
        <input
          style={{ width: "100%", padding: 10, marginTop: 6 }}
          placeholder="email@example.com"
          {...form.register("email", {
            required: "Email is required",
            pattern: {
              value: /^\S+@\S+\.\S+$/,
              message: "Invalid email",
            },
          })}
        />
      </label>
      {form.touched.email && form.errors.email && (
        <p style={{ color: "crimson", marginTop: 6 }}>{form.errors.email}</p>
      )}

      <label style={{ display: "block", marginTop: 16 }}>
        Username (async check)
        <input
          style={{ width: "100%", padding: 10, marginTop: 6 }}
          placeholder="narek"
          {...form.register("username", {
            required: "Username is required",
            minLength: { value: 3, message: "Min length is 3" },
            validateAsync: async (value) => {
              // fake server delay
              await new Promise((r) => setTimeout(r, 700));

              // demo rule: "admin" is taken
              return String(value).toLowerCase() === "admin"
                ? "Username is already taken"
                : undefined;
            },
          })}
        />
      </label>

      {form.validating.username && (
        <p style={{ marginTop: 6 }}>Checking username…</p>
      )}
      {form.touched.username && form.errors.username && (
        <p style={{ color: "crimson", marginTop: 6 }}>{form.errors.username}</p>
      )}

      <label style={{ display: "block", marginTop: 16 }}>
        Age
        <input
          style={{ width: "100%", padding: 10, marginTop: 6 }}
          placeholder="18"
          {...form.register("age", {
            min: { value: 18, message: "Must be at least 18" },
            max: { value: 99, message: "Max is 99" },
          })}
        />
      </label>
      {form.errors.age && (
        <p style={{ color: "crimson", marginTop: 6 }}>{form.errors.age}</p>
      )}

      <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
        <button
          onClick={form.handleSubmit(
            (values) => alert(JSON.stringify(values, null, 2)),
            (errors) => console.log("Invalid:", errors)
          )}
          disabled={form.isValidating}
          style={{ padding: "10px 14px" }}
        >
          {form.isValidating ? "Validating…" : "Submit"}
        </button>

        <div style={{ opacity: 0.8, alignSelf: "center" }}>
          isValid: <b>{form.isValid ? "true" : "false"}</b>
        </div>
      </div>

      <hr style={{ margin: "20px 0" }} />
      <pre style={{ background: "#f6f6f6", padding: 12, borderRadius: 8 }}>
        {JSON.stringify({ values: form.values, errors: form.errors }, null, 2)}
      </pre>
    </div>
  );
}

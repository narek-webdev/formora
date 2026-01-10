# ✨ Formora

<p align="center">
  <strong>A tiny, headless form state & validation hook for React</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/formora"><img src="https://img.shields.io/npm/v/formora.svg" /></a>
  <a href="https://github.com/narek-webdev/formora/actions/workflows/ci.yml"><img src="https://github.com/narek-webdev/formora/actions/workflows/ci.yml/badge.svg" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-yellow.svg" /></a>
</p>

<p align="center">
  📚 <a href="https://narek-webdev.github.io/formora/">Documentation</a> • 🧪 Playground included • 🧠 TypeScript-first
</p>

---

## 🚀 Why Formora?

Formora is built for **developers who want control**.

- 🧩 **Headless** — bring your own UI
- 🔍 **Predictable** — explicit validation timing (`change`, `blur`, `submit`)
- 🧠 **Type-safe** — first-class TypeScript & nested values
- 🧪 **Battle-tested** — manually tested against real DOM edge cases
- 🤖 **AI-friendly** — simple mental model, explicit APIs

No magic. No hidden behavior.

---

## 📦 Installation

```bash
npm install formora
```

---

## ⚡ Quick Start

```tsx
import { useForm } from "formora";

type Values = { email: string };

export function LoginForm() {
  const { register, values, errors, touched, handleSubmit } = useForm<Values>({
    initialValues: { email: "" },
    validateOn: "submit",
  });

  return (
    <form onSubmit={handleSubmit((v) => console.log(v))}>
      <input
        placeholder="Email"
        {...register("email", {
          required: "Email is required",
          validate: (v) =>
            String(v ?? "").includes("@") ? undefined : "Email must include @",
        })}
      />

      {touched?.email && errors?.email && (
        <p style={{ color: "crimson" }}>{String(errors.email)}</p>
      )}

      <pre>{JSON.stringify(values, null, 2)}</pre>

      <button type="submit">Submit</button>
    </form>
  );
}
```

---

## 🧠 Core API

### `useForm(options)`

```ts
useForm<T>({
  initialValues: T;
  validateOn?: "change" | "blur" | "submit";
});
```

### Returned helpers

- `values` — current form values
- `errors` — validation errors
- `touched` — field touched state (on blur)
- `dirty` — field dirty state (vs initialValues)
- `register(name, rules)` — connect inputs
- `handleSubmit(onValid, onInvalid?)`
- `reset()` — reset everything back to initial state

---

## ✅ Validation (Sync)

Formora validation is **synchronous and explicit**.

### Required

```ts
register("email", { required: "Email is required" });
```

### Custom validation

```ts
register("email", {
  validate: (value, values) => {
    const v = String(value ?? "");
    if (!v) return "Required";
    if (!v.includes("@")) return "Invalid email";
    return undefined;
  },
});
```

> `undefined` → valid • `string` → error message

---

## 🧩 Supported Inputs (Tested)

### ☑️ Checkbox → `boolean`

```tsx
<input type="checkbox" {...register("agree")} />
```

---

### 🔘 Radio

⚠️ **Important:** put `value="..."` **after** `register()`

```tsx
<input type="radio" {...register("plan")} value="basic" />
<input type="radio" {...register("plan")} value="pro" />
```

---

### 🔽 Select (single)

```tsx
<select {...register("country")}>
  <option value="">Select</option>
  <option value="am">Armenia</option>
</select>
```

---

### 🔽 Select (multiple) → `string[]`

```tsx
<select multiple {...register("tags")}>
  <option value="js">JavaScript</option>
  <option value="ts">TypeScript</option>
</select>
```

---

### 🔢 Number inputs

HTML number inputs often return **strings**. Coerce when needed:

```ts
register("age", {
  validate: (v) => {
    const n = Number(v);
    if (!v) return "Required";
    if (Number.isNaN(n)) return "Invalid number";
    if (n < 18) return "Must be 18+";
    return undefined;
  },
});
```

---

### 📝 Textarea

```tsx
<textarea {...register("bio")} />
```

---

## 🧬 Nested fields

Formora supports dot-paths out of the box:

```ts
"user.email";
"profile.address.street";
```

```tsx
<input {...register("user.email")} />
<input {...register("profile.address.street")} />
```

Errors follow the same shape:

```tsx
errors.user?.email;
```

---

## 🔁 Reset

```ts
reset();
```

Resets:

- values
- errors
- touched
- dirty

---

## 🧪 Playground

A real Vite + React playground is included for manual testing.

```bash
npm run build
cd playground
npm install
npm run dev
```

> Reinstall playground dependencies after rebuilding the library.

---

## ⚠️ Known limitations (by design)

- ❌ Async validation (planned)
- ❌ Schema resolvers (planned)
- ❌ Checkbox arrays
- ❌ File input helpers

Formora favors **explicit behavior over hidden magic**.

---

## 🗺 Roadmap

- Async validation
- Optional value coercion (`valueAsNumber`)
- Schema integrations

---

## 📄 License

MIT

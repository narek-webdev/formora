# formora

[![npm version](https://img.shields.io/npm/v/formora.svg)](https://www.npmjs.com/package/formora)
[![CI](https://github.com/narek-webdev/formora/actions/workflows/ci.yml/badge.svg)](https://github.com/narek-webdev/formora/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A **headless form state and validation hook for React**.

`formora` helps you manage form values, track user interaction, and validate inputs with a clean, type-safe API — without enforcing any UI structure.

---

## ✨ Features

- ✅ Form state management (values)
- ✅ Validation on **change**, **blur**, or **submit**
- ✅ Built-in validation rules (`required`, `pattern`, `minLength`, `maxLength`, `min`, `max`)
- ✅ Tracks `errors`, `touched`, and `isValid`
- ✅ Fully controlled inputs
- ✅ TypeScript-first, strongly typed field names
- ✅ Headless (bring your own UI)

---

## 📦 Installation

```bash
npm install formora
```

or

```bash
yarn add formora
```

---

## 🚀 Basic Usage

```tsx
import { useForm } from "formora";

function LoginForm() {
  const form = useForm({
    initialValues: { email: "" },
    validateOn: "submit",
  });

  return (
    <form onSubmit={form.handleSubmit(console.log)}>
      <input
        placeholder="Email"
        {...form.register("email", { required: "Email is required" })}
      />

      {form.touched.email && form.errors.email && <p>{form.errors.email}</p>}

      <button type="submit">Submit</button>
    </form>
  );
}
```

---

## 🧠 API Overview

### `useForm(options)`

```ts
useForm<T>({
  initialValues: T,
  validateOn: "change" | "blur" | "submit",
});
```

### Returned values

| Property       | Description                        |
| -------------- | ---------------------------------- |
| `values`       | Current form values                |
| `errors`       | Validation errors per field        |
| `touched`      | Tracks whether a field was blurred |
| `isValid`      | `true` if there are no errors      |
| `register`     | Connects an input to the form      |
| `handleSubmit` | Handles submit + validation        |

---

### `register(name, rules)`

```tsx
<input {...form.register("email", { required: true })} />
```

#### Supported rules (v0.1)

- `required: boolean | string`
- `pattern: RegExp | { value: RegExp; message: string }`
- `minLength: number | { value: number; message: string }`
- `maxLength: number | { value: number; message: string }`
- `min: number | { value: number; message: string }` (numbers / numeric strings)
- `max: number | { value: number; message: string }` (numbers / numeric strings)
- `validate: (value, values) => string | undefined`

---

### `handleSubmit(onValid, onInvalid?)`

```tsx
<form onSubmit={form.handleSubmit(onValid, onInvalid)}>
```

- Calls `onValid(values)` if form is valid
- Calls `onInvalid(errors)` if validation fails

---

## 🧪 Testing

`formora` is tested using **Vitest** and **Testing Library**, focusing on real user behavior.

```bash
npm run test
```

---

## 🧩 Playground

This repository includes a small **Vite + React playground** used to manually test `formora` in a real application environment.

The playground demonstrates:

- Sync validation rules
- Async validation (race-condition safe)
- Field-level `validating` state
- Submit behavior while async validation is in progress

### Run the playground locally

In one terminal (build the library in watch mode):

```bash
npm run build -- --watch
```

In another terminal (start the playground dev server):

```bash
cd playground
npm install
npm run dev
```

> 💡 The playground uses `formora` via a local `file:..` dependency. If you change the library build output, you may need to reinstall dependencies inside `playground/`.

---

## 🎯 Design Principles

Formora is built with a few clear principles in mind:

- **Headless by design** — Formora manages state and validation only. UI, layout, and styling are always up to you.
- **Predictable behavior** — Validation timing is explicit (`change`, `blur`, or `submit`). No hidden side effects.
- **Async-first mindset** — Async validation is treated as a first-class feature and is race-condition safe by default.
- **Type safety over magic** — Strong TypeScript typing with explicit field names and minimal runtime assumptions.
- **Small, composable API** — Fewer concepts, fewer surprises. Features are added deliberately.

## 🗺 Roadmap

Planned and possible future improvements:

- Async validation UX improvements (debouncing, submit behavior)
- Form state helpers (`reset`, `setValue`, `setError`)
- Cross-field validation helpers
- Schema adapters (Zod, Valibot) — optional, not required
- Nested fields and field arrays (longer-term)
- Improved playground examples

---

## 🤝 Contributing

Contributions are welcome!

- Open issues for bugs or feature requests
- Submit pull requests with clear descriptions
- Keep changes small and well-tested

---

## 📄 License

MIT

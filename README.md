# formora

A **headless form state and validation hook for React**.

`formora` helps you manage form values, track user interaction, and validate inputs with a clean, type-safe API — without enforcing any UI structure.

---

## ✨ Features

- ✅ Form state management (values)
- ✅ Validation on **change**, **blur**, or **submit**
- ✅ Built-in validation rules (starting with `required`)
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

## 🗺 Roadmap

Planned features:

- Pattern / length / number validation rules
- Async validation support
- Schema resolvers (Zod, Valibot)
- Nested fields and field arrays
- Playground & Storybook examples

---

## 🤝 Contributing

Contributions are welcome!

- Open issues for bugs or feature requests
- Submit pull requests with clear descriptions
- Keep changes small and well-tested

---

## 📄 License

MIT

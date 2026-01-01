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
- ✅ Cross-field validation (v0.4)
- ✅ Async validation (race-condition safe)
- ✅ Debounced async validation (v0.2)
- ✅ Field-level `validating` state
- ✅ DX helpers: `setValue`, `setValues`, `reset`, `resetField`, error & touched helpers (v0.3)
- ✅ Tracks `errors`, `touched`, and `isValid`
- ✅ Fully controlled inputs
- ✅ TypeScript-first, strongly typed field names
- ✅ Headless (bring your own UI)
- ✅ Nested object fields (v0.5)
- ✅ Field arrays (append/remove) with dot-index paths (v0.6)

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
  asyncDebounceMs: number,
  blockSubmitWhileValidating: boolean,
});
```

### Returned values

| Property       | Description                                |
| -------------- | ------------------------------------------ |
| `values`       | Current form values                        |
| `errors`       | Validation errors per field                |
| `touched`      | Tracks whether a field was blurred         |
| `isValid`      | `true` if there are no errors              |
| `register`     | Connects an input to the form              |
| `handleSubmit` | Handles submit + validation                |
| `validating`   | Field-level async validation state         |
| `isValidating` | `true` if any field is validating          |
| `submitCount`  | Number of submit attempts                  |
| `hasSubmitted` | `true` after first submit attempt          |
| `setValue`     | Programmatically set a field value         |
| `reset`        | Reset the entire form to initial values    |
| `resetField`   | Reset a single field to its initial value  |
| `setValues`    | Programmatically set multiple field values |
| `setError`     | Manually set a field error                 |
| `clearError`   | Clear a specific field error               |
| `clearErrors`  | Clear all field errors                     |
| `setTouched`   | Manually set a field's touched state       |
| `touchAll`     | Mark all registered fields as touched      |

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
- `validateAsync: (value, values) => Promise<string | undefined>`

---

## ⏳ Async Validation (v0.2)

Formora treats async validation as a first-class feature.

### `validateAsync`

```ts
register("email", {
  validateAsync: async (value) => {
    await new Promise((r) => setTimeout(r, 300));
    return value.includes("@") ? undefined : "Invalid email";
  },
});
```

### Debounced async validation

You can debounce async validators globally:

```ts
useForm({
  initialValues: { email: "" },
  validateOn: "change",
  asyncDebounceMs: 300,
});
```

Or per field:

```ts
register("email", {
  validateAsync,
  asyncDebounceMs: 500,
});
```

### UX rules

- Async validation is **race-condition safe** (latest result always wins)
- Debounce applies on `change`
- `blur` and `submit` **bypass debounce** and run async validation immediately
- `validating[field]` becomes `true` as soon as async validation is scheduled

---

## 🔗 Cross-field Validation (v0.4)

Formora supports **cross-field validation**, allowing a field’s validation logic to depend on the values of other fields.

Cross-field validation is **explicit** and **predictable**:

- Validation logic belongs to the field where the rule is defined
- Errors are assigned only to that field
- On submit, **all registered fields are validated**, even if untouched

### Example: Confirm password

```ts
register("confirmPassword", {
  validate: (value, values) =>
    value !== values.password ? "Passwords do not match" : undefined,
});
```

### Example: Conditional required field

```ts
register("companyName", {
  validate: (value, values) =>
    values.isCompany && !value ? "Company name is required" : undefined,
});
```

### Example: Date range validation

```ts
register("endDate", {
  validate: (value, values) => {
    if (!value || !values.startDate) return undefined;
    return new Date(value) <= new Date(values.startDate)
      ? "End date must be after start date"
      : undefined;
  },
});
```

### Async cross-field validation

```ts
register("email", {
  validateAsync: async (value, values) => {
    await new Promise((r) => setTimeout(r, 300));
    return value !== values.confirmEmail ? "Emails do not match" : undefined;
  },
});
```

> ℹ️ Formora does **not** auto-revalidate dependent fields when other fields change. This keeps validation behavior explicit and predictable.

---

## 🧬 Nested Fields (v0.5)

Formora supports **nested object fields** using dot-notation paths.

This allows you to work with real-world form shapes while keeping validation **explicit and predictable**.

### Supported paths

```ts
"user.email";
"profile.address.street";
```

> ℹ️ v0.5 introduced nested object paths. Field arrays (e.g. `items.0.name`) are supported starting in **v0.6**.

---

### Basic example

```tsx
const form = useForm({
  initialValues: {
    user: { email: "" },
    profile: { address: { street: "" } },
  },
});

<input {...form.register("user.email", { required: "Email is required" })} />
<input {...form.register("profile.address.street")} />

{form.errors.user?.email && <p>{form.errors.user.email}</p>}
```

---

### Nested helpers

All helpers work with nested paths:

```ts
form.setValue("user.email", "test@example.com");
form.resetField("profile.address.street");
form.setTouched("user.email", true);
form.setError("user.email", "Invalid email");
```

---

### Nested cross-field validation

Cross-field validation works seamlessly with nested values:

```ts
register("confirmPassword", {
  validate: (value, values) =>
    value !== values.user.password ? "Passwords do not match" : undefined,
});
```

Nested validation follows the same rules:

- Validation is explicit
- Errors are assigned only to the field being validated
- On submit, **all registered fields are validated**

---

---

## 🧩 Field Arrays (v0.6)

Formora supports **basic field arrays** with `append` and `remove` helpers.

Array fields use **dot-index paths** (e.g. `items.0.name`). Bracket syntax like `items[0].name` is intentionally not supported.

### Basic example

```tsx
const form = useForm({
  initialValues: {
    items: [{ name: "" }],
  },
  validateOn: "submit",
});

function addItem() {
  form.append("items", { name: "" }, { shouldTouch: true });
}

function removeItem(i: number) {
  form.remove("items", i);
}

return (
  <form onSubmit={form.handleSubmit(console.log)}>
    {form.values.items.map((_, i) => (
      <div key={i}>
        <input
          {...form.register(`items.${i}.name`, {
            required: "Name required",
          })}
        />

        {form.errors.items?.[i]?.name && <p>{form.errors.items[i].name}</p>}

        <button type="button" onClick={() => removeItem(i)}>
          Remove
        </button>
      </div>
    ))}

    <button type="button" onClick={addItem}>
      Add item
    </button>

    <button type="submit">Submit</button>
  </form>
);
```

### Behavior notes

- `append(name, value)` adds an item to the end of the array.
- `remove(name, index)` removes an item and **shifts** the array branch in `errors`, `touched`, and `validating`.
- On submit, **all registered fields** (including array fields) are validated.

### Async validation & field arrays

When removing an array item (e.g. `remove("items", index)`), Formora automatically **cancels and invalidates** any pending async validations for fields at or after the removed index.

This prevents stale async results (from old indices) from attaching to shifted items after removal.

**Example scenario:**

- User types in `items.2.email` → async validation starts
- User removes `items.1`
- `items.2.email` becomes `items.1.email`
- Formora cancels the old async validation so it cannot overwrite the new field state

---

## 🧰 DX Helpers (v0.3)

Formora provides a small set of **developer experience helpers** for common imperative form actions.

### `setValue(name, value, options?)`

```ts
form.setValue("email", "test@example.com", {
  shouldTouch: true,
  shouldValidate: true,
});
```

Options:

- `shouldTouch` — marks the field as touched
- `shouldValidate` — runs sync + async validation immediately

This does **not** depend on `validateOn` and is fully explicit.

---

### `reset()`

Resets the entire form to its initial state:

```ts
form.reset();
```

This will:

- restore `initialValues`
- clear `errors`, `touched`, and `validating`
- cancel any pending async validation

#### Reset options

You can control which parts of the form state are preserved during reset:

```ts
form.reset({
  keepErrors: true,
  keepTouched: true,
  keepDirty: true,
  keepValidating: true,
});
```

- `keepErrors` — preserve validation errors
- `keepTouched` — preserve touched state
- `keepDirty` — preserve dirty state
- `keepValidating` — preserve async validating state (otherwise pending async is cancelled)

> ℹ️ By default, `reset()` clears **all meta state** and cancels pending async validation.

---

### `resetField(name)`

Resets a single field:

```ts
form.resetField("email");
```

This will:

- restore the field’s initial value
- clear its error, touched, and validating state
- cancel pending async validation for that field

#### ResetField options

```ts
form.resetField("email", {
  keepError: true,
  keepTouched: true,
  keepDirty: true,
  keepValidating: true,
});
```

- `keepError` — preserve the field error
- `keepTouched` — preserve touched state for this field
- `keepDirty` — preserve dirty state for this field
- `keepValidating` — preserve async validating state for this field

When async validation is not preserved, any pending async validation for this field is **cancelled and invalidated**.

---

### `setValues(partial, options?)`

Set multiple field values at once:

```ts
form.setValues(
  { email: "user@example.com", age: 25 },
  {
    shouldTouch: true,
    shouldValidate: true,
  }
);
```

Options:

- `shouldTouch` — marks all provided fields as touched
- `shouldValidate` — validates only the provided fields
- `bypassDebounce` — if `true`, async validation runs immediately

---

### Error helpers

```ts
form.setError("email", "Email already exists");
form.clearError("email");
form.clearErrors();
```

These helpers are useful for:

- server-side validation errors
- manual error control

---

### Touched helpers

```ts
form.setTouched("email", true);
form.touchAll();
```

- `setTouched(name, boolean)` manually toggles touched state
- `touchAll()` marks all registered fields as touched

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

- ✅ Async validation UX improvements (debouncing, submit behavior)
- ✅ Form state helpers (`setValue`, `setValues`, `reset`, `resetField`, error & touched helpers)
- ✅ Cross-field validation
- ✅ Nested object fields (v0.5)
- ✅ Field arrays (append/remove) with dot-index paths (v0.6)
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

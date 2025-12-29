# Changelog

All notable changes to this project will be documented in this file.

The format is based on **Keep a Changelog**, and this project follows **Semantic Versioning**.

## [Unreleased]

### Added

- (none)

### Changed

- (none)

### Fixed

- (none)

---

## [0.4.0-beta.1] - 2025-12-29

### Added

- Nested field paths (dot-notation):
  - `user.email`
  - `profile.address.street`
  - `items.0.name`
- Nested validation for all built-in rules (`required`, `pattern`, `minLength`, `maxLength`, `min`, `max`).
- Deterministic submit validation (sync + async collected at submit time).
- Typed field paths for improved TypeScript DX (autocomplete and value inference).
- Extended nested playground examples for developer testing.

### Changed

- `errors` are now stored as **nested objects** instead of flat key-value maps.
- Submit behavior now bypasses async debounce and validates immediately.
- Internal validation flow simplified and stabilized for nested paths.

### Notes

- ⚠️ This is a **beta release**. APIs may change before `1.0.0`.

## [0.3.0] - 2025-12-28

### Added

- Extended DX helpers for imperative form control:
  - `setValue(name, value, options)`
  - `setValues(partial, options)`
  - `reset()`
  - `resetField(name)`
  - Error helpers: `setError`, `clearError`, `clearErrors`
  - Touched helpers: `setTouched`, `touchAll`

### Changed

- Form state can now be safely manipulated programmatically without relying on DOM events or `register` handlers.
- Multiple fields can be updated, validated, and touched in a single operation.

### Fixed

- (none)

---

## [0.2.0] - 2025-12-28

### Added

- **Debounced async validation** via `asyncDebounceMs` (global and per-field).
- Blur and submit **bypass debounce** for immediate async validation.
- Field-level async scheduling state (`validating`).
- Submission lifecycle state:
  - `submitCount`
  - `hasSubmitted`
- New test suite covering async debounce, race safety, and submit behavior.

### Changed

- Async validation UX is now explicit, predictable, and calmer under rapid input.
- Submit behavior now waits for async validation when configured.

### Fixed

- Prevented stale async validation results from overriding newer input during debounce.

---

## [0.1.0] - 2025-12-28

### Added

- `useForm` hook for **headless form state** and **validation** in React.
- Controlled input registration via `register(name, rules)`.
- Validation modes: `validateOn: "change" | "blur" | "submit"`.
- Built-in rules:
  - `required`
  - `pattern`
  - `minLength` / `maxLength`
  - numeric `min` / `max` (supports numbers and numeric strings)
- Custom sync validation via `validate(value, values)`.
- **Async validation** via `validateAsync(value, values)`.
- **Race-condition safety** for async validation (latest result wins).
- Async validation state:
  - `validating` (per-field)
  - `isValidating` (form-level)
- Test suite with Vitest + Testing Library.
- GitHub Actions CI to run typecheck, tests, and build.

[Unreleased]: https://github.com/narek-webdev/formora/compare/v0.4.0-beta.1...HEAD
[0.4.0-beta.1]: https://github.com/narek-webdev/formora/releases/tag/v0.4.0-beta.1
[0.3.0]: https://github.com/narek-webdev/formora/releases/tag/v0.3.0
[0.2.0]: https://github.com/narek-webdev/formora/releases/tag/v0.2.0
[0.1.0]: https://github.com/narek-webdev/formora/releases/tag/v0.1.0

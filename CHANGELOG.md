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

## [0.6.0] - 2026-01-01

### Added

- **Field arrays (v0.6)** with explicit `append` and `remove` helpers.
- Official support for **dot-index paths** for array fields (e.g. `items.0.name`).
- Full validation support for array fields, including submit-time validation of registered array items.
- Automatic shifting of `errors`, `touched`, and `validating` state when removing array items.
- New test suite covering array append, remove, index shifting, and submit validation behavior.

### Changed

- Internal path utilities now support numeric segments for arrays while keeping dot-notation only.
- Form-level `isValidating` and submit blocking logic now correctly account for nested and array validation state.

### Fixed

- Prevented stale errors and touched state after removing array items.
- Improved type safety for nested and array-based form state under strict TypeScript settings.

---

## [0.5.0] - 2025-12-31

### Added

- **Nested object field support** using dot-notation paths (e.g. `user.email`, `profile.address.street`).
- Nested form state for `values`, `errors`, `touched`, and `validating` matching the shape of `initialValues`.
- Full nested-path support across all helpers:
  - `register`, `setValue`, `setValues`, `resetField`
  - `setError`, `clearError`, `setTouched`, `touchAll`
- Cross-field validation compatibility with nested values.
- New test suite covering nested field registration, updates, validation, and submit behavior.

### Changed

- Internal path handling is now **object-only and explicit**, removing legacy array/bracket path parsing.
- Validation, touched, and validating state are now managed as nested objects instead of flat path maps.

### Fixed

- Eliminated inconsistencies between flat path keys and nested state access.
- Improved correctness of submit-time validation for nested registered fields.

---

## [0.4.0] - 2025-12-30

### Added

- **Cross-field validation** via `validate(value, values)`.
- **Cross-field async validation** via `validateAsync(value, values)`.
- Submit-time validation now validates **all registered fields**, even if untouched.
- Deterministic validation using internal value snapshots.

### Changed

- Async validation now always runs against a consistent values snapshot to avoid stale cross-field results.
- Debounced async validation behavior is now fully deterministic under rapid input changes.

### Fixed

- Prevented stale debounced async validators from using outdated form values.

---

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

[Unreleased]: https://github.com/narek-webdev/formora/compare/v0.6.0...HEAD
[0.6.0]: https://github.com/narek-webdev/formora/releases/tag/v0.6.0
[0.5.0]: https://github.com/narek-webdev/formora/releases/tag/v0.5.0
[0.4.0]: https://github.com/narek-webdev/formora/releases/tag/v0.4.0
[0.3.0]: https://github.com/narek-webdev/formora/releases/tag/v0.3.0
[0.2.0]: https://github.com/narek-webdev/formora/releases/tag/v0.2.0
[0.1.0]: https://github.com/narek-webdev/formora/releases/tag/v0.1.0

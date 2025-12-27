# Changelog

All notable changes to this project will be documented in this file.

The format is based on **Keep a Changelog**, and this project follows **Semantic Versioning**.

## [Unreleased]

### Added

- (placeholder)

### Changed

- (placeholder)

### Fixed

- (placeholder)

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

[Unreleased]: https://github.com/narek-webdev/formora/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/narek-webdev/formora/releases/tag/v0.1.0

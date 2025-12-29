import type { Rules } from "./types";

function asNumber(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const t = v.trim();
    if (t === "") return undefined;
    const n = Number(t);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

// ---------------------------------------------
// Nested field (path) helpers
// Supports: "a.b.c", "a[0].b", "a.0.b", "a['x']", "a[\"x\"]"
// ---------------------------------------------

type PathKey = string | number;

function toPath(path: string): PathKey[] {
  const normalized = String(path)
    .replace(/\[(\d+)\]/g, ".$1")
    .replace(/\[["']([^"']+)["']\]/g, ".$1")
    .replace(/^\./, "");

  return normalized
    .split(".")
    .filter(Boolean)
    .map((k) => {
      const n = Number(k);
      return Number.isFinite(n) && String(n) === k ? n : k;
    });
}

function getByPath<TVal = any>(obj: any, path: string, fallback?: TVal): TVal {
  const keys = toPath(path);
  let cur = obj;
  for (const key of keys) {
    if (cur == null) return fallback as TVal;
    cur = cur[key as any];
  }
  return (cur === undefined ? (fallback as TVal) : cur) as TVal;
}

export function getFieldError<T extends Record<string, any>>(
  name: string,
  nextValues: T,
  rulesMap: Map<string, Rules<any>>
): string | undefined {
  const rules = rulesMap.get(name);
  if (!rules) return undefined;

  if (rules.required) {
    const msg =
      typeof rules.required === "string"
        ? rules.required
        : "This field is required";

    const value = getByPath(nextValues, name);
    const empty =
      value === null ||
      value === undefined ||
      (typeof value === "string" && value.trim() === "") ||
      (Array.isArray(value) && value.length === 0);

    if (empty) return msg;
  }

  if (rules.pattern) {
    const value = getByPath(nextValues, name);
    if (typeof value === "string" && value.length > 0) {
      const reg =
        rules.pattern instanceof RegExp ? rules.pattern : rules.pattern.value;
      const msg =
        rules.pattern instanceof RegExp
          ? "Invalid format"
          : rules.pattern.message;
      if (!reg.test(value)) return msg;
    }
  }

  if (rules.minLength !== undefined) {
    const value = getByPath(nextValues, name);
    const min =
      typeof rules.minLength === "number"
        ? rules.minLength
        : rules.minLength.value;
    const msg =
      typeof rules.minLength === "number"
        ? `Must be at least ${min} characters`
        : rules.minLength.message;

    if (typeof value === "string" && value.length > 0 && value.length < min)
      return msg;
  }

  if (rules.maxLength !== undefined) {
    const value = getByPath(nextValues, name);
    const maxLen =
      typeof rules.maxLength === "number"
        ? rules.maxLength
        : rules.maxLength.value;
    const msg =
      typeof rules.maxLength === "number"
        ? `Must be at most ${maxLen} characters`
        : rules.maxLength.message;

    if (typeof value === "string" && value.length > 0 && value.length > maxLen)
      return msg;
  }

  const num = asNumber(getByPath(nextValues, name));

  if (rules.min !== undefined && num !== undefined) {
    const min = typeof rules.min === "number" ? rules.min : rules.min.value;
    const msg =
      typeof rules.min === "number"
        ? `Must be at least ${min}`
        : rules.min.message;
    if (num < min) return msg;
  }

  if (rules.max !== undefined && num !== undefined) {
    const max = typeof rules.max === "number" ? rules.max : rules.max.value;
    const msg =
      typeof rules.max === "number"
        ? `Must be at most ${max}`
        : rules.max.message;
    if (num > max) return msg;
  }

  if (typeof rules.validate === "function") {
    const msg = rules.validate(getByPath(nextValues, name), nextValues);
    if (typeof msg === "string") return msg;
  }

  return undefined;
}

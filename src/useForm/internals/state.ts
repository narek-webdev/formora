import { getByPath } from "../../utils/getByPath";

export function hasAnyLeafError(obj: any): boolean {
  if (!obj) return false;
  if (typeof obj === "string") return obj.length > 0;
  if (typeof obj !== "object") return false;
  for (const k of Object.keys(obj)) {
    if (hasAnyLeafError((obj as any)[k])) return true;
  }
  return false;
}

export function hasAnyTrue(obj: any): boolean {
  if (!obj) return false;
  if (obj === true) return true;
  if (typeof obj !== "object") return false;
  for (const k of Object.keys(obj)) {
    if (hasAnyTrue((obj as any)[k])) return true;
  }
  return false;
}

export function isDeepEqual(a: any, b: any): boolean {
  if (Object.is(a, b)) return true;
  if (a == null || b == null) return a === b;

  const ta = typeof a;
  const tb = typeof b;

  if (ta !== "object" && tb !== "object") return a === b;

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!isDeepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (ta === "object" && tb === "object") {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    for (const k of aKeys) {
      if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
      if (!isDeepEqual((a as any)[k], (b as any)[k])) return false;
    }
    return true;
  }

  return false;
}

// Proxy object so validators that do `values[name]` still work when `name` is a path.
export function asPathReadableObject<TObj extends Record<string, any>>(
  values: TObj
): TObj {
  return new Proxy(values as any, {
    get(target: any, prop: PropertyKey) {
      if (typeof prop === "string") return getByPath(target, prop);
      return target[prop];
    },
  });
}

export function computeIsDirty<TValues>(
  name: string,
  nextValues: TValues,
  initialValues: TValues
): boolean {
  const currentValue = getByPath(nextValues as any, name);
  const initialValue = getByPath(initialValues as any, name);
  return !isDeepEqual(currentValue, initialValue);
}

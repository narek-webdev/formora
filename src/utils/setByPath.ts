// v0.5 — Nested fields (objects only)
// Sets a value on an object using dot-notation paths like "user.email".
// Returns a NEW object (immutable update). Arrays are intentionally NOT supported in v0.5.

export function setByPath<T extends object = any>(
  obj: T,
  path: string,
  value: any
): T {
  if (typeof path !== "string" || path.length === 0) {
    return obj;
  }

  // Fast path for non-nested keys
  if (path.indexOf(".") === -1) {
    return {
      ...(obj as any),
      [path]: value,
    } as T;
  }

  const parts = path.split(".");

  // We clone only the chain we touch.
  const root: any = { ...(obj as any) };
  let current: any = root;

  for (let i = 0; i < parts.length; i++) {
    const key = parts[i]!;

    if (i === parts.length - 1) {
      current[key] = value;
      break;
    }

    const next = current[key];

    // v0.5: only plain objects are allowed along the path.
    // If the existing value isn't an object, we replace it with a new object.
    const nextObj =
      next && typeof next === "object" && !Array.isArray(next) ? next : {};

    // Clone next level to keep immutability
    current[key] = { ...nextObj };
    current = current[key];
  }

  return root as T;
}

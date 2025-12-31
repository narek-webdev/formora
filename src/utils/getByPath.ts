// v0.5 — Nested fields (objects only)
// Reads a value from an object using dot-notation paths like "user.email"
// Arrays are intentionally NOT supported in v0.5.

export function getByPath<T = any>(obj: T, path: string): any {
  if (!obj || typeof path !== "string" || path.length === 0) {
    return undefined;
  }

  // Fast path for non-nested keys
  if (path.indexOf(".") === -1) {
    return (obj as any)[path];
  }

  const parts = path.split(".");
  let current: any = obj;

  for (const key of parts) {
    if (current == null || typeof current !== "object") {
      return undefined;
    }

    current = current[key];
  }

  return current;
}

// v0.6 — Nested fields + field arrays (dot-index only)
// Reads a value from an object using dot-notation paths like:
// "user.email", "items.0.name"
// Bracket syntax (items[0].name) is intentionally NOT supported.

export function getByPath<T = any>(obj: T, path: string): any {
  if (obj == null || typeof path !== "string" || path.length === 0) {
    return undefined;
  }

  // Fast path for non-nested keys
  if (path.indexOf(".") === -1) {
    return (obj as any)[path];
  }

  const parts = path.split(".");
  let current: any = obj;

  for (const rawKey of parts) {
    if (current == null) return undefined;

    // Numeric segment → array index
    if (Array.isArray(current)) {
      const index = Number(rawKey);
      if (!Number.isInteger(index)) return undefined;
      current = current[index];
      continue;
    }

    // Object segment
    if (typeof current !== "object") return undefined;
    current = (current as any)[rawKey];
  }

  return current;
}

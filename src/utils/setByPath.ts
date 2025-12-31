// v0.6 — Nested fields + field arrays (dot-index only)
// Sets a value on an object using dot-notation paths like:
// "user.email", "items.0.name"
// Returns a NEW object (immutable update).
// Bracket syntax (items[0].name) is intentionally NOT supported.

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

  // Clone only the chain we touch.
  const root: any = { ...(obj as any) };
  let current: any = root;

  for (let i = 0; i < parts.length; i++) {
    const key = parts[i]!;

    if (i === parts.length - 1) {
      // Last segment: set value
      if (Array.isArray(current)) {
        const idx = Number(key);
        if (!Number.isInteger(idx)) {
          // invalid index segment for an array path
          return root as T;
        }
        const nextArr = current.slice();
        nextArr[idx] = value;
        // Assign back to the parent reference by mutating current in-place is not possible,
        // because `current` is the array itself. Instead, we replace via a hidden marker.
        // We handle this by writing into current via splice-like replacement.
        current.length = 0;
        current.push(...nextArr);
      } else {
        current[key] = value;
      }
      break;
    }

    // Determine the next container based on the current container type.
    if (Array.isArray(current)) {
      const idx = Number(key);
      if (!Number.isInteger(idx)) {
        return root as T;
      }

      const existing = current[idx];
      const nextKey = parts[i + 1]!;
      const nextShouldBeArray = Number.isInteger(Number(nextKey));

      const nextContainer = nextShouldBeArray
        ? Array.isArray(existing)
          ? existing
          : []
        : existing && typeof existing === "object" && !Array.isArray(existing)
        ? existing
        : {};

      const cloned = Array.isArray(nextContainer)
        ? nextContainer.slice()
        : { ...nextContainer };

      const nextArr = current.slice();
      nextArr[idx] = cloned;

      // Replace current array contents in-place to keep the parent reference consistent.
      current.length = 0;
      current.push(...nextArr);

      current = current[idx];
      continue;
    }

    // Object path
    const existing = current[key];
    const nextKey = parts[i + 1]!;
    const nextShouldBeArray = Number.isInteger(Number(nextKey));

    const nextContainer = nextShouldBeArray
      ? Array.isArray(existing)
        ? existing
        : []
      : existing && typeof existing === "object" && !Array.isArray(existing)
      ? existing
      : {};

    current[key] = Array.isArray(nextContainer)
      ? nextContainer.slice()
      : { ...nextContainer };

    current = current[key];
  }

  return root as T;
}

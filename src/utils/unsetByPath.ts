// Local helper: remove a nested path from an object/array without mutating the original.
// We keep it here because the project may not expose a shared utils/unsetByPath yet.
export function unsetByPath(obj: any, path: string): any {
  if (obj == null) return obj;
  if (!path) return obj;

  const parts = path.split(".");

  // If the path is a single key, handle quickly.
  if (parts.length === 1) {
    const key = parts[0]!;
    if (Array.isArray(obj)) {
      const idx = Number(key);
      if (!Number.isFinite(idx)) return obj;
      const next = obj.slice();
      delete (next as any)[idx];
      return next;
    }
    if (typeof obj === "object") {
      if (!(key in obj)) return obj;
      const next = { ...obj };
      delete (next as any)[key];
      return next;
    }
    return obj;
  }

  // Walk and clone along the path.
  const root = Array.isArray(obj) ? obj.slice() : { ...obj };
  let curr: any = root;
  let source: any = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]!;
    const nextSource = source?.[part];
    if (
      nextSource == null ||
      (typeof nextSource !== "object" && !Array.isArray(nextSource))
    ) {
      return obj; // nothing to unset
    }

    const nextClone = Array.isArray(nextSource)
      ? nextSource.slice()
      : { ...nextSource };
    curr[part] = nextClone;

    curr = nextClone;
    source = nextSource;
  }

  const last = parts[parts.length - 1]!;
  if (Array.isArray(curr)) {
    const idx = Number(last);
    if (!Number.isFinite(idx)) return root;
    delete (curr as any)[idx];
    return root;
  }

  if (typeof curr === "object" && curr != null) {
    delete (curr as any)[last];
  }

  return root;
}

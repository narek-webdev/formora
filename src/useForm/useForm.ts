import * as React from "react";
import type {
  Errors,
  Rules,
  UseFormOptions,
  Touched,
  Validating,
  ResetOptions,
  ResetFieldOptions,
} from "./types";
import { getFieldError } from "./validation";
import { isLatestAsyncSeq, nextAsyncSeq } from "./async";

import { getByPath } from "../utils/getByPath";
import { setByPath } from "../utils/setByPath";

// v0.5 — Nested fields (objects only)
// Supports dot paths like "user.email". Arrays are intentionally NOT supported in v0.5.

function unsetByPath(obj: any, path: string): any {
  if (!obj || typeof path !== "string" || path.length === 0) return obj;
  if (path.indexOf(".") === -1) {
    const next = { ...(obj as any) };
    delete next[path];
    return next;
  }

  const parts = path.split(".");
  const root: any = { ...(obj as any) };
  let current: any = root;

  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i]!;
    const existing = current[key];
    if (
      existing == null ||
      typeof existing !== "object" ||
      Array.isArray(existing)
    ) {
      return root;
    }
    current[key] = { ...existing };
    current = current[key];
  }

  const lastKey = parts[parts.length - 1]!;
  if (current && typeof current === "object") {
    delete current[lastKey];
  }

  return root;
}

function hasAnyLeafError(obj: any): boolean {
  if (!obj) return false;
  if (typeof obj === "string") return obj.length > 0;
  if (typeof obj !== "object") return false;
  for (const k of Object.keys(obj)) {
    if (hasAnyLeafError(obj[k])) return true;
  }
  return false;
}

function hasAnyTrue(obj: any): boolean {
  if (!obj) return false;
  if (obj === true) return true;
  if (typeof obj !== "object") return false;
  for (const k of Object.keys(obj)) {
    if (hasAnyTrue(obj[k])) return true;
  }
  return false;
}

function isDeepEqual(a: any, b: any): boolean {
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
      if (!isDeepEqual(a[k], b[k])) return false;
    }
    return true;
  }

  return false;
}

// Proxy object so validators that do `values[name]` still work when `name` is a path.
function asPathReadableObject<TObj extends Record<string, any>>(
  values: TObj
): TObj {
  return new Proxy(values as any, {
    get(target, prop) {
      if (typeof prop === "string") return getByPath(target, prop);
      return (target as any)[prop as any];
    },
  });
}

export function useForm<T extends Record<string, any>>(
  options: UseFormOptions<T>
) {
  const validateOn = options.validateOn ?? "submit";
  const globalAsyncDebounceMs = options.asyncDebounceMs ?? 0;
  const blockSubmitWhileValidating = options.blockSubmitWhileValidating ?? true;

  const [values, setValues] = React.useState<T>(options.initialValues);
  const valuesRef = React.useRef<T>(options.initialValues);
  React.useEffect(() => {
    valuesRef.current = values;
  }, [values]);
  const [errors, setErrors] = React.useState<any>({});
  const [touched, setTouched] = React.useState<Touched<T>>({} as Touched<T>);
  const [dirty, setDirty] = React.useState<any>({});
  const [validating, setValidating] = React.useState<Validating<T>>(
    {} as Validating<T>
  );
  const [submitCount, setSubmitCount] = React.useState(0);

  const rulesRef = React.useRef(new Map<string, Rules<any>>());
  const asyncSeqRef = React.useRef(new Map<string, number>());
  const debounceTimersRef = React.useRef(
    new Map<string, ReturnType<typeof setTimeout>>()
  );
  const isMountedRef = React.useRef(true);

  const initialValuesRef = React.useRef(options.initialValues);

  React.useEffect(() => {
    initialValuesRef.current = options.initialValues;
  }, [options.initialValues]);

  React.useEffect(() => {
    return () => {
      isMountedRef.current = false;
      // clear any pending debounce timers
      for (const t of debounceTimersRef.current.values()) clearTimeout(t);
      debounceTimersRef.current.clear();
    };
  }, []);

  function clearDebounceTimer(name: string) {
    const t = debounceTimersRef.current.get(name);
    if (t) {
      clearTimeout(t);
      debounceTimersRef.current.delete(name);
    }
  }

  function clearAllDebounceTimers() {
    for (const t of debounceTimersRef.current.values()) clearTimeout(t);
    debounceTimersRef.current.clear();
  }

  function setFieldValidating(name: string, isValidating: boolean) {
    if (!isMountedRef.current) return;
    setValidating((prev: any) => {
      return isValidating
        ? setByPath(prev, name, true)
        : unsetByPath(prev, name);
    });
  }

  function setFieldDirty(name: string, isDirty: boolean) {
    if (!isMountedRef.current) return;

    setDirty((prev: any) => {
      const existing = getByPath(prev, name);

      if (isDirty) {
        // Preserve nested dirty leaves.
        if (existing && typeof existing === "object") {
          // If it's an array branch, don't set items.__self (can reshape arrays in setByPath).
          if (Array.isArray(existing)) {
            return setByPath(prev, `__selfDirty.${name}`, true);
          }
          return setByPath(prev, name + ".__self", true);
        }
        return setByPath(prev, name, true);
      }

      // Clearing: preserve nested branches; only clear the root marker.
      if (existing && typeof existing === "object") {
        if (Array.isArray(existing)) {
          return unsetByPath(prev, `__selfDirty.${name}`);
        }
        return unsetByPath(prev, name + ".__self");
      }

      return unsetByPath(prev, name);
    });
  }

  function computeIsDirty(name: string, nextValues: T) {
    const currentValue = getByPath(nextValues, name);
    const initialValue = getByPath(initialValuesRef.current, name);
    return !isDeepEqual(currentValue, initialValue);
  }

  function setFieldError(name: string, message?: string) {
    if (!isMountedRef.current) return;
    setErrors((prev: any) => {
      const next = message
        ? setByPath(prev, name, message)
        : unsetByPath(prev, name);
      return next;
    });
  }

  function validateFieldSync(name: string, nextValues: T) {
    const readableValues = asPathReadableObject(nextValues);
    const msg = getFieldError(name, readableValues as any, rulesRef.current);
    setFieldError(name, msg);
    return !msg;
  }

  function validateAllSync(nextValues: T) {
    const readableValues = asPathReadableObject(nextValues);
    const nextErrors: any = {};
    for (const name of rulesRef.current.keys()) {
      const msg = getFieldError(name, readableValues as any, rulesRef.current);
      if (msg) Object.assign(nextErrors, setByPath(nextErrors, name, msg));
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function validateFieldAsync(
    name: string,
    nextValues: T,
    opts?: { bypassDebounce?: boolean }
  ) {
    const readableValues = asPathReadableObject(nextValues);
    const rules = rulesRef.current.get(name);
    const validateAsync = rules?.validateAsync;

    // sync-first short-circuit
    const syncMsg = getFieldError(
      name,
      readableValues as any,
      rulesRef.current
    );
    if (syncMsg) {
      // Cancel any in-flight/scheduled async validation so stale results can't overwrite sync errors.
      nextAsyncSeq(asyncSeqRef.current, name);
      clearDebounceTimer(name);
      setFieldError(name, syncMsg);
      setFieldValidating(name, false);
      return false;
    }

    if (!validateAsync) {
      // No async validator; cancel any pending/in-flight async for this field.
      nextAsyncSeq(asyncSeqRef.current, name);
      clearDebounceTimer(name);
      setFieldValidating(name, false);
      return true;
    }

    const bypassDebounce = opts?.bypassDebounce ?? false;
    const fieldDebounceMs = rules.asyncDebounceMs ?? globalAsyncDebounceMs;
    const shouldDebounce = !bypassDebounce && fieldDebounceMs > 0;

    // cancel any pending debounce schedule for this field
    clearDebounceTimer(name);

    if (shouldDebounce) {
      // mark as validating immediately when scheduled
      setFieldValidating(name, true);

      // create a new seq for this scheduled attempt so older results can't win
      const scheduledSeq = nextAsyncSeq(asyncSeqRef.current, name);

      const timer = setTimeout(async () => {
        debounceTimersRef.current.delete(name);

        // If something else became latest while waiting, bail.
        if (!isLatestAsyncSeq(asyncSeqRef.current, name, scheduledSeq)) return;

        // re-check sync rules before running async
        const latestValues = valuesRef.current;
        const latestReadableValues = asPathReadableObject(latestValues);
        const againSync = getFieldError(
          name,
          latestReadableValues as any,
          rulesRef.current
        );
        if (againSync) {
          setFieldError(name, againSync);
          setFieldValidating(name, false);
          return;
        }

        const runSeq = nextAsyncSeq(asyncSeqRef.current, name);
        const msg = await validateAsync(
          getByPath(latestValues, name),
          latestReadableValues as any
        );

        if (!isMountedRef.current) return;
        if (!isLatestAsyncSeq(asyncSeqRef.current, name, runSeq)) return; // stale

        setFieldError(name, msg);
        setFieldValidating(name, false);
      }, fieldDebounceMs);

      debounceTimersRef.current.set(name, timer);
      return true;
    }

    // immediate async (blur/submit bypass or debounce disabled)
    const seq = nextAsyncSeq(asyncSeqRef.current, name);
    setFieldValidating(name, true);

    const msg = await validateAsync(
      getByPath(nextValues, name),
      readableValues as any
    );

    if (!isMountedRef.current) return true;
    if (!isLatestAsyncSeq(asyncSeqRef.current, name, seq)) return true; // stale

    setFieldError(name, msg);
    setFieldValidating(name, false);
    return !msg;
  }

  async function validateAllAsync(
    nextValues: T,
    opts?: { bypassDebounce?: boolean }
  ) {
    const names = Array.from(rulesRef.current.keys());
    const asyncErrors: any = {};
    const readableValues = asPathReadableObject(nextValues);

    // Run sequentially to respect per-field state updates cleanly (still fast for typical forms).
    for (const name of names) {
      const rules = rulesRef.current.get(name);
      if (!rules?.validateAsync) continue;

      const ok = await validateFieldAsync(name, nextValues, opts);
      if (!ok) {
        const msg =
          getFieldError(name, readableValues as any, rulesRef.current) ??
          getByPath(errors, name);
        if (msg) Object.assign(asyncErrors, setByPath(asyncErrors, name, msg));
      } else {
        // if validateFieldAsync scheduled (debounced) it might not have produced an error yet
        // We only collect errors that are already known here.
        const current = getFieldError(
          name,
          readableValues as any,
          rulesRef.current
        );
        if (current)
          Object.assign(asyncErrors, setByPath(asyncErrors, name, current));
      }
    }

    // Collect current errors snapshot
    return asyncErrors;
  }
  // Deterministically collect submit-time errors (sync + async) for all registered fields
  async function collectSubmitErrors(nextValues: T) {
    const readableValues = asPathReadableObject(nextValues);
    const nextErrors: any = {};

    // 1) Sync rules for all registered fields
    for (const name of rulesRef.current.keys()) {
      const msg = getFieldError(name, readableValues as any, rulesRef.current);
      if (msg) Object.assign(nextErrors, setByPath(nextErrors, name, msg));
    }

    // 2) Async rules (submit bypasses debounce and runs immediately)
    for (const name of rulesRef.current.keys()) {
      const rules = rulesRef.current.get(name);
      if (!rules?.validateAsync) continue;

      // If sync already failed for this field, skip async
      if (getByPath(nextErrors, name)) continue;

      const seq = nextAsyncSeq(asyncSeqRef.current, name);
      setFieldValidating(name, true);

      const msg = await rules.validateAsync(
        getByPath(nextValues, name),
        readableValues as any
      );

      if (!isMountedRef.current) continue;
      if (!isLatestAsyncSeq(asyncSeqRef.current, name, seq)) {
        // stale result
        continue;
      }

      if (msg) Object.assign(nextErrors, setByPath(nextErrors, name, msg));
      setFieldValidating(name, false);
    }

    return nextErrors;
  }

  function touchAllRegisteredFields() {
    setTouched((prev: any) => {
      let next: any = prev;
      for (const key of rulesRef.current.keys())
        next = setByPath(next, key, true);
      return next;
    });
  }

  type SetValueOptions = {
    shouldValidate?: boolean;
    shouldTouch?: boolean;
  };

  function setValue(name: string, value: any, opts: SetValueOptions = {}) {
    const { shouldValidate, shouldTouch } = opts;

    if (shouldTouch) {
      setTouched((prev: any) => setByPath(prev, name, true));
    }

    setValues((prev) => {
      const next: any = setByPath(prev, name, value);
      setFieldDirty(name, computeIsDirty(name, next));

      if (shouldValidate) {
        validateFieldSync(name, next);
        void validateFieldAsync(name, next);
      }

      return next;
    });
  }

  type SetValuesOptions = {
    shouldValidate?: boolean;
    shouldTouch?: boolean;
    bypassDebounce?: boolean;
  };

  function setValuesPartial(partial: Partial<T>, opts: SetValuesOptions = {}) {
    const { shouldValidate, shouldTouch, bypassDebounce = true } = opts;

    if (shouldTouch) {
      setTouched((prev: any) => {
        let next: any = prev;
        for (const k of Object.keys(partial) as Array<keyof T>) {
          next = setByPath(next, String(k), true);
        }
        return next;
      });
    }

    setValues((prev) => {
      const next = { ...prev, ...partial };

      for (const k of Object.keys(partial) as Array<keyof T>) {
        const key = String(k);
        setFieldDirty(key, computeIsDirty(key, next as any));
      }

      if (shouldValidate) {
        // Validate only the keys being set (keeps it fast and predictable)
        for (const k of Object.keys(partial) as Array<keyof T>) {
          validateFieldSync(String(k), next);
          void validateFieldAsync(String(k), next, { bypassDebounce });
        }
      }

      return next;
    });
  }

  function setError(name: string, message: string) {
    setFieldError(name, message);
  }

  function clearError(name: string) {
    setFieldError(name, undefined);
  }

  function clearErrors() {
    // Clear all errors (nested or flat)
    setErrors({});
  }

  function setTouchedField(name: string, isTouched: boolean) {
    setTouched((prev: any) => {
      return isTouched ? setByPath(prev, name, true) : unsetByPath(prev, name);
    });
  }

  function touchAll() {
    touchAllRegisteredFields();
  }

  function reset(opts: ResetOptions = {}) {
    // Cancel async validation if we are not keeping validating state.
    if (!opts.keepValidating) {
      clearAllDebounceTimers();
      setValidating({} as Validating<T>);
      asyncSeqRef.current.clear();
    }

    // Reset values always (also update ref synchronously so async paths read latest).
    const nextValues = initialValuesRef.current;
    valuesRef.current = nextValues;
    setValues(nextValues);

    if (!opts.keepErrors) setErrors({});
    if (!opts.keepTouched) setTouched({} as Touched<T>);
    if (!opts.keepDirty) setDirty({});

    // Keep existing behavior: reset submit count.
    setSubmitCount(0);
  }

  function resetField(name: string, opts: ResetFieldOptions = {}) {
    // If we are not keeping validating, cancel pending/in-flight async for this field.
    if (!opts.keepValidating) {
      // bump seq so any in-flight async result becomes stale
      nextAsyncSeq(asyncSeqRef.current, name);
      clearDebounceTimer(name);
      setValidating((prev: any) => unsetByPath(prev, name));
      asyncSeqRef.current.delete(name);
    }

    // reset field value (and update ref synchronously)
    setValues((prev) => {
      const next: any = setByPath(
        prev,
        name,
        getByPath(initialValuesRef.current, name)
      );
      valuesRef.current = next;
      return next;
    });

    // clear per-field state depending on opts
    if (!opts.keepError) setErrors((prev: any) => unsetByPath(prev, name));
    if (!opts.keepTouched) setTouched((prev: any) => unsetByPath(prev, name));

    if (!opts.keepDirty) {
      setDirty((prev: any) => {
        let next = unsetByPath(prev, name);
        // also clear our special dirty markers used for array/object roots
        next = unsetByPath(next, `__selfDirty.${name}`);
        next = unsetByPath(next, name + ".__self");
        return next;
      });
    }

    if (!opts.keepValidating) {
      setValidating((prev: any) => unsetByPath(prev, name));
    }
  }

  function invalidateAsyncForArrayRemove(
    arrayPath: string,
    removedIndex: number
  ) {
    const prefix = arrayPath + ".";
    const keysToInvalidate: string[] = [];

    // Use registered rules to determine which field paths can exist.
    for (const key of rulesRef.current.keys()) {
      if (!key.startsWith(prefix)) continue;
      const rest = key.slice(prefix.length);
      const idxStr = rest.split(".")[0];
      const idx = Number(idxStr);
      if (!Number.isFinite(idx)) continue;
      if (idx >= removedIndex) keysToInvalidate.push(key);
    }

    if (!keysToInvalidate.length) return;

    // Cancel debounce timers + invalidate async seq so stale results can't overwrite shifted items.
    for (const key of keysToInvalidate) {
      nextAsyncSeq(asyncSeqRef.current, key);
      clearDebounceTimer(key);
    }

    // Ensure validating flags for these paths are cleared.
    setValidating((prev: any) => {
      let next: any = prev;
      for (const key of keysToInvalidate) next = unsetByPath(next, key);
      return next;
    });
  }
  // v0.6 — Field array helpers (append/remove)

  function invalidateAsyncForArrayReorder(
    arrayPath: string,
    fromIndex: number,
    toIndex: number
  ) {
    const min = Math.min(fromIndex, toIndex);
    const max = Math.max(fromIndex, toIndex);
    const prefix = arrayPath + ".";
    const keysToInvalidate: string[] = [];

    for (const key of rulesRef.current.keys()) {
      if (!key.startsWith(prefix)) continue;
      const rest = key.slice(prefix.length);
      const idxStr = rest.split(".")[0];
      const idx = Number(idxStr);
      if (!Number.isFinite(idx)) continue;
      if (idx >= min && idx <= max) keysToInvalidate.push(key);
    }

    if (!keysToInvalidate.length) return;

    for (const key of keysToInvalidate) {
      nextAsyncSeq(asyncSeqRef.current, key);
      clearDebounceTimer(key);
    }

    setValidating((prev: any) => {
      let next: any = prev;
      for (const key of keysToInvalidate) next = unsetByPath(next, key);
      return next;
    });
  }

  function reorderNestedArrayBranch(
    state: any,
    arrayPath: string,
    fromIndex: number,
    toIndex: number,
    arrayLen: number
  ) {
    const branch = getByPath(state, arrayPath);
    if (branch == null) return state;

    // Build an array of length `arrayLen` from either a real array or an object with numeric keys.
    const arr: any[] = (() => {
      const out = new Array(arrayLen);

      if (Array.isArray(branch)) {
        for (let i = 0; i < Math.min(branch.length, arrayLen); i++)
          out[i] = branch[i];
        return out;
      }

      if (typeof branch === "object") {
        for (const k of Object.keys(branch)) {
          const idx = Number(k);
          if (!Number.isFinite(idx) || idx < 0 || idx >= arrayLen) continue;
          out[idx] = (branch as any)[k];
        }
        return out;
      }

      return out;
    })();

    if (fromIndex === toIndex) return state;
    if (fromIndex < 0 || toIndex < 0) return state;
    if (fromIndex >= arrayLen || toIndex >= arrayLen) return state;

    const nextArr = arr.slice();
    const [moved] = nextArr.splice(fromIndex, 1);
    nextArr.splice(toIndex, 0, moved);

    return setByPath(state, arrayPath, nextArr);
  }

  function swapNestedArrayBranch(
    state: any,
    arrayPath: string,
    a: number,
    b: number,
    arrayLen: number
  ) {
    const branch = getByPath(state, arrayPath);
    if (branch == null) return state;

    const arr: any[] = (() => {
      const out = new Array(arrayLen);

      if (Array.isArray(branch)) {
        for (let i = 0; i < Math.min(branch.length, arrayLen); i++)
          out[i] = branch[i];
        return out;
      }

      if (typeof branch === "object") {
        for (const k of Object.keys(branch)) {
          const idx = Number(k);
          if (!Number.isFinite(idx) || idx < 0 || idx >= arrayLen) continue;
          out[idx] = (branch as any)[k];
        }
        return out;
      }

      return out;
    })();

    if (a === b) return state;
    if (a < 0 || b < 0) return state;
    if (a >= arrayLen || b >= arrayLen) return state;

    const nextArr = arr.slice();
    const tmp = nextArr[a];
    nextArr[a] = nextArr[b];
    nextArr[b] = tmp;

    return setByPath(state, arrayPath, nextArr);
  }

  function getArrayAtPath(values: any, name: string): any[] {
    const arr = getByPath(values, name);
    return Array.isArray(arr) ? arr : [];
  }

  function shiftNestedStateAfterRemove(
    obj: any,
    path: string,
    index: number
  ): any {
    const arr = getByPath(obj, path);
    if (!Array.isArray(arr)) return obj;

    const nextArr = arr.slice();
    nextArr.splice(index, 1);

    return setByPath(obj, path, nextArr);
  }

  function shiftNestedStateAfterInsert(
    obj: any,
    path: string,
    index: number,
    arrayLen: number
  ): any {
    const branch = getByPath(obj, path);
    if (branch == null) return obj;

    // Build an array of length `arrayLen` from either a real array or an object with numeric keys.
    const out = new Array(arrayLen);
    if (Array.isArray(branch)) {
      for (let i = 0; i < Math.min(branch.length, arrayLen); i++)
        out[i] = branch[i];
    } else if (typeof branch === "object") {
      for (const k of Object.keys(branch)) {
        const idx = Number(k);
        if (!Number.isFinite(idx) || idx < 0 || idx >= arrayLen) continue;
        out[idx] = (branch as any)[k];
      }
    } else {
      return obj;
    }

    const nextArr = out.slice();
    nextArr.splice(index, 0, undefined);

    return setByPath(obj, path, nextArr);
  }

  function appendArray(
    name: string,
    value: any,
    opts: { shouldValidate?: boolean; shouldTouch?: boolean } = {}
  ) {
    setValues((prev) => {
      const arr = getArrayAtPath(prev, name);
      const next = setByPath(prev, name, [...arr, value]);
      setFieldDirty(name, computeIsDirty(name, next));

      if (opts.shouldTouch) {
        setTouched((t: any) => setByPath(t, `${name}.${arr.length}`, true));
      }

      if (opts.shouldValidate) {
        const index = arr.length;
        const keyPrefix = `${name}.${index}`;
        for (const key of rulesRef.current.keys()) {
          if (key === keyPrefix || key.startsWith(keyPrefix + ".")) {
            validateFieldSync(key, next);
            void validateFieldAsync(key, next);
          }
        }
      }

      return next;
    });
  }

  function removeArray(
    name: string,
    index: number,
    opts: { shouldValidate?: boolean; shouldTouch?: boolean } = {}
  ) {
    setValues((prev) => {
      const arr = getArrayAtPath(prev, name);
      if (!arr.length || index < 0 || index >= arr.length) return prev;

      const nextArr = arr.slice();
      nextArr.splice(index, 1);
      const next = setByPath(prev, name, nextArr);

      setErrors((e: any) => shiftNestedStateAfterRemove(e, name, index));
      setTouched((t: any) => shiftNestedStateAfterRemove(t, name, index));
      setValidating((v: any) => shiftNestedStateAfterRemove(v, name, index));
      setDirty((d: any) => shiftNestedStateAfterRemove(d, name, index));
      setFieldDirty(name, computeIsDirty(name, next));

      // IMPORTANT: removing an array item shifts indices. Cancel/invalidate async validation for
      // any paths at/after the removed index so stale async results can't overwrite the new items.
      invalidateAsyncForArrayRemove(name, index);

      if (opts.shouldValidate) {
        for (const key of rulesRef.current.keys()) {
          if (key.startsWith(name + ".")) {
            validateFieldSync(key, next);
            void validateFieldAsync(key, next);
          }
        }
      }

      return next;
    });
  }

  function insertArray(
    name: string,
    index: number,
    value: any,
    opts: { shouldValidate?: boolean; shouldTouch?: boolean } = {}
  ) {
    setValues((prev) => {
      const arr = getArrayAtPath(prev, name);

      // clamp index into [0, arr.length]
      const at = Math.max(0, Math.min(index, arr.length));

      const nextArr = arr.slice();
      nextArr.splice(at, 0, value);
      const next = setByPath(prev, name, nextArr);

      // Shift nested state (indices >= at move right)
      const nextLen = nextArr.length;
      setErrors((e: any) => shiftNestedStateAfterInsert(e, name, at, nextLen));
      setTouched((t: any) => shiftNestedStateAfterInsert(t, name, at, nextLen));
      setValidating((v: any) =>
        shiftNestedStateAfterInsert(v, name, at, nextLen)
      );
      setDirty((d: any) => shiftNestedStateAfterInsert(d, name, at, nextLen));

      // mark form/array dirty
      setFieldDirty(name, computeIsDirty(name, next));

      // IMPORTANT: inserting shifts indices. Cancel/invalidate async validation for any paths at/after `at`.
      // Reuse remove-invalidation logic since it cancels keys >= index.
      invalidateAsyncForArrayRemove(name, at);

      if (opts.shouldTouch) {
        setTouched((t: any) => setByPath(t, `${name}.${at}`, true));
      }

      if (opts.shouldValidate) {
        for (const key of rulesRef.current.keys()) {
          if (key.startsWith(name + ".")) {
            validateFieldSync(key, next);
            void validateFieldAsync(key, next);
          }
        }
      }

      return next;
    });
  }

  function replaceArray(
    name: string,
    index: number,
    value: any,
    opts: { shouldValidate?: boolean; shouldTouch?: boolean } = {}
  ) {
    setValues((prev) => {
      const arr = getArrayAtPath(prev, name);
      if (!arr.length || index < 0 || index >= arr.length) return prev;

      const nextArr = arr.slice();
      nextArr[index] = value;
      const next = setByPath(prev, name, nextArr);

      // mark form/array dirty
      setFieldDirty(name, computeIsDirty(name, next));

      // Invalidate async validations for this index (and any nested fields under it)
      const prefix = `${name}.${index}`;
      const keysToInvalidate: string[] = [];
      for (const key of rulesRef.current.keys()) {
        if (key === prefix || key.startsWith(prefix + "."))
          keysToInvalidate.push(key);
      }
      for (const key of keysToInvalidate) {
        nextAsyncSeq(asyncSeqRef.current, key);
        clearDebounceTimer(key);
      }
      if (keysToInvalidate.length) {
        setValidating((v: any) => {
          let nextV: any = v;
          for (const key of keysToInvalidate) nextV = unsetByPath(nextV, key);
          return nextV;
        });
      }

      if (opts.shouldTouch) {
        setTouched((t: any) => setByPath(t, `${name}.${index}`, true));
      }

      if (opts.shouldValidate) {
        for (const key of rulesRef.current.keys()) {
          if (key === prefix || key.startsWith(prefix + ".")) {
            validateFieldSync(key, next);
            void validateFieldAsync(key, next);
          }
        }
      }

      return next;
    });
  }

  function moveArray(name: string, fromIndex: number, toIndex: number) {
    setValues((prev: any) => {
      const arr = getByPath(prev, name);
      if (!Array.isArray(arr)) return prev;
      if (fromIndex === toIndex) return prev;
      if (fromIndex < 0 || toIndex < 0) return prev;
      if (fromIndex >= arr.length || toIndex >= arr.length) return prev;

      const nextArr = arr.slice();
      const [moved] = nextArr.splice(fromIndex, 1);
      nextArr.splice(toIndex, 0, moved);

      const next = setByPath(prev, name, nextArr);

      setErrors((e: any) =>
        reorderNestedArrayBranch(e, name, fromIndex, toIndex, arr.length)
      );
      setTouched((t: any) =>
        reorderNestedArrayBranch(t, name, fromIndex, toIndex, arr.length)
      );
      setDirty((d: any) =>
        reorderNestedArrayBranch(d, name, fromIndex, toIndex, arr.length)
      );
      setValidating((v: any) =>
        reorderNestedArrayBranch(v, name, fromIndex, toIndex, arr.length)
      );

      setFieldDirty(name, computeIsDirty(name, next));

      // async safety
      invalidateAsyncForArrayReorder(name, fromIndex, toIndex);

      return next;
    });
  }

  function swapArray(name: string, indexA: number, indexB: number) {
    setValues((prev: any) => {
      const arr = getByPath(prev, name);
      if (!Array.isArray(arr)) return prev;
      if (indexA === indexB) return prev;
      if (indexA < 0 || indexB < 0) return prev;
      if (indexA >= arr.length || indexB >= arr.length) return prev;

      const nextArr = arr.slice();
      const tmp = nextArr[indexA];
      nextArr[indexA] = nextArr[indexB];
      nextArr[indexB] = tmp;

      const next = setByPath(prev, name, nextArr);

      setErrors((e: any) =>
        swapNestedArrayBranch(e, name, indexA, indexB, arr.length)
      );
      setTouched((t: any) =>
        swapNestedArrayBranch(t, name, indexA, indexB, arr.length)
      );
      setDirty((d: any) =>
        swapNestedArrayBranch(d, name, indexA, indexB, arr.length)
      );
      setValidating((v: any) =>
        swapNestedArrayBranch(v, name, indexA, indexB, arr.length)
      );

      setFieldDirty(name, computeIsDirty(name, next));

      invalidateAsyncForArrayReorder(name, indexA, indexB);

      return next;
    });
  }

  function handleSubmit(
    onValid: (vals: T) => void,
    onInvalid?: (errs: Errors<T>) => void
  ) {
    return async (e?: any) => {
      e?.preventDefault?.();

      setSubmitCount((c) => c + 1);
      touchAllRegisteredFields();

      // If configured, block submit while any field is validating (debounced or in-flight)
      if (blockSubmitWhileValidating && hasAnyTrue(validating)) {
        onInvalid?.(errors);
        return;
      }

      // Submit uses a deterministic collection of sync + async errors.
      const submitValues = valuesRef.current;
      const nextErrors = await collectSubmitErrors(submitValues);
      setErrors(nextErrors);

      const hasErrors =
        nextErrors &&
        typeof nextErrors === "object" &&
        Object.keys(nextErrors).length > 0;

      if (!hasErrors) onValid(submitValues);
      else onInvalid?.(nextErrors);
    };
  }

  function register(name: string, rules?: Rules<any>) {
    if (rules) rulesRef.current.set(name, rules);

    return {
      name: String(name),
      value: getByPath(values, name) ?? "",
      onChange: (e: any) => {
        const nextValue = e?.target ? e.target.value : e;

        setValues((prev) => {
          const next: any = setByPath(prev, name, nextValue);
          setFieldDirty(name, computeIsDirty(name, next));
          if (validateOn === "change") {
            validateFieldSync(name, next);
            void validateFieldAsync(name, next);
          }

          return next;
        });
      },
      onBlur: () => {
        setTouched((prev: any) => setByPath(prev, name, true));

        if (validateOn === "blur") {
          setValues((prev) => {
            validateFieldSync(name, prev);
            void validateFieldAsync(name, prev, { bypassDebounce: true });
            return prev;
          });
        }
      },
    };
  }

  const isValid = !hasAnyLeafError(errors);
  const isValidating = hasAnyTrue(validating);
  const isDirty = hasAnyTrue(dirty);

  function shouldShowError(name: string) {
    const isTouched = !!getByPath(touched as any, name);
    return submitCount > 0 || isTouched;
  }

  function getFieldMeta(name: string) {
    return {
      isTouched: !!getByPath(touched as any, name),
      isDirty: !!getByPath(dirty as any, name),
      isValidating: !!getByPath(validating as any, name),
      error: getByPath(errors as any, name),
      showError: shouldShowError(name),
    };
  }

  const formState = {
    isValid,
    isDirty,
    isValidating,
    submitCount,
    hasSubmitted: submitCount > 0,
  };

  return {
    values,
    errors,
    touched,
    dirty,
    validating,

    isValid,
    isDirty,
    isValidating,

    // helpers
    shouldShowError,
    getFieldMeta,

    // consolidated state
    formState,

    register,
    setValue,
    setValues: setValuesPartial,
    setError,
    clearError,
    clearErrors,
    setTouched: setTouchedField,
    touchAll,
    reset,
    resetField,
    append: appendArray,
    remove: removeArray,
    insert: insertArray,
    replace: replaceArray,
    move: moveArray,
    swap: swapArray,
    validateField: validateFieldSync,
    handleSubmit,
    submitCount,
    hasSubmitted: submitCount > 0,
  };
}

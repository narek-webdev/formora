import * as React from "react";
import type { Errors, Rules, UseFormOptions } from "./types";
import { getFieldError } from "./validation";
import { isLatestAsyncSeq, nextAsyncSeq } from "./async";

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

function isPlainObject(v: any) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function setByPath(obj: any, path: string, value: any): any {
  const keys = toPath(path);
  if (keys.length === 0) return obj;

  const root = Array.isArray(obj)
    ? obj.slice()
    : isPlainObject(obj)
    ? { ...obj }
    : {};

  let cur: any = root;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const isLast = i === keys.length - 1;

    if (isLast) {
      cur[key as any] = value;
      break;
    }

    const nextKey = keys[i + 1];
    const existing = cur[key as any];
    const shouldBeArray = typeof nextKey === "number";

    let nextContainer: any;
    if (existing == null) {
      nextContainer = shouldBeArray ? [] : {};
    } else {
      nextContainer = Array.isArray(existing)
        ? existing.slice()
        : isPlainObject(existing)
        ? { ...existing }
        : shouldBeArray
        ? []
        : {};
    }

    cur[key as any] = nextContainer;
    cur = nextContainer;
  }

  return root;
}

function unsetByPath(obj: any, path: string): any {
  const keys = toPath(path);
  if (keys.length === 0) return obj;

  const root = Array.isArray(obj)
    ? obj.slice()
    : isPlainObject(obj)
    ? { ...obj }
    : {};

  let cur: any = root;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    const existing = cur[key as any];
    if (existing == null) return root;

    const cloned = Array.isArray(existing)
      ? existing.slice()
      : isPlainObject(existing)
      ? { ...existing }
      : existing;

    cur[key as any] = cloned;
    cur = cloned;
  }

  const lastKey = keys[keys.length - 1];

  if (Array.isArray(cur) && typeof lastKey === "number") {
    cur[lastKey] = undefined; // keep indices stable
  } else if (isPlainObject(cur)) {
    delete cur[lastKey as any];
  } else {
    cur[lastKey as any] = undefined;
  }

  return root;
}

// Proxy object so legacy validators that do `values[name]` still work when `name` is a path.
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
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});
  const [validating, setValidating] = React.useState<Record<string, boolean>>(
    {}
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
    setValidating((prev) => {
      const next: Record<string, boolean> = { ...prev };
      if (isValidating) next[name] = true;
      else delete next[name];
      return next;
    });
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
      clearDebounceTimer(name);
      setFieldError(name, syncMsg);
      setFieldValidating(name, false);
      return false;
    }

    if (!validateAsync) {
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

    // Run sequentially to respect per-field state updates cleanly (still fast for typical forms).
    for (const name of names) {
      const rules = rulesRef.current.get(name);
      if (!rules?.validateAsync) continue;

      const ok = await validateFieldAsync(name, nextValues, opts);
      if (!ok) {
        const msg =
          getFieldError(name, nextValues, rulesRef.current) ??
          getByPath(errors, name);
        if (msg) Object.assign(asyncErrors, setByPath(asyncErrors, name, msg));
      } else {
        // if validateFieldAsync scheduled (debounced) it might not have produced an error yet
        // We only collect errors that are already known here.
        const current = getFieldError(name, nextValues, rulesRef.current);
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
    setTouched((prev) => {
      const next: Record<string, boolean> = { ...prev };
      for (const key of rulesRef.current.keys()) next[key] = true;
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
      setTouched((prev) => ({ ...prev, [name]: true }));
    }

    setValues((prev) => {
      const next: any = setByPath(prev, name, value);

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
      setTouched((prev) => {
        const next: any = { ...prev };
        for (const k of Object.keys(partial) as Array<keyof T>) {
          next[k] = true;
        }
        return next;
      });
    }

    setValues((prev) => {
      const next = { ...prev, ...partial };

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
    setTouched((prev) => {
      const next: Record<string, boolean> = { ...prev };
      if (isTouched) next[name] = true;
      else delete next[name];
      return next;
    });
  }

  function touchAll() {
    touchAllRegisteredFields();
  }

  function reset() {
    // cancel any pending debounced async validations
    clearAllDebounceTimers();

    // reset state
    setValues(initialValuesRef.current);
    setErrors({});
    setTouched({});
    setValidating({});
    setSubmitCount(0);

    // reset async sequence tracking (optional but keeps state tidy)
    asyncSeqRef.current.clear();
  }

  function resetField(name: string) {
    // cancel any pending debounced async validation for this field
    clearDebounceTimer(name);

    // reset field value
    setValues((prev) =>
      setByPath(prev, name, getByPath(initialValuesRef.current, name))
    );

    // clear field error/touched/validating
    setErrors((prev: any) => unsetByPath(prev, name));
    setTouched((prev) => {
      const next = { ...prev };
      delete (next as any)[name];
      return next;
    });
    setValidating((prev) => {
      const next = { ...prev };
      delete (next as any)[name];
      return next;
    });

    // reset async seq for the field (optional)
    asyncSeqRef.current.delete(name);
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
      if (
        blockSubmitWhileValidating &&
        Object.values(validating).some(Boolean)
      ) {
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

          if (validateOn === "change") {
            validateFieldSync(name, next);
            void validateFieldAsync(name, next);
          }

          return next;
        });
      },
      onBlur: () => {
        setTouched((prev) => ({ ...prev, [name]: true }));

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

  const isValid =
    errors && typeof errors === "object"
      ? Object.keys(errors).length === 0
      : true;
  const isValidating = Object.values(validating).some(Boolean);

  return {
    values,
    errors,
    touched,
    validating,
    isValid,
    isValidating,
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
    validateField: validateFieldSync,
    handleSubmit,
    submitCount,
    hasSubmitted: submitCount > 0,
  };
}

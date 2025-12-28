import * as React from "react";
import type { Errors, Rules, UseFormOptions } from "./types";
import { getFieldError } from "./validation";
import { isLatestAsyncSeq, nextAsyncSeq } from "./async";

export function useForm<T extends Record<string, any>>(
  options: UseFormOptions<T>
) {
  const validateOn = options.validateOn ?? "submit";
  const globalAsyncDebounceMs = options.asyncDebounceMs ?? 0;
  const blockSubmitWhileValidating = options.blockSubmitWhileValidating ?? true;

  const [values, setValues] = React.useState<T>(options.initialValues);
  const [errors, setErrors] = React.useState<Errors<T>>({});
  const [touched, setTouched] = React.useState<
    Partial<Record<keyof T, boolean>>
  >({});
  const [validating, setValidating] = React.useState<
    Partial<Record<keyof T, boolean>>
  >({});
  const [submitCount, setSubmitCount] = React.useState(0);

  const rulesRef = React.useRef(new Map<keyof T, Rules<T>>());
  const asyncSeqRef = React.useRef(new Map<keyof T, number>());
  const debounceTimersRef = React.useRef(
    new Map<keyof T, ReturnType<typeof setTimeout>>()
  );
  const isMountedRef = React.useRef(true);

  React.useEffect(() => {
    return () => {
      isMountedRef.current = false;
      // clear any pending debounce timers
      for (const t of debounceTimersRef.current.values()) clearTimeout(t);
      debounceTimersRef.current.clear();
    };
  }, []);

  function clearDebounceTimer(name: keyof T) {
    const t = debounceTimersRef.current.get(name);
    if (t) {
      clearTimeout(t);
      debounceTimersRef.current.delete(name);
    }
  }

  function setFieldValidating(name: keyof T, isValidating: boolean) {
    if (!isMountedRef.current) return;
    setValidating((prev) => {
      const next: Partial<Record<keyof T, boolean>> = { ...prev };
      if (isValidating) next[name] = true;
      else delete (next as any)[name];
      return next;
    });
  }

  function setFieldError(name: keyof T, message?: string) {
    if (!isMountedRef.current) return;
    setErrors((prev) => {
      const next = { ...prev };
      if (!message) delete (next as any)[name];
      else next[name] = message;
      return next;
    });
  }

  function validateFieldSync(name: keyof T, nextValues: T) {
    const msg = getFieldError(name, nextValues, rulesRef.current);
    setFieldError(name, msg);
    return !msg;
  }

  function validateAllSync(nextValues: T) {
    const nextErrors: Errors<T> = {};
    for (const name of rulesRef.current.keys()) {
      const msg = getFieldError(name, nextValues, rulesRef.current);
      if (msg) nextErrors[name] = msg;
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function validateFieldAsync(
    name: keyof T,
    nextValues: T,
    opts?: { bypassDebounce?: boolean }
  ) {
    const rules = rulesRef.current.get(name);
    const validateAsync = rules?.validateAsync;

    // sync-first short-circuit
    const syncMsg = getFieldError(name, nextValues, rulesRef.current);
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
        const againSync = getFieldError(name, nextValues, rulesRef.current);
        if (againSync) {
          setFieldError(name, againSync);
          setFieldValidating(name, false);
          return;
        }

        const runSeq = nextAsyncSeq(asyncSeqRef.current, name);
        const msg = await validateAsync(nextValues[name], nextValues);

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

    const msg = await validateAsync(nextValues[name], nextValues);

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
    const asyncErrors: Errors<T> = {};

    // Run sequentially to respect per-field state updates cleanly (still fast for typical forms).
    for (const name of names) {
      const rules = rulesRef.current.get(name);
      if (!rules?.validateAsync) continue;

      const ok = await validateFieldAsync(name, nextValues, opts);
      if (!ok) {
        const msg =
          getFieldError(name, nextValues, rulesRef.current) ??
          (errors as any)[name];
        if (msg) asyncErrors[name] = msg as any;
      } else {
        // if validateFieldAsync scheduled (debounced) it might not have produced an error yet
        // We only collect errors that are already known here.
        const current = getFieldError(name, nextValues, rulesRef.current);
        if (current) asyncErrors[name] = current as any;
      }
    }

    // Collect current errors snapshot
    return asyncErrors;
  }

  function touchAllRegisteredFields() {
    setTouched((prev) => {
      const next: any = { ...prev };
      for (const key of rulesRef.current.keys()) next[key] = true;
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
      if (
        blockSubmitWhileValidating &&
        Object.values(validating).some(Boolean)
      ) {
        onInvalid?.(errors);
        return;
      }

      const okSync = validateAllSync(values);
      if (!okSync) {
        const nextErrors: Errors<T> = {};
        for (const name of rulesRef.current.keys()) {
          const msg = getFieldError(name, values, rulesRef.current);
          if (msg) nextErrors[name] = msg;
        }
        onInvalid?.(nextErrors);
        return;
      }

      // Submit bypasses debounce (immediate async validation)
      await validateAllAsync(values, { bypassDebounce: true });

      // After async completes, use the latest errors state snapshot
      const hasErrors = Object.keys(errors).length > 0;
      if (!hasErrors) onValid(values);
      else onInvalid?.(errors);
    };
  }

  function register<K extends keyof T>(name: K, rules?: Rules<T>) {
    if (rules) rulesRef.current.set(name, rules);

    return {
      name: String(name),
      value: values[name],
      onChange: (e: any) => {
        const nextValue = e?.target ? e.target.value : e;

        setValues((prev) => {
          const next = { ...prev, [name]: nextValue };

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

  const isValid = Object.keys(errors).length === 0;
  const isValidating = Object.values(validating).some(Boolean);

  return {
    values,
    errors,
    touched,
    validating,
    isValid,
    isValidating,
    register,
    validateField: validateFieldSync,
    handleSubmit,
    submitCount,
    hasSubmitted: submitCount > 0,
  };
}

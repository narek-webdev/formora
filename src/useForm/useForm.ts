import * as React from "react";
import type {
  Errors,
  Rules,
  UseFormOptions,
  Touched,
  Validating,
} from "./types";
import { getFieldError } from "./validation";
import { isLatestAsyncSeq, nextAsyncSeq } from "./async";

import { getByPath } from "../utils/getByPath";
import { setByPath } from "../utils/setByPath";
import { unsetByPath } from "../utils/unsetByPath";

import { createMetaApi } from "./internals/meta";
import { createResetApi } from "./internals/reset";
import { createFieldArrayApi } from "./internals/fieldArray";
import {
  asPathReadableObject,
  computeIsDirty,
  hasAnyLeafError,
  hasAnyTrue,
} from "./internals/state";

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

    setValues((prev: any) => {
      const next: any = setByPath(prev, name, value);
      setFieldDirty(name, computeIsDirty(name, next, initialValuesRef.current));

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

    setValues((prev: any) => {
      const next = { ...prev, ...partial };

      for (const k of Object.keys(partial) as Array<keyof T>) {
        const key = String(k);
        setFieldDirty(
          key,
          computeIsDirty(key, next as any, initialValuesRef.current)
        );
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
        const t = e?.target;
        const nextValue = t
          ? t.type === "checkbox"
            ? Boolean(t.checked)
            : t.type === "number"
            ? t.value === "" || Number.isNaN(t.valueAsNumber)
              ? ""
              : t.valueAsNumber
            : t.value
          : e;

        setValues((prev: any) => {
          const next: any = setByPath(prev, name, nextValue);
          setFieldDirty(
            name,
            computeIsDirty(name, next, initialValuesRef.current)
          );
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
          setValues((prev: any) => {
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

  const formState = {
    isValid,
    isDirty,
    isValidating,
    submitCount,
    hasSubmitted: submitCount > 0,
  };

  const metaApi = createMetaApi({
    touched,
    dirty,
    validating,
    errors,
    submitCount,
  });

  const resetApi = createResetApi<T>({
    initialValuesRef,
    valuesRef,
    setValues,
    setErrors,
    setTouched,
    setDirty,
    setValidating,
    setSubmitCount,
    asyncSeqRef,
    nextAsyncSeq,
    clearDebounceTimer,
    clearAllDebounceTimers,
  });

  const fieldArrayApi = createFieldArrayApi({
    setValues: setValues as any,
    setErrors: setErrors as any,
    setTouched: setTouched as any,
    setDirty: setDirty as any,
    setValidating: setValidating as any,

    rulesRef: rulesRef as any,
    asyncSeqRef: asyncSeqRef as any,
    nextAsyncSeq,
    clearDebounceTimer,

    validateFieldSync: (path: string, vals: any) => {
      validateFieldSync(path, vals);
    },
    validateFieldAsync: (path: string, vals: any) => {
      void validateFieldAsync(path, vals);
    },

    computeIsDirty: (path: string, vals: any) =>
      computeIsDirty(path, vals as T, initialValuesRef.current),
    setFieldDirty,
  });

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
    shouldShowError: metaApi.shouldShowError,
    getFieldMeta: metaApi.getFieldMeta,

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
    reset: resetApi.reset,
    resetField: resetApi.resetField,
    append: fieldArrayApi.append,
    remove: fieldArrayApi.remove,
    insert: fieldArrayApi.insert,
    replace: fieldArrayApi.replace,
    move: fieldArrayApi.move,
    swap: fieldArrayApi.swap,
    validateField: validateFieldSync,
    handleSubmit,
    submitCount,
    hasSubmitted: submitCount > 0,
  };
}

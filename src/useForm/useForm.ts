import * as React from "react";
import type { Errors, Rules, UseFormOptions } from "./types";
import { getFieldError } from "./validation";
import { isLatestAsyncSeq, nextAsyncSeq } from "./async";

export function useForm<T extends Record<string, any>>(
  options: UseFormOptions<T>
) {
  const validateOn = options.validateOn ?? "submit";

  const [values, setValues] = React.useState<T>(options.initialValues);
  const [errors, setErrors] = React.useState<Errors<T>>({});
  const [touched, setTouched] = React.useState<
    Partial<Record<keyof T, boolean>>
  >({});
  const [validating, setValidating] = React.useState<
    Partial<Record<keyof T, boolean>>
  >({});

  const rulesRef = React.useRef(new Map<keyof T, Rules<T>>());
  const asyncSeqRef = React.useRef(new Map<keyof T, number>());

  function setFieldValidating(name: keyof T, isValidating: boolean) {
    setValidating((prev) => {
      const next: Partial<Record<keyof T, boolean>> = { ...prev };
      if (isValidating) next[name] = true;
      else delete (next as any)[name];
      return next;
    });
  }

  function setFieldError(name: keyof T, message?: string) {
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

  async function validateFieldAsync(name: keyof T, nextValues: T) {
    const rules = rulesRef.current.get(name);

    const syncMsg = getFieldError(name, nextValues, rulesRef.current);
    if (syncMsg) {
      setFieldError(name, syncMsg);
      setFieldValidating(name, false);
      return false;
    }

    if (!rules?.validateAsync) {
      setFieldValidating(name, false);
      return true;
    }

    const seq = nextAsyncSeq(asyncSeqRef.current, name);
    setFieldValidating(name, true);

    const msg = await rules.validateAsync(nextValues[name], nextValues);

    if (!isLatestAsyncSeq(asyncSeqRef.current, name, seq)) return true; // stale

    setFieldError(name, msg);
    setFieldValidating(name, false);
    return !msg;
  }

  async function validateAllAsync(nextValues: T) {
    const names = Array.from(rulesRef.current.keys());
    const asyncErrors: Errors<T> = {};

    await Promise.all(
      names.map(async (name) => {
        const rules = rulesRef.current.get(name);
        if (!rules?.validateAsync) return;

        const syncMsg = getFieldError(name, nextValues, rulesRef.current);
        if (syncMsg) {
          asyncErrors[name] = syncMsg;
          setFieldError(name, syncMsg);
          setFieldValidating(name, false);
          return;
        }

        const seq = nextAsyncSeq(asyncSeqRef.current, name);
        setFieldValidating(name, true);

        const msg = await rules.validateAsync(nextValues[name], nextValues);

        if (!isLatestAsyncSeq(asyncSeqRef.current, name, seq)) return;

        if (msg) asyncErrors[name] = msg;
        setFieldError(name, msg);
        setFieldValidating(name, false);
      })
    );

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

      touchAllRegisteredFields();

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

      const asyncErrors = await validateAllAsync(values);
      if (Object.keys(asyncErrors).length === 0) onValid(values);
      else onInvalid?.(asyncErrors);
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
            void validateFieldAsync(name, prev);
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
  };
}

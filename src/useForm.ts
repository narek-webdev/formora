import * as React from "react";

type UseFormOptions<T> = {
  initialValues: T;
  validateOn?: "change" | "blur" | "submit";
};

type Errors<T> = Partial<Record<keyof T, string>>;

type Rules<T> = {
  required?: boolean | string; // true or custom message
  pattern?: RegExp | { value: RegExp; message: string };
  minLength?: number | { value: number; message: string };
  maxLength?: number | { value: number; message: string };
  min?: number | { value: number; message: string };
  max?: number | { value: number; message: string };

  /**
   * Custom synchronous validator.
   * Return a string to indicate an error message, or undefined for valid.
   */
  validate?: (value: unknown, values: T) => string | undefined;

  /**
   * Custom async validator (race-condition safe).
   * Return a Promise resolving to a string error message or undefined.
   */
  validateAsync?: (value: unknown, values: T) => Promise<string | undefined>;
};

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

  // store rules without causing re-renders
  const rulesRef = React.useRef(new Map<keyof T, Rules<T>>());

  // Per-field async validation sequence. Latest sequence wins.
  const asyncSeqRef = React.useRef(new Map<keyof T, number>());

  function nextAsyncSeq(name: keyof T) {
    const prev = asyncSeqRef.current.get(name) ?? 0;
    const next = prev + 1;
    asyncSeqRef.current.set(name, next);
    return next;
  }

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

  function getFieldError(name: keyof T, nextValues: T): string | undefined {
    const rules = rulesRef.current.get(name);
    if (!rules) return undefined;

    if (rules.required) {
      const msg =
        typeof rules.required === "string"
          ? rules.required
          : "This field is required";

      const value = nextValues[name];
      const empty =
        value === null ||
        value === undefined ||
        (typeof value === "string" && value.trim() === "") ||
        (Array.isArray(value) && value.length === 0);

      if (empty) return msg;
    }

    if (rules.pattern) {
      const value = nextValues[name];

      // Only apply pattern validation to non-empty strings.
      // If the field is empty, `required` should handle it.
      if (typeof value === "string" && value.length > 0) {
        const reg =
          rules.pattern instanceof RegExp ? rules.pattern : rules.pattern.value;
        const msg =
          rules.pattern instanceof RegExp
            ? "Invalid format"
            : rules.pattern.message;

        if (!reg.test(value)) return msg;
      }
    }

    if (rules.minLength !== undefined) {
      const value = nextValues[name];

      const min =
        typeof rules.minLength === "number"
          ? rules.minLength
          : rules.minLength.value;

      const msg =
        typeof rules.minLength === "number"
          ? `Must be at least ${min} characters`
          : rules.minLength.message;

      // Only apply minLength to non-empty strings.
      // If empty should be invalid, `required` should handle it.
      if (typeof value === "string" && value.length > 0 && value.length < min)
        return msg;
    }

    if (rules.maxLength !== undefined) {
      const value = nextValues[name];

      const maxLen =
        typeof rules.maxLength === "number"
          ? rules.maxLength
          : rules.maxLength.value;

      const msg =
        typeof rules.maxLength === "number"
          ? `Must be at most ${maxLen} characters`
          : rules.maxLength.message;

      // Only apply maxLength to non-empty strings.
      // If empty should be invalid, `required` should handle it.
      if (
        typeof value === "string" &&
        value.length > 0 &&
        value.length > maxLen
      )
        return msg;
    }

    // Numeric range checks: support both numbers and numeric strings
    const asNumber = (v: unknown): number | undefined => {
      if (typeof v === "number" && Number.isFinite(v)) return v;
      if (typeof v === "string") {
        const t = v.trim();
        if (t === "") return undefined;
        const n = Number(t);
        if (Number.isFinite(n)) return n;
      }
      return undefined;
    };

    const num = asNumber(nextValues[name]);

    if (rules.min !== undefined && num !== undefined) {
      const min = typeof rules.min === "number" ? rules.min : rules.min.value;
      const msg =
        typeof rules.min === "number"
          ? `Must be at least ${min}`
          : rules.min.message;
      if (num < min) return msg;
    }

    if (rules.max !== undefined && num !== undefined) {
      const max = typeof rules.max === "number" ? rules.max : rules.max.value;
      const msg =
        typeof rules.max === "number"
          ? `Must be at most ${max}`
          : rules.max.message;
      if (num > max) return msg;
    }

    if (typeof rules.validate === "function") {
      const msg = rules.validate(nextValues[name], nextValues);
      if (typeof msg === "string") return msg;
    }

    return undefined;
  }

  function validateFieldSync(name: keyof T, nextValues: T) {
    const msg = getFieldError(name, nextValues);
    setFieldError(name, msg);
    return !msg;
  }

  function validateAllSync(nextValues: T) {
    const nextErrors: Errors<T> = {};

    for (const name of rulesRef.current.keys()) {
      const msg = getFieldError(name, nextValues);
      if (msg) nextErrors[name] = msg;
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function validateFieldAsync(name: keyof T, nextValues: T) {
    const rules = rulesRef.current.get(name);

    // If sync fails, never run async
    const syncMsg = getFieldError(name, nextValues);
    if (syncMsg) {
      setFieldError(name, syncMsg);
      setFieldValidating(name, false);
      return false;
    }

    if (!rules?.validateAsync) {
      setFieldValidating(name, false);
      return true;
    }

    const seq = nextAsyncSeq(name);
    setFieldValidating(name, true);

    const msg = await rules.validateAsync(nextValues[name], nextValues);

    const latest = asyncSeqRef.current.get(name) ?? 0;
    if (latest !== seq) return true; // stale result ignored

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

        // Only run async if sync passes
        const syncMsg = getFieldError(name, nextValues);
        if (syncMsg) {
          asyncErrors[name] = syncMsg;
          setFieldError(name, syncMsg);
          setFieldValidating(name, false);
          return;
        }

        const seq = nextAsyncSeq(name);
        setFieldValidating(name, true);

        const msg = await rules.validateAsync(nextValues[name], nextValues);

        const latest = asyncSeqRef.current.get(name) ?? 0;
        if (latest !== seq) return;

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
          const msg = getFieldError(name, values);
          if (msg) nextErrors[name] = msg;
        }
        onInvalid?.(nextErrors);
        return;
      }

      const asyncErrors = await validateAllAsync(values);
      if (Object.keys(asyncErrors).length === 0) {
        onValid(values);
      } else {
        onInvalid?.(asyncErrors);
      }
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

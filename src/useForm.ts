import * as React from "react";

type UseFormOptions<T> = {
  initialValues: T;
  validateOn?: "change" | "blur" | "submit";
};

type Errors<T> = Partial<Record<keyof T, string>>;

type Rules = {
  required?: boolean | string; // true or custom message
  pattern?: RegExp | { value: RegExp; message: string };
  minLength?: number | { value: number; message: string };
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

  // store rules without causing re-renders
  const rulesRef = React.useRef(new Map<keyof T, Rules>());

  function setFieldError(name: keyof T, message?: string) {
    setErrors((prev) => {
      const next = { ...prev };
      if (!message) delete next[name];
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
      if (typeof value === "string" && value.length > 0 && value.length < min) {
        return msg;
      }
    }

    return undefined;
  }

  function validateField(name: keyof T, nextValues: T) {
    const msg = getFieldError(name, nextValues);
    setFieldError(name, msg);
    return !msg;
  }

  function validateAll(nextValues: T) {
    const nextErrors: Errors<T> = {};

    for (const name of rulesRef.current.keys()) {
      const msg = getFieldError(name, nextValues);
      if (msg) nextErrors[name] = msg;
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
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
    return (e?: any) => {
      e?.preventDefault?.();

      touchAllRegisteredFields();

      const ok = validateAll(values);
      if (ok) {
        onValid(values);
      } else {
        // validateAll already updated state; also compute a snapshot to pass to callback
        const nextErrors: Errors<T> = {};
        for (const name of rulesRef.current.keys()) {
          const msg = getFieldError(name, values);
          if (msg) nextErrors[name] = msg;
        }
        onInvalid?.(nextErrors);
      }
    };
  }

  function register<K extends keyof T>(name: K, rules?: Rules) {
    if (rules) rulesRef.current.set(name, rules);

    return {
      name: String(name),
      value: values[name],
      onChange: (e: any) => {
        const nextValue = e?.target ? e.target.value : e;

        setValues((prev) => {
          const next = { ...prev, [name]: nextValue };

          if (validateOn === "change") {
            validateField(name, next);
          }

          return next;
        });
      },
      onBlur: () => {
        setTouched((prev) => ({ ...prev, [name]: true }));

        if (validateOn === "blur") {
          setValues((prev) => {
            validateField(name, prev);
            return prev;
          });
        }
      },
    };
  }

  const isValid = Object.keys(errors).length === 0;

  return {
    values,
    errors,
    touched,
    isValid,
    register,
    validateField,
    handleSubmit,
  };
}

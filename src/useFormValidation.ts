import * as React from "react";

type UseFormOptions<T> = {
  initialValues: T;
  validateOn?: "change" | "blur" | "submit";
};

type Errors<T> = Partial<Record<keyof T, string>>;

type Rules = {
  required?: boolean | string; // true or custom message
};

export function useFormValidation<T extends Record<string, any>>(
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

  function validateField(name: keyof T, nextValues: T) {
    const rules = rulesRef.current.get(name);
    if (!rules) return true;

    if (rules.required) {
      const msg =
        typeof rules.required === "string"
          ? rules.required
          : "This field is required";

      const value = nextValues[name];
      const empty =
        value === null ||
        value === undefined ||
        (typeof value === "string" && value.trim() === "");

      if (empty) {
        setFieldError(name, msg);
        return false;
      }
    }

    setFieldError(name, undefined);
    return true;
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
          validateField(name, values);
        }
      },
    };
  }

  return {
    values,
    errors,
    touched,
    register,
    validateField,
  };
}

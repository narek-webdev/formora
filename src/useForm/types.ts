export type UseFormOptions<T> = {
  initialValues: T;
  validateOn?: "change" | "blur" | "submit";
  asyncDebounceMs?: number;
  blockSubmitWhileValidating?: boolean;
};

export type Errors<T> = Partial<Record<keyof T, string>>;

export type Rules<T> = {
  required?: boolean | string; // true or custom message
  pattern?: RegExp | { value: RegExp; message: string };
  minLength?: number | { value: number; message: string };
  maxLength?: number | { value: number; message: string };
  min?: number | { value: number; message: string };
  max?: number | { value: number; message: string };
  asyncDebounceMs?: number; // overrides global debounce for this field
  /** Return a string for error message, or undefined for valid. */
  validate?: (value: unknown, values: T) => string | undefined;

  /** Return a Promise resolving to a string error message or undefined. */
  validateAsync?: (value: unknown, values: T) => Promise<string | undefined>;
};

export type SetValueOptions = {
  shouldValidate?: boolean;
  shouldTouch?: boolean;
};

export type SetValuesOptions = {
  shouldValidate?: boolean;
  shouldTouch?: boolean;
  /** If true, async validation runs immediately (ignores debounce). */
  bypassDebounce?: boolean;
};

export type Touched<T> = Partial<Record<keyof T, boolean>>;
export type Validating<T> = Partial<Record<keyof T, boolean>>;

export type UseFormReturn<T> = {
  values: T;
  errors: Errors<T>;
  touched: Touched<T>;
  validating: Validating<T>;

  isValid: boolean;
  isValidating: boolean;
  submitCount: number;
  hasSubmitted: boolean;

  // Register returns input props (kept as `any` to stay compatible with different input types)
  register: <K extends keyof T>(name: K, rules?: Rules<T>) => any;

  // Submit helper (signature kept broad to avoid forcing a specific event type)
  handleSubmit: (
    onValid: (values: T) => void | Promise<void>,
    onInvalid?: (errors: Errors<T>, values: T) => void | Promise<void>
  ) => (e?: any) => Promise<void>;

  // DX helpers (v0.3)
  setValue: <K extends keyof T>(
    name: K,
    value: T[K],
    opts?: SetValueOptions
  ) => void;
  setValues: (partial: Partial<T>, opts?: SetValuesOptions) => void;
  reset: () => void;
  resetField: <K extends keyof T>(name: K) => void;

  // Error helpers
  setError: <K extends keyof T>(name: K, message: string) => void;
  clearError: <K extends keyof T>(name: K) => void;
  clearErrors: () => void;

  // Touched helpers
  setTouched: <K extends keyof T>(name: K, isTouched: boolean) => void;
  touchAll: () => void;
};

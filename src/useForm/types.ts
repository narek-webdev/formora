export type UseFormOptions<T> = {
  initialValues: T;
  validateOn?: "change" | "blur" | "submit";
  asyncDebounceMs?: number;
  blockSubmitWhileValidating?: boolean;
};

// ---------------------------------------------
// Option B: Typed field paths (DX)
// ---------------------------------------------
// We provide a typed Path<T> for autocomplete and safer value inference.
// Runtime still accepts any string path.

type Primitive =
  | string
  | number
  | boolean
  | bigint
  | symbol
  | null
  | undefined
  | Date
  | Function;

type KeyOf<T> = Extract<keyof T, string>;

type PathImpl<T> = T extends Primitive
  ? never
  : T extends Array<any>
  ? never
  : {
      [K in KeyOf<T>]: T[K] extends Primitive
        ? `${K}`
        : T[K] extends Array<any>
        ? // v0.5: arrays are not supported as nested paths yet
          `${K}`
        : `${K}` | `${K}.${Path<T[K]>}`;
    }[KeyOf<T>];

export type Path<T> = PathImpl<T>;

// Backward-compatible: anything can still be passed, but Path<T> gives autocomplete.
export type FieldPath<T = any> = Path<T> | (string & {});

// Infer the value type at a given dot-path.
// Note: only dot notation is typed; bracket notation falls back to `any`.

type Split<S extends string, D extends string> = string extends S
  ? string[]
  : S extends ""
  ? []
  : S extends `${infer T}${D}${infer U}`
  ? [T, ...Split<U, D>]
  : [S];

type ToKey<S extends string> = S;

type PathValueImpl<T, Parts extends readonly string[]> = Parts extends []
  ? T
  : Parts extends [infer H, ...infer R]
  ? H extends string
    ? R extends string[]
      ? ToKey<H> extends keyof T
        ? PathValueImpl<T[ToKey<H>], R>
        : any
      : any
    : any
  : any;

export type PathValue<T, P extends string> = PathValueImpl<T, Split<P, ".">>;

// Nested state objects (v0.5): match the shape of values.
// Leaf nodes hold the specific value type (string for errors, boolean for touched/validating).

type IsPlainObject<T> = T extends Primitive
  ? false
  : T extends Array<any>
  ? false
  : T extends object
  ? true
  : false;

type DeepMap<T, V> = {
  [K in KeyOf<T>]?: IsPlainObject<T[K]> extends true ? DeepMap<T[K], V> : V;
};

export type Errors<T> = DeepMap<T, string>;
export type Touched<T> = DeepMap<T, boolean>;
export type Validating<T> = DeepMap<T, boolean>;

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
  register: {
    <P extends Path<T>>(name: P, rules?: Rules<T>): any;
    (name: string, rules?: Rules<any>): any;
  };

  // Submit helper (signature kept broad to avoid forcing a specific event type)
  handleSubmit: (
    onValid: (values: T) => void | Promise<void>,
    onInvalid?: (errors: Errors<T>, values: T) => void | Promise<void>
  ) => (e?: any) => Promise<void>;

  // DX helpers (v0.3)
  setValue: {
    <P extends Path<T>>(
      name: P,
      value: PathValue<T, P>,
      opts?: SetValueOptions
    ): void;
    (name: string, value: any, opts?: SetValueOptions): void;
  };
  setValues: (partial: Partial<T>, opts?: SetValuesOptions) => void;
  reset: () => void;
  resetField: {
    <P extends Path<T>>(name: P): void;
    (name: string): void;
  };

  // Error helpers
  setError: {
    <P extends Path<T>>(name: P, message: string): void;
    (name: string, message: string): void;
  };
  clearError: {
    <P extends Path<T>>(name: P): void;
    (name: string): void;
  };
  clearErrors: () => void;

  // Touched helpers
  setTouched: {
    <P extends Path<T>>(name: P, isTouched: boolean): void;
    (name: string, isTouched: boolean): void;
  };
  touchAll: () => void;
};

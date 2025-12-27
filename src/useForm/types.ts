export type UseFormOptions<T> = {
  initialValues: T;
  validateOn?: "change" | "blur" | "submit";
};

export type Errors<T> = Partial<Record<keyof T, string>>;

export type Rules<T> = {
  required?: boolean | string; // true or custom message
  pattern?: RegExp | { value: RegExp; message: string };
  minLength?: number | { value: number; message: string };
  maxLength?: number | { value: number; message: string };
  min?: number | { value: number; message: string };
  max?: number | { value: number; message: string };

  /** Return a string for error message, or undefined for valid. */
  validate?: (value: unknown, values: T) => string | undefined;

  /** Return a Promise resolving to a string error message or undefined. */
  validateAsync?: (value: unknown, values: T) => Promise<string | undefined>;
};

// Internal module — not part of public API.
import { getByPath } from "../../utils/getByPath";

export type FieldMeta = {
  isTouched: boolean;
  isDirty: boolean;
  isValidating: boolean;
  error: string | undefined;
  showError: boolean;
};

type MetaCtx = {
  touched: any;
  dirty: any;
  validating: any;
  errors: any;
  submitCount: number;
};

export function createMetaApi(ctx: MetaCtx) {
  function shouldShowError(name: string) {
    const isTouched = !!getByPath(ctx.touched as any, name);
    return ctx.submitCount > 0 || isTouched;
  }

  function getFieldMeta(name: string): FieldMeta {
    return {
      isTouched: !!getByPath(ctx.touched as any, name),
      isDirty: !!getByPath(ctx.dirty as any, name),
      isValidating: !!getByPath(ctx.validating as any, name),
      error: getByPath(ctx.errors as any, name),
      showError: shouldShowError(name),
    };
  }

  return {
    getFieldMeta,
    shouldShowError,
  };
}

// Internal module — not part of public API.
import type React from "react";
import { getByPath } from "../../utils/getByPath";
import { setByPath } from "../../utils/setByPath";
import { unsetByPath } from "../../utils/unsetByPath";
import type { ResetFieldOptions, ResetOptions } from "../types";

type ResetCtx<TValues> = {
  // Values
  initialValuesRef: React.MutableRefObject<TValues>;
  valuesRef: React.MutableRefObject<TValues>;
  setValues: React.Dispatch<React.SetStateAction<TValues>>;

  // Meta state
  setErrors: React.Dispatch<React.SetStateAction<any>>;
  setTouched: React.Dispatch<React.SetStateAction<any>>;
  setDirty: React.Dispatch<React.SetStateAction<any>>;
  setValidating: React.Dispatch<React.SetStateAction<any>>;
  setSubmitCount: React.Dispatch<React.SetStateAction<number>>;

  // Async controls
  asyncSeqRef: React.MutableRefObject<Map<string, number>>;
  nextAsyncSeq: (seqMap: Map<string, number>, path: string) => number;
  clearDebounceTimer: (path: string) => void;
  clearAllDebounceTimers: () => void;
};

export function createResetApi<TValues>(ctx: ResetCtx<TValues>) {
  function reset(opts: ResetOptions = {}) {
    // Cancel async validation if we are not keeping validating state.
    if (!opts.keepValidating) {
      ctx.clearAllDebounceTimers();
      ctx.setValidating({});
      ctx.asyncSeqRef.current.clear();
    }

    // Reset values always (also update ref synchronously so async paths read latest).
    const nextValues = ctx.initialValuesRef.current;
    ctx.valuesRef.current = nextValues;
    ctx.setValues(nextValues);

    if (!opts.keepErrors) ctx.setErrors({});
    if (!opts.keepTouched) ctx.setTouched({});
    if (!opts.keepDirty) ctx.setDirty({});

    // Keep existing behavior: reset submit count.
    ctx.setSubmitCount(0);
  }

  function resetField(name: string, opts: ResetFieldOptions = {}) {
    // If we are not keeping validating, cancel pending/in-flight async for this field.
    if (!opts.keepValidating) {
      // bump seq so any in-flight async result becomes stale
      ctx.nextAsyncSeq(ctx.asyncSeqRef.current, name);
      ctx.clearDebounceTimer(name);
      ctx.setValidating((prev: any) => unsetByPath(prev, name));
      ctx.asyncSeqRef.current.delete(name);
    }

    // reset field value (and update ref synchronously)
    ctx.setValues((prev: any) => {
      const next: any = setByPath(
        prev,
        name,
        getByPath(ctx.initialValuesRef.current, name)
      );
      ctx.valuesRef.current = next;
      return next;
    });

    // clear per-field state depending on opts
    if (!opts.keepError) ctx.setErrors((prev: any) => unsetByPath(prev, name));
    if (!opts.keepTouched)
      ctx.setTouched((prev: any) => unsetByPath(prev, name));

    if (!opts.keepDirty) {
      ctx.setDirty((prev: any) => {
        let next = unsetByPath(prev, name);
        // also clear our special dirty markers used for array/object roots
        next = unsetByPath(next, `__selfDirty.${name}`);
        next = unsetByPath(next, name + ".__self");
        return next;
      });
    }

    if (!opts.keepValidating) {
      ctx.setValidating((prev: any) => unsetByPath(prev, name));
    }
  }

  return {
    reset,
    resetField,
  };
}

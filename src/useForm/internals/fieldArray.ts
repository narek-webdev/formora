// Internal module — not part of public API.
import type React from "react";
import { getByPath } from "../../utils/getByPath";
import { setByPath } from "../../utils/setByPath";
import { unsetByPath } from "../../utils/unsetByPath";

type ArrayOpts = { shouldValidate?: boolean; shouldTouch?: boolean };

type FieldArrayCtx = {
  setValues: React.Dispatch<React.SetStateAction<any>>;
  setErrors: React.Dispatch<React.SetStateAction<any>>;
  setTouched: React.Dispatch<React.SetStateAction<any>>;
  setDirty: React.Dispatch<React.SetStateAction<any>>;
  setValidating: React.Dispatch<React.SetStateAction<any>>;

  // Validation registry + async controls
  rulesRef: React.MutableRefObject<Map<string, any>>;
  asyncSeqRef: React.MutableRefObject<Map<string, number>>;
  nextAsyncSeq: (seqMap: Map<string, number>, path: string) => number;
  clearDebounceTimer: (path: string) => void;

  // Validation runners
  validateFieldSync: (path: string, values: any) => void;
  validateFieldAsync: (path: string, values: any) => Promise<void> | void;

  // Dirty tracking
  computeIsDirty: (path: string, values: any) => boolean;
  setFieldDirty: (path: string, isDirty: boolean) => void;
};

function getArrayAtPath(values: any, path: string): any[] {
  const arr = getByPath(values, path);
  return Array.isArray(arr) ? arr : [];
}

function shiftNestedStateAfterRemove(
  obj: any,
  path: string,
  index: number
): any {
  const arr = getByPath(obj, path);
  if (!Array.isArray(arr)) return obj;
  const nextArr = arr.slice();
  nextArr.splice(index, 1);
  return setByPath(obj, path, nextArr);
}

function shiftNestedStateAfterInsert(
  obj: any,
  path: string,
  index: number,
  arrayLen: number
): any {
  const branch = getByPath(obj, path);
  if (branch == null) return obj;

  // Build an array of length `arrayLen` from either a real array or an object with numeric keys.
  const out = new Array(arrayLen);
  if (Array.isArray(branch)) {
    for (let i = 0; i < Math.min(branch.length, arrayLen); i++)
      out[i] = branch[i];
  } else if (typeof branch === "object") {
    for (const k of Object.keys(branch)) {
      const idx = Number(k);
      if (!Number.isFinite(idx) || idx < 0 || idx >= arrayLen) continue;
      out[idx] = (branch as any)[k];
    }
  } else {
    return obj;
  }

  const nextArr = out.slice();
  nextArr.splice(index, 0, undefined);
  return setByPath(obj, path, nextArr);
}

function reorderNestedArrayBranch(
  state: any,
  arrayPath: string,
  fromIndex: number,
  toIndex: number,
  arrayLen: number
) {
  const branch = getByPath(state, arrayPath);
  if (branch == null) return state;

  // Build an array of length `arrayLen` from either a real array or an object with numeric keys.
  const arr: any[] = (() => {
    const out = new Array(arrayLen);

    if (Array.isArray(branch)) {
      for (let i = 0; i < Math.min(branch.length, arrayLen); i++)
        out[i] = branch[i];
      return out;
    }

    if (typeof branch === "object") {
      for (const k of Object.keys(branch)) {
        const idx = Number(k);
        if (!Number.isFinite(idx) || idx < 0 || idx >= arrayLen) continue;
        out[idx] = (branch as any)[k];
      }
      return out;
    }

    return out;
  })();

  if (fromIndex === toIndex) return state;
  if (fromIndex < 0 || toIndex < 0) return state;
  if (fromIndex >= arrayLen || toIndex >= arrayLen) return state;

  const nextArr = arr.slice();
  const [moved] = nextArr.splice(fromIndex, 1);
  nextArr.splice(toIndex, 0, moved);

  return setByPath(state, arrayPath, nextArr);
}

function swapNestedArrayBranch(
  state: any,
  arrayPath: string,
  a: number,
  b: number,
  arrayLen: number
) {
  const branch = getByPath(state, arrayPath);
  if (branch == null) return state;

  const arr: any[] = (() => {
    const out = new Array(arrayLen);

    if (Array.isArray(branch)) {
      for (let i = 0; i < Math.min(branch.length, arrayLen); i++)
        out[i] = branch[i];
      return out;
    }

    if (typeof branch === "object") {
      for (const k of Object.keys(branch)) {
        const idx = Number(k);
        if (!Number.isFinite(idx) || idx < 0 || idx >= arrayLen) continue;
        out[idx] = (branch as any)[k];
      }
      return out;
    }

    return out;
  })();

  if (a === b) return state;
  if (a < 0 || b < 0) return state;
  if (a >= arrayLen || b >= arrayLen) return state;

  const nextArr = arr.slice();
  const tmp = nextArr[a];
  nextArr[a] = nextArr[b];
  nextArr[b] = tmp;

  return setByPath(state, arrayPath, nextArr);
}

function keysAtOrAfterIndex(
  rulesKeys: IterableIterator<string>,
  arrayPath: string,
  startIndex: number
): string[] {
  const prefix = arrayPath + ".";
  const out: string[] = [];

  for (const key of rulesKeys) {
    if (!key.startsWith(prefix)) continue;
    const rest = key.slice(prefix.length);
    const idxStr = rest.split(".")[0];
    const idx = Number(idxStr);
    if (!Number.isFinite(idx)) continue;
    if (idx >= startIndex) out.push(key);
  }

  return out;
}

export function createFieldArrayApi(ctx: FieldArrayCtx) {
  function invalidateAsyncAtOrAfterIndex(
    arrayPath: string,
    startIndex: number
  ) {
    const keysToInvalidate = keysAtOrAfterIndex(
      ctx.rulesRef.current.keys(),
      arrayPath,
      startIndex
    );
    if (!keysToInvalidate.length) return;

    for (const key of keysToInvalidate) {
      ctx.nextAsyncSeq(ctx.asyncSeqRef.current, key);
      ctx.clearDebounceTimer(key);
    }

    ctx.setValidating((prev: any) => {
      let next: any = prev;
      for (const key of keysToInvalidate) next = unsetByPath(next, key);
      return next;
    });
  }

  function invalidateAsyncForReorder(arrayPath: string, a: number, b: number) {
    // conservative + safe: invalidate anything at/after the min index
    invalidateAsyncAtOrAfterIndex(arrayPath, Math.min(a, b));
  }

  function append(name: string, value: any, opts: ArrayOpts = {}) {
    ctx.setValues((prev: any) => {
      const arr = getArrayAtPath(prev, name);
      const next = setByPath(prev, name, [...arr, value]);
      ctx.setFieldDirty(name, ctx.computeIsDirty(name, next));

      if (opts.shouldTouch) {
        ctx.setTouched((t: any) => setByPath(t, `${name}.${arr.length}`, true));
      }

      if (opts.shouldValidate) {
        const index = arr.length;
        const keyPrefix = `${name}.${index}`;
        for (const key of ctx.rulesRef.current.keys()) {
          if (key === keyPrefix || key.startsWith(keyPrefix + ".")) {
            ctx.validateFieldSync(key, next);
            void ctx.validateFieldAsync(key, next);
          }
        }
      }

      return next;
    });
  }

  function remove(name: string, index: number, opts: ArrayOpts = {}) {
    ctx.setValues((prev: any) => {
      const arr = getArrayAtPath(prev, name);
      if (!arr.length || index < 0 || index >= arr.length) return prev;

      const nextArr = arr.slice();
      nextArr.splice(index, 1);
      const next = setByPath(prev, name, nextArr);

      ctx.setErrors((e: any) => shiftNestedStateAfterRemove(e, name, index));
      ctx.setTouched((t: any) => shiftNestedStateAfterRemove(t, name, index));
      ctx.setValidating((v: any) =>
        shiftNestedStateAfterRemove(v, name, index)
      );
      ctx.setDirty((d: any) => shiftNestedStateAfterRemove(d, name, index));
      ctx.setFieldDirty(name, ctx.computeIsDirty(name, next));

      // IMPORTANT: removing shifts indices. Invalidate async for paths at/after the removed index.
      invalidateAsyncAtOrAfterIndex(name, index);

      if (opts.shouldValidate) {
        for (const key of ctx.rulesRef.current.keys()) {
          if (key.startsWith(name + ".")) {
            ctx.validateFieldSync(key, next);
            void ctx.validateFieldAsync(key, next);
          }
        }
      }

      return next;
    });
  }

  function move(name: string, fromIndex: number, toIndex: number) {
    ctx.setValues((prev: any) => {
      const arr = getByPath(prev, name);
      if (!Array.isArray(arr)) return prev;
      if (fromIndex === toIndex) return prev;
      if (fromIndex < 0 || toIndex < 0) return prev;
      if (fromIndex >= arr.length || toIndex >= arr.length) return prev;

      const nextArr = arr.slice();
      const [moved] = nextArr.splice(fromIndex, 1);
      nextArr.splice(toIndex, 0, moved);

      const next = setByPath(prev, name, nextArr);

      ctx.setErrors((e: any) =>
        reorderNestedArrayBranch(e, name, fromIndex, toIndex, arr.length)
      );
      ctx.setTouched((t: any) =>
        reorderNestedArrayBranch(t, name, fromIndex, toIndex, arr.length)
      );
      ctx.setDirty((d: any) =>
        reorderNestedArrayBranch(d, name, fromIndex, toIndex, arr.length)
      );
      ctx.setValidating((v: any) =>
        reorderNestedArrayBranch(v, name, fromIndex, toIndex, arr.length)
      );

      ctx.setFieldDirty(name, ctx.computeIsDirty(name, next));

      invalidateAsyncForReorder(name, fromIndex, toIndex);

      return next;
    });
  }

  function swap(name: string, indexA: number, indexB: number) {
    ctx.setValues((prev: any) => {
      const arr = getByPath(prev, name);
      if (!Array.isArray(arr)) return prev;
      if (indexA === indexB) return prev;
      if (indexA < 0 || indexB < 0) return prev;
      if (indexA >= arr.length || indexB >= arr.length) return prev;

      const nextArr = arr.slice();
      const tmp = nextArr[indexA];
      nextArr[indexA] = nextArr[indexB];
      nextArr[indexB] = tmp;

      const next = setByPath(prev, name, nextArr);

      ctx.setErrors((e: any) =>
        swapNestedArrayBranch(e, name, indexA, indexB, arr.length)
      );
      ctx.setTouched((t: any) =>
        swapNestedArrayBranch(t, name, indexA, indexB, arr.length)
      );
      ctx.setDirty((d: any) =>
        swapNestedArrayBranch(d, name, indexA, indexB, arr.length)
      );
      ctx.setValidating((v: any) =>
        swapNestedArrayBranch(v, name, indexA, indexB, arr.length)
      );

      ctx.setFieldDirty(name, ctx.computeIsDirty(name, next));

      invalidateAsyncForReorder(name, indexA, indexB);

      return next;
    });
  }

  function insert(
    name: string,
    index: number,
    value: any,
    opts: ArrayOpts = {}
  ) {
    ctx.setValues((prev: any) => {
      const arr = getArrayAtPath(prev, name);

      // clamp index into [0, arr.length]
      const at = Math.max(0, Math.min(index, arr.length));

      const nextArr = arr.slice();
      nextArr.splice(at, 0, value);
      const next = setByPath(prev, name, nextArr);

      // Shift nested state (indices >= at move right)
      const nextLen = nextArr.length;
      ctx.setErrors((e: any) =>
        shiftNestedStateAfterInsert(e, name, at, nextLen)
      );
      ctx.setTouched((t: any) =>
        shiftNestedStateAfterInsert(t, name, at, nextLen)
      );
      ctx.setValidating((v: any) =>
        shiftNestedStateAfterInsert(v, name, at, nextLen)
      );
      ctx.setDirty((d: any) =>
        shiftNestedStateAfterInsert(d, name, at, nextLen)
      );

      ctx.setFieldDirty(name, ctx.computeIsDirty(name, next));

      // Inserting shifts indices. Invalidate async for paths at/after `at`.
      invalidateAsyncAtOrAfterIndex(name, at);

      if (opts.shouldTouch) {
        ctx.setTouched((t: any) => setByPath(t, `${name}.${at}`, true));
      }

      if (opts.shouldValidate) {
        for (const key of ctx.rulesRef.current.keys()) {
          if (key.startsWith(name + ".")) {
            ctx.validateFieldSync(key, next);
            void ctx.validateFieldAsync(key, next);
          }
        }
      }

      return next;
    });
  }

  function replace(
    name: string,
    index: number,
    value: any,
    opts: ArrayOpts = {}
  ) {
    ctx.setValues((prev: any) => {
      const arr = getArrayAtPath(prev, name);
      if (!arr.length || index < 0 || index >= arr.length) return prev;

      const nextArr = arr.slice();
      nextArr[index] = value;
      const next = setByPath(prev, name, nextArr);

      ctx.setFieldDirty(name, ctx.computeIsDirty(name, next));

      // Invalidate async validations for this index (and any nested fields under it)
      const prefix = `${name}.${index}`;
      const keysToInvalidate: string[] = [];
      for (const key of ctx.rulesRef.current.keys()) {
        if (key === prefix || key.startsWith(prefix + "."))
          keysToInvalidate.push(key);
      }
      for (const key of keysToInvalidate) {
        ctx.nextAsyncSeq(ctx.asyncSeqRef.current, key);
        ctx.clearDebounceTimer(key);
      }
      if (keysToInvalidate.length) {
        ctx.setValidating((v: any) => {
          let nextV: any = v;
          for (const key of keysToInvalidate) nextV = unsetByPath(nextV, key);
          return nextV;
        });
      }

      if (opts.shouldTouch) {
        ctx.setTouched((t: any) => setByPath(t, `${name}.${index}`, true));
      }

      if (opts.shouldValidate) {
        for (const key of ctx.rulesRef.current.keys()) {
          if (key === prefix || key.startsWith(prefix + ".")) {
            ctx.validateFieldSync(key, next);
            void ctx.validateFieldAsync(key, next);
          }
        }
      }

      return next;
    });
  }

  return {
    append,
    remove,
    move,
    swap,
    insert,
    replace,
  };
}

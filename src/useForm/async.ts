export function nextAsyncSeq<K>(map: Map<K, number>, key: K) {
  const prev = map.get(key) ?? 0;
  const next = prev + 1;
  map.set(key, next);
  return next;
}

export function isLatestAsyncSeq<K>(map: Map<K, number>, key: K, seq: number) {
  return (map.get(key) ?? 0) === seq;
}

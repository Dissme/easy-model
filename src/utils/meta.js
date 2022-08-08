const metaMap = new WeakMap();

export function getFromMap(target) {
  if (!metaMap.has(target)) metaMap.set(target, {});
  return metaMap.get(target);
}

export function setMeta(target, k, v) {
  const obj = getFromMap(target);
  obj[k] = v;
}

export function getMeta(target, k) {
  return getFromMap(target)[k];
}

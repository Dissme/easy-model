export function pick(obj, ...keys) {
  return keys.reduce(
    (result, key) => ({
      ...result,
      [key]: obj[key]
    }),
    {}
  );
}

export function like(obj1, obj2) {
  if (obj1 === obj2) return true;
  if (typeof obj1 !== typeof obj2) return false;
  if (typeof obj1 === "object" && obj1 !== null && obj2 !== null) {
    const keys = Object.keys(obj1);
    for (let index = 0; index < keys.length; index++) {
      const key = keys[index];
      if (obj1[key] !== obj2[key]) return false;
    }
    return true;
  }
  return false;
}

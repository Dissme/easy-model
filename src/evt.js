import { getMeta, setMeta } from "./utils/meta";

const transformEvt = evt => `evt::${evt}`;

export function trigger(model, evt, ...params) {
  evt = transformEvt(evt);
  getMeta(model, evt)?.forEach?.(cb => cb(...params));
}

export function listen(model, evt, cb) {
  evt = transformEvt(evt);
  let pool = getMeta(model, evt);
  if (!pool) {
    pool = new Set();
    setMeta(model, evt, pool);
  }
  pool.add(cb);
}

export function unlisten(model, evt, cb = null) {
  evt = transformEvt(evt);
  if (!cb) return setMeta(model, evt, null);
  getMeta(model, evt)?.delete?.(cb);
}

export function onece(model, evt, cb) {
  const fn = (...args) => {
    unlisten(model, evt, fn);
    return cb(...args);
  };
  listen(model, evt, fn);
}

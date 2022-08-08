import { like, pick } from "./utils/helpers";
import LRU from "./utils/lru";
import { getMeta, setMeta } from "./utils/meta";

const PRIMARY_KEY = "PRIMARY_KEY";
const OFF_KEY = "OFF_KEY";
const RELATED = "RELATED";

function injectRelated(fn) {
  return function (...args) {
    return fn.call(this, getMeta(this, RELATED), ...args);
  };
}

export const inited = Symbol("inited");

export function primaryKey(_, { kind, name, isStatic }) {
  if (kind !== "field" || isStatic) throw "只能装饰非静态Field";
  return function (initalValue) {
    const metas = getMeta(this.constructor, PRIMARY_KEY);
    if (!metas) setMeta(this.constructor, PRIMARY_KEY, new Set([name]));
    else metas.add(name);
    return initalValue;
  };
}

export function off(_, { kind, name, isStatic }) {
  if (kind !== "field" || isStatic) throw "只能装饰非静态Field";
  return function (initalValue) {
    const metas = getMeta(this.constructor, OFF_KEY);
    if (!metas) setMeta(this.constructor, OFF_KEY, new Set([name]));
    else metas.add(name);
    return initalValue;
  };
}

export function easy(T, { kind }) {
  if (kind !== "class") throw "只能装饰类";
  return class EasyModel extends T {
    static #instances = new LRU(T.cacheSize ?? 20);

    static #getInstance(initails) {
      return EasyModel.#instances.get(initails);
    }

    static #getPKs() {
      return getMeta(EasyModel, PRIMARY_KEY) || new Set(["id"]);
    }

    @off [inited] = false;

    #lastSnapShot = null;

    #wirteQueue = [];

    #syncing = null;

    get #exited() {
      return [...EasyModel.#getPKs()].every(
        key => this[key] !== undefined && this[key] !== null
      );
    }

    get #primaryObj() {
      return pick(this, ...EasyModel.#getPKs());
    }

    constructor(...args) {
      super(...args);

      let result = this.#exited && EasyModel.#getInstance(this.#primaryObj);
      if (!result) {
        result = new Proxy(this, {
          set(target, key, value, receiver) {
            if (EasyModel.#getPKs().has(key)) {
              throw new TypeError("主键不允许变更");
            }

            const offs = getMeta(EasyModel, OFF_KEY);
            if (!offs?.has?.(key)) {
              target.#wirteQueue.push({ [key]: value });
              if (!target.#lastSnapShot) target.#lastSnapShot = { ...target };
            }

            return Reflect.set(target, key, value, receiver);
          }
        });
        if (this.#exited) EasyModel.#instances.set(this.#primaryObj, result);
        setMeta(result, RELATED, this);
      }

      return result;
    }

    @injectRelated
    async get(target) {
      const wirteQueue = target.#wirteQueue;
      target.#wirteQueue = [];
      try {
        const result = await super.get?.();
        Object.assign(target, result, ...wirteQueue, ...target.#wirteQueue, {
          [inited]: true
        });
        target.#lastSnapShot = null;
      } catch (error) {
        target.#wirteQueue.unshift(...wirteQueue);
        throw error;
      }
    }

    @injectRelated
    async post(target) {
      const wirteQueue = target.#wirteQueue;
      target.#wirteQueue = [];
      try {
        const result = await super.post?.();
        Object.assign(target, result, ...target.#wirteQueue, {
          [inited]: true
        });
        EasyModel.#instances.set(target.#primaryObj, this);
        target.#lastSnapShot = null;
      } catch (error) {
        target.#wirteQueue.unshift(...wirteQueue);
        throw error;
      }
    }

    @injectRelated
    async put(target) {
      const wirteQueue = target.#wirteQueue;
      target.#wirteQueue = [];

      try {
        const result = await super.put?.();
        Object.assign(target, result, ...target.#wirteQueue);
        target.#lastSnapShot = null;
      } catch (error) {
        target.#wirteQueue.unshift(...wirteQueue);
        throw error;
      }
    }

    async delete() {
      await super.delete?.();
      this.destroy();
    }

    @injectRelated
    sync(target) {
      const syncHandler = async () => {
        if (!this[inited]) await (target.#exited ? this.get() : this.post());
        else await this.put();
        if (target.#wirteQueue.length) return syncHandler();
      };

      if (!target.#syncing) {
        target.#syncing = syncHandler().finally(() => {
          target.#syncing = null;
        });
      }

      return target.#syncing;
    }

    @injectRelated
    reset(target) {
      if (target.#syncing) return target.#syncing;
      target.#wirteQueue = [];
      Object.keys(target.#lastSnapShot)
        .concat(Object.keys(target))
        .forEach(key => {
          target[key] = target.#lastSnapShot[key];
        });
      target.#lastSnapShot = null;
    }

    @injectRelated
    destroy(target) {
      EasyModel.#instances.drop(target.#primaryObj);
      target.#lastSnapShot = null;
      super.destroy?.();
    }
  };
}

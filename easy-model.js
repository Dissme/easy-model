export const $nextTick = Symbol("$nextTick");
export const $isAuto = Symbol("$isAuto");
export const $get = Symbol("$get");
export const $post = Symbol("$post");
export const $patch = Symbol("$patch");
export const $put = Symbol("$put");
export const $delete = Symbol("$delete");

const processing = Symbol("processing");
const waitToSync = Symbol("waitToSync");
const batchProperties = Symbol("batchProperties");

const readOnly = [
  $nextTick,
  $isAuto,
  $get,
  $post,
  $patch,
  $put,
  $delete,
  processing,
  waitToSync,
  batchProperties,
];

let safe = false;

let offFields = [];
let primaryKeyFields = [];
const privateMap = new WeakMap();

export function easy(T, { kind }) {
  if (kind !== "class") throw "只能装饰class";
  const offs = offFields;
  offFields = [];
  if (!primaryKeyFields.length) throw "必须要有主键";
  const pks = primaryKeyFields;
  primaryKeyFields = [];

  const instances = new Set(); // 有待优化的内存泄漏

  return class extends T {
    [processing] = {};
    [waitToSync] = {};

    get [batchProperties]() {
      return {
        ...this[processing],
        ...this[waitToSync],
      };
    }

    get [$nextTick]() {
      return TaskManager.getTM(this).nextTick;
    }

    get [$isAuto]() {
      return TaskManager.getTM(this).isAuto;
    }

    set [$isAuto](v) {
      TaskManager.getTM(this).isAuto = v;
      return true;
    }

    constructor(...args) {
      super(...args);

      let result = getInstance(this);

      if (!result) {
        result = new Proxy(this, {
          get(t, k, r) {
            if (
              safe ||
              readOnly.includes(k) ||
              offs.includes(k) ||
              !(k in t[batchProperties])
            ) {
              return Reflect.get(t, k, r);
            }
            return t[batchProperties][k];
          },
          set(t, k, v, r) {
            if (safe || offs.includes(k)) {
              return Reflect.set(t, k, v, r);
            }

            if (readOnly.includes(k)) return false;

            if (pks.includes(k)) {
              if (v ?? false) return false;
              t[$delete]();
              return true;
            }

            t[waitToSync][k] = v;
            t[$patch]();
            return true;
          },
        });
        instances.add(result);
        result.sync();

        TaskManager.getTM(result).isAuto = this[$isAuto] ?? true;
      }

      return result;
    }

    sync() {
      if (safeRAW(() => pks.every((k) => this[k] ?? false))) {
        this[$get]();
      } else {
        this[$post]();
      }
    }

    @TaskManager.register async [$get]() {
      const result = await super[$get]?.(
        safeRAW(() =>
          pks.reduce(
            (ret, key) => ({
              ...ret,
              [key]: this[key],
            }),
            {}
          )
        )
      );

      safeRAW(() => Object.assign(this, result));
    }

    @TaskManager.register async [$post]() {
      const result = await super[$post]?.();

      safeRAW(() => Object.assign(this, result));
    }

    @TaskManager.register async [$patch]() {
      Object.assign(this[processing], this[waitToSync]);
      this[waitToSync] = {};

      if (super[$patch]) {
        await super[$patch](this[processing]);
      } else {
        await this[$put]();
      }

      safeRAW(() => Object.assign(this, this[processing]));

      this[processing] = {};
    }

    @TaskManager.register [$put]() {
      return super[$put]?.();
    }

    @TaskManager.register async [$delete]() {
      await super[$delete]?.();
      instances.delete(this);
    }
  };

  function getInstance(obj) {
    for (const instance of instances) {
      if (pks.every((k) => obj[k] === instance[k])) return instance;
    }
  }
}

export function off(_, { name, kind, isStatic }) {
  if (isStatic) throw "不能装饰静态属性";
  if (kind !== "field") throw "只能装饰field";
  offFields.push(name);
}

export function primaryKey(_, { name, kind, isStatic }) {
  if (isStatic) throw "不能装饰静态属性";
  if (kind !== "field") throw "只能装饰field";
  primaryKeyFields.push(name);
}

class TaskManager {
  static getTM(instance) {
    return getFromPrivate(instance, TaskManager);
  }

  static register(orignFn, { name }) {
    return function (...args) {
      const TM = TaskManager.getTM(this);
      if (name === $delete) TM.flush();
      TM.push(orignFn, this, args);
    };
  }

  #isAuto = true;

  #r = null;

  tasks = [];

  nextTick = null;

  get isAuto() {
    return this.#isAuto;
  }

  set isAuto(v) {
    this.#isAuto = !!v;
    if (this.#isAuto) {
      this.#r?.();
      this.#r = null;
    }
  }

  push(fn, caller, args) {
    if (this.tasks[this.tasks.length - 1]?.fn !== fn)
      this.tasks.push({ fn, caller, args });
    if (!this.nextTick) {
      this.nextTick = new Promise((r) => {
        if (this.#isAuto) r();
        else {
          this.#r = r;
        }
      }).then(() => this.pipe());
    }
  }

  flush() {
    this.tasks.length = 0;
  }

  async pipe() {
    if (!this.tasks.length) return (this.nextTick = null);
    const { fn, caller, args } = this.tasks.shift();
    try {
      await fn.apply(caller, args);
    } catch (error) {
      console.error(error);
    }
    return this.pipe();
  }
}

function getFromPrivate(instance, clazz) {
  if (!privateMap.has(instance)) privateMap.set(instance, {});

  if (!(clazz.name in privateMap.get(instance)))
    privateMap.get(instance)[clazz.name] = new clazz();

  return privateMap.get(instance)[clazz.name];
}

function safeRAW(cb) {
  safe = true;
  let ret = cb();
  safe = false;
  return ret;
}

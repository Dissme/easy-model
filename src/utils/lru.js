import { like } from "./helpers";

const time = () => performance?.now?.() ?? Date.now();

export default class LRU {
  minLifeTime = 3600000;
  maxSize = 20;
  pool = [];

  constructor(maxSize = 20) {
    this.maxSize = maxSize;
  }

  findIndex(primaryObj) {
    return this.pool.findIndex(item => like(primaryObj, item.value));
  }

  set(primaryObj, value) {
    const index = this.findIndex(primaryObj);
    if (index >= 0) {
      this.pool[index].value = value;
    } else {
      this.pool.unshift({ value, lastTime: time() });
    }
    this.get(primaryObj);
    if (this.pool.length > this.maxSize) this.drop();
  }

  get(primaryObj) {
    let result;
    if (this.pool.length === 1 && like(primaryObj, this.pool[0].value))
      return this.pool[0].value;

    this.pool.sort((a, b) => {
      if (like(primaryObj, a.value)) {
        a.lastTime = time();
        result = a.value;
      }

      if (like(primaryObj, b.value)) {
        b.lastTime = time();
        result = b.value;
      }

      return b.lastTime - a.lastTime;
    });

    return result;
  }

  drop(primaryObj) {
    let target;

    if (primaryObj) {
      const index = this.findIndex(primaryObj);
      if (index >= 0) {
        target = this.pool.splice(index, 1)[0];
      }
    } else {
      target = this.pool.pop();
      if (target.lastTime + this.minLifeTime > time()) {
        this.pool.push(target);
        target = null;
      }
    }

    target?.value?.destroy?.();
  }
}

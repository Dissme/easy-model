# 说明

## 使用方法
```bash
npm i @easythings/easy-model
```


```js
import { off, primaryKey, easy, inited } from "@easythings/easy-model";

@easy
class TestModel {
  @primaryKey id;
  @primaryKey tel;

  @off xx = 123;

  name = "123";

  lastName = "";

  constructor(initails) {
    Object.assign(this, initails);
  }

  get() {
    return; // 在这里请求，返回后段返回的数据
  }

  post() {
    return; // 在这里请求，返回后段返回的数据
  }

  put() {
    return; // 在这里请求，返回后段返回的数据
  }

  delete() {
    // 在这里请求
  }

  destroy() {
    // 销毁时候会触发
  }
}

const m = new TestModel({ id: 1, tel: 123 });
await m.sync(); // 会调用get
const m2 = new TestModel({ name: "xxx" });
await m2.sync(); // 会调用post
const m3 = new TestModel({ id: m2.id, tel: m2.tel });
m3.name = "asdf";
await m3.sync(); // 会调用put
console.log(m3.name, m3.name === m2.name, m3 === m2); // 相同的主键是同一个对象
m3.name = 'fasdf';
m3.lastName = 'galsadkfjlkj';
m3.reset();
console.log(m3.name, m2.name) // 还原成最近一次跟后端交互过的状态
m3.sync(); // 不会请求
```

## [changelog](./CHANGELOG.md)

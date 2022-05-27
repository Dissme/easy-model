```js
import {
  easy,
  off,
  primaryKey,
  $isAuto,
  $nextTick,
  $get,
  $post,
  $patch,
  $put,
  $delete,
} from "easy-model";

@easy
class XXX {
  [$isAuto] = false; // 不自动同步
  [$isAuto] = true; // 自动同步
  [$nextTick]; // 每次变更属性时会变为一个新的promise 同步结束会resolve

  @off property = 123; // 不代理的属性
  @primaryKey id; // 主键 赋值为undefined或者null会调用delete new的时候如果有至少一个主键 会调用get 否则调用post

  constructor(properties) {
    Object.assign(this, properties);
  }

  sync() {} // 会调用get或者post的同步函数 

  async [$get]() {} // 同步函数 获取固定ID的item
  async [$post]() {} // 同步函数 生成固定ID的item
  async [$patch](params) {} // 同步函数 params是更新的kv 会优先于put调用
  async [$put]() {} // 同步函数 不存在patch的时候会调用
  async [$delete]() {} // 同步函数 删除
}

let xxx = new XXX({ id: 1 }); // 如果有存在的未释放的ID为1的实例会返回 否则会 get

let xxx2 = new XXX({ name: "xx" }); // 不存在主键 这里会调用post

while (xxx.i < 100) {
  xxx.i++;
}
xxx.property = 10;
xxx.name = "bbb"; // 这段代码执行完之后会自动调用一次patch({ i: 100, name: bbb })没有patch方法会调用put
xxx.id = null // 这里会调用一次delete

await xxx[$nextTick]
xxx = null
```


使用时候需要babel 2021-12的decorator插件支持语法
打包时候需要用babel转换
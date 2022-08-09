import { off, primaryKey, easy, inited, listen } from "./src/index";

@easy
export class TestModel {
  @primaryKey id;
  @primaryKey tel;

  @off xx = 123;

  [inited] = false;

  name = "123";

  lastName = "";

  constructor(initails) {
    Object.assign(this, initails);
  }

  get() {
    return new Promise(r => {
      setTimeout(() => {
        r({ name: "fasdf", lastName: "gasdfqwer" });
      }, 1000);
    });
  }

  post() {
    return { id: 123, tel: 321 }; // 在这里请求，返回后段返回的数据
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

const model = new TestModel({ id: 1, tel: 123 });
const app = document.querySelector("#app");
app.textContent = JSON.stringify(model);
model.sync();
listen(model, "changed", () => {
  app.textContent = JSON.stringify(model);
});

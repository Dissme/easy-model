import { off, primaryKey, easy, inited, listen, unlisten } from "./index";
import { test, expect } from "vitest";
import mockDatas from "./mock.json";

function findData(obj) {
  const target = mockDatas.find(
    item => +item.id === +obj.id && +item.tel === +obj.tel && !item.del
  );
  if (target) return JSON.parse(JSON.stringify(target));
}

function getFromMock(obj) {
  return new Promise((r, rej) =>
    setTimeout(() => {
      const target = findData(obj);
      target ? r(target) : rej();
    }, 300)
  );
}

function createMock(obj) {
  const target = { ...obj };
  const last = mockDatas[mockDatas.length - 1];
  target.id = last.id + 1;
  target.tel = last.tel + 1;
  return new Promise(r =>
    setTimeout(() => {
      r(target);
    }, 300)
  );
}

function setMock(obj) {
  return new Promise(r =>
    setTimeout(() => {
      const index = mockDatas.findIndex(
        item => +item.id === +obj.id && +item.tel === +obj.tel
      );
      if (index >= 0) r(Object.assign(mockDatas[index], obj));
      else rej();
    }, 300)
  );
}

function deleteMock(obj) {
  return new Promise(r =>
    setTimeout(() => {
      const index = mockDatas.findIndex(
        item => +item.id === +obj.id && +item.tel === +obj.tel
      );
      mockDatas[index].del = true;
      r();
    }, 300)
  );
}

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
    return getFromMock(this);
  }

  post() {
    return createMock(this);
  }

  put() {
    return setMock(this);
  }

  delete() {
    return deleteMock(this);
  }

  destroy() {
    models[models.findIndex(i => i == this)] = null;
  }
}

const models = Array.from(
  { length: 1000 },
  (v, k) => new TestModel({ id: k + 1, tel: 13100000000 + k })
);

test("get", async () => {
  const list = [];
  models.forEach(model => {
    const s = model.sync();
    expect(s).to.equal(model.sync());
    list.push(s);
    expect(model).to.have.property(inited, false);
  });
  await Promise.all(list);
  models.forEach((model, i) => {
    expect(model).to.have.property(inited, true);
    expect(model).to.eql(mockDatas[i]).but.not.equal(mockDatas[i]);
  });
});

test("same primaryKey same model", async () => {
  const model1 = new TestModel({ ...mockDatas[0] });
  const model2 = new TestModel({ ...mockDatas[0] });
  expect(model1).to.have.property(inited, true);
  expect(model2).to.have.property(inited, true);
  expect(model1).to.equal(model2);
});

test("post", async () => {
  const fields = { name: "xxx", lastName: "tentacion" };
  const model = new TestModel(fields);
  await model.sync();
  expect(model).to.include.keys(["id", "tel"]);
  expect(model).to.have.property(inited, true);
  expect(model).to.include(fields);
  expect(models).not.contain(model);
  expect(new TestModel({ ...model })).to.equal(model);
});

test("put", async () => {
  const model1 = new TestModel({ ...mockDatas[0] });
  expect(model1).to.have.property(inited, true);
  expect(() => {
    model1.id = 123;
  }).to.throw();
  model1.name = "I'm put";
  await model1.sync();
  expect(mockDatas[0].name).to.equal(model1.name);
  const model2 = new TestModel({ id: mockDatas[0].id, tel: mockDatas[0].tel });
  expect(model2).to.equal(model1);
  expect(model2).to.have.property(inited, true);
  expect(model1).to.have.property("name", "I'm put");
  expect(model2).to.have.property("name", "I'm put");
});

test("changed", async () => {
  const model = new TestModel();
  let changed = false;
  listen(model, "changed", payload => {
    console.log(payload);
    expect(model).to.include(payload);
    changed = true;
  });
  model.name = "atention";
  expect(changed).to.equal(true);
  changed = false;
  unlisten(model, "changed");
  model.name = "atention";
  expect(changed).to.equal(false);
});

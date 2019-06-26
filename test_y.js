const __yagaBindMap__ = Symbol.for("__yagaBindMap__");

function __yagaBindFn__(o, tgt) {
  if (typeof tgt === "string") tgt = o[tgt];
  if (typeof tgt !== "function") throw new Error("Target of bind must be a function");
  let bf,
      map = tgt[__yagaBindMap__] || (tgt[__yagaBindMap__] = new WeakMap());
  return map.get(o) || (map.set(o, bf = tgt.bind(o)), bf);
}

const __yagaPrivateSpace__ = new WeakMap();

function __yagaObjLiteral__(o, oPrivate) {
  __yagaPrivateSpace__.set(o, oPrivate);

  return o;
}

function __yagaGetPrivateSpace__(o) {
  let oPrivate = __yagaPrivateSpace__.get(o);

  if (!oPrivate) oPrivate = __yagaPrivateSpace__.set(o, {});
  return oPrivate;
}

/*
import {
    arrayTypeAnnotation
} from "@babel/types";
*/
// A test module to put through the Yaga extensions transpiler.
function main() {
  testPrivateSpace(); //    testBind();
}

function testPrivateSpace() {
  obj = __yagaObjLiteral__({
    a: 1,
    b: 2,
    d: 4
  }, {
    c: 3
  });
  log('testPrivateSpace: 1:', __yagaGetPrivateSpace__(obj)['c'], __yagaGetPrivateSpace__(obj).c);
  __yagaGetPrivateSpace__(obj).c = 100;
  log('testPrivateSpace: 2:', obj.c, __yagaGetPrivateSpace__(obj).c);

  __yagaGetPrivateSpace__(obj);

  log('testPrivateSpace: 3:', __yagaGetPrivateSpace__(obj), __yagaGetPrivateSpace__(obj).c);

  if (true === false) {
    __yagaGetPrivateSpace__(obj).aaa.x.y;
  }
}

function testBind() {
  let obj = {
    foo() {
      log('hello world');
    }

  };
  let f1 = obj.foo.bind(obj);
  let f2 = obj.foo.bind(obj);

  let f3 = __yagaBindFn__(obj, "foo");

  let f4 = __yagaBindFn__(obj, "foo");

  log(f1 === f2, f3 === f4);
  f1 = foobar.bind(obj);
  f2 = foobar.bind(obj);
  f3 = __yagaBindFn__(obj, foobar);
  f4 = __yagaBindFn__(obj, foobar);
  log(f1 === f2, f3 === f4);

  if (true === false) {
    f1 = __yagaBindFn__(obj.a.b, "foo").x.y;
  }
}

function foobar() {
  log('hello world');
}

main();

function log(...args) {
  console.log.apply(undefined, args);
}
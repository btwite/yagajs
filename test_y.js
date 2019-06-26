const _yagaBindMap__ = Symbol.for("__yagaBindMap__");

function __yagaBindFn__(o, tgt) {
  if (typeof tgt === "string") tgt = o[tgt];
  if (typeof tgt !== "function") throw new Error("Target of bind must be a function");
  let bf,
      map = tgt[_yagaBindMap__] || (tgt[_yagaBindMap__] = new WeakMap());
  return map.get(o) || (map.set(o, bf = tgt.bind(o)), bf);
}

/*
import {
    arrayTypeAnnotation
} from "@babel/types";
*/
// A test module to put through the Yaga extensions transpiler.
function main() {
  obj = {
    a: 1,
    b: 2,
    #c: 3,
    d: 4
  };
  obj['aaa'];
  obj.#aaa;
  console.log(obj);
  let obj = {
    foo() {
      console.log('hello world');
    }

  };
  let f1 = obj.foo.bind(obj);
  let f2 = obj.foo.bind(obj);

  let f3 = __yagaBindFn__(obj, "foo");

  let f4 = __yagaBindFn__(obj, "foo");

  console.log(f1 === f2, f3 === f4);
  f1 = foobar.bind(obj);
  f2 = foobar.bind(obj);
  f3 = __yagaBindFn__(obj, foobar);
  f4 = __yagaBindFn__(obj, foobar);
  console.log(f1 === f2, f3 === f4);
  f1 = __yagaBindFn__(obj.a.b, "foo");
}

function foobar() {
  console.log('hello world');
}

main();
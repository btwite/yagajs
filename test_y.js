const __yagaBindMap__ = Symbol.for('__yagaBindMap__');

function __yagaBindFn__(o, tgt) {
  if (typeof tgt === 'string') tgt = o[tgt];
  if (typeof tgt !== 'function')
    throw new Error('Target of bind must be a function');
  let bf, map = tgt[__yagaBindMap__] || (tgt[__yagaBindMap__] = new WeakMap());
  return map.get(o) || (map.set(o, (bf = tgt.bind(o))), bf);
}

let o = { a: 1, b: 2 };

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

function __yagaThisArg__(f) {
  return function (...args) {
    return f(this, ...args);
  };
}

// A test module to put through the Yaga extensions transpiler.
function fred(...args) { }

function main() {
  testThisArg();
  testPrivateSpace();
  testBind();
}

function testThisArg() {
  let obj = {
    thisArg: __yagaThisArg__(thisArg),
    badThisArg: __yagaThisArg__(1),
    noThisArg: noThisArg,
  };

  function thisArg(that) {
    log(that);
    return that;
  }

  function noThisArg() {
    log(this);
    return this;
  }

  log(obj.thisArg(), obj.noThisArg());
  trycode(() => {
    obj.badThisArg();
  });
}

function testPrivateSpace() {
  let obj = __yagaObjLiteral__(
    {
      a: 1,
      b: 2,
    },
    {
      c: 3,
      ['d']: 4,
    }
  );

  log(
    'testPrivateSpace: 1:',
    __yagaGetPrivateSpace__(obj)['c'],
    __yagaGetPrivateSpace__(obj).c,
    __yagaGetPrivateSpace__(obj)['d']
  );
  __yagaGetPrivateSpace__(obj).c = 100;
  log('testPrivateSpace: 2:', obj.c, __yagaGetPrivateSpace__(obj).c);
  log(
    'testPrivateSpace: 3:',
    __yagaGetPrivateSpace__(obj),
    __yagaGetPrivateSpace__(obj).c
  );

  if (true === false) {
    __yagaGetPrivateSpace__(obj).aaa.x.y;
  }
}

function testBind() {
  let obj = {
    foo() {
      log('hello world');
    },
  };
  let f1 = obj.foo.bind(obj);
  let f2 = obj.foo.bind(obj);

  let f3 = __yagaBindFn__(obj, 'foo');

  let f4 = __yagaBindFn__(obj, 'foo');

  log(f1 === f2, f3 === f4);
  f1 = foobar.bind(obj);
  f2 = foobar.bind(obj);
  f3 = __yagaBindFn__(obj, foobar);
  f4 = __yagaBindFn__(obj, foobar);
  log(f1 === f2, f3 === f4);

  if (true === false) {
    f1 = __yagaBindFn__(obj.a.b, 'foo').x.y;
  }
}

function foobar() {
  log('hello world');
}

main();

function log(...args) {
  console.log.apply(undefined, args);
}

function trycode(fn, fErr) {
  try {
    fn();
  } catch (err) {
    if (fErr) fErr(err);
    else log(err);
    if (typeof err === 'object' && err.errors) yaga.printErrors(err.errors);
  }
}

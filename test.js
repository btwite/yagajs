// A test module to put through the Yaga extensions transpiler.

function fred(...args) {

}

function main() {
    testThisArg();
    testPrivateSpace();
    testBind();
}

function testThisArg() {
    let obj = {
        thisArg::thisArg,
        badThisArg::1,
        noThisArg: noThisArg
    };

    function thisArg(that) {
        log(that);
        return (that);
    }

    function noThisArg() {
        log(this);
        return (this);
    }

    log(obj.thisArg(), obj.noThisArg());
    trycode(() => {
        obj.badThisArg();
    })
}

function testPrivateSpace() {
    let obj = {
        a: 1,
        b: 2,
        #c: 3,
        # ['d']: 4
    };

    log('testPrivateSpace: 1:', obj#['c'], obj.#c, obj#['d']);

    obj.#c = 100;
    log('testPrivateSpace: 2:', obj.c, obj.#c);

    log('testPrivateSpace: 3:', obj#[], obj#[].c);

    if (true === false) {
        obj.#aaa.x.y;
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
    let f3 = obj - > foo;
    let f4 = obj - > foo;

    log(f1 === f2, f3 === f4);

    f1 = foobar.bind(obj);
    f2 = foobar.bind(obj);
    f3 = obj - > [foobar];
    f4 = obj - > [foobar];

    log(f1 === f2, f3 === f4);

    if (true === false) {
        f1 = obj.a.b - > foo.x.y;
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
        fn()
    } catch (err) {
        if (fErr) fErr(err);
        else log(err);
        if (typeof err === 'object' && err.errors) yaga.printErrors(err.errors);
    }
}
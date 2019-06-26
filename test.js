/*
import {
    arrayTypeAnnotation
} from "@babel/types";
*/

let _yagaPrivateSpace_ = new WeakMap();

function _yagaObjLiteral_(o, oPrivate) {
    _yagaPrivateSpace_.set(o, oPrivate);
    return (o);
}

function _yagaGetPrivateSpace(o) {
    let oPrivate = _yagaPrivateSpace_.get(o);
    if (!oPrivate)
        oPrivate = _yagaPrivateSpace_.set(o, {});
    return (oPrivate);
}

// A test module to put through the Yaga extensions transpiler.

function main() {
    obj = {
        a: 1,
        b: 2,
        #c: 3,
        d: 4
    };
    obj#['aaa'];
    obj.#aaa;
    console.log(obj);

    let obj = {
        foo() {
            console.log('hello world');
        }
    };
    let f1 = obj.foo.bind(obj);
    let f2 = obj.foo.bind(obj);
    let f3 = obj - > foo;
    let f4 = obj - > foo;

    console.log(f1 === f2, f3 === f4);

    f1 = foobar.bind(obj);
    f2 = foobar.bind(obj);
    f3 = obj - > [foobar];
    f4 = obj - > [foobar];

    console.log(f1 === f2, f3 === f4);

    f1 = obj.a.b - > foo;

}

function foobar() {
    console.log('hello world');
}

main();
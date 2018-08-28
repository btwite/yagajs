/**
 * Main for testing features of the Influence Framework
 */

"use strict"

let yaga = require('./Yaga');

test();
testComposition();
//testInfluence();
//testGrammarExtensions();

function test() {
    //    log(yaga);
    //    yaga();
    //    log(Object.is(yaga, yaga.Reader.ReadPoint.Yaga));
}

function testComposition() {
    let inf1 = yaga.Influence({
        name: 'inf1',
        prototype: {
            helloWorld() {
                console.log('Hello World from inf1');
            }
        },
        static: {
            helloWorld() {
                console.log('Static Hello World from inf1');
            }
        }
    });
    let inf2 = yaga.Influence({
        name: 'inf2',
        prototype: {
            helloWorld() {
                console.log('Hello World from inf2');
            }
        },
        static: {
            helloWorld() {
                console.log('Static Hello World from inf2');
            }
        }
    });
    inf1.create().helloWorld();
    inf2.create().helloWorld();

    let inf3 = yaga.Influence({
        name: 'inf3',
        composition: [inf1, inf2.create],
        harmonizers: {
            defaults: {
                prototype: '.most.'
            },
            prototype: {
                helloWorld: ['.least.'],
                helloWorld1() {
                    return (this.makeCallable(this.getProperties('helloWorld', '.most.', 'function')));
                }
            },
            static: {
                helloWorld: ['.least.'],
            }
        }
    });
    log(inf3);
    let o = inf3.create();
    o.helloWorld();
    o.helloWorld1();
    inf3.create.helloWorld();
    log(o.isainf3, o.isainf1);
}

function testInfluence() {
    let myInf = yaga.Influence({
        name: 'myInf',
        prototype: {
            helloWorld() {
                console.log('Hello World');
                return (this);
            },
            protected_: {
                log() {
                    console.log('XXX', this.myval, myInf.public(this).myval)
                },
            }
        },
        constructor: {
            myval: 100,
            private_: {
                myprivateval: []
            },
            protected_: {
                myval: 1000
            }
        },
        static: {
            foo() {
                console.log('bar =', this.bar)
            },
            foobar() {
                myInf.protectedStatic(this).foo()
            },
            foobar1() {
                myInf.privateStatic(this).foo()
            },
            bar: 1000,
            protected_: {
                foo() {
                    console.log('bar =', this.bar)
                },
                bar: 2000,
            },
            private_: {
                foo() {
                    console.log('bar =', this.bar)
                },
                bar: 10000,
            }
        }
    });
    log(myInf);
    let o = myInf.create();
    let o1 = myInf.create();
    log(o.helloWorld().typeName);
    log(myInf.private(o1), myInf.protected(o1), myInf.public(o1));
    myInf.protected(o1).log();
    myInf.private(o1).myprivateval.push(300);
    log(myInf.private(o), myInf.private(o1));

    log(yaga.Reader.ReadPoint.default.isaReadPoint);
    let r = yaga.Reader.ReadPoint('mySource', 2, 3);
    log(r.format(), r.increment(10).format(), yaga.Reader.ReadPoint.default.format());

    myInf.create.foo();
    myInf.create.foobar();
    myInf.create.foobar1();
}

function oldReader() {
    let yi = yaga.Instance.new();
    let reader = yaga.Reader.new(yi);
    log(reader);
    let o = {};
    o[''] = 'fred';
    console.log(o['']);
}

function testGrammarExtensions() {
    yaga.installGrammarExtensions();
    let obj = {
        foobar() {
            console.log('SUCCESS', 'foobar', this)
        },
        foobar1() {
            console.log('SUCCESS', 'foobar1', this)
        }
    };

    let f1 = 'this->foobar'._(obj);
    let f2 = '_->foobar1'._(obj);
    log('Check get same bound foobar :', Object.is(f1, 'this->foobar'._(obj)))
    log('Check that foobar and foobar1 are different :', !Object.is(f1, f2))
    f1();
    f2();

    function fn1() {
        log(`'fn1' Calling foobar`);
        this.foobar();
    }

    function fn2() {
        log(`'fn2' Calling foobar`);
        this.foobar();
    }

    // Bound functions are related to their bindng object, not the syntax of the request
    // The _ (none argument) can be replaced with any symbol to provide greater clarity
    let f3 = '_->[_]'._(obj, fn1);
    log('Check get same bound fn1 :', Object.is(f3, 'obj->[fn1]'._(obj, fn1)))
    f3();

    // Demonstrates partial functions.
    // Yaga has a partial function state that will only resolve down to the actual
    // function implementation when all parameter positions have been satisfied.
    // The use of _ (none) indicates that an argument is yet to be filled.
    '_->[_]'._()(obj)(fn2)();
}

function log(...args) {
    console.log.apply(undefined, args);
}

function trycode(fn) {
    try {
        fn()
    } catch (err) {
        console.log(err.name, err.message);
        if (err.errors) yaga.printErrors(err.errors);
    }
}
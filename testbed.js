/**
 * Main for testing features of the Influence Framework
 */

"use strict"

let yaga = require('./Yaga');

test();
//testProperties();
//testExceptions();
//testReaderTable();
//testComposition();
//testReadPoint();
//testInfluence();
//testGrammarExtensions();

function test() {
    //    let rt = yaga.Reader.ReaderTable({});
    let r = yaga.Reader({
        startReader: (...args) => console.log('startReader', ...args),
        endReader: (...args) => console.log('endReader', ...args),
        startStream: state => {
            console.log('startStream', state);
            return (state.rootExpression);
        },
        endStream: state => {
            console.log('endStream', state);
            return (state.rootExpression);
        },
        startLine: (...args) => console.log('startLine', ...args),
        endLine: (...args) => console.log('endLine', ...args),
        commitToken: state => {
            console.log('commitToken', state);
            state.addToken(state.token);
        },
        commitChar: state => {
            console.log('commitChar', state);
            state.addChar(state.char);
        },
    });
    r.readString('Hello World').tokens.forEach(tok => log(tok));
}

function testProperties() {
    //    log(yaga);
    //    yaga();
    //    log(Object.is(yaga, yaga.Reader.ReadPoint.Yaga));
    let d = Object.getOwnPropertyDescriptors({
        [Symbol.for('fred')]: 200,
        fred: 100,
    });
    let o = Object.defineProperties({}, d);
    log(Object.getOwnPropertyDescriptors(o));
    Object.getOwnPropertyNames(d).forEach(prop => log('name', d[prop]));
    Object.getOwnPropertySymbols(d).forEach(sym => log('sym', d[sym]));
    log("abcd".includes(""));
}

function testExceptions() {
    let exc = yaga.Exception('TestException')
    trycode(() => {
        throw exc('My Exception');
    });
    exc = yaga.Exception({
        name: 'my.TestException',
        constructor(a, b, c) {
            this.a = a;
            this.b = b;
            this.c = c;
            return (`Msg: ${a} ${b} ${c}`);
        }
    });
    trycode(() => {
        throw exc(1, 2, 3);
    });
    let exc1 = yaga.Exception({
        name: 'my.TestException1',
        constructor(a, b, c, d) {
            this.d = d;
            return (yaga.Exception.super(exc1, this, a, b, c) + ' ' + d);
        },
        prototype: exc
    });
    trycode(() => {
        throw exc1(10, 20, 30, 40);
    });
}

function oldReader() {
    let yi = yaga.Instance.new();
    let reader = yaga.Reader.new(yi);
    log(reader);
    let o = {};
    o[''] = 'fred';
    console.log(o['']);
}

function testReaderTable() {
    let _ = undefined;
    let rt = yaga.Reader.ReaderTable();
    log(rt.match('Hello World'));
    rt.addPattern('Hello');
    log(rt.match('Hello World'));
    rt.addTemplate({
        patterns: {
            'World': _,
            'NONE': _,
            '/World/': {
                level: 2
            },
            '/^Hello/': {
                level: 1
            },
            '+': _,
            '++': _,
            '-aa-': _,
            '<=': _,
        }
    })
    log(rt.match('HelloWorld'));
    log(rt.match('HellWorld'));
    log(rt.match('++'));
    log(rt.match('+-'));
    log(rt.match('-aa-xyz'));
}

function testComposition() {
    let inf1 = yaga.Influence({
        name: 'inf1',
        prototype: {
            helloWorld() {
                console.log('Hello World from inf1');
            },
        },
        constructor() {
            return {
                protected_: {
                    var0: 20000,
                    inf1_var1: 200,
                    inf1_var2: 300
                }
            }
        },
        static: {
            helloWorld() {
                console.log('Static Hello World from inf1');
            },
            protected_: {
                protVar: 10000
            }
        }
    });

    let inf2 = yaga.Influence({
        name: 'inf2',
        prototype: {
            helloWorld() {
                console.log('Hello World from inf2');
            },
            showVar0() {
                log('var0', inf2.protected(this).var0);
            },
            private_: {
                myVar: 'This actually the prototype version'
            }
        },
        constructor() {
            return {
                protected_: {
                    var0: 40000,
                    inf2_var1: 400,
                    inf2_var2: 600
                }
            }
        },
        static: {
            helloWorld() {
                console.log('Static Hello World from inf2. ' + inf2.static.private(this).myVar);
            },
            showProtVar() {
                log('protVar', inf1.static.protected(this).protVar);
            },
            private_: {
                myVar: 'High there'
            }
        }
    });

    let o1 = inf1.create();
    o1.helloWorld();
    let o2 = inf2.create();
    o2.helloWorld();
    log(inf1.protected(o1), inf2.protected(o2));

    let inf3 = yaga.Influence({
        name: 'inf3',
        composition: [inf1, inf2.create],
        harmonizers: {
            defaults: {
                prototype: '.most.',
                static: '.most.',
                constructor: [inf2, inf1]
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
    log(inf3);
    o.helloWorld();
    o.helloWorld1();
    log('\n\n');
    inf3.create.helloWorld();
    log(o.isainf3, o.isainf1);
    log(inf3.protected(o), inf3.protected(inf3.create()));
    o.showVar0();
    inf3.create.showProtVar();
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
            },
            private_: {}
        },
        constructor: () => ({
            myval: 100,
            private_: {
                myprivateval: [],
            },
            protected_: {
                myval: 1000
            }
        }),
        static: {
            foo() {
                console.log('bar =', this.bar)
            },
            foobar() {
                myInf.static.protected(this).foo()
            },
            foobar1() {
                myInf.static.private(this).foo()
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

    myInf.create.foo();
    myInf.create.foobar();
    myInf.create.foobar1();
}

function testReadPoint() {
    log(yaga.Reader.ReadPoint.default.isaReadPoint);
    let r = yaga.Reader.ReadPoint('mySource', 2, 3);
    log(r.format(), r.increment(10).format(), yaga.Reader.ReadPoint.default.format());
    trycode(() => r.sourceName = 'mysource', err => log(err.message));
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

function trycode(fn, fErr) {
    try {
        fn()
    } catch (err) {
        if (fErr) fErr(err);
        else log(err);
        if (err.errors) yaga.printErrors(err.errors);
    }
}
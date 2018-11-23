/**
 * Main for testing features of the Influence Framework
 */

"use strict"

let _ = undefined;
let yaga = require('./core');

//let r = /^(?:\d+(?:\.\d+)?(?:[Ee](?:\+|-)?\d+)?)(?![a-zA-Z0-9])/;
//log(r.exec('1.11e*2'));

//test();
testTranspiler();
//testMachine();
//testRegExprs();
//testCharacter();
//testReader();
//testGlobalDictionary();
//testResolvePath()
//testProperties();
//testExceptions();
//testReaderTable();
//testReplicate();
//testScopes();
//testLatePrivateProtectedAccess();
//testComposition();
//testReadPoint();
//testAbstractInfluence();
//testInfluence();
//testGrammarExtensions();

function test() {
    let rt = require('./machine').YagaReaderTable;
    //    log(rt.match('((.jsPrim'));
    let reader = yaga.Reader(rt);
    let exprs = reader.readFile(__dirname + '\\test.yaga');
    log(exprs);
}

function testTranspiler() {
    let cc = require('charcodes');
    let out = yaga.transpile("let x; x->y; x->['a' + 'b']");
    log(out.code);
    yaga.transpileFile('../repos/yaga/test.jsy');
}

function testMachine() {
    let mach;
    try {
        mach = yaga.Machine({
            //        readerTable: _,
            //coreDictionary: 'test.yaga',
            //        jsPrimLoader: () => _,
            //dictionary: 'test.yaga',
            //        dictionaries: _,
        });
        mach.printGlobalDictionary();
        mach.print(mach.rbeplFile('test.yaga'));
    } catch (err) {
        if ((mach = err.machine || mach) && mach.hasErrors()) {
            mach.printErrors();
            //mach.printGlobalDictionary();
            //            if (err.expressions.readExpression)
            //                log(err.expressions.readExpression);
        } else
            throw err;
    };
}

function testRegExprs() {
    let r = /^(?:(?:\+|-)?\d+(?:.\d+)?(?:[Ee](?:\+|-)?\d+)?)(?![a-zA-Z0-9])/;
    let r1 = /^(?:(?:\+|-)?\d+(?:.\d+)?(?:[Ee](?:\+|-)?\d+)?)/;
    //let r = /^(?:\+|-)/;
    let s = '+11111.1111e-10';
    let m = r.exec(s);
    let m1 = r1.exec();
    log(m, m1);
}

function testCharacter() {
    let Char = yaga.Character;
    log('isAlpha(a,0,_)', Char.isAlpha('a'), Char.isAlpha('0'), Char.isAlpha(''));
    log('isDigit(a,0,_)', Char.isDigit('a'), Char.isDigit('0'), Char.isDigit(''));
    log('isAlphaNumeric(a,0,_)', Char.isAlphaNumeric('a'), Char.isAlphaNumeric('0'), Char.isAlphaNumeric(''));
    log('isEndOfLine(\u2028,0,_)', Char.isEndOfLine('\u2028'), Char.isEndOfLine('0'), Char.isEndOfLine(''));
    log('isControl(\v,\u2028,_)', Char.isControl('\v'), Char.isControl('\u2028'), Char.isControl(''));
    log('isWhitespace( ,\r,_)', Char.isWhitespace(' '), Char.isWhitespace('\r'), Char.isWhitespace(''));
    log('isSpecial(\u4000, ,_)', Char.isSpecial('\u4000'), Char.isSpecial(' '), Char.isSpecial(''));
}

function testReader() {
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

function testGlobalDictionary() {
    let desc = {
        name: 'testGlobalDictionary',
        coreDictionary: 'testpath://myYaga/core.yaga',
        dictionary: 'testpath://myYaga/dict.yaga',
        fReadDictionary(gd, path) {
            log('fReadDictionary:', path);
            switch (path.substr(path.lastIndexOf('myYaga')).replace('\\', '/')) {
                case 'myYaga/core.yaga':
                    gd.setDictionaryName('core');
                    gd.setDictionaryDependencies(['testpath://myYaga/core1.yaga', 'testpath://myYaga/core2.yaga']);
                    gd.define('core', true);
                    gd.define('dict2', true);
                    gd.define('x:y', true);
                    break;
                case 'myYaga/core1.yaga':
                    gd.setDictionaryName('core1');
                    gd.define('core1', true);
                    break;
                case 'myYaga/core2.yaga':
                    gd.setDictionaryName('core2');
                    gd.define('core2', true);
                    break;
                case 'myYaga/dict.yaga':
                    gd.setDictionaryName('dict');
                    gd.setDictionaryDependencies(['testpath://myYaga/dict1.yaga', 'testpath://myYaga/dict2.yaga']);
                    gd.define('dict', true);
                    break;
                case 'myYaga/dict1.yaga':
                    gd.setDictionaryName('dict1');
                    gd.setDictionaryDependencies('testpath://myYaga/dict2.yaga');
                    gd.define('dict1', true);
                    break;
                case 'myYaga/dict2.yaga':
                    gd.setDictionaryName('dict2');
                    gd.define('dict2', false);
                    break;
                case 'myYaga/dict3.yaga':
                    gd.setDictionaryName('dict3');
                    gd.define('dict3', 'Hello World');
                    break;
            }
        }
    };
    let gd = yaga.Machine.GlobalDictionary.fromDescriptor(desc);
    log(gd.ids);
    gd.print(process.stdout);
    yaga.Machine.GlobalDictionary.printDictionaries(process.stdout);
    yaga.Machine.GlobalDictionary.printDictionary('dict2', process.stdout);
    log(gd.find('dict'), gd.find('core:dict2'), gd.find('core:x:y'), gd.find('core:x:y1'));
    let dict = gd.loadDictionary('testpath://myYaga/dict3.yaga');
    dict.print(process.stdout);
    log(gd.find('dict'), gd.find('core:dict2'), gd.find('core:x:y'), gd.find('core:x:y1'));
}

function testResolvePath() {
    log(yaga.Paths.resolve('path://yaga/toolbox/Influence.js'));
    yaga.Machine; // Have to force load machine to have the machine path name initialised
    log(yaga.Paths.resolve('path://yaga.machine/core.yaga'));
    log(yaga.Paths.resolve('toolbox/Influence.js'));
    log(yaga.Paths.tryResolve('toolbox1/Influence.js'));
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
            return (exc1.super(this, a, b, c) + ' ' + d);
        },
        prototype: exc
    });
    trycode(() => {
        throw exc1(10, 20, 30, 40);
    });
    let exc2 = yaga.Exception({
        name: 'my.TestException2',
        constructor(a, b, c, d) {
            this.d = d;
            return (yaga.Exception.super(exc2, this, a, b, c) + ' ' + d);
        },
        prototype: exc
    });
    trycode(() => {
        throw exc2(100, 200, 300, 400);
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

function testReplicate() {
    let o = {
        a: 1,
        b: 2,
        c: 3
    };
    let o1 = yaga.copy(o);
    log(o, o1);

    o.d = {
        x: 100,
        y: 200,
        z: 300
    };
    o1 = yaga.clone(o);
    o.d.z = 400;
    log(o, o1);

    let Private = yaga.createPrivateScope();
    Private(o).array = [1, 2, 3, 4, 5, 6];
    o1 = yaga.clone(o);
    Private(o1).array.push(7);
    log(o, Private(o));
    log(o1, Private(o1));
}

function testScopes() {
    let o = {
        a: 1,
        b: 2
    };
    let Private = yaga.createPrivateScope();
    Private(o).c = 100;
    let Private1 = yaga.createPrivateScope();
    Private1(o).c = 200;
    log(Private(o), Private1(o));
    let Private2 = yaga.createPrivateScope({
        d: 1.1
    });
    log(Private2(o), Private2(o).d);
}

function testLatePrivateProtectedAccess() {
    let inf1 = yaga.Influence({
        name: 'inf1',
        prototype: {
            get x() {
                return (inf1.private(this).x);
            },
            get y() {
                return (inf1.protected(this).y);
            },
        },
        constructor() {
            inf1.private(this).x = 1;
            inf1.protected(this).y = 2;
        },
        static: {
            set z(v) {
                inf1.static.private(this).z = v;
                inf1.static.protected(this).w = v * 2;
            },
            get z() {
                return (inf1.static.private(this).z);
            },
            get w() {
                return (inf1.static.protected(this).w);
            }
        }
    });

    let o1 = inf1.create();
    inf1.create.z = 3000;
    log(o1.x, o1.y, inf1.create.z, inf1.create.w);

    let inf2 = yaga.Influence({
        name: 'inf2',
        prototype: {
            get x() {
                return (inf2.private(this).x);
            },
            get y() {
                return (inf2.protected(this).y);
            },
        },
        constructor() {
            inf2.private(this).x = 1000000;
            inf2.protected(this).y = 2000000;
        },
        static: {
            set z(v) {
                inf2.static.private(this).z = v;
                inf2.static.protected(this).w = v * 10;
            },
            get z() {
                return (inf2.static.private(this).z);
            },
            get w() {
                return (inf2.static.protected(this).w);
            }
        }
    });

    let inf3 = yaga.Influence({
        name: 'inf3',
        composition: [inf1, inf2],
        harmonizers: {
            prototype: {
                x: inf1,
                x1() {
                    return (this.getProperty(inf2, 'x'))
                },
                y: inf2
            },
            constructor: ['.least.'],
            static: {
                z: inf1,
                z1() {
                    return (this.getProperty(inf2, 'z'))
                },
                w: inf1
            }
        }
    });
    let o3 = inf3.create();
    log(o3.x, o3.x1, o3.y, inf3.protected(o3));
    inf3.create.z = 100;
    inf3.create.z1 = 200;
    inf1.static.protected(inf3.static.object).w = 10000;
    log(inf3.create.z, inf3.create.z1, inf3.create.w);
    log(inf3.static.private(inf3.static.object), inf3.static.protected(inf3.static.object));
    log(inf1.static.private(inf3.static.object), inf2.static.private(inf3.static.object));
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

function testAbstractInfluence() {
    let myInf = yaga.Influence({
        name: 'myAbstractInf',
        abstract: {
            helloWorld() {
                console.log('Hello World');
                return (this);
            },
            protected_: {
                log() {
                    console.log('XXX', this.myval, myInf.public(this).myval)
                },
            },
        },
        static: {
            foo() {
                console.log('bar =', this.bar)
            },
            bar: 1000,
        }
    });
    log(myInf);
    trycode(() => myInf.create());
    myInf.create.foo();
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

    o.assign({
        helloWorld() {
            console.log('dlroW olleH');
            return (this);
        },
    });
    o.helloWorld();
    o = o.extend({
        helloWorld() {
            console.log('olleH dlroW');
            return (this);
        },
    });
    o.helloWorld();
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
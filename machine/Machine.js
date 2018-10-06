/**
 * yaga : @file
 * 
 * Entry module for the yaga machine
 */
"use strict";

let _ = undefined;

var Yaga = require('../Yaga');
var Mach;

var Binder = Yaga.Influence({
    name: 'yaga.machine.Binder',
    prototype: {
        thisArg_: {
            pushClosure,
            popClosure,
        }
    },
    constructor: {
        closures: _,
        curDesc: _,
        curBlock: _,
        curIdx: _,
    },
});

var MachineContext = Yaga.Influence({
    name: 'yaga.machine.Context',
    prototype: {
        thisArg_: {
            bind,
            evaluate,
            call,
            printDictionaries,
            printLoadedDictionary,
            printDictionary,
            causedErrors,
            clearErrors,
            hasErrors,
            print,
            newVariable,
            registerOperator,
            addError,
            addException,
            start,
            mustHaveStarted,
            setDictName,
            setDictDependsOn,
            printErrors,
        },
        getOperatorName,
    },
    constructor(machine, options) {
        return {
            machine,
            options: validateOptions(this, options),
            binder: Binder.create(),
            isStarted: false,
            isInitialised: false,
            gd: _,
            reader: Yaga.Reader(options.readerTable || Mach.YagaReaderTable),
            jfnAttacher: _,
            errors: [],
            operators: '',
        }
    }
});

/**
 * Create the prototype for a Yaga instance which inherits this module exports.
 * Options:
 *      readerTable: Alternate startup Yaga ReaderTable.
 *      coreDictionary: Alternate file path for the core yaga definitions.
 *      jsPrimLoader: Alternate JavaScript primitive function loader.
 *      dictionary: Path of the dictionary script to load
 *      dictionaries: Array of dictionary paths to load
 */
var Machine = Yaga.Influence({
    name: 'yaga.Machine',
    prototype: {
        bind: asMachineContext('bind'),
        evaluate: asMachineContext('evaluate'),
        call: asMachineContext('call'),
        printDictionaries: asMachineContext('printDictionaries'),
        printLoadedDictionary: asMachineContext('printLoadedDictionary'),
        printDictionary: asMachineContext('printDictionary'),
        causedErrors: asMachineContext('causedErrors'),
        clearErrors: asMachineContext('clearErrors'),
        hasErrors: asMachineContext('hasErrors'),
        print: asMachineContext('print'),
        printErrors: asMachineContext('printErrors'),
    },
    constructor(options = {}) {
        let ymc = MachineContext.create(this, options);
        Machine.private(this).context = ymc;
        ymc.start();
    }
});

module.exports = Object.freeze({
    Machine: Machine.create,
    Initialise: x => Mach = x,
});

function asMachineContext(meth) {
    return function (...args) {
        return (Machine.private(this).context[meth](...args));
    }
}

function start(ymc) {
    ymc.isStarted = true;
    if (!ymc.options.ldDesc.coreDictionary)
        ymc.options.ldDesc.coreDictionary = 'path://yaga.machine/core.yaga';
    ymc.gd = Mach.Dictionary.fromDescriptor(ymc.options.ldDesc);
    ymc.isInitialised = true;
}

function readDictionary(ymc, gd, fPath) {
    let curld = ymc.gd;
    ymc.gd = gd;
    // Before evaluating the core definitions we will need to create the '.jsPrim' macro for
    // loading JavaScript primitive functions for handling low level operations.
    if (!gd.ids['.jsPrim']) {
        let jfn = ymc.options.jsPrimLoader;
        if (!jfn) jfn = Mach.Primitives.jsPrimLoader.bind(Mach.Primitives);
        let desc = [Mach.Symbol('macro'), Mach.Symbol('jsPrim')];
        gd.define('.jsPrim', Mach.Function.Macro(desc, jfn));
    }
    let exprs = {};
    try {
        if (ymc.causedErrors(() => exprs.readExpression = ymc.reader.readFile(fPath)))
            throw Mach.Error.ReadDictionaryException(ymc.machine, `Read failed for dictionary '${fPath}'`, exprs, ymc.errors);
        if (ymc.causedErrors(() => exprs.bindExpression = ymc.bind(exprs.readExpression))) {
            throw Mach.Error.ReadDictionaryException(ymc.machine, `Bind failed for dictionary '${fPath}'`, exprs, ymc.errors);
        }
        exprs.evaluateExpression = mach.evaluate(exprs.bindExpression);
    } catch (err) {
        ymc.addException(_, err);
    }
    ymc.gd = curld;
    if (ymc.hasErrors())
        throw Mach.Error.ReadDictionaryException(ymc.machine, 'Yaga dictionary read failed', exprs, ymc.errors);
}

function validateOptions(ymc, opts) {
    let o = {
        ldDesc: {}
    }
    Yaga.dispatchPropertyHandlers(opts, {
        readerTable: prop => o[prop] = opts[prop],
        coreDictionary: prop => o.ldDesc[prop] = opts[prop],
        dictionary: prop => o.ldDesc[prop] = opts[prop],
        dictionaries: prop => o.ldDesc[prop] = opts[prop],
        jsPrimLoader: prop => validateTypedProperty((o[prop] = opts[prop], opts), prop, 'function'),
        _other_: prop => {
            throw Mach.Error.YagaException(`Invalid Machine option property '${prop}'`);
        }
    });
    o.ldDesc.fReadDictionary = (gd, fPath) => readDictionary(ymc, gd, fPath);
    return (o);
}

function validateTypedProperty(opts, prop, type) {
    if (typeof opts[prop] !== type)
        throw Mach.Error.YagaException(`Machine descriptor property '${prop}' must be a '${type}'`);
}

function mustHaveStarted(ymc) {
    if (!ymc.isStarted)
        throw Mach.Error.YagaException('Yaga machine could not be started');
}

function bind(ymc, exprs) {
    ymc.mustHaveStarted();
    // Can get one or more expressions to bind.
    // Anwsers the result of the bind(s).
    let binds = [],
        fn = x => {
            resetBinder(ymc);
            return (x.bind(ymc));
        };
    if (Array.isArray(exprs))
        exprs.forEach(expr => binds.push(doPhase(ymc, fn, expr)));
    else
        binds = doPhase(ymc, fn, exprs);
    resetBinder(ymc);
    return (binds);
}

function evaluate(exprs) {
    ymc.mustHaveStarted();
    // Can get one or more expressions to evaluate.
    // Anwsers the result of the evaluate(s).
    let result = [],
        fn = x => x.evaluate(ymc);
    if (Array.isArray(exprs))
        exprs.forEach(expr => result.push(doPhase(ymc, fn, expr)));
    else
        result = doPhase(ymc, fn, exprs);
    return (result);
}

function call(ymc, fn, ...args) {
    ymc.mustHaveStarted();
    if (!Mach.isaMachineType(fn) || !fn.isaClosure) throw Mach.Error.YagaException('Require a Yaga machine function type');
    return (fn.call(this, Mach.Wrapper.wrap(args)).nativeValue(ymc));
}

function doPhase(ymc, fn, expr) {
    try {
        return (fn(expr));
    } catch (err) {
        ymc.addException(expr, err);
    }
    return (undefined);
}


function pushClosure(binder, fnType) {
    let varMap = Object.create(binder.curDesc.varMap);
    let desc = {
        fnType: fnType,
        varMap: varMap
    };
    binder.closures.push(desc);
    binder.curDesc = desc;
    if (fnType.isaBlock) binder.curBlock = fnType;
    binder.curIdx++;
    return (varMap);
}

function popClosure(binder) {
    let closures = binder.closures;
    closures.pop();
    let desc = closures[closures.length - 1];
    if (desc.fnType.isaBlock) binder.curBlock = desc.fnType;
    binder.curDesc = desc;
    binder.curIdx--;
}

function resetBinder(ymc) {
    let binder = ymc.binder;
    binder.closures = [];
    binder.curBlock = undefined;
    binder.curDesc = {
        varMap: null
    };
    binder.curIdx = -1;
}

function newVariable(ymc, sym) {
    let binder = ymc.binder;
    if (!binder.closures || binder.closures.length == 0)
        throw Mach.Error.YagaException(sym, 'Binder is not active');
    let fnType = binder.curDesc && binder.curDesc.fnType;
    if (!fnType.isaBoundClosure)
        throw Mach.Error.BindException(sym, 'Variable must be declared within a function or block');
    return (Mach.Symbol.Variable(fnType, sym));
}

function setDictName(ymc, sName) {
    if (ymc.isInitialised || ymc.gd.dictionaryName)
        throw Mach.Error.YagaException('Dictionary name cannot be set');
    ymc.gd.setDictionaryName(sName);
}

function setDictDependsOn(ymc, paths) {
    if (ymc.isInitialised || ymc.gd.dictionaryDependencies)
        throw Mach.Error.YagaException('Dictionary dependency cannot be set');
    ymc.gd.setDictionaryDependencies(paths);
}

function printLoadedDictionary(ymc, stream = process.stdout) {
    stream.write('---------------- Yaga Machine Loaded Dictionary ----------------\n');
    ymc.gd.print(stream, (v, indent) => print(v, stream, indent));
}

function printDictionaries(ymc, stream = process.stdout) {
    stream.write('---------------- All Dictionaries ----------------\n');
    ymc.gd.printDictionaries(stream, (v, indent) => print(v, stream, indent));
}

function printDictionary(ymc, stream = process.stdout, name) {
    stream.write('---------------- Dictionary ----------------\n');
    ymc.gd.printDictionary(name, stream, (v, indent) => print(v, stream, indent));
}

function registerOperator(ymc, sOp, wrap) {
    for (let i = 0; i < sOp.length; i++) {
        if (!ymc.operators.includes(sOp[i])) ymc.operators += sOp[i];
    }
    sOp = getOperatorName(sOp);
    ymc.gd.define(sOp, wrap);
    return (sOp);
}

function getOperatorName(sOp) {
    return (`..<${sOp}>..`);
}

function print(ymc, exprs, stream, initIndent = 0) {
    if (!stream) stream = process.stdout;
    let indent, length, extra,
        maxIndent = ' '.repeat(32);
    let printer = {
        printExpression(expr) {
            if (_isaYagaType(expr)) expr.print(this);
            else this.printElement(String(expr));
            return (this);
        },
        printChars(chs) {
            if (length + chs.length > 80) {
                stream.write('\n');
                length = initIndent;
                if (indent > 0) {
                    let s = indent > maxIndent.length ? maxIndent : maxIndent.substr(0, indent);
                    length += s.length;
                    stream.write(s);
                }
            }
            length += chs.length;
            stream.write(chs);
            extra = undefined;
            return (this);
        },
        printTrail(str) {
            this.printChars(str);
            extra = ' ';
            return (this);
        },
        printLead(str) {
            if (extra) this.printChars(extra);
            this.printChars(str);
            return (this);
        },
        printElement(str) {
            this.printLead(str);
            extra = ' ';
            return (this);
        },
        increaseIndent(n) {
            indent += n;
            return (this);
        },
        decreaseIndent(n) {
            indent -= n;
            return (this);
        },
        reset() {
            indent = initIndent;
            length = initIndent;
            extra = '';
            return (this);
        }
    };

    function newline() {
        stream.write('\n');
        return (newline);
    }

    function noNewline() {
        return (newline);
    };

    let nl = noNewline;
    if (!Array.isArray(exprs)) exprs = [exprs];
    exprs.forEach((xs) => {
        nl = nl();
        let nl1 = noNewline;
        if (!Array.isArray(xs)) xs = [xs];
        xs.forEach((expr) => {
            nl1 = nl1();
            printer
                .reset()
                .printExpression(expr);
        });
    });
    stream.write('\n');
}

function addError(ymc, e, msg, attach) {
    ymc.errors.push(Mach.Error(e, msg, attach))
    return (ymc);
}

function addException(ymc, e, excp) {
    if (e === undefined && excp) e = excp.element;
    let msg = `${excp.name}: ${excp.message}`;
    ymc.errors.push(Mach.Error(e, msg, excp))
}

function clearErrors(ymc) {
    ymc.errors = [];
    return (ymc);
}

function hasErrors(ymc) {
    return (ymc.errors.length > 0);
}

function causedErrors(ymc, fn) {
    let errCount = ymc.errors.length;
    fn();
    return (errCount < ymc.errors.length);
}

function printErrors(ymc, stream) {
    let errors = ymc.errors;
    if (!Array.isArray(errors)) return;
    if (!stream) stream = process.stdout;
    errors.forEach((err) => {
        stream.write(`=> ${err.formattedMessage()}\n`);
        let attach = err.attachment;
        if (attach) {
            if (attach instanceof Error) {
                stream.write(attach.stack);
            } else {
                stream.write(`    ${String(attach)}`);
            }
            stream.write('\n\n');
        }
    });
}
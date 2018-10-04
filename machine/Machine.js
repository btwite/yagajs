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
            ld: _,
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
        let mc = MachineContext.create(this, options);
        Machine.private(this).context = mc;
        mc.start();
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

function start(mc) {
    mc.isStarted = true;
    if (!mc.options.ldDesc.coreDictionary)
        mc.options.ldDesc.coreDictionary = 'path://yaga.machine/core.yaga';
    mc.ld = Mach.Dictionary.fromDescriptor(mc.options.ldDesc);
    mc.isInitialised = true;
}

function readDictionary(mc, ld, fPath) {
    let curld = mc.ld;
    mc.ld = ld;
    // Before evaluating the core definitions we will need to create the '.jsPrim' macro for
    // loading JavaScript primitive functions for handling low level operations.
    if (!ld.ids['.jsPrim']) {
        let jfn = mc.options.jsPrimLoader;
        if (!jfn) jfn = Mach.Primitives.jsPrimLoader.bind(Mach.Primitives);
        let desc = [Mach.Symbol('macro'), Mach.Symbol('jsPrim')];
        ld.define('.jsPrim', Mach.Function.Macro(desc, jfn));
    }
    let exprs = {};
    try {
        if (mc.causedErrors(() => exprs.readExpression = mc.reader.readFile(fPath)))
            throw Mach.Error.ReadDictionaryException(mc.machine, `Read failed for dictionary '${fPath}'`, exprs, mc.errors);
        if (mc.causedErrors(() => exprs.bindExpression = mc.bind(exprs.readExpression))) {
            throw Mach.Error.ReadDictionaryException(mc.machine, `Bind failed for dictionary '${fPath}'`, exprs, mc.errors);
        }
        exprs.evaluateExpression = mach.evaluate(exprs.bindExpression);
    } catch (err) {
        mc.addException(_, err);
    }
    if (mc.hasErrors())
        throw Mach.Error.ReadDictionaryException(mc.machine, 'Yaga dictionary read failed', exprs, mc.errors);
    mc.ld = curld;
}

function validateOptions(mc, opts) {
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
    o.ldDesc.fReadDictionary = (ld, fPath) => readDictionary(mc, ld, fPath);
    return (o);
}

function validateTypedProperty(opts, prop, type) {
    if (typeof opts[prop] !== type)
        throw Mach.Error.YagaException(`Machine descriptor property '${prop}' must be a '${type}'`);
}

function mustHaveStarted(mc) {
    if (!mc.isStarted)
        throw Mach.Error.YagaException('Yaga machine could not be started');
}

function bind(mc, exprs) {
    mc.mustHaveStarted();
    // Can get one or more expressions to bind.
    // Anwsers the result of the bind(s).
    let binds = [],
        fn = x => {
            resetBinder(mc);
            return (x.bind(mc));
        };
    if (Array.isArray(exprs))
        exprs.forEach(expr => binds.push(doPhase(mc, fn, expr)));
    else
        binds = doPhase(mc, fn, exprs);
    resetBinder(mc);
    return (binds);
}

function evaluate(exprs) {
    mc.mustHaveStarted();
    // Can get one or more expressions to evaluate.
    // Anwsers the result of the evaluate(s).
    let result = [],
        fn = x => x.evaluate(mc);
    if (Array.isArray(exprs))
        exprs.forEach(expr => result.push(doPhase(mc, fn, expr)));
    else
        result = doPhase(mc, fn, exprs);
    return (result);
}

function call(mc, fn, ...args) {
    mc.mustHaveStarted();
    if (!Mach.isaMachineType(fn) || !fn.isaClosure) throw Mach.Error.YagaException('Require a Yaga machine function type');
    return (fn.call(this, Mach.Wrapper.wrap(args)).nativeValue(mc));
}

function doPhase(mc, fn, expr) {
    try {
        return (fn(expr));
    } catch (err) {
        mc.addException(expr, err);
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

function resetBinder(mc) {
    let binder = mc.binder;
    binder.closures = [];
    binder.curBlock = undefined;
    binder.curDesc = {
        varMap: null
    };
    binder.curIdx = -1;
}

function newVariable(mc, sym) {
    let binder = mc.binder;
    if (!binder.closures || binder.closures.length == 0)
        throw Mach.Error.YagaException(sym, 'Binder is not active');
    let fnType = binder.curDesc && binder.curDesc.fnType;
    if (!fnType.isaBoundClosure)
        throw Mach.Error.BindException(sym, 'Variable must be declared within a function or block');
    return (Mach.Symbol.Variable(fnType, sym));
}

function setDictName(mc, sName) {
    if (mc.isInitialised || mc.ld.dictionaryName)
        throw Mach.Error.YagaException('Dictionary name cannot be set');
    mc.ld.setDictionaryName(sName);
}

function setDictDependsOn(mc, paths) {
    if (mc.isInitialised || mc.ld.dictionaryDependencies)
        throw Mach.Error.YagaException('Dictionary dependency cannot be set');
    mc.ld.setDictionaryDependencies(paths);
}

function printLoadedDictionary(mc, stream = process.stdout) {
    stream.write('---------------- Yaga Machine Loaded Dictionary ----------------\n');
    mc.ld.print(stream, (v, indent) => print(v, stream, indent));
}

function printDictionaries(mc, stream = process.stdout) {
    stream.write('---------------- All Dictionaries ----------------\n');
    mc.ld.printDictionaries(stream, (v, indent) => print(v, stream, indent));
}

function printDictionary(mc, stream = process.stdout, name) {
    stream.write('---------------- Dictionary ----------------\n');
    mc.ld.printDictionary(name, stream, (v, indent) => print(v, stream, indent));
}

function registerOperator(mc, sOp, wrap) {
    for (let i = 0; i < sOp.length; i++) {
        if (!mc.operators.includes(sOp[i])) mc.operators += sOp[i];
    }
    sOp = getOperatorName(sOp);
    mc.ld.define(sOp, wrap);
    return (sOp);
}

function getOperatorName(sOp) {
    return (`..<${sOp}>..`);
}

function print(mc, exprs, stream, initIndent = 0) {
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

function addError(mc, e, msg, attach) {
    mc.errors.push(Mach.Error(e, msg, attach))
    return (mc);
}

function addException(mc, e, excp) {
    if (e === undefined && excp) e = excp.element;
    let msg = `${excp.name}: ${excp.message}`;
    mc.errors.push(Mach.Error(e, msg, excp))
}

function clearErrors(mc) {
    mc.errors = [];
    return (mc);
}

function hasErrors(mc) {
    return (mc.errors.length > 0);
}

function causedErrors(mc, fn) {
    let errCount = mc.errors.length;
    fn();
    return (errCount < mc.errors.length);
}

function printErrors(mc, stream) {
    let errors = mc.errors;
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
/**
 * yaga : @file
 * 
 * Entry module for the yaga machine
 */
"use strict";

let _ = undefined;

var Yaga = require('../Yaga');

var Binder = Yaga.Influence({
    name: 'yaga.Machine',
    prototype: {
        pushClosure: _pushClosure,
        popClosure: _popClosure,
    }
});

/**
 * Create the prototype for a Yaga instance which inherits this module exports.
 * Options:
 *      yagaCorePath: Alternate file path for the core yaga definitions.
 *      jsPrimLoader: Alternate JavaScript primitive function loader.
 *      dictionaryPath: Path of the dictionary script to load
 */
var Machine = Yaga.Influence({
    name: 'yaga.Machine',
    prototype: {
        evaluateDictionary: _evaluateDictionary,
        bind: _bind,
        evaluate: _evaluate,
        call: _call,
        newVariable: _newVariable,
        printDictionaries: _printDictionaries,
        setDictName: _setDictName,
        setDictDependsOn: _setDictDependsOn,
        registerOperator: _registerOperator,
        getOperatorName: _getOperatorName,
        binder: {
            closures: undefined,
            curDesc: undefined,
            curBlock: undefined,
            curIdx: undefined,
        },
        causedErrors: _causedErrors,
        addError: _addError,
        addException: _addException,
        clearErrors: _clearErrors,
        hasErrors: _hasErrors,
        print: _print,
    },
    constructor(options = {}) {
        yi._options = options;
        yi.parser = yaga.Parser.new(yi);
        yi.dictionary = yaga.Dictionary.load(yi, options.dictionaryPath);
        if (yi.hasErrors()) {
            throw yaga.errors.YagaException(undefined, 'Dictionary load failed', yi._errors);
        }
        yi.isInitialised = true;
        return {
            isInitialised: false,
            dictionary: undefined,
            parser: undefined,
            _options: undefined,
            _jfnAttacher: undefined,
            _errors: [],
            _operators: '',
        }
    }
});
Object.defineProperty(_instance, 'printErrors', {
    value(...args) {
        _printErrors(this._errors, ...args);
    }
})

let _exports = {
    Instance: {
        new: _newYagaInstance,
    },
};
module.exports = yaga = _exports;

Object.freeze(_exports);

function _bind(exprs) {
    // Can get one or more expressions to bind.
    // Anwsers the result of the bind(s).
    let binds = [],
        fn = x => {
            _resetBinder(this);
            return (x.bind(this));
        };
    if (Array.isArray(exprs)) {
        exprs.forEach(expr => binds.push(_doPhase(this, fn, expr)));
    } else {
        binds = _doPhase(this, fn, exprs);
    }
    _resetBinder(this);
    return (binds);
}

function _evaluate(exprs) {
    // Can get one or more expressions to evaluate.
    // Anwsers the result of the evaluate(s).
    let result = [],
        fn = x => x.evaluate(this);
    if (Array.isArray(exprs)) {
        exprs.forEach(expr => result.push(_doPhase(this, fn, expr)));
    } else {
        result = _doPhase(this, fn, exprs);
    }
    return (result);
}

function _call(fn, ...args) {
    if (!_isaYagaType(fn) || !fn.isaClosure) throw yaga.errors.YagaException(undefined, 'Require a Yaga function type');
    return (fn.call(this, yaga.Wrapper.wrap(args)).nativeValue(this));
}

function _doPhase(yi, fn, expr) {
    try {
        return (fn(expr));
    } catch (err) {
        yi.addException(expr, err);
    }
    return (undefined);
}


function _pushClosure(fnType) {
    let varMap = Object.create(this.curDesc.varMap);
    let desc = {
        fnType: fnType,
        varMap: varMap
    };
    this.closures.push(desc);
    this.curDesc = desc;
    if (fnType.isaBlock) this.curBlock = fnType;
    this.curIdx++;
    return (varMap);
}

function _popClosure() {
    let closures = this.closures;
    closures.pop();
    let desc = closures[closures.length - 1];
    if (desc.fnType.isaBlock) this.curBlock = desc.fnType;
    this.curDesc = desc;
    this.curIdx--;
}

function _resetBinder(yi) {
    let binder = yi.binder;
    binder.closures = [];
    binder.curBlock = undefined;
    binder.curDesc = {
        varMap: null
    };
    binder.curIdx = -1;
}

function _newVariable(sym) {
    let binder = this.binder;
    if (!binder.closures || binder.closures.length == 0) {
        throw yaga.errors.YagaException(sym, 'Binder is not active');
    }
    let fnType = binder.curDesc && binder.curDesc.fnType;
    if (!fnType.isaBoundClosure) {
        throw yaga.errors.BindException(sym, 'Variable must be declared within a function or block');
    }
    return (yaga.Symbol.Variable.new(fnType, sym));
}

function _resetContext(yi) {
    let ctxt = yi.context;
    ctxt.closures = [];
    ctxt.curClosure = undefined;
    ctxt.argLists = undefined;
}

function _evaluateDictionary(dict, path) {
    let curDict = this.dictionary;
    this.dictionary = dict;
    try {
        let exprs;
        if (this.causedErrors(() => exprs = yaga.Parser.new(this).parseFile(path))) {
            throw yaga.errors.YagaException(undefined, `Parse failed for '${path}'`, this._errors);
        }
        if (this.causedErrors(() => exprs = this.bind(exprs))) {
            throw yaga.errors.YagaException(undefined, `Parse failed for '${path}'`, this._errors);
        }
        this.evaluate(exprs);
    } catch (err) {
        this.addException(undefined, err);
    }
    this.dictionary = curDict;
}

function _setDictName(sName) {
    if (this.isInitialised || this.dictionary.name) {
        throw yaga.errors.YagaException(undefined, `Dictionary name cannot be set`);
    }
    this.dictionary.setName(this, sName);
}

function _setDictDependsOn(sPath, sMod) {
    if (this.isInitialised || this.dictionary.parent !== yaga.Dictionary.core()) {
        throw yaga.errors.YagaException(undefined, `Dictionary dependency cannot be set`);
    }
    this.dictionary.setDependsOn(this, sPath, sMod);
}

function _printDictionaries(stream) {
    if (!stream) stream = process.stdout;
    stream.write('---------------- Loaded Dictionaries ----------------\n');
    this.dictionary.printAll(this, stream);
}

function _registerOperator(sOp, wrap) {
    for (let i = 0; i < sOp.length; i++) {
        if (!this._operators.includes(sOp[i])) this._operators += sOp[i];
    }
    sOp = _getOperatorName(sOp);
    this.dictionary.define(sOp, wrap);
    return (sOp);
}

function _getOperatorName(sOp) {
    return (`..<${sOp}>..`);
}

function _print(exprs, stream, initIndent = 0) {
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

function _addError(e, msg, attach) {
    this._errors.push(yaga.errors.Error(e, msg, attach))
    return (this);
}

function _addException(e, excp) {
    if (e === undefined && excp) e = excp.element;
    let msg = `${excp.name}: ${excp.message}`;
    this._errors.push(yaga.errors.Error(e, msg, excp))
}

function _clearErrors() {
    this._errors = [];
    return (this);
}

function _hasErrors() {
    return (this._errors.length > 0);
}

function _causedErrors(fn) {
    let errCount = this._errors.length;
    fn();
    return (errCount < this._errors.length);
}
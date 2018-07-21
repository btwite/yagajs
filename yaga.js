/**
 * yaga : @file
 * 
 * Entry module for the yaga machine
 * 
 */
"use strict";

let yaga;
let _exports = {
    Instance: {
        new: _newYagaInstance,
    },
    resolveFileName: _resolveFileName,
    getParserPoint: _getParserPoint,
    bindValue: _bindValue,
    evaluateValue: _evaluateValue,
    isaYagaType: _isaYagaType,
    isCallable: _isCallable,
    isaMacro: _isaMacro,
    isaFunction: _isaFunction,
    isaList: _isaList,
    assignParameters: _assignParameters,
    newVariable: _newVariable,
};
module.exports = yaga = _exports;

_exports.StringBuilder = require('./StringBuilder');
_exports.Symbol = require('./Symbol');
_exports.Dictionary = require('./Dictionary');
_exports.Parser = require('./Parser');
_exports.errors = require('./errors');
_exports.List = require('./List');
_exports.Wrapper = require('./Wrapper');
_exports.Primitives = require('./Primitives');
_exports.Function = require('./Function');

Object.freeze(_exports);

/**
 * Initiialise each module if they have provided an Initialise method.
 */
_runInitPhase('Initialise', _exports);
/**
 * Initiialise each module if they have provided a PostInitialise method.
 * This is provided to allow modules to run initialisation processes that require
 * access to other library services not just the library reference.
 */
_runInitPhase('PostInitialise');

/**
 * Create the prototype for a Yaga instance which inherits this module exports.
 * Options:
 *      yagaCorePath: Alternate file path for the core yaga definitions.
 *      jsPrimLoader: Alternate JavaScript primitive function loader.
 */
function _newYagaInstance(optDictPath, options = {}) {
    let yi = Object.create(_instance);
    yi._options = options;
    // ......
    yi.dictionary = yaga.Dictionary.load(yi, optDictPath);
    return (yi);
}

function _resolveFileName(sFile, optModule) {
    let path = require('path');
    if (sFile.includes(path.sep)) return (sFile);
    let mod = optModule ? optModule : module;
    return (path.dirname(mod.filename) + path.sep + sFile);
}

var _instance = Object.assign(Object.create(_exports), {
    typeName: 'YagaInstance',
    dictionary: undefined,
    evaluateDictionary: _evaluateDictionary,
    bind: _bind,
    binder: {
        closures: undefined,
        curDesc: undefined,
        curBlock: undefined,
        curIdx: undefined,
        pushClosure(fnType) {
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
        },
        popClosure() {
            let closures = this.closures;
            closures.pop();
            let desc = closures[closures.length - 1];
            if (desc.fnType.isaBlock) this.curBlock = desc.fnType;
            this.curDesc = desc;
            this.curIdx--;
        },
    },
    context: {
        closures: undefined,
        curClosure: undefined,
        argLists: undefined,
    },
    addError: _addError,
    addException: _addException,
    printErrors: _printErrors,
    clearErrors: _clearErrors,
    hasErrors: _hasErrors,
    _options: undefined,
    _jfnAttacher: undefined,
    _errors: [],
    print: _print,
});

function _bind(exprs) {
    // Can get one or more expressions to bind.
    // Anwsers the result of the bind(s).
    let binds;
    if (Array.isArray(exprs)) {
        let binds = [];
        exprs.forEach((expr) => {
            binds.push(_bindExpr(this, expr));
        });
    } else {
        binds = _bindExpr(this, exprs);
    }
    _resetBinder(yi);
    return (binds);
}

function _bindExpr(yi, expr) {
    if (!expr || !expr.isaYagaType) return (expr);
    _resetBinder(yi);
    try {
        return (expr.bind(yi));
    } catch (err) {
        this.addException(expr, err);
    }
    return (undefined);
}

function _bindValue(yi, e) {
    if (e && e.isYagaType) return (e.bind(yi));
    return (e);
}

function _assignParameters(parms) {
    if (!parms || !Array.isArray(parms) || parms.length == 0) return;
    let binder = yi.binder;
    if (!binder.closures || binder.closures.length == 0) {
        throw yaga.errors.YagaException(parms[0], 'Binder is not active');
    }
    let fnType = binder.curDesc && binder.curDesc.fnType;
    if (!fnType || !fnType.isaBlock) {
        throw yaga.errors.BindException(parms[0], 'Parameters can only be assigned to a block');
    }
    if (fnType.parms) {
        throw yaga.errors.BindException(parms[0], 'Parameters have already been assigned to the block');
    }
    if (!fnType.isaBoundBlock) {
        throw yaga.errors.InternalException('Attempting to assign parameters to unbound block');
    }
    if (fnType.scope.variables.length > 0) {
        throw yaga.errors.BindException(parms[0], 'Parameters must be declared prior to variables');
    }
    fnType.assignParameters(this, parms);
}

function _newVariable(sym) {
    let binder = yi.binder;
    if (!binder.closures || binder.closures.length == 0) {
        throw yaga.errors.YagaException(sym, 'Binder is not active');
    }
    let fnType = binder.curDesc && binder.curDesc.fnType;
    if (!fnType.isaBoundClosure) {
        throw yaga.errors.BindException(sym, 'Variable must be declared within a function or block');
    }
    return (yaga.Symbol.Variable.new(fnType, sym));
}

function _evaluateValue(yi, e) {
    if (e && e.isYagaType) return (e.evaluate(yi));
    return (e);
}

function _isaYagaType(e) {
    return (e && e.isYagaType);
}

function _isCallable(e) {
    return ((_isaYagaType(e) && e.isaClosure) || (typeof head === 'function'));
}

function _isaMacro(e) {
    return ((_isaYagaType(e) && e.isaMacro));
}

function _isaFunction(e) {
    return ((_isaYagaType(e) && e.isaFunction));
}

function _isaList(e) {
    return ((_isaYagaType(e) && e.isaList));
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

function _resetContext(yi) {
    let ctxt = yi.context;
    ctxt.closures = [];
    ctxt.curClosure = undefined;
    ctxt.argLists = undefined;
}

function _evaluateDictionary(dict, path) {
    let curDict = this.dictionary;
    this.dictionary = dict;

    console.log(`Evaluate dictionary '${path}'`);
    // .....
    this.dictionary = curDict;
    return (undefined);
}

function _getParserPoint(e) {
    if (e === undefined || e === null) return (yaga.Parser.defaultParserPoint);
    if (!e.isaYagaType && !e.parserPoint) return (yaga.Parser.defaultParserPoint);
    if (e.isaParserPoint) return (e);
    return (e.parserPoint);
}

function _print(stream, ...set) {
    if (set.length == 0) return;
    let indent, length, extra,
        maxIndent = ' '.repeat(32);
    let printer = {
        printExpression(expr) {
            if (expr.isaYagaType) expr.print(this);
            else this.printElement(String(expr));
            return (this);
        },
        printChars(chs) {
            if (length + chs.length > 80) {
                stream.write('\n');
                length = 0;
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
            indent = 0;
            length = 0;
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
    set.forEach((exprs) => {
        nl = nl();
        let nl1 = noNewline;
        exprs.forEach((expr) => {
            nl1 = nl1();
            printer
                .reset()
                .printExpression(expr);
        });
    });
}

function _addError(e, msg, attach) {
    this._errors.push(yaga.errors.Error(e, msg, attach))
    return (this);
}

function _addException(e, excp) {
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

function _printErrors(stream) {
    if (!stream) stream = process.stdout;
    this._errors.forEach((err) => {
        stream.write(`=> ${err.formattedMessage()}\n`);
        let attach = err.attachment;
        if (attach) {
            if (attach instanceof Error) {
                stream.write(attach.stack);
            } else {
                stream.write(`    ${String(attach)}`);
            }
        }
    });
}

function _runInitPhase(sPhase, ...args) {
    Object.keys(_exports).forEach(sProp => {
        let prop = _exports[sProp];
        if (typeof prop === 'object' && typeof prop[sPhase] === 'function') {
            prop[sPhase](...args);
        }
    });
}
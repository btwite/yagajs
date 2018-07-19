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
_exports.Functions = require('./Functions');

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
    addError: _addError,
    printErrors: _printErrors,
    clearErrors: _clearErrors,
    hasErrors: _hasErrors,
    _options: undefined,
    _jfnAttacher: undefined,
    _errors: [],
    print: _print,
});

function _evaluateDictionary(dict, path) {
    let curDict = this.dictionary;
    this.dictionary = dict;

    console.log(`Evaluate dictionary '${path}'`);
    // .....
    this.dictionary = curDict;
    return (undefined);
}

function _getParserPoint(e) {
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
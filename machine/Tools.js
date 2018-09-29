/**
 * Tools : @file
 * 
 * Various helper functions for the Yaga Machine
 */
"use strict";

let _ = undefined;

var Yaga = require('../Yaga');

module.exports = Object.freeze({
    isaMachineType,
    isCallable,
    assignParameters,
    getReadPoint,
    printErrors,
    Initialise: x => exps = x,
});

function isaMachineType(e) {
    return (e && e.isaMachineType);
}

function isCallable(e) {
    return (e.isaClosure || (typeof e === 'function'));
}

function assignParameters(mi, parms) {
    if (!parms || !Array.isArray(parms) || parms.length == 0) return;
    let binder = mi.binder;
    if (!binder.closures || binder.closures.length == 0) {
        throw exps.Error.YagaException(parms[0], 'Binder is not active');
    }
    let fnType = binder.curDesc && binder.curDesc.fnType;
    if (!fnType || !fnType.isaBlock) {
        throw exps.Error.BindException(parms[0], 'Parameters can only be assigned to a block');
    }
    if (fnType.parms) {
        throw exps.Error.BindException(parms[0], 'Parameters have already been assigned to the block');
    }
    if (!fnType.isaBoundBlock) {
        throw exps.Error.InternalException('Attempting to assign parameters to unbound block');
    }
    if (fnType.scope.variables.length > 0) {
        throw exps.Error.BindException(parms[0], 'Parameters must be declared prior to variables');
    }
    fnType.assignParameters(this, parms);
}

function getReadPoint(e) {
    if (e === undefined || e === null) return (Yaga.ReadPoint.default);
    if (e.isaMachineType) {
        return (e.readPoint ? e.readPoint : Yaga.ReadPoint.default);
    }
    if (e.isaReadPoint) return (e);
    return (Yaga.ReadPoint.default);
}

function printErrors(errors, stream) {
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

function _installGrammarExtensions() {
    if (String.prototype['_']) return;
    let yi = yaga.Instance.new({
        dictionaryPath: _resolveFileName('exprjs.yaga'),
    });
    let exprMap = new Map();
    String.prototype['_'] = function (...args) {
        try {
            yi.clearErrors();
            let fn = exprMap.get(this);
            if (!fn) {
                let str, l = this.length;
                if (l == 0 || this[0] != '(' || this[l - 1] != ')') str = `(${this})`;
                let e = yi.parser.parseString(str)
                if (yi.hasErrors()) throw exps.Error.YagaException(undefined, 'Expression parse failed', yi._errors);
                fn = e.bind(yi);
                if (yi.hasErrors()) throw exps.Error.YagaException(undefined, 'Expression bind failed', yi._errors);
                exprMap.set(this, (fn = fn.nativeValue(yi)));
            }
            return (fn(...args));
        } catch (err) {
            if (yi.hasErrors()) {
                if (err.isaYagaException && err.errors) throw err;
                throw exps.Error.YagaException(undefined, err.message, yi._errors);
            }
            throw err;
        }
    }
}
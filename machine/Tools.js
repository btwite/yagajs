/**
 * Tools : @file
 * 
 * Various helper functions for the Yaga Machine
 */
"use strict";

let _ = undefined;

var Yaga = require('../Yaga');
var Mach;

module.exports = Object.freeze({
    isaMachineType,
    isCallable,
    assignParameters,
    getReadPoint,
    Initialise: x => Mach = x,
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
        throw Mach.Error.YagaException(parms[0], 'Binder is not active');
    }
    let fnType = binder.curDesc && binder.curDesc.fnType;
    if (!fnType || !fnType.isaBlock) {
        throw Mach.Error.BindException(parms[0], 'Parameters can only be assigned to a block');
    }
    if (fnType.parms) {
        throw Mach.Error.BindException(parms[0], 'Parameters have already been assigned to the block');
    }
    if (!fnType.isaBoundBlock) {
        throw Mach.Error.InternalException('Attempting to assign parameters to unbound block');
    }
    if (fnType.scope.variables.length > 0) {
        throw Mach.Error.BindException(parms[0], 'Parameters must be declared prior to variables');
    }
    fnType.assignParameters(this, parms);
}

function getReadPoint(e) {
    if (e === undefined || e === null) return (Yaga.Reader.ReadPoint.default);
    if (e.isaMachineType) {
        return (e.readPoint ? e.readPoint : Yaga.Reader.ReadPoint.default);
    }
    if (e.isaReadPoint) return (e);
    return (Yaga.Reader.ReadPoint.default);
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
                if (yi.hasErrors()) throw Mach.Error.YagaException(undefined, 'Expression parse failed', yi._errors);
                fn = e.bind(yi);
                if (yi.hasErrors()) throw Mach.Error.YagaException(undefined, 'Expression bind failed', yi._errors);
                exprMap.set(this, (fn = fn.nativeValue(yi)));
            }
            return (fn(...args));
        } catch (err) {
            if (yi.hasErrors()) {
                if (err.isaYagaException && err.errors) throw err;
                throw Mach.Error.YagaException(undefined, err.message, yi._errors);
            }
            throw err;
        }
    }
}
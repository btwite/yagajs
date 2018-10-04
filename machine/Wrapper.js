/**
 * Wrapper : @file
 * 
 * Simple wrapper object to contain JavaScript types that can not handle property requests.
 */

'use strict';

module.exports = {
    Wrapper: () => 'Wrapper',
};
return;

var yaga, _wrapper;

module.exports = {
    new: _newWrapper,
    wrap: _wrap,
    Initialise: y => yaga = yaga ? yaga : y,
    PostInitialise: () => yaga.newType(_wrapper),
};
Object.freeze(module.exports);

function _newWrapper(val, optPoint) {
    let ty = typeof val;
    if (ty === 'function') return (yaga.Function.jsNewNative(val));
    if (yaga.isaYagaType(val)) return (val);
    let wrap = Object.create(_wrapper);
    if ((wrap.typeName = ty) === 'string') wrap.isaString = true;
    if (val !== undefined) wrap._value = val;
    if (optPoint)
        wrap.parserPoint = optPoint;
    return (wrap);
}

function _wrap(es) {
    let arr = [];
    for (let i = 0; i < es.length; i++) es[i] = _newWrapper(arr[i]);
    return (es);
}

_wrapper = {
    typeName: 'Wrapper',
    isaWrapper: true,
    parserPoint: undefined,
    asQuoted: _returnThis,
    asQuasiQuoted: _returnThis,
    asQuasiOverride: _returnThis,
    asQuasiInjection: _returnThis,
    referenceList: undefined,
    value() {
        return (this._value);
    },
    nativeValue() {
        return (this._value);
    },
    asString() {
        return (String(this._value));
    },
    _value: undefined,
    bind: _returnThis,
    evaluate: _returnThis,
    print(printer) {
        if (this.referenceList) this.referenceList.print(printer);
        else printer.printElement(String(this._value));
    }
};

function _returnThis() {
    return (this);
}
/**
 * Wrapper : @file
 * 
 * Simple wrapper object to contain JavaScript types that can not handle property requests.
 */

'use strict';

var yaga;

module.exports = {
    new: _newWrapper,
    Initialise: (y) => {
        yaga = yaga ? yaga : y;
    }
};
Object.freeze(module.exports);

function _newWrapper(val, optPoint) {
    let wrap = Object.create(_wrapper);
    if (val !== undefined) wrap.value = val;
    if (optPoint)
        wrap.parserPoint = optPoint;
    return (wrap);
}

var _wrapper = {
    typeName: 'Wrapper',
    isaYagaType: true,
    parserPoint: undefined,
    asQuoted: _returnThis,
    asQuasiQuoted: _returnThis,
    asQuasiOverride: _returnThis,
    asQuasiInjection: _returnThis,
    value: undefined,
    bind(yi) {
        /* Add code here */
    },
    evaluate(yi) {
        return (this);
    },
    print(printer) {
        printer.printElement(String(this.value));
    }
};

function _returnThis() {
    return (this);
}
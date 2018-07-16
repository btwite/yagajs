/**
 * Symbol : @file
 * 
 * Yaga symbol objects.
 * 
 */

'use strict';

var yaga;

module.exports = {
    new: _newSymbol,
    Quoted: {
        new: _newQuotedSymbol,
    },
    Initialise: (y) => {
        yaga = yaga ? yaga : y;
    }
};
Object.freeze(module.exports);

let _symbols = {};

function _newSymbol(symName) {
    let sym = _symbols[symName];
    if (!sym) {
        _symbols[symName] = sym = Object.create(_symbol);
        sym._name = symName;
    }
    return (sym);
}

function _newQuotedSymbol(symName) {
    let sym = Object.create(_newSymbol(symName));
    sym.typeName = 'QuotedSymbol';
    sym.bind = function () {
        return (Object.getPrototypeOf(sym));
    };
    sym.evaluate = function () {
        throw new yaga.errors.InternalException("'evaluate' method unsupported for QuotedSymbol");
    }
}

var _symbol = {
    typeName: 'Symbol',
    _name: '<Unknown>',
    isListorAtom: true,
    bind() {
        /* Add code here */
    },
    evaluate() {
        return (this);
    },
    asString() {
        return (this._name);
    },
    print(stream) {
        return (stream.write(this._name));
    }
}
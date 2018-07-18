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
    Initialise: (y) => {
        yaga = yaga ? yaga : y;
    },
    PostInitialise: () => {
        _symbol.parserPoint = yaga.Parser.defaultParserPoint;
    },
};
Object.freeze(module.exports);

function _newSymbol(symName, optPoint) {
    if (typeof symName !== 'string') symName = symName.toString(); // Handle StringBuilder case.
    let sym = Object.create(_symbol);
    sym._name = symName;
    sym.reference = sym;
    if (optPoint)
        sym.parserPoint = optPoint;
    return (sym);
}

var _symbol = {
    typeName: 'Symbol',
    _name: '<Unknown>',
    isaListOrAtom: true,
    parserPoint: undefined,
    reference: undefined,
    asQuoted: _asQuoted,
    asQuasiQuoted: _asQuasiQuoted,
    asQuasiOverride: _asQuasiOverride,
    isQuoted: false,
    isQuasiOverride: false,
    isAtInjected: false,
    bind(yi) {
        /* Add code here */
    },
    evaluate(yi) {
        return (this);
    },
    asString() {
        return (this._name);
    },
    print(stream) {
        return (stream.write(this._name));
    }
};

function _asQuoted() {
    let sym = Object.create(this);
    sym.typeName = 'QuotedSymbol';
    sym.isQuoted = true;
    sym.bind = function (yi) {
        return (Object.getPrototypeOf(sym));
    };
    sym.evaluate = function (yi) {
        throw new yaga.errors.InternalException("'evaluate' method unsupported for QuotedSymbol");
    }
    return (sym);
}

function _asQuasiQuoted() {
    let sym = this.asQuoted();
    sym.evaluate = function (yi) {
        throw new yaga.errors.InternalException("'evaluate' method unsupported for QuasiQuotedSymbol");
    }
    return (sym);
}

// May change bind so that parent list is passed to handle quasi overrides rather than the parent having
// to check every element.
function _asQuasiOverride(flAtOp) {
    let sym = Object.create(this);
    sym.typeName = 'QuotedSymbol';
    sym.isQuasiOverride = true;
    sym.isAtInjected = flAtOp;
    sym.bind = function (yi) {
        return (Object.getPrototypeOf(this).bind(yi))
    };
    sym.evaluate = function (yi) {
        throw new yaga.errors.InternalException("'evaluate' method unsupported for QuasiOverrideSymbol");
    }
    return (sym);
}
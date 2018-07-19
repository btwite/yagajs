/**
 * Symbol : @file
 * 
 * Yaga symbol objects.
 */

'use strict';

var yaga;

module.exports = {
    new: _newSymbol,
    none: _none,
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
    sym.value = symName;
    sym.reference = sym;
    if (optPoint)
        sym.parserPoint = optPoint;
    return (sym);
}

function _none(optPoint) {
    let none = _newsymbol('_', optPoint);
    none.typeName = 'None';
    none.isNone = true;
    return (none);
}

var _symbol = {
    typeName: 'Symbol',
    value: '<Unknown>',
    isaYagaType: true,
    parserPoint: undefined,
    reference: undefined,
    asQuoted: _asQuoted,
    asQuasiQuoted: _asQuasiQuoted,
    asQuasiOverride: _asQuasiOverride,
    asQuasiInjection: _asQuasiInjection,
    isaSymbol: true,
    isQuoted: false,
    isQuasiOverride: false,
    isQuasiInjection: false,
    leadSyntax: undefined,
    bind(yi) {
        /* Add code here */
    },
    evaluate(yi) {
        return (this);
    },
    asString() {
        return (this.value);
    },
    print(printer) {
        if (this.leadSyntax) printer.printLead(this.leadSyntax);
        printer.printElement(this.value);
    }
};

function _asQuoted() {
    let sym = Object.create(this);
    sym.typeName = 'QuotedSymbol';
    sym.isQuoted = true;
    sym.leadSyntax = '\'',
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
    sym.leadSyntax = '`';
    sym.evaluate = function (yi) {
        throw new yaga.errors.InternalException("'evaluate' method unsupported for QuasiQuotedSymbol");
    }
    return (sym);
}

// May change bind so that parent list is passed to handle quasi overrides rather than the parent having
// to check every element.
function _asQuasiOverride() {
    let sym = Object.create(this);
    sym.typeName = 'QuasiOverrideSymbol';
    sym.isQuasiOverride = true;
    sym.leadSyntax = ',';
    sym.bind = function (yi) {
        return (Object.getPrototypeOf(this).bind(yi))
    };
    sym.evaluate = function (yi) {
        throw new yaga.errors.InternalException("'evaluate' method unsupported for QuasiOverrideSymbol");
    }
    return (sym);
}

function _asQuasiInjection() {
    let sym = this.asQuasiOverride();
    sym.typeName = 'QuasiInjectionSymbol';
    sym.isQuasiInjection = true;
    sym.leadSyntax = ',@';
    sym.bind = function (yi) {
        return (Object.getPrototypeOf(this).bind(yi))
    };
    return (sym);
}
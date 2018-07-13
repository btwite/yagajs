/**
 * Symbol : @file
 * 
 * Yaga symbol objects.
 * 
 */

'use strict';

let _symbols = new Map();
let _symbol = {
    typeName: 'Symbol',
    _sym: '<Unknown>',
    asjString() {
        return (this._sym);
    },
    asPrintSymbol() {
        return (_asPrintSymbol(this._sym));
    }
}

let _enumReserved = {
    UNKNOWN: 0,
    TRUE: 1,
    FALSE: 2,
    NONE: 3
}

module.exports = {
    get: _getSymbol,
    new: _newSymbol,

    symbolToElement: _symbolToElement,
    printReserved: _printReserved,
    xprintReserved: _xprintReserved,
    printSymbol: _printSymbol,
    xprintSymbol: _xprintSymbol,
    asPrintSymbol: _asPrintSymbol,

    LOCAL: _getSymbol("local"),
    BIND: _getSymbol("bind"),
    NAMES: _getSymbol("names"),
    UNBOUND: _getSymbol("unbound"),
    ARGS: _getSymbol("args"),
    VARGS: _getSymbol("vargs"),
    NPARMS: _getSymbol("nparms"),
    PROD: _getSymbol("prod"),
    DATA: _getSymbol("data"),

    Reserved: _enumReserved,
};
Object.freeze(module.exports);

let yc = require('./yagacore');

let _reservedAtom = {
    get true() {
        return (yc.AtomTrivalent.TRUE);
    },
    get false() {
        return (yc.AtomTrivalent.FALSE);
    },
    get unknown() {
        return (yc.AtomTrivalent.UNKNOWN);
    },
    get '_#' () {
        return (yc.AtomTrivalent.NONE);
    }
}

let _sReserved = ['true', 'false', 'unknown', '_#'];

function _symbolToElement(sym) {
    // Handle escaped reserved symbols first
    if (sym.charAt(0) == '#') {
        let s = sym.substring(1);
        if (_reservedAtom[s])
            sym = s;
        return (AtomSymbol.new(_getSymbol(sym)));
    }

    // Try for a reserved Symbol
    let atom = _reservedAtom[sym];
    if (!atom)
        return (AtomSymbol.new(_getSymbol(sym)));
    return (atom);
}

function _printReserved(sb, enumSym) {
    if (enumSym >= _sReserved.length) return;
    sb.append('#').append(_sReserved[enumSym]);
}

function _xprintReserved(sb, enumSym, type) {
    if (enumSym >= _sReserved.length) return;
    sb.append("[").append(type).append("]#").append(_sReserved[enumSym]);
}

function _printSymbol(sb, sym) {
    sb.append(_asPrintSymbol(sym));
}

function _xprintSymbol(sb, sym) {
    if (_reservedAtom[sym])
        sb.append("[#]");
    sb.append('#').append(sym);
}

function _asPrintSymbol(sym) {
    let lead = "#";
    if (_reservedAtom[sym])
        lead += '#';
    return (lead + sym);
}


function _getSymbol(symName) {
    let _sym = _symbols.get(symName);
    if (!_sym) _symbols.set(symName, (_sym = _newSymbol(symName)));
    return (_sym);
}

function _newSymbol(sName) {
    let o = Object.create(_symbol);
    o._sym = sName;
    return (o);
}
/**
 * Symbol : @file
 * 
 * Yaga symbol objects.
 * 
 */

'use strict';

var yaga;
let _symbols = {};
let _symbol = {
    typeName: 'Symbol',
    _sym: '<Unknown>',
    asString() {
        return (this._sym);
    },
    print(stream) {
        return (stream.write(this_sym));
    }
}

module.exports = {
    get: _getSymbol,

    Initialise: (y) => {
        yaga = yaga ? yaga : y;
    },
    PostInitialise: _postInit,
};
Object.freeze(module.exports);

function _getSymbol(symName) {
    let _sym = _symbols[symName];
    if (!_sym) _symbols[symName] = (_sym = _newSymbol(symName));
    return (_sym);
}

function _newSymbol(sName) {
    let o = Object.create(_symbol);
    o._sym = sName;
    return (o);
}
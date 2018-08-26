/**
 * Yaga : @file
 * 
 * Entry module for the yaga machine and related services.
 * The Yaga function object is returned and defaults as the interface
 * to create an instance of the yaga machine. The function object also contains
 * other Yaga services.
 *      Ex. let yaga = require('yaga');
 *          let yagaInstance = yaga(...);
 *          let mods = yaga.load({ ... });
 */
"use strict";

module.exports = yaga;

function yaga() {
    console.log('Yaga machince instantiator');
}

function thisArg(f) {
    return function (...args) {
        return f(this, ...args);
    };
}

yaga.thisArg = thisArg
yaga.Loader = require('./toolbox/Loader').Loader;
yaga.Character = require('./toolbox/Character');
yaga.StringBuilder = require('./toolbox/StringBuilder').StringBuilder;
yaga.Influence = require('./toolbox/Influence').Influence;

// Setup Reader as a getter and only load on first access.
let Reader = undefined;
Object.defineProperty(yaga, 'Reader', {
    configurable: false,
    enumerable: true,
    get() {
        if (Reader) return (Reader);
        let exps = yaga.Loader(require('./reader/loader'));
        Reader = (...args) => exps.Reader(...args);
        Object.assign(Reader, exps.Reader);
        Reader.ReadPoint = exps.ReadPoint;
        Reader.ReaderTable = exps.ReaderTable;
        return (Reader);
    }
});

Object.freeze(yaga);
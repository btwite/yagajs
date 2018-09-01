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

yaga.thisArg = thisArg;
yaga.dispatchPropertyHandlers = dispatchPropertyHandlers;
yaga.Loader = require('./toolbox/Loader').Loader;

let toolbox = yaga.Loader(require('./toolbox/loadScript'));
yaga.Character = toolbox.Character;
yaga.StringBuilder = toolbox.StringBuilder;
yaga.Influence = toolbox.Influence;
yaga.Exception = toolbox.Exception;

// Setup Reader as a getter and only load on first access.
let Reader = undefined;
Object.defineProperty(yaga, 'Reader', {
    get() {
        if (Reader) return (Reader);
        let exps = yaga.Loader(require('./reader/loadScript'));
        Reader = (...args) => exps.Reader(...args);
        Object.assign(Reader, exps.Reader);
        Reader.ReadPoint = exps.ReadPoint;
        Reader.ReaderTable = exps.ReaderTable;
        return (Reader);
    }
});

Object.freeze(yaga);

function thisArg(f) {
    return function (...args) {
        return f(this, ...args);
    };
}

function dispatchPropertyHandlers(o, oHandlers) {
    if (typeof o !== 'object')
        throw new error(`Object expected found '${o}'`);
    let fOther = oHandlers._other_ || (() => {});
    Object.keys(o).forEach(prop => {
        if (oHandlers.hasOwnProperty(prop))
            return (oHandlers[prop](prop));
        return (fOther(prop));
    });
}
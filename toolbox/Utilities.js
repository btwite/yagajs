/*
 *  Utilities: @file
 *
 *  Utility functions.
 */
"use strict";

const SymBindMap = Symbol.for('BindMap');

module.exports = Object.freeze({
    thisArg,
    dispatchPropertyHandlers,
    bind,
    uuidv4
});

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

function bind(o, tgt) {
    // Bind the object to an explicit function or if a string to a function member of 
    // the object and record the relationship to anwser the same bound function in the future.
    let bf, f, ty = typeof tgt;
    if (ty === 'string' && typeof o[tgt] === 'function')
        f = o[tgt];
    else if (ty === 'function')
        f = tgt;
    else
        throw new Error('Target of bind must be a function or a function property of the object');

    let map = f[SymBindMap];
    if (!map) {
        f[SymBindMap] = map = new WeakMap();
        map.set(o, (bf = f.bind(o)));
        return (bf);
    }
    bf = map.get(o);
    if (!bf) map.set(o, (bf = f.bind(o)));
    return (bf);
}

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        var r = Math.random() * 16 | 0,
            v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
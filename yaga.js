/**
 * yaga : @file
 * 
 * Entry module for the yaga machine
 * 
 */
"use strict";

let yaga;
let _exports = {
    Instance: {
        new: _newYagaInstance
    }
};
module.exports = yaga = _exports;

_exports.errors = require('./errors');
_exports.StringBuilder = require('./StringBuilder');
_exports.Symbol = require('./Symbol');

Object.freeze(_exports);

/**
 * Initiialise each module if they have provided an Initialise method.
 */
_runInitPhase('Initialise', _exports);
/**
 * Initiialise each module if they have provided a PostInitialise method.
 * This is provided to allow modules to run initialisation processes that require
 * access to other library services not just the library reference.
 */
_runInitPhase('PostInitialise');
/**
 * Create the prototype for a Yaga instance which inherits this module exports.
 */
var _instance = Object.assign(Object.create(_exports), {
    typeName: 'YagaInstance',
    dictionary: undefined,
});

function _newYagaInstance(optDictPath, optYagaCore) {
    let yi = Object.create(_instance);

    yaga.Dictionary.load(yi, optDictPath, optYagaCore);
    return (yi);
}

function _runInitPhase(sPhase, ...args) {
    Object.keys(_exports).forEach(sProp => {
        let prop = _exports[sProp];
        if (typeof prop === 'object' && typeof prop[sPhase] === 'function') {
            prop[sPhase](...args);
        }
    });
}
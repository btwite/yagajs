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
        new: _newYagaInstance,
    },
    resolveFileName: _resolveFileName,
};
module.exports = yaga = _exports;

_exports.StringBuilder = require('./StringBuilder');
_exports.Symbol = require('./Symbol');
_exports.Dictionary = require('./Dictionary');
_exports.Parser = require('./Parser');
_exports.errors = require('./errors');
_exports.List = require('./List');

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

function _newYagaInstance(optDictPath, options = {}) {
    let yi = Object.create(_instance);
    yi._options = options;
    // ......
    yi.dictionary = yaga.Dictionary.load(yi, optDictPath, options.yagaCorePath);
    return (yi);
}

function _resolveFileName(sFile, optModule) {
    let path = require('path');
    if (sFile.includes(path.sep)) return (sFile);
    let mod = optModule ? optModule : module;
    return (path.dirname(mod.filename) + path.sep + sFile);
}

var _instance = Object.assign(Object.create(_exports), {
    typeName: 'YagaInstance',
    dictionary: undefined,
    evaluateDictionary: _evaluateDictionary,
    _options: undefined,
});

function _evaluateDictionary(dict, path) {
    let curDict = this.dictionary;
    this.dictionary = dict;

    console.log(`Evaluate dictionary '${path}'`);
    // .....
    this.dictionary = curDict;
    return (undefined);
}

function _runInitPhase(sPhase, ...args) {
    Object.keys(_exports).forEach(sProp => {
        let prop = _exports[sProp];
        if (typeof prop === 'object' && typeof prop[sPhase] === 'function') {
            prop[sPhase](...args);
        }
    });
}
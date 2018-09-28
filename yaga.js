/**
 * Yaga : @file
 * 
 * Entry module for the yaga machine and related services.
 * The Yaga function object is returned and defaults as the interface
 * to create an instance of the yaga machine. The function object also contains
 * other Yaga services.
 */
"use strict";

var yaga = {};

module.exports = yaga;

let utils = require('./toolbox/Utilities');
yaga.thisArg = utils.thisArg;
yaga.dispatchPropertyHandlers = utils.dispatchPropertyHandlers;
yaga.bind = utils.bind;

yaga.Loader = require('./toolbox/Loader').Loader;

let toolbox = yaga.Loader(require('./toolbox/loadScript'));
yaga.Character = toolbox.Character;
yaga.StringBuilder = toolbox.StringBuilder;
yaga.Influence = toolbox.Influence;
yaga.Exception = toolbox.Exception;

yaga.public = toolbox.Scopes.public;
yaga.createPrivateScope = toolbox.Scopes.createPrivateScope;
yaga.copy = toolbox.Replicate.copy;
yaga.reverseCopy = toolbox.Replicate.reverseCopy;
yaga.clone = toolbox.Replicate.clone;
yaga.resolvePath = toolbox.File.resolvePath;

// Setup Reader as a getter and only load on first access.
let Reader = undefined;
Object.defineProperty(yaga, 'Reader', {
    get() {
        if (Reader) return (Reader);
        let exps = yaga.Loader(require('./reader/loadScript'));
        Reader = (...args) => exps.Reader(...args);
        Reader.ReadPoint = exps.ReadPoint;
        Reader.ReaderTable = exps.ReaderTable;
        return (Reader);
    }
});

// Setup Machine as a getter and only load on first access.
let Machine = undefined;
Object.defineProperty(yaga, 'Machine', {
    get() {
        if (Machine) return (Machine);
        let exps = yaga.Loader(require('./machine/loadScript'));
        Machine = (...args) => exps.Machine(...args);
        Machine.LoadedDictionary = exps.Dictionary;
        return (Machine);
    }
});

Object.freeze(yaga);
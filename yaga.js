/**
 * Yaga : @file
 * 
 * Entry module for the Yaga machine and related services.
 * The Yaga function object is returned and defaults as the interface
 * to create an instance of the Yaga machine. The function object also contains
 * other Yaga services.
 */
"use strict";

var Yaga = {};

module.exports = Yaga;

let utils = require('./toolbox/Utilities');
Yaga.thisArg = utils.thisArg;
Yaga.dispatchPropertyHandlers = utils.dispatchPropertyHandlers;
Yaga.bind = utils.bind;

Yaga.Loader = require('./toolbox/Loader').Loader;

let toolbox = Yaga.Loader(require('./toolbox/loadScript'));
Yaga.Character = toolbox.Character;
Yaga.StringBuilder = toolbox.StringBuilder;
Yaga.Influence = toolbox.Influence;
Yaga.Exception = toolbox.Exception;

Yaga.public = toolbox.Scopes.public;
Yaga.createPrivateScope = toolbox.Scopes.createPrivateScope;
Yaga.copy = toolbox.Replicate.copy;
Yaga.reverseCopy = toolbox.Replicate.reverseCopy;
Yaga.clone = toolbox.Replicate.clone;
Yaga.resolvePath = toolbox.File.resolvePath;
Yaga.tryResolvePath = toolbox.File.tryResolvePath;
Yaga.Paths = toolbox.File.Paths;

Yaga.Paths.append(__dirname);
Yaga.Paths.forAppend('yaga', __dirname);
Yaga.Paths.forAppend('yaga.machine', __dirname + '/machine');

// Setup Reader as a getter and only load on first access.
let Reader = undefined;
Object.defineProperty(Yaga, 'Reader', {
    get() {
        if (Reader) return (Reader);
        let exps = Yaga.Loader(require('./reader/loadScript'));
        Reader = (...args) => exps.Reader(...args);
        Reader.ReadPoint = exps.ReadPoint;
        Reader.ReaderTable = exps.ReaderTable;
        return (Reader);
    }
});

// Setup Machine as a getter and only load on first access.
let Machine = undefined;
Object.defineProperty(Yaga, 'Machine', {
    get() {
        if (Machine) return (Machine);
        let exps = Yaga.Loader(require('./machine/loadScript'));
        Machine = (...args) => exps.Machine(...args);
        Machine.LoadedDictionary = exps.Dictionary;
        return (Machine);
    }
});

Object.freeze(Yaga);
/**
 * index : @file
 * 
 * Entry module for answering core yaga services wrapped in a single export.
 * Reader and Machine services are lazy loaded.
 */
"use strict";

var Yaga = {};

module.exports = Yaga;

let toolbox = require('../toolbox');
Yaga.thisArg = toolbox.Utilities.thisArg;
Yaga.dispatchPropertyHandlers = toolbox.Utilities.dispatchPropertyHandlers;
Yaga.bind = toolbox.Utilities.bind;

Yaga.Character = toolbox.Character;
Yaga.StringBuilder = toolbox.StringBuilder;
Yaga.Influence = toolbox.Influence;
Yaga.Exception = toolbox.Exception;

Yaga.public = toolbox.Scopes.public;
Yaga.createPrivateScope = toolbox.Scopes.createPrivateScope;
Yaga.assign = toolbox.Replicate.assign;
Yaga.copy = toolbox.Replicate.copy;
Yaga.reverseCopy = toolbox.Replicate.reverseCopy;
Yaga.clone = toolbox.Replicate.clone;
Yaga.Paths = toolbox.File.Paths;

let transpiler = require('../extensions/transpiler');
Yaga.transpile = transpiler.transpile;
Yaga.transpileFile = transpiler.transpileFile;

// Setup Reader as a getter and only load on first access.
let Reader = undefined;
Object.defineProperty(Yaga, 'Reader', {
    get() {
        if (Reader) return (Reader);
        let exps = require('../reader');
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
        let exps = require('../machine');
        Machine = (...args) => exps.Machine(...args);
        Machine.GlobalDictionary = exps.Dictionary.GlobalDictionary;
        return (Machine);
    }
});

Object.freeze(Yaga);
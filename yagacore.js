/**
 * yagacore : @file
 * 
 * Module that aggregates all the yaga modules
 * 
 */
"use strict";

let _exports = {};
module.exports = _exports;

_exports.errors = require('./errors');
_exports.StringBuilder = require('./StringBuilder');
_exports.Symbol = require('./Symbol');
_exports.List = require('./List');
_exports.AtomicList = require('./AtomicList');
_exports.AtomAlias = require('./AtomAlias');
_exports.AtomTrivalent = require('./AtomTrivalent');
_exports.AtomNone = require('./AtomNone');
_exports.AtomComment = require('./AtomComment');
_exports.AtomNumber = require('./AtomNumber');
_exports.AtomFloat = require('./AtomFloat');
_exports.AtomNamespace = require('./AtomNamespace');
_exports.Namespace = require('./Namespace');
_exports.Container = require('./Container');

Object.freeze(_exports);

/**
 * Initiialise each module if they have provided an Initialise method.
 */
Object.keys(_exports).forEach(mod => {
    if (typeof _exports[mod].Initialise === 'function') _exports[mod].Initialise(_exports);
});

/**
 * Initiialise each module if they have provided a PostInitialise method.
 * This is provided to allow modules to run initialisation processes that require
 * access to other library services not just the library reference.
 */
Object.keys(_exports).forEach(mod => {
    if (typeof _exports[mod].PostInitialise === 'function') _exports[mod].PostInitialise();
});
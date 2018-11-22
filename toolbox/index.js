/*
 *  index: @file
 *
 *  Main module for the toolbox. Exports public services and loads all toolbox components.
 */
"use strict";

let _ = undefined;

module.exports = require('./Loader').load({
    modules: {
        Loader: _,
        Character: _,
        Utilities: _,
        File: _,
        Scopes: _,
        Replicate: mod => ({
            assign: mod.assign,
            copy: mod.copy,
            reverseCopy: mod.reverseCopy,
            clone: mod.clone
        }),
        Influence: mod => mod.Influence,
        StringBuilder: mod => mod.StringBuilder,
        Exception: mod => mod.Exception,
    },
    path: __dirname
});
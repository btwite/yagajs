/*
 *  loadScript: @file
 *
 *  Answers the loader descriptor for the toolbox package, other than the loader itself.
 */
"use strict";

let _ = undefined;
module.exports = {
    modules: {
        Character: _,
        Utilities: _,
        Replicate: _,
        File: _,
        Scopes: _,
        Influence: mod => mod.Influence,
        StringBuilder: mod => mod.StringBuilder,
        Exception: mod => mod.Exception,
    },
    path: __dirname
};
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
        File: _,
        Scopes: _,
        Replicate: mod => ({
            copy: mod.copy,
            clone: mod.clone
        }),
        Influence: mod => mod.Influence,
        StringBuilder: mod => mod.StringBuilder,
        Exception: mod => mod.Exception,
    },
    path: __dirname
};
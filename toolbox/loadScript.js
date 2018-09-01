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
        Influence: mod => mod.Influence,
        StringBuilder: mod => mod.StringBuilder,
        Exception: mod => mod.Exception,
    },
    path: __dirname
};
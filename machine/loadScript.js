/*
 *  loadScript: @file
 *
 *  Answers the loader descriptor for the machine package.
 */
"use strict";

let _ = undefined;
module.exports = {
    modules: {
        Dictionary: mod => mod.LoadedDictionary,
    },
    path: __dirname
};
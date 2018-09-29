/*
 *  loadScript: @file
 *
 *  Answers the loader descriptor for the machine package.
 */
"use strict";

let _ = undefined;
module.exports = {
    modules: {
        Common: mod => mod.Common,
        Dictionary: mod => mod.LoadedDictionary,
        Error: mod => mod.Error,
        Tools: _,
    },
    path: __dirname
};
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
        Tools(mod, cb) {
            return (cb.rollupModuleExports());
        },
        Machine: mod => mod.Machine,
        YagaReaderTable: mod => mod.YagaReaderTable,
    },
    path: __dirname
};
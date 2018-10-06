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
        Dictionary: mod => mod.GlobalDictionary,
        Error: mod => mod.Error,
        Tools(mod, cb) {
            return (cb.rollupModuleExports());
        },
        Machine: mod => mod.Machine,
        YagaReaderTable: mod => mod.YagaReaderTable,
        List: mod => mod.List,
        Function: mod => mod.Function,
        Symbol: mod => mod.Symbol,
        Wrapper: mod => mod.Wrapper,
    },
    path: __dirname
};
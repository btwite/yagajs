/*
 *  index: @file
 *
 *  Answers the the full machine package interface.
 */
"use strict";

let _ = undefined;
let tb = require('../toolbox');

module.exports = tb.Loader.load({
    modules: {
        Common: mod => mod.Common,
        Dictionary: _,
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
        Primitives: _,
    },
    path: __dirname
});

tb.File.Paths.forAppend('yaga.machine', __dirname);
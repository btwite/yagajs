/*
 *  index: @file
 *
 *  Answers the exports for the reader package.
 */
"use strict";

let _ = undefined;
let tb = require('../toolbox');

module.exports = tb.Loader.load({
    modules: {
        ReadPoint: mod => mod.ReadPoint,
        ReaderTable: mod => mod.ReaderTable,
        Reader: mod => mod.Reader,
    },
    path: __dirname
});
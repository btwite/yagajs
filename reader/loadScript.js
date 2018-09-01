/*
 *  loadScript: @file
 *
 *  Answers the loader descriptor for the reader package.
 */
"use strict";

let _ = undefined;
module.exports = {
    modules: {
        ReadPoint: mod => mod.ReadPoint,
        ReaderTable: mod => mod.ReaderTable,
        Reader: mod => mod.Reader,
    },
    path: __dirname
};
/*
 *  loader: @file
 *
 *  Answers the loader descriptor for the reader package.
 */
"use strict";

let _ = undefined;
module.exports = {
    modules: {
        ReadPoint() {
            return (this.ReadPoint);
        },
    },
    path: __dirname
};
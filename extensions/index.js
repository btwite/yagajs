/**
 * index : @file
 * 
 * Default entry point for requiring the Yaga extensions.
 * Will determine if it is via a 'require' statement or a command line call.
 */
"use strict";

const Transpiler = require('./transpiler');

if (process.mainModule === module) {
    Transpiler.main(process.argv.slice(2));
} else {
    module.exports = Transpiler;
}

function log(...args) {
    console.log(...args);
}
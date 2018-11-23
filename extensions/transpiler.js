/*
 *  transpiler: @file
 *
 *  Yaga extensions transpiler.
 *  Can be called as the main module passed to node or provides the exported interface
 *  for other javascript calling modules.
 */
"use strict"

const Babel = require("@babel/core");
const YagaParser = require('./yagaParser_715');
const Path = require('path');
const Fs = require('fs');
const YagaExt = '_y';

function transpile(code) {
    let ast = Babel.parseSync(code, {
        plugins: [{
            parserOverride(code, opts) {
                return (YagaParser.parse(code, opts));
            }
        }]
    });

    // Result is { code, map , ast }
    return (Babel.transformFromAstSync(ast, code, {
        plugins: [Path.join(__dirname, 'yagaPlugin.js')],
    }));
}

function transpileFile(inPath, outPath) {
    let stats = Fs.statSync(inPath);
    if (!stats.isFile())
        throw new Error(`'${inPath} must be of file type`);
    inPath = Fs.realpathSync(inPath);
    let fDesc = Path.parse(inPath);

    if (outPath) {
        outPath = Fs.realpathSync(outPath);
        stats = Fs.statSync(outPath);
        if (stats.isDirectory()) {
            let p = outPath;
            outPath = Path.join(outPath, fDesc.name);
            if (p === fDesc.dir && fDesc.ext === 'js')
                outPath += YagaExt; // Add a Yaga specific extension to prevent overide
            outPath += '.js';
        }
    } else {
        // No output path provided so construct a copy of the file with the Yaga specific extension.
        outPath = Path.join(fDesc.dir, fDesc.name);
        if (fDesc.ext === 'js')
            outPath += YagaExt;
        outPath += '.js'
    }

    let code = Fs.readFileSync(inPath);
    let res = transpile(code);
    //    Fs.unlinkSync(outPath);
    Fs.writeFileSync(outPath, res.code);
}

function log(...args) {
    console.log(...args);
}

// Check if we are the main module and if so expect command line arguments to nominate
// source file(s) and a target output directory.

if (process.mainModule === __filename) {

} else {
    module.exports = Object.freeze({
        transpile,
        transpileFile,
    });
}
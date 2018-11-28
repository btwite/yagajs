/*
 *  transpiler: @file
 *
 *  Yaga extensions transpiler.
 *  Can be called as the main module passed to node or provides the exported interface
 *  for other javascript calling modules.
 */
"use strict"

const _ = undefined;

const Babel = require("@babel/core");
const File = require('../toolbox/File');
const YagaParser = require('./yagaParser_715');
const Path = require('path');
const Fs = require('fs');
const YagaExt = '_y';
const JsExt = '.js';

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
    File.isaFile(inPath, msg => throwError(msg));
    if (outPath)
        File.isaDirectory(outPath, msg => throwError(msg));

    inPath = Fs.realpathSync(inPath);
    let fDesc = Path.parse(inPath);

    if (outPath) {
        outPath = Fs.realpathSync(outPath);
        let p = outPath;
        outPath = Path.join(outPath, fDesc.name);
        if (p === fDesc.dir && fDesc.ext === JsExt)
            outPath += YagaExt; // Add a Yaga specific extension to prevent override
        outPath += JsExt;
    } else {
        // No output path provided so construct a copy of the file with the Yaga specific extension.
        outPath = Path.join(fDesc.dir, fDesc.name);
        if (fDesc.ext === JsExt)
            outPath += YagaExt;
        outPath += JsExt
    }

    let code = Fs.readFileSync(inPath);
    let res = transpile(code);
    //    Fs.unlinkSync(outPath);
    Fs.writeFileSync(outPath, res.code);
}

function throwError(msg) {
    throw new Error(msg);
}

function normaliseOutDirPath(outPath) {

}

// Check if we are the main module and if so expect command line arguments to nominate
// source file(s) and a target output directory.

if (process.mainModule === module) {
    main();
} else {
    module.exports = Object.freeze({
        transpile,
        transpileFile,
        main
    });
}

// Transpiler has been invoked as a main module with the following usage.
//  node @yagajs/extensions[/transpiler] [-?] [-l] [-r] [-f <regexpr>] inFile|inDir [outDir]
function main() {
    // Arguments for the Transpiler will start at the 3rd entry.
    const args = {
        flList: false,
        flRecursive: false,
        filter: /.js$/,
        inFile: _,
        inisDir: false,
        outDir: _,
    };
    if (!parseArguments(args))
        return;
}

function parseArguments(args) {
    for (let i = 2; i < process.argv.length; i++) {
        let arg = process.argv[i];
        log(arg);
        switch (arg) {
            case '-l':
                args.flList = true;
                break;
            case '-r':
                args.flRecursive = true;
                break;
            case '-f':
                if (++i >= process.argv.length)
                    return (usage('Missing filter regular expression'));
                try {
                    args.filter = new RegExp(process.argv[i]);
                } catch (err) {
                    return (usage(`Invalid filter expression '${process.argv[i]}'`));
                }
                break;
            case '-?':
                return (usage());
            default:
                if (!args.inFile) {
                    if (File.isaDirectory(arg))
                        args.inisDir = true;
                    else if (!File.isaFile(arg, msg => usage(msg)))
                        return;
                    args.inFile = arg;
                } else if (!args.outDir) {
                    if (!File.isaDirectory(arg, msg => usage(msg)))
                        return;
                    args.outDir = arg;
                } else
                    return (usage('Too many arguments'));
        }
    }

    if (!args.inFile)
        return (usage('Missing input file argument'));
    if (!Fs.exists(args.inFile))
        return (usage(`Input file '${args.inFile}' does not exit`));

    if (args.outDir && !Fs.exists(args.outDir))
        return (usage(`Output directory '${args.outDir}' does not exit`));
}

function usage(errMsg) {
    log();
    if (errMsg)
        log('Error:', errMsg);
    log('Usage:');
    log('   node @yagajs/extensions[/transpiler]');
    log('        [-?] [-l] [-r] [-f <regexpr>] inFile|inDir [outDir]\n');
    log('      -? : Usage');
    log('      -l : List the input and target output files without transpiling');
    log('      -r : Recursively process sub-directories');
    log('      -f : Regular expression file filter for input directory. Default(.js$)');
    log('      inFile|inDir : Single source file or input directory to filter');
    log('      outDir : Optional output directory for transpiled files. If not provided');
    log("               then the file name will either be appended with a '.js'");
    log("               extension if the input does not have a '.js' extension or");
    log("               refactored according to the formatting rule '*.js ---> *_y.js");

    return (null);
}

function log(...args) {
    console.log(...args);
}
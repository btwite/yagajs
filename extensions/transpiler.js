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
    inPath = File.Paths.tryResolve(inPath) || inPath;
    File.isaFile(inPath, msg => throwError(msg));
    inPath = Fs.realpathSync(inPath);
    let fDesc = Path.parse(inPath);

    if (outPath) {
        outPath = File.Paths.tryResolve(outPath) || outPath;
        if (File.isaDirectory(outPath)) {
            outPath = Fs.realpathSync(outPath);
            let p = outPath;
            outPath = Path.join(outPath, fDesc.name);
            if (p === fDesc.dir && fDesc.ext === JsExt)
                outPath += YagaExt; // Add a Yaga specific extension to prevent override
            outPath += JsExt;
        } else {
            outPath = Fs.realpathSync(outPath);
            let fDesc = Path.parse(outPath);
            File.isaDirectory(fDesc.dir, msg => throwError(msg));
            if (outPath === inPath) {
                // Add a Yaga specific extension to prevent override
                outPath = Path.join(fDesc.dir, fDesc.name) + YagaExt + fDesc.ext;
            }
        }
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
    return {
        inPath,
        outPath
    }
}

function throwError(msg) {
    throw new Error(msg);
}

function normaliseOutDirPath(outPath) {

}

// Check if we are the main module and if so expect command line arguments to nominate
// source file(s) and a target output directory.

if (process.mainModule === module) {
    main(process.argv.slice(2));
} else {
    module.exports = Object.freeze({
        transpile,
        transpileFile,
        main
    });
}

// Transpiler has been invoked as a main module with the following usage.
//  node @yagajs/extensions[/transpiler] [-?] [-l] [-r] [-f <regexpr>] inFile|inDir [outDir]
function main(argv) {
    // Arguments for the Transpiler will start at the 3rd entry.
    const args = {
        flList: false,
        flRecursive: false,
        filter: /.js$/,
        inFile: _,
        inisDir: false,
        outDir: _,
    };
    if (!parseArguments(args, argv))
        return;

    if (args.inisDir) {

    } else
        mainTranspile(args.inFile, args.outDir);
    log('**** Transpiler Ended');
}

function mainTranspile(inFile, outDir) {
    if (outDir)
        log(`**** Transpiling '${inFile}' to '${outDir}`);
    else
        log(`**** Transpiling '${inFile}'`);
    try {
        let res = transpileFile(inFile, outDir);
        log(`**** Transpile Complete. Target(${res.outPath})`);
    } catch (err) {
        log(`****** ERROR: ${err.message}`);
    }
}

function parseArguments(args, argv) {
    for (let i = 0; i < argv.length; i++) {
        let arg = argv[i];
        switch (arg) {
            case '-l':
                args.flList = true;
                break;
            case '-r':
                args.flRecursive = true;
                break;
            case '-f':
                if (++i >= argv.length)
                    return (usage('Missing filter regular expression'));
                try {
                    args.filter = new RegExp(argv[i]);
                } catch (err) {
                    return (usage(`Invalid filter expression '${argv[i]}'`));
                }
                break;
            case '-?':
                return (usage());
            default:
                if (!args.inFile) {
                    args.inFile = File.Paths.tryResolve(arg) || arg;
                    if (File.isaDirectory(args.inFile))
                        args.inisDir = true;
                    else if (!File.isaFile(args.inFile, msg => usage(msg)))
                        return;
                } else if (!args.outDir) {
                    args.outDir = File.Paths.tryResolve(arg) || arg;
                    if (!File.isaDirectory(args.outDir, msg => usage(msg)))
                        return;
                } else
                    return (usage('Too many arguments'));
        }
    }

    if (!args.inFile)
        return (usage('Missing input file argument'));
    if (!Fs.existsSync(args.inFile))
        return (usage(`Input file '${args.inFile}' does not exit`));

    if (args.outDir && !Fs.existsSync(args.outDir))
        return (usage(`Output directory '${args.outDir}' does not exit`));
    return (true);
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
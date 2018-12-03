/*
 *  File: @file
 *
 *  File related services.
 */
"use strict";

const SymDefault = Symbol.for('PathsDefault');
const sDefault = '#default';
const sIncludes = '#includes';

const Path = require('path');
const Fs = require('fs');
const Paths = {
    resolve: resolvePath,
    tryResolve: tryResolvePath,
    append: pathsAppend,
    insert: pathsInsert,
    remove: pathsRemove,
    forAppend: pathsForAppend,
    forInsert: pathsForInsert,
    forRemove: pathsForRemove
};
const PathsMap = {
    [SymDefault]: [],
};

module.exports = Object.freeze({
    Paths,
    isaFile,
    isaDirectory,
    fileType,
});

function isaFile(fPath, fnErr) {
    if (!Fs.existsSync(fPath)) {
        if (fnErr) fnErr(`'${fPath}' does not exist`);
        return (false);
    }
    const stats = Fs.statSync(fPath);
    if (!stats.isFile()) {
        if (fnErr) fnErr(`'${fPath}' is not a file`);
        return (false);
    }
    return (true);
}

function isaDirectory(fPath, fnErr) {
    if (!Fs.existsSync(fPath)) {
        if (fnErr) fnErr(`'${fPath}' does not exist`);
        return (false);
    }
    const stats = Fs.statSync(fPath);
    if (!stats.isDirectory()) {
        if (fnErr) fnErr(`'${fPath}' is not a directory`);
        return (false);
    }
    return (true);
}

function fileType(fPath, fnErr) {
    if (!Fs.existsSync(fPath)) {
        if (fnErr) fnErr(`'${fPath}' does not exist`);
        return (null);
    }
    const stats = Fs.statSync(fPath);
    if (stats.isFile())
        return ('file');
    else if (stats.isDirectory)
        return ('directory');
    return (null);
}

function findFiles(dirPath, flRecursive, filterExpr) {

}

/**
 * Function:    resolvePath
 * Description: Answers a fully qualified path name for a partial file or directory specification.
 *              The path can contain the following type prefix:
 *                  path://<pathTag>/... : Try named Paths specification first followed by Default
 * 
 * @param {string} path : Full or relative path of the file or directory to resolve.
 */

function resolvePath(path) {
    let absPath = tryResolvePath(path);
    if (!absPath)
        throw new Error(`Relative path '${path}' could not be resolved`);
    return (absPath);
}

const SpecTypeMap = {
    path: pathSpecType,
    testpath: testpathSpecType
};

function tryResolvePath(path) {
    // May have a fully qualified path to start with.
    if (typeof path !== 'string' || path.length <= 0)
        throw new Error('String required for file path');
    if (Path.isAbsolute(path))
        return (Fs.existsSync(path) ? path : null);
    return (checkSpecTypeTag(path) || buildResolvedPath(PathsMap[SymDefault], path));
}

function buildResolvedPath(paths, relPath) {
    if (!paths)
        return (null);
    for (let i = 0; i < paths.length; i++) {
        // We may have a recursive operation if the tagged path also
        // refers to another tagged path.
        let path = paths[i] + relPath;
        let absPath = checkSpecTypeTag(path);
        if (absPath)
            return (absPath)
        if (Fs.existsSync(path))
            return (Fs.realpathSync(path));
    }
    return (null);
}

function checkSpecTypeTag(path) {
    let i = path.indexOf('://');
    if (i > 0) {
        const specType = path.substr(0, i);
        return (SpecTypeMap[specType] && SpecTypeMap[specType](path));
    }
    return (null);
}

function getSpecTypeTag(path, ty) {
    let i = path.indexOf(ty);
    if (i !== 0)
        return (null);
    let j = ty.length,
        k = path.indexOf('/', j),
        l = path.indexOf('\\', j);
    if (k < 0 && l < 0)
        k = path.length - 1; // Allow for just the tag name
    else if (l > 0 && l < k)
        k = l;
    if (k <= j)
        throw new Error('Missing tag name in file path');
    return (path.substring(j, k));
}

function pathSpecType(path) {
    let paths, tag;
    if ((tag = getSpecTypeTag(path, 'path://'))) {
        if (paths = PathsMap[tag]) {
            // 'path' will be empty string if only have tag name
            return (buildResolvedPath(paths, path.substr('path://'.length + tag.length + 1)));
        }
    }
    return (null);
}

function testpathSpecType(path) {
    return (path);
}


function pathsAppend(...args) {
    __pathsOperation(SymDefault, args, _pathAppend)
}

function pathsInsert(...args) {
    __pathsOperation(SymDefault, args, _pathInsert)
}

function pathsRemove(...args) {
    __pathsOperation(SymDefault, args, _pathRemove)
}

function pathsForAppend(tag, ...args) {
    _pathsOperation(tag, args, _pathAppend);
}

function pathsForInsert(tag, ...args) {
    _pathsOperation(tag, args, _pathInsert);
}

function pathsForRemove(tag, ...args) {
    _pathsOperation(tag, args, _pathRemove);
}

function _pathsOperation(tag, pathSpec, fOp) {
    if (typeof tag !== 'string')
        throw new Error('Path tag must be a String');
    if (!PathsMap.hasOwnProperty(tag))
        PathsMap[tag] = [];
    __pathsOperation(tag, pathSpec, fOp);
}

function __pathsOperation(tag, pathSpec, fOp) {
    let ty = typeof pathSpec;
    if (ty === 'string' && pathSpec.length > 0) {
        let a = pathSpec.split(Path.delimiter);
        if (a.length === 1) {
            let c = pathSpec[pathSpec.length - 1];
            if (c != '/' && c != '\\')
                pathSpec += '/';
            fOp(tag, pathSpec);
        } else
            a.forEach(ps => __pathsOperation(tag, ps, fOp));
    } else if (Array.isArray(pathSpec) && pathSpec.length > 0)
        pathSpec.forEach(ps => __pathsOperation(tag, ps, fOp));
    else
        throw new Error('Path specification must be a non empty String or an Array of Strings');
}

function _pathAppend(tag, path) {
    //    log('_pathAppend', tag, path)
    let a = PathsMap[tag];
    a.push(path);
    return (a);
}

function _pathInsert(tag, path) {
    return (PathsMap[tag] = [path].concat(a));
}

function _pathRemove(tag, path) {
    let a = PathsMap[tag];
    for (let i = 0; i < a.length; i++) {
        let p = a[i],
            len = p.length - 1;
        if (path === p || ((path.length === len && (p[len] === '/' || p[len] === '\\')) && path === p.substr(0, len))) {
            a.splice(i, 1);
            break;
        }
    }
    return (a);
}

pathsAppend(process.cwd());
let p = __dirname.substr(0, __dirname.length - '/toolbox'.length);
pathsForAppend('yaga', p);
pathsForAppend('yaga.machine', p + '/machine');

// Locate yagapaths.json files in the following locations in the order given
//      1. CWD
//      2. YAGAPATHS environment variable
//      3. Main Module directory.
// Note that module directory is last to allow localisation paths to be defined
// before module related dependencies.
// Env variable can be a platform separated list of specific json files and/or
// directories that contain yagapaths.json files. Each JSON file is loaded once.

const JsonSet = new Set();

function loadPathsJSONFile(fPath, fErr) {
    fPath = tryResolvePath(fPath);
    if (!fPath)
        return (null);
    const ty = fileType(fPath, fErr);
    if (ty === 'directory' && (fPath += '/yagapaths.json', !isaFile(fPath)))
        return (null);
    if (JsonSet.has(fPath))
        return (fPath); // Has already been processed.

    const json = JSON.parse(Fs.readFileSync(fPath));

    const propDefault = json[sDefault];
    delete json[sDefault];
    const propIncludes = json[sIncludes];
    delete json[sIncludes];

    Object.keys(json).forEach(prop => pathsForAppend(prop, json[prop]));
    if (propDefault)
        pathsAppend(propDefault);
    if (propIncludes) {
        if (typeof propIncludes === 'string')
            loadPathsJSONFile(resolvePath(propIncludes), fErr);
        else if (Array.isArray(propIncludes))
            propIncludes.forEach(fJson => loadPathsJSONFile(resolvePath(fJson), fErr));
    }
    return (fPath);
}

loadPathsJSONFile(process.cwd());
if (process.env.YAGAPATHS)
    process.env.YAGAPATHS.split(Path.delimiter).forEach(path => loadPathsJSONFile(path));
if (process.mainModule) {
    let fDesc = Path.parse(process.mainModule.filename);
    loadPathsJSONFile(fDesc.dir);
}

function log(...args) {
    console.log(...args)
}
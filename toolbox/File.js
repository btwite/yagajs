/*
 *  File: @file
 *
 *  File related services.
 */
"use strict";

let Default = '__default__';

var Path = require('path');
var Fs = require('fs');
var Paths = {
    append: pathsAppend,
    insert: pathsInsert,
    remove: pathsRemove,
    forAppend: pathsForAppend,
    forInsert: pathsForInsert,
    forRemove: pathsForRemove
};
var PathsMap = {
    [Default]: [],
};

module.exports = Object.freeze({
    Paths,
    resolvePath,
    tryResolvePath,
});

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

function tryResolvePath(path) {
    // May have a fully qualified path to start with.
    if (typeof path !== 'string' || path.length <= 0)
        throw new Error('String required for file path');
    if (Path.isAbsolute(path))
        return (path);
    let absPath, paths, tyName = resolveSpecType(path, 'path://');
    if (tyName && (paths = PathsMap[tyName])) {
        path = path.substr('path://'.length + tyName.length + 1);
        absPath = formResolvedPath(paths, path);
    } else if (!absPath)
        absPath = formResolvedPath(PathsMap[Default], path);
    return (absPath);
}

function formResolvedPath(paths, relPath) {
    if (!paths)
        return (null);
    for (let i = 0; i < paths.length; i++) {
        let absPath = Path.normalize(paths[i] + relPath);
        if (Fs.existsSync(absPath))
            return (absPath);
    }
    return (null);
}

function resolveSpecType(path, ty) {
    let i = path.indexOf(ty);
    if (i !== 0)
        return (null);
    let j = ty.length,
        k = path.indexOf('/', j),
        l = path.indexOf('\\', j);
    if (l > 0 && l < k)
        k = l;
    if (k <= j)
        throw new Error('Missing tag name in file path');
    return (path.substring(j, k));
}

function pathsAppend(...args) {
    pathsForAppend(Default, ...args);
}

function pathsInsert(...args) {
    pathsForInsert(Default, ...args);
}

function pathsRemove(...args) {
    pathsForRemove(Default, ...args);
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
    } else if (Array.isArray(pathSpec))
        pathSpec.forEach(ps => __pathsOperation(tag, ps, fOp));
    else
        throw new Error('Path specification must be a non empty String or an Array of Strings');
}

function _pathAppend(tag, path) {
    let a = PathsMap[tag];
    if (!a.includes(path))
        a.push(path);
    return (a);
}

function _pathInsert(tag, path) {
    let a = PathsMap[tag];
    if (a.includes(path))
        a = _pathRemove(tag, path);
    return (PathsMap[tag] = [path].concat(a));
}

function _pathRemove(tag, path) {
    let a = PathsMap[tag];
    let i = a.indexOf(path);
    if (i >= 0)
        a.splice(i, 1);
    return (a);
}
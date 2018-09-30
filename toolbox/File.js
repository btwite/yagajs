/*
 *  File: @file
 *
 *  File related services.
 */
"use strict";

var Path = require('path');

module.exports = Object.freeze({
    resolvePath
});

/**
 * Function:    resolvePath
 * Description: Answers a fully qualified path name for a partial file specification.
 *              The path can contain the following type prefix:
 *                  require://<reqName>/... : Use the required module path.
 *                  module://<modTag>/...   : Use module in descriptor to get path.
 * 
 * @param {string} path : Full or relative path of the file to resolve.
 * @param {object} modDesc : Descriptor object with module tags and associated directory paths.
 *                           A 'default' entry should be provided to handle cases where
 *                           we have a partial file spec and no 'require' or 'module' format
 *                           type.
 *                           Descriptor can also hold aliases for 'require://' if the module
 *                           name includes path elements.  Ex. './module'.
 */
function resolvePath(path, modDesc) {
    if (modDesc && typeof modDesc !== 'object')
        throw new Error('Invalid module descriptor');
    // May have a fully qualified path to start with.
    if (typeof path !== 'string' || path.length <= 0)
        throw new Error('String required for file path');
    if (path[0] === '/' || (path.length > 1 && path[1] === ':'))
        return (path);

    let tyName = _resolveSpecType(path, 'require://');
    if (tyName) {
        let reqName = tyName;
        if (modDesc && typeof modDesc[tyName] === 'string')
            reqName = modDesc[tyName];
        let modPath = require.resolve(reqName);
        if (!modPath)
            throw new Error(`Module '${tyName}' cannot be found`);
        return (formResolvedPath(modPath, path.substr('require://'.length + tyName.length)));
    }

    tyName = _resolveSpecType(path, 'module://');
    if (tyName) {
        if (!modDesc || !modDesc[tyName])
            throw new Error(`Module tag '${tyName}' not found in module descriptor object`);
        let modPath = modDesc[tyName];
        if (typeof modPath === 'object' && modPath.filename)
            modPath = modPath.filename;
        if (typeof modPath !== 'string')
            throw new Error(`Module or module path expected for '${tyName}'`);
        return (formResolvedPath(modPath, path.substr('module://'.length + tyName.length)));
    }

    // Will need a 'default' descriptor entry for the module directory.
    if (!modDesc || !modDesc.default)
        throw new Error("Module tag 'default' not found in module descriptor object");
    let modPath = modDesc.default;
    if (typeof modPath === 'object' && modPath.filename)
        modPath = modPath.filename;
    if (typeof modPath !== 'string')
        throw new Error(`Module or module path expected for 'default'`);
    return (formResolvedPath(modPath, path));
}

function formResolvedPath(relFileName, suffix) {
    if (suffix[0] !== '/')
        suffix = '/' + suffix;
    return (Path.normalize(Path.dirname(relFileName).replace(/\\/g, '/') + suffix));
}

function _resolveSpecType(path, ty) {
    let i = path.indexOf(ty);
    if (i !== 0)
        return (null);
    let j = ty.length,
        k = path.indexOf('/', j);
    if (k <= j)
        throw new Error('Missing module name in file path');
    return (path.substring(j, k));
}
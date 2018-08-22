/*
 *  Loader: @file
 *
 *  Package loader that answers an exports object after 'requiring'
 *  package modules from a descriptor that defines the modules
 *  and dependency sequence.
 *
 *  Descriptor of the form:
 *		{
 *	 		initialiser: {
 *
 *			},
 *
 *			modules: {
 *				<name> : <seqNo> | <sourceFile> |
 *					 	[ <seqNo>, <sourceFile> ] |
 *					 	{
 *							sequence: <num>,
 *							source: <string>
 *					 	},
 *				...,
 *			},
 *
 *			path: '<root path for each module to load>'
 *		}
 */
"use strict";

module.exports = Object.freeze(load);

/**
 * Package loader function.
 * Note: The path can typically be set to the module's __dirname argument.
 */
function load(oInit, oDesc) {
	if (arguments.length <= 0)
		throw new Error(`Loader call requires minimum of a loader specification argument`);
	if (arguments.length === 1) {
		oDesc = oInit;
		oInit = undefined;
	}
	if (typeof oDesc !== 'object')
		throw new Error(`Invalid loader specification argument '${oDesc}'`);
	if (oInit !== undefined && typeof oInit !== 'object')
		throw new Error(`Invalid initialiser argument '${oInit}'`);

	let modPath = oDesc.path;
	if (typeof modPath !== 'string')
		throw new Error(`Invalid source path '${modPath}'`);
	if (typeof oDesc.modules !== 'object')
		throw new Error(`Invalid modules specification '${oDesc.modules}'`);

	let depList = [];
	Object.keys(oDesc.modules).forEach(name => addRequire(depList, name, name, oDesc.modules[name]));
	// Have an ordered dependency list so we can now load each package module.
	// Note that entries at level 0 are the least significant
	let exps = {};
	if (oDesc.initialiser)
		Object.assign(exps, oDesc.initialiser);
	if (oInit)
		Object.assign(exps, oInit);

	if (depList.length <= 0)
		return (exps);

	for (let i = 1; i < depList.length; i++) {
		let list = depList[i];
		if (!list) continue;
		list.forEach(req => doRequire(exps, req[0], req[1], modPath));
	}
	if (depList[0])
		depList[0].forEach(req => doRequire(exps, req[0], req[1], modPath));
	/**
	 * Initialise each module if they have provided an Initialise method.
	 */
	runInitPhase(exps, 'Initialise', exps);
	/**
	 * Initialise each module if they have provided a PostInitialise method.
	 * Allows modules to run initialisation processes that require
	 * access to other module services not just the module reference.
	 */
	runInitPhase(exps, 'PostInitialise');

	return (exps);
}

function runInitPhase(exps, sPhase, ...args) {
	Object.keys(exps).forEach(sProp => {
		let prop = exps[sProp];
		if (typeof prop === 'object' && typeof prop[sPhase] === 'function') {
			prop[sPhase](...args);
		}
	});
}

let RootExpr = /^(?:[a-zA-Z]\:)?\//;

function doRequire(exps, name, src, modPath) {
	// If the src path does not start at the file system root then we append to
	// the callers provided source directory path.
	if (!RootExpr.test(src))
		src = modPath + '/' + src;
	exps[name] = require(src);
}

function addRequire(depList, name, src, seq) {
	if (typeof src !== 'string')
		throw new Error(`Invalid source file name for '${name}'. Found(${src})`);
	switch (typeof seq) {
		case 'number':
			if (seq < 1)
				throw new Error(`Module sequence number must be >= 1. Found(${seq})`);
			break;
		case 'object':
			if (Array.isArray(seq)) {
				if (seq.length !== 2)
					throw new Error(`Expecting sequence number and source file name for '${name}'`);
				return (addRequire(depList, name, seq[1], seq[0]));
			}
			return (addRequire(depList, name, seq.source, seq.sequence));
			break;
		case 'string':
			src = seq;
			seq = 0;
			break;
		case 'undefined':
			seq = 0;
			break;
		default:
			throw new Error(`Invalid sequence number for '${name}'. Found(${seq})`);
			break;
	}
	if (!depList[seq]) depList[seq] = [];
	depList[seq].push([name, src]);
}
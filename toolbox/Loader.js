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
 *				<name> : <seqNo> | <sourceFile> | fExpValue
 *					 	[ <seqNo>, <sourceFile>, fExpValue ] |
 *					 	{
 *							sequence: <num>,
 *							source: <string>,
 *							export: fExpValue
 *					 	},
 *				...,
 *			},
 *
 *			path: '<root path for each module to load>'
 *		}
 *
 *  Notes:
 * 		1. Each module export object can contain an 'Initialise' function that is called
 * 		   after the Loader has required each module. This function is passed the completed
 * 		   package modules and exports object.
 * 		2. Each module export object can contain a 'PostInitialise' function that is called
 * 		   after each module has been initialised. This permits package modules to perform
 * 		   additional initialisation that requires access to module services.
 * 		3. Sequence should be specified where one package module has a dependency on another
 * 		   that cannot be resolved by the 'Initialise' & 'PostInitialise' phases.
 * 		4. Export value functions are bound with the module export list can can return a specific
 * 		   value or subset as required.
 * 		5. A module entry object descriptor must have at least two entries of any combination.
 */
"use strict";

let _ = undefined;

module.exports = Object.freeze({
	Loader
});

/**
 * Package loader function.
 * Note: The path can typically be set to the module's __dirname argument.
 */
function Loader(oDesc, oInit) {
	if (arguments.length <= 0)
		throw new Error(`Loader call requires minimum of a loader descriptor argument`);
	if (typeof oDesc !== 'object')
		throw new Error(`Invalid loader descriptor argument '${oDesc}'`);
	if (oInit !== undefined && typeof oInit !== 'object')
		throw new Error(`Invalid initialiser argument '${oInit}'`);

	let modPath = oDesc.path;
	if (typeof modPath !== 'string')
		throw new Error(`Invalid source path '${modPath}'`);
	if (typeof oDesc.modules !== 'object')
		throw new Error(`Invalid modules descriptor '${oDesc.modules}'`);

	let depList = [];
	Object.keys(oDesc.modules).forEach(name => addRequire(depList, name, name, oDesc.modules[name]));
	// Have an ordered dependency list so we can now load each package module.
	// Note that entries at level 0 are the least significant
	let exps = {},
		mods = {};
	if (oDesc.initialiser)
		Object.assign(exps, oDesc.initialiser);
	if (oInit)
		Object.assign(exps, oInit);

	if (depList.length <= 0)
		return (exps);

	for (let i = 1; i < depList.length; i++) {
		let list = depList[i];
		if (!list) continue;
		list.forEach(req => doRequire(mods, exps, req[0], req[1], req[2], modPath));
	}
	if (depList[0])
		depList[0].forEach(req => doRequire(mods, exps, req[0], req[1], req[2], modPath));
	/**
	 * Initialise each module if they have provided an Initialise method.
	 */
	runInitPhase(mods, 'Initialise', exps, mods);
	/**
	 * Initialise each module if they have provided a PostInitialise method.
	 * Allows modules to run initialisation processes that require
	 * access to other module services not just the module reference.
	 */
	runInitPhase(mods, 'PostInitialise', exps, mods);

	return (exps);
}

function runInitPhase(mods, sPhase, ...args) {
	Object.keys(mods).forEach(sProp => {
		let prop = mods[sProp];
		if (typeof prop === 'object' && typeof prop[sPhase] === 'function') {
			prop[sPhase](...args);
		}
	});
}

let RootExpr = /^(?:[a-zA-Z]\:)?\//;

function doRequire(mods, exps, name, src, fExport, modPath) {
	// If the src path does not start at the file system root then we append to
	// the callers provided source directory path.
	if (!RootExpr.test(src))
		src = modPath + '/' + src;
	let mod = require(src);
	mods[name] = mod;
	if (fExport) {
		let res = callExportFn(exps, mod, fExport, src);
		if (res)
			exps[name] = res;
	} else
		exps[name] = mod;
}

function callExportFn(exps, mod, fExport, src) {
	let helpers = {
		rollupModuleExports() {
			let modexps = Yaga.copy(mod);
			delete modexps.Initialise;
			delete modexps.PostInitialise;
			Object.keys(modexps).forEach(prop => {
				if (exps.hasOwnProperty(prop))
					throw new Error(`Attempting to rollup a duplicate export property '${prop}'. Module(${src})`);
				exps[prop] = modexps[prop];
			});
			return (_);
		},
		rollupSelectedExports(...args) {
			args.forEach(prop => {
				if (exps.hasOwnProperty(prop))
					throw new Error(`Attempting to rollup a duplicate export property '${prop}'. Module(${src})`);
				exps[prop] = mod[prop];
			});
			return (_);
		}
	};
	return (fExport(mod, helpers));
}

function addRequire(depList, name, src, seq, fExport) {
	if (typeof src !== 'string')
		throw new Error(`Invalid source file name for '${name}'. Found(${src})`);
	switch (typeof seq) {
		case 'number':
			if (seq < 1)
				throw new Error(`Module sequence number must be >= 1. Found(${seq})`);
			break;
		case 'object':
			if (Array.isArray(seq)) {
				if (seq.length !== 3)
					throw new Error(`Expecting sequence number, source name and export function for '${name}'`);
				return (addRequire(depList, name, seq[1], seq[0], seq[2]));
			}
			src = seq.source || name;
			fExport = seq.export;
			if ((seq = seq.sequence) === undefined) seq = 0;
			return (addRequire(depList, name, src, seq, fExport));
			break;
		case 'string':
			src = seq;
			seq = 0;
			break;
		case 'function':
			fExport = seq;
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
	depList[seq].push([name, src, fExport]);
}
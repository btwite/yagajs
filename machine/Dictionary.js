/*
 *  Dictionary: @file
 * 
 *  This module contains the behaviour for creating a LoadedDictionary from one or more
 *  Dictionary segments.
 *
 *  A LoadedDictionary is a loosely coupled dependency hierachy of Dictionaries with 
 *  the root Dictionary segment set to the Yaga core dictionary definitions (which can 
 *  also be extended and overwritten).
 *  Yaga instance initialisation allows the instance to be assigned a list of startup 
 *  Dictionaries that will be typically loaded from an initialisation script of 
 *  Yaga expressions. The list is assumed to be ordered with most significant dictionary
 *  segment first in the list. 
 * 
 *  Each Dictionary can contain a dependency list
 * 		(dictionaryDependsOn "source path" | ("source path" ...))
 *  that must be the first expression in the Dictionary. If specified the 
 *  dependencies will be processed recursively.
 * 
 *  Each Yaga instance contains two dictionary spaces. The first is known as the Immutable
 *  Dictionary Space (IDS) and contains all loaded segments folded into the space from
 *  least significant to most signicant, including allowance for dependencies. The second
 *  is the Mutable Dictionary Space (MDS) which inherits from the IDS and holds all new or 
 *  updated dictionary definitions created during the life of the Yaga instance.
 * 
 *  The process of reading a Dictionary makes use of the IDS & MDS as follows:
 *  	1. Dictionary "foo" has dependencies of "bar" and "foobar"
 * 		2. If "bar" has not been read then recursively apply process to "bar"
 * 		3. If "foobar" dictionary has not been read then recursively apply process to "foobar"
 * 		4. Fold root segment(s) into the IDS. Note that root dictionary may have dependencies.
 *      5. Recursively fold "foobar" dependent segments into the IDS. Note that a
 *         Dictionary segment may be referenced multiple times as a dependent however only the
 * 		   least significant reference is folded.
 * 		6. Fold "foobar" into IDS.
 * 		7. Repeat for "bar"
 * 		8. Read, bind and evaluate the "foo". Definitions will be loaded into the MDS.
 * 		9. Save the MDS as the binary Dictionary representation for "foo".
 *  
 *  The above process is applied until all Dictionaries have been resolved down to their
 *  binary form. Once this is complete a final fold is performed on the list of 
 *  Dictionaries assigned to the Yaga instance.
 * 
 *  The script can also specify a Dictionary name with the expression 
 *  (dictionaryName "myDictionary"). The name is used to reference a specific Dictionary
 *  entry. For example the symbol 'foo:bar' will attempt to bind to the entry 'bar' in
 *  the Dictionary named 'foo'. If this fails then a lookup will attempt to bind to
 *  the 'foo:bar' symbol in the overall LoadedDictionary space.
 *  Note that a symbol contains multiple ':' characters then the lookup will process
 *  these left to right.
 * 
 *  LoadedDictionary has a static function 'fromDescriptor'that accepts a descriptor object of the 
 *  following format:
 * 		{
 * 			coreDictionary: <path>,
 * 			dictionary: <path>,
 * 			dictionaries: [ <path>, ... ],
 * 			fReadDictionary: function(LoadedDictionary, <path of dictionary to read>),
 * 			modules: Object as per 'File.resolvePath' specification.
 * 		}
 */
"use strict";

let _ = undefined;

var Yaga = require('../Yaga');
var Dictionaries = new Map();
var NamedDictionaries = new Map();

var Dictionary = Yaga.Influence({
	name: 'Dictionary',
	constructor(name, depends, spaceTemplate) {
		if (name) {
			if (NamedDictionaries.get(name))
				throw new Error(`A dictionary named '${name}' already exists`);
			NamedDictionaries.set(name, this);
		}
		return {
			name: name,
			dependencies: depends,
			space: Object.assign(Object.create(null), spaceTemplate),
		}
	}
});


({
	setDependsOn: _setDependsOn,
	setName: _setName,
	define: _define,
	redefine: _redefine,
	find: _find,
	findString: _findString,
	print: _print,
	printAll: _printAll,
});

var LoadedDictionary = Yaga.Influence({
	name: 'LoadedDictionary',
	prototype: {
		thisArg_: {
			dictionaryDependsOn,
			dictionaryName,
		},
		get mds() {
			return (this.space);
		},
		get ids() {
			return (Object.getPrototypeOf(this.space));
		},
	},
	constructor(coreDictPath, dictPaths, fReadDictionary, modules) {
		let coreDict = loadDictionary(coreDictPath, undefined, fReadDictionary, modules);
		let dicts = [];
		if (dictPaths) {
			if (!Array.isArray(dictpaths))
				dictPaths = [dictPaths];
			dictPaths.forEach(dictPath => dicts.push(loadDictionary(dictPath, coreDictPath, fReadDictionary, modules)));
		}
		// Save the dictionaries in reverse order for folding.
		dicts = Yaga.reverseCopy(dicts);
		return {
			freeze_: {
				space: loadDictionarySpace(coreDict, dicts),
				coreDictionary: coreDict,
				dictionaries: dicts,
				configuration: {
					coreDictionary: coreDictPath,
					dictionaries: dictPaths,
					fReadDictionary: fReadDictionary,
					modules: modules
				}
			},
			// Properties to save a dictionary name and dependencies that will be picked up during the
			// read-bind-evaluate process of a dictionary script that is loaded.
			// Dependencies are ordered from most to least significant.
			dictionaryName: _,
			dictionaryDependencies: _,
		};
	},
	static: {
		fromDescriptor
	}
});

module.exports = Object.freeze({
	LoadedDictionary: LoadedDictionary.create,
});

function dictionaryName(ld, name) {
	if (typeof name !== 'string')
		throw new Error('String expected for Dictionary name');
	if (ld.dictionaryName)
		throw new Error(`A Dictionary name '${ld.dictionaryName}' has aleady been defined`);
	ld.dictionaryName = name;
}

function dictionaryDependsOn(ld, dictPaths) {
	if (!Array.isArray(dictPaths))
		throw new Error('Array expected for Dictionary dependencies');
	if (ld.dictionaryDependencies)
		throw new Error('Dictionary dependencies have aleady been defined');
	let dicts = [];
	dictPaths.forEach(dictPath => {
		dicts.push(loadDictionary(dictPath,
			ld.configuration.coreDictionary,
			ld.configuration.fReadDictionary,
			ld.configuration.modules));
	});
	ld.dictionaryDependencies = Yaga.reverseCopy(dicts);
}

function loadDictionarySpace(coreDict, dicts) {
	let ids = Object.create(null), // Dictionary space cannot inherit from Object.
		mds = Object.create(ids),
		foldMap = new Set();
	// Firstly fold the core dictionary and related dependencies into the ids.
	foldDictionary(ids, coreDict, foldMap);
	// Now fold all the user defined dictionaries in least significant order.
	// Note dictionaries list has already been reversed
	dicts.forEach(dict => foldDictionary(ids, dict, foldMap));
	Object.freeze(ids);
	return (mds);
}

function foldDictionary(ids, dict, foldMap) {
	if (foldMap.get(dict))
		return; // Least significant occurrence has already been folded
	if (dict.dependencies) {
		// Need to process dependencies first in least significant order.
		// Note that the list has already been reversed.
		dict.dependencies.forEach(dict => foldDictionary(ids, dict, foldMap));
	}
	// Fold the dictionary space into the LoadedDictionary ids.
	Object.assign(ids, dict.space);
	foldMap.set(dict);
}

function loadDictionary(dictPath, coreDictPath, fReadDictionary, modules) {
	if (!dictPath)
		return (null);
	let resPath = Yaga.resolvePath(dictPath, modules);
	let dict = Dictionaries.get(resPath);
	if (!dict) {
		// Create a LoadedDictionary with just the Core Dictionary and then request
		// that the Dictionary be read against this core.
		let ld = LoadedDictionary.create(coreDictPath, null, fReadDictionary, modules);
		fReadDictionary(ld, resPath);
		// Our Dictionary has been read and the definitions are located in the mds
		// component of the LoadedDictionary space. Use this as a template for creating
		// the dictionary object.
		dict = Dictionary.create(ld.dictionaryName, ld.dictionaryDependencies, ld.mds);
	}
	return (dict);
}

function fromDescriptor(oDesc) {
	validateDescriptor(oDesc);
	return (LoadedDictionary.create(oDesc.coreDictionary,
		oDesc.dictionary ? [oDesc.dictionary] : oDesc.dictionaries,
		oDesc.fReadDictionary, oDesc.modules));
}

function validateDescriptor(oDesc) {
	Yaga.dispatchPropertyHandlers(oDesc, {
		coreDictionary: prop => validateTypedProperty(oDesc, prop, 'string'),
		dictionary: prop => validateTypedProperty(oDesc, prop, 'string'),
		dictionaries: prop => validateTypedArrayProperty(oDesc, prop, 'string'),
		fReadDictionary: prop => validateTypedProperty(oDesc, prop, 'function'),
		modules: prop => undefined, // Leave this for 'resolvePath' to handle
		_other_: prop => {
			throw new Error(`Invalid descriptor property '${prop}'`);
		}
	});
	if (oDesc.dictionary && oDesc.dictionaries)
		throw new Error(`Can only have one of either 'dictionary' or 'dictionaries'`);
	if (!oDesc.fReadDictionary)
		throw new Error(`Descriptor must have a 'fReadDictionary' property`);
}

function validateTypedProperty(oDesc, prop, type) {
	if (typeof oDesc[prop] !== type)
		throw new Error(`Descriptor property '${prop}' must be a '${type}'`);
}

function validateTypedArrayProperty(oDesc, prop, type) {
	if (!Array.isArray(oDesc[prop]))
		throw new Error(`Descriptor property '${prop}' must be an Array of '${type}'`);
	oDesc[prop].forEach(val => {
		if (typeof val !== type)
			throw new Error(`Descriptor property '${prop}' value '${val}' must be a '${type}'`);
	});
}


function _loadDictionary(yi, optPath) {
	_getCoreDictionary(yi);
	if (!optPath) return (_createDictionaryInstance(_core));
	let dict = _getDictionary(yi, optPath);
	return (_createDictionaryInstance(dict))
}

function _getDictionary(yi, path) {
	let dict = _dictionaries[path];
	if (dict) return (dict);
	dict = Object.create(_dictionary);
	dict._space = Object.create(_core._space);
	_evaluateDictionary(yi, dict, path);
	return (dict);
}

function _getCoreDictionary(yi, optPath) {
	if (_core) return (_core);
	let path = yi._options.yagaCorePath;
	if (!path) path = yaga.resolveFileName('core.yaga', module);
	_core = Object.create(_dictionary);
	_core._space = Object.create(null);

	// Before evaluating the core definitions we will need to create the '.jsPrim' macro for
	// loading JavaScript primitive functions for handling low level operations.
	let jfn = yi._options.jsPrimLoader;
	if (!jfn) jfn = yaga.Primitives.jsPrimLoader.bind(yaga.Primitives);
	let desc = [yaga.Symbol.new('macro'), yaga.Symbol.new('jsPrim')];
	_core.define('.jsPrim', yaga.Function.Macro.jsNew(desc, jfn));
	_evaluateDictionary(yi, _core, path);
	return (_core);
}

function _evaluateDictionary(yi, dict, path) {
	dict.parent = _core;
	yi.evaluateDictionary(dict, path);
	if (!dict.name) dict.name = path;
	_dictionaries[path] = dict;
}

function _createDictionaryInstance(parentDict) {
	let dict = Object.create(_dictionary);
	dict.parent = parentDict;
	dict._space = Object.create(parentDict._space);
	dict.name = '<local>'
	return (dict);
}


function _define(sym, e) {
	if (e.value() === undefined) {
		throw yaga.errors.DictionaryException(sym, `'undefined' can not be assigned to a definition`);
	}
	if (this._space[sym] && Object.getOwnPropertyDescriptor(this._space, sym)) {
		throw yaga.errors.DictionaryException(sym, `'${sym}' is already defined`);
	}
	this._space[sym] = e;
}

function _redefine(sym, e) {
	if (e === undefined) {
		throw yaga.errors.DictionaryException(sym, `'undefined' can not be assigned to a definition`);
	}
	this._space[sym] = e;
}

function _find(sym) {
	return (this._space[sym.asString()]);
}

function _findString(s) {
	return (this._space[s]);
}

function _setDependsOn(yi, path, mod) {
	if (mod) path = yaga.resolveFileName(path, require(mod));
	this.parent = _getDictionary(yi, path);
	this._space = Object.assign(Object.create(this.parent._space), this._space);
}

function _setName(yi, name) {
	this.name = name;
}

function _printAll(yi, stream) {
	let dict = this;
	for (; dict.parent != dict; dict = dict.parent) dict.print(yi, stream);
	dict.print(yi, stream);
}

function _print(yi, stream) {
	stream.write(`Dictionary(${this.name}) ::\n`)
	let space = this._space;
	Object.keys(space).forEach(key => {
		stream.write(`  ${key}: `);
		yi.print(space[key], stream, `  ${key}: `.length + 2);
	});
}
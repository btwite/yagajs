/*
 *  Dictionary: @file
 * 
 *  This module contains the behaviour for creating a GlobalDictionary from one or more
 *  Dictionary segments, as well as loading inidividual dictionaries.
 *
 *  A GlobalDictionary is a loosely coupled dependency hierachy of Dictionaries with 
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
 *  the 'foo:bar' symbol in the overall GlobalDictionary space.
 *  Note that a symbol contains multiple ':' characters then the lookup will process
 *  these left to right.
 * 
 *  GlobalDictionary has a static function 'fromDescriptor'that accepts a descriptor object of the 
 *  following format:
 * 		{
 * 			name: <string>,	// Optional tag to be assigned to the GlobalDictionary
 * 			coreDictionary: <path>,
 * 			dictionary: <path>,
 * 			dictionaries: [ <path>, ... ],
 * 			fReadDictionary: function(GlobalDictionary, <path of dictionary to read>),
 * 		}
 */
"use strict";

let _ = undefined;

var Yaga = require('../Yaga');
var Dictionaries = new Map();
var NamedDictionaries = new Map();

var Dictionary = Yaga.Influence({
	name: 'yaga.Dictionary',
	prototype: {
		thisArg_: {
			find: findDictionary,
			print: _printDictionary,
		}
	},
	constructor(path, name, depends, spaceTemplate) {
		if (name) {
			if (NamedDictionaries.get(name))
				throw DictionaryError(`A dictionary named '${name}' already exists`);
			NamedDictionaries.set(name, this);
		}
		return {
			freeze_: {
				name: name || path,
				dependencies: Object.freeze(Yaga.copy(depends)),
				space: Object.freeze(Object.assign(Object.create(null), spaceTemplate)),
			}
		}
	}
});

var GlobalDictionary = Yaga.Influence({
	name: 'yaga.GlobalDictionary',
	prototype: {
		thisArg_: {
			setDictionaryDependencies,
			setDictionaryName,
			define,
			redefine,
			find: findGlobalDictionary,
			print: printGlobalDictionary,
		},
		loadDictionary(dictPath) {
			return (loadDictionary(dictPath, this.configuration.coreDictionary, this.configuration.fReadDictionary));
		},
		get mds() {
			return (this.space);
		},
		get ids() {
			return (Object.getPrototypeOf(this.space));
		},
	},
	constructor(coreDictPath, dictPaths, fReadDictionary, name) {
		let coreDict = loadDictionary(coreDictPath, undefined, fReadDictionary);
		let dicts = [];
		if (dictPaths) {
			if (!Array.isArray(dictPaths))
				dictPaths = [dictPaths];
			dictPaths.forEach(dictPath => dicts.push(loadDictionary(dictPath, coreDictPath, fReadDictionary)));
		}
		// Save the dictionaries in reverse order for folding.
		dicts = Yaga.reverseCopy(dicts);
		return {
			freeze_: {
				name: name || '<anonymous>',
				space: loadGlobalDictionarySpace(coreDict, dicts),
				coreDictionary: coreDict,
				dictionaries: dicts,
				configuration: {
					coreDictionary: coreDictPath,
					dictionaries: dictPaths,
					fReadDictionary: fReadDictionary,
				}
			},
			// Properties to save a dictionary name and dependencies that will be picked up during the
			// read-bind-evaluate process of a dictionary script that is loaded.
			// Dependencies are ordered from most to least significant, and then reversed within.
			dictionaryName: _,
			dictionaryDependencies: _,
		};
	},
	static: {
		fromDescriptor,
		printDictionaries,
		printDictionary
	}
});

module.exports = Object.freeze({
	GlobalDictionary: GlobalDictionary.create,
});

function setDictionaryName(gd, name) {
	if (typeof name !== 'string')
		throw DictionaryError('String expected for Dictionary name');
	if (gd.dictionaryName)
		throw DictionaryError(`A Dictionary name '${gd.dictionaryName}' has aleady been defined`);
	gd.dictionaryName = name;
}

function setDictionaryDependencies(gd, dictPaths) {
	if (!Array.isArray(dictPaths))
		dictPaths = [dictPaths];
	if (gd.dictionaryDependencies)
		throw DictionaryError('Dictionary dependencies have aleady been defined');
	let dicts = [];
	dictPaths.forEach(dictPath => {
		if (typeof dictPath !== 'string')
			throw DictionaryError('Expecting a String for Dictionary dependency');
		dicts.push(loadDictionary(dictPath,
			gd.configuration.coreDictionary,
			gd.configuration.fReadDictionary));
	});
	gd.dictionaryDependencies = Yaga.reverseCopy(dicts);
}

function loadGlobalDictionarySpace(coreDict, dicts) {
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
	if (!dict || foldMap.has(dict))
		return; // Least significant occurrence has already been folded
	if (dict.dependencies) {
		// Need to process dependencies first in least significant order.
		// Note that the list has already been reversed.
		dict.dependencies.forEach(dict => foldDictionary(ids, dict, foldMap));
	}
	// Fold the dictionary space into the GlobalDictionary ids.
	Object.assign(ids, dict.space);
	foldMap.add(dict);
}

function loadDictionary(dictPath, coreDictPath, fReadDictionary) {
	if (!dictPath)
		return (null);
	let resPath = Yaga.Paths.resolve(dictPath);
	let dict = Dictionaries.get(resPath);
	if (!dict) {
		// Create a GlobalDictionary with just the Core Dictionary and then request
		// that the Dictionary be read against this core.
		let gd = GlobalDictionary.create(coreDictPath, null, fReadDictionary);
		fReadDictionary(gd, resPath);
		// Our Dictionary has been read and the definitions are located in the mds
		// component of the GlobalDictionary space. Use this as a template for creating
		// the dictionary object.
		dict = Dictionary.create(resPath, gd.dictionaryName, gd.dictionaryDependencies, gd.mds);
		Dictionaries.set(resPath, dict);
	}
	return (dict);
}

function fromDescriptor(oDesc) {
	validateDescriptor(oDesc);
	return (GlobalDictionary.create(oDesc.coreDictionary,
		oDesc.dictionary ? [oDesc.dictionary] : oDesc.dictionaries,
		oDesc.fReadDictionary, oDesc.name));
}

function keyToString(key) {
	switch (typeof key) {
		case 'string':
			return (key);
		case 'object':
			if (typeof key.asString === 'function')
				return (key.asString());
	}
	return (String(key));
}

function define(gd, key, value) {
	key = keyToString(key);
	if (Object.getOwnPropertyDescriptor(gd.space, key))
		throw DictionaryError(key, `'${key}' is already defined`);
	_define(gd, key, value);
}

function redefine(gd, key, value) {
	_define(gd, keyToString(key), value);
}

function _define(gd, key, value) {
	Object.defineProperty(gd.space, key, {
		value: value,
		configurable: false,
		writable: true,
		enumerable: true
	});
}

function findGlobalDictionary(gd, key) {
	key = keyToString(key);
	let v = findDictionaryValue(key);
	return (v !== undefined ? v : gd.space[key]);
}

function findDictionaryValue(key, iEnd = key.length) {
	let i = key.lastIndexOf(':', iEnd);
	if (i < 0) return (undefined);
	let dict = NamedDictionaries.get(key.substr(0, i));
	if (dict) {
		let v = dict.find(key.substr(i + 1));
		if (v !== undefined) return (v);
	}
	return (i > 0 ? findDictionaryValue(key, i - 1) : undefined);
}

function findDictionary(dict, key) {
	return (dict.space[keyToString(key)])
}

function printGlobalDictionary(gd, stream, fPrinter) {
	stream.write(`GlobalDictionary(${gd.name}-IDS) ::\n`)
	printSpace(gd.ids, stream, fPrinter);
	stream.write(`GlobalDictionary(${gd.name}-MDS) ::\n`)
	printSpace(gd.mds, stream, fPrinter);
}

function printDictionaries(stream, fPrinter) {
	stream.write(`Printing Dictionaries ....\n`);
	Dictionaries.forEach(dict => dict.print(stream, fPrinter));
	stream.write(`--------------------------\n`);
}

function printDictionary(name, stream, fPrinter) {
	let dict = NamedDictionaries.get(name) || Dictionaries.get(Yaga.Paths.resolve(name));
	if (!dict)
		throw new Error(`Dictionary '${name}' not found`);
	dict.print(stream, fPrinter);
}

function _printDictionary(dict, stream, fPrinter) {
	stream.write(`Dictionary(${dict.name}) ::\n`)
	printSpace(dict.space, stream, fPrinter);
}

function printSpace(space, stream, fPrinter) {
	Object.keys(space).forEach(key => {
		stream.write(`  ${key}: `);
		let v = space[key];
		if (fPrinter)
			fPrinter(v, `  ${key}: `.length + 2, stream);
		else
			stream.write(`${String(v)}\n`);
	});
}

function validateDescriptor(oDesc) {
	Yaga.dispatchPropertyHandlers(oDesc, {
		name: prop => validateTypedProperty(oDesc, prop, 'string'),
		coreDictionary: prop => validateTypedProperty(oDesc, prop, 'string'),
		dictionary: prop => validateTypedProperty(oDesc, prop, 'string'),
		dictionaries: prop => validateTypedArrayProperty(oDesc, prop, 'string'),
		fReadDictionary: prop => validateTypedProperty(oDesc, prop, 'function'),
		_other_: prop => {
			throw DictionaryError(`Invalid descriptor property '${prop}'`);
		}
	});
	if (oDesc.dictionary && oDesc.dictionaries)
		throw DictionaryError(`Can only have one of either 'dictionary' or 'dictionaries'`);
	if (!oDesc.fReadDictionary)
		throw DictionaryError(`Descriptor must have a 'fReadDictionary' property`);
}

function validateTypedProperty(oDesc, prop, type) {
	if (typeof oDesc[prop] !== type)
		throw DictionaryError(`Descriptor property '${prop}' must be a '${type}'`);
}

function validateTypedArrayProperty(oDesc, prop, type) {
	if (!Array.isArray(oDesc[prop]))
		throw DictionaryError(`Descriptor property '${prop}' must be an Array of '${type}'`);
	oDesc[prop].forEach(val => {
		if (typeof val !== type)
			throw DictionaryError(`Descriptor property '${prop}' value '${val}' must be a '${type}'`);
	});
}

// Exceptions
var DictionaryError = Yaga.Exception({
	name: 'yaga.machine.DictionaryError',
	constructor(key, msg) {
		if (msg === undefined)
			return (key);
		this.key = key;
		return (msg);
	}
});
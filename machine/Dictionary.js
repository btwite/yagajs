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
 *  The LoadedDictionary constructor accepts a descriptor object of the following format:
 * 		{
 * 			coreDictionary: <path>,
 * 			dictionary: <path>,
 * 			dictionaries: [ <path>, ... ],
 * 			fReadDictionary: function(LoadedDictionary, <path of dictionary to read>),
 * 			modules: {
 * 				<modTag>: module object | module Name | undefined,
 * 				...
 * 			}
 * 		}
 * 
 *  The dictionary path can take the following forms:
 * 		1. Fully qualified path name.
 * 		2. Module relative path of the form: module://<modTag>/...
 * 		   If the module specification is a string then this will be assumed to be
 * 		   a module that can be loaded using 'require'. The <modTag> entry is
 * 		   optional if the tag is the actual name to be required.
 */
"use strict";

let _ = undefined;

var Yaga = require('../Yaga');

_dictionary = {
	typeName: 'Dictionary',
	name: undefined,
	parent: undefined,
	_space: undefined,
	isaDictionary: true,
	setDependsOn: _setDependsOn,
	setName: _setName,
	define: _define,
	redefine: _redefine,
	find: _find,
	findString: _findString,
	print: _print,
	printAll: _printAll,
}

var LoadedDictionary = Yaga.Influence({
	name: 'LoadedDictionary',
	prototype: {
		thisArg_: {
			dictionaryDependsOn,
			dictionaryName,
		}
	},
	constructor(oDesc) {
		validateDescriptor(oDesc);
	}
});

module.exports = Object.freeze({
	LoadedDictionary: LoadedDictionary.create,
});

function validateDescriptor(oDesc) {
	Yaga.dispatchPropertyHandlers(oDesc, {
		coreDictionary: prop => validateTypedProperty(oDesc, prop, 'string'),
		dictionary: prop => validateTypedProperty(oDesc, prop, 'string'),
		dictionaries: prop => validateTypedArrayProperty(oDesc, prop, 'string'),
		fReadDictionary: prop => validateTypedProperty(oDesc, prop, 'function'),
		modules: () => validateModules(oDesc.modules),
		_other_: prop => {
			throw new Error(`Invalid descriptor property '${prop}'`);
		}
	});
	if (oDesc.dictionary && oDesc.dictionaries)
		throw new Error(`Can only have one of either 'dictionary' or 'dictionaries'`);
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

function validateModules(oMods) {
	Object.keys(oMods).forEach()
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
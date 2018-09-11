/*
 *  Dictionary: @file
 * 
 *  This module contains the behaviour for creating dictionaries and a dictionary hierachy.
 *
 *  Yaga dictionaries contain the yaga immutable definitions. Dictionaries are arranged
 *  into a loosely coupled dependency hierachy with the root dictionary set to the yaga 
 *  core dictionary (which can also be extended and overwritten).
 *  Yaga instance initialisation allows the instance to be assigned a list of startup 
 *  dictionaries that will be typically loaded from an initialisation script of yaga 
 *  expressions. The list is assumed to be ordered with most significant dictionary
 *  first in the list. 
 * 
 *  Each dictionary can contain a dependency list
 * 		(dictionaryDependsOn "source path" | ("source path" ...))
 *  that must be the first expression in the dictionary. If specified the dependencies
 *  will be processed recursively.
 * 
 *  Each yaga instance contains two dictionary spaces. The first is known as the Yaga
 *  Dictionary Space (YDS) and contains all loaded dictionaries folded into the space from
 *  least significant to most signicant, including allowance for dependencies. The second
 *  is the Local Dictionary Space (LDS) which inherits from the Yaga Dictionary Space and
 *  holds all new or updated dictionary definitions created for the yaga instance.
 * 
 *  Dictionary loading makes use of the YDS & LDS as follows:
 *  	1. Dictionary "foo" has dependencies of "bar" and "foobar"
 * 		2. If "bar" dictionary has not been loaded then recursively apply process to "bar"
 * 		3. If "foobar" has not been loaded then recursively apply process to "foobar"
 * 		4. Fold root dictionary(s) into the YDS. Note that root
 * 		   dictionaries may have dependencies.
 *      5. Recursively fold "foobar" dependent dictionaries into the YDS. Note that a
 *         dictionary may be referenced multiple times as a dependent however only the
 * 		   least significant reference is folded.
 * 		6. Fold "foobar" into YDS.
 * 		7. Repeat for "bar"
 * 		8. Read, bind and evaluate the "foo". Definitions will be loaded into the 
 * 		   LDS.
 * 		9. Save the LDS as the binary dictionary representation for "foo".
 *  
 *  The above process is applied until all dictionaries have been resolved down to their
 *  binary form. Once this is complete a final fold is performed on the list of dictionaries
 *  assigned to the instance.
 * 
 *  The script can also specify a name with the expression (dictionaryName "myDictionary").
 */
"use strict";

var yaga, _dictionary, _core;
var _dictionaries = {};

module.exports = {
	load: _loadDictionary,
	core: () => _core,
	Initialise: (y) => {
		yaga = yaga ? yaga : y;
	},
};

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
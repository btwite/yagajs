/*
 *  Dictionary: @file
 *
 *  Yaga dictionaries contain the yaga immutable definitions. Dictionaries are arranged
 *  in hierachies with the root dictionary always set to the yaga core dictionary.
 *  Yaga instance initialisation allows the instance to be assigned a startup dictionary
 *  that will be typically loaded from an initialisation script of yaga expressions.
 *  Any dependencies are also loaded at that time, although the dependency is defined in
 *  the script by the expression (dictionaryDependsOn "source path"). The script can also
 *  specify a name with the expression (dictionaryName "myDictionary").
 * 
 *  The yaga instance is assigned a child dictionary for further definitions and overrides,
 *  as the preloaded hierachy are immutable and reusable across yaga instances.
 * 
 *  This module contains the behaviour for creating dictionaries and a dictionary hierachy.
 */
"use strict";

var yaga, _dictionary, _core;
var _dictionaries = {};

module.exports = {
	load: _loadDictionary,
	Initialise: (y) => {
		yaga = yaga ? yaga : y;
	}
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
	if (!jfn) jfn = yaga.Primitives.jsPrimLoader;
	_core.define('.jsPrim', yaga.Functions.Macro.jsNew(yaga.List.nil(), jfn));
	_evaluateDictionary(yi, _core, path);
	return (_core);
}

function _evaluateDictionary(yi, dict, path) {
	dict.parent = _core;
	yi.evaluateDictionary(dict, path);
	_dictionaries[path] = dict;
}

function _createDictionaryInstance(parentDict) {
	let dict = Object.create(parentDict);
	dict._space = Object.create(parentDict._space);
	return (dict);
}


_dictionary = {
	typeName: 'Dictionary',
	name: undefined,
	parent: undefined,
	_space: undefined,
	isaDictionary: true,
	dictionaryDependsOn: _dictionaryDependsOn,
	dictionaryName: _dictionaryName,
	define: _define,
	redefine: _redefine,
	find: _find,
}

function _define(sym, e) {
	if (e === undefined) {
		throw yaga.errors.DictionaryException(sym, `'undefined' can not be assigned to a definition`);
	}
	let s = sym;
	if (typeof sym !== 'string') s = sym.value;
	if (this._space[s] && Object.getOwnPropertyDescriptor(this._space, s)) {
		throw yaga.errors.DictionaryException(sym, `'${s}' is already defined`);
	}
	this._space[s] = e;
}

function _redefine(sym, e) {
	if (e === undefined) {
		throw yaga.errors.DictionaryException(sym, `'undefined' can not be assigned to a definition`);
	}
	let s = sym;
	if (typeof sym !== 'string') s = sym.value;
	this._space[s] = e;
}

function _find(sym) {
	let s = sym;
	if (typeof sym !== 'string') s = sym.value;
	return (this._space[s]);
}

function _dictionaryDependsOn(yi, path) {
	this._parent = _getDictionary(yi, path);
	this._space = Object.assign(Object.create(this.parent._space), this._space);
}

function _dictionaryName(yi, name) {
	this._name = name;
}

/*

var _privateNamespaces = [];
var _nextID = 0;

function _newPrivateNamespace(parent) {
	if (_privateNamespaces.length == 0) {
		if (parent) {
			let o = Object.create(_namespace);
			return (o.initNamespace(parent).setPrivate());
		}
		return (_newRootNamespace().setPrivate());
	}
	return (_privateNamespaces.pop().initNamespace());
}

function _release(ns) {
	_privateNamespaces.push(ns);
}

function _newPublicNamespace(sName, parent) {
	if (!parent) parent = _core; // Default to core as the root parent.
	let o = Object.create(_namespace);
	return (o.initNamespace(parent).setPublic(sName));
}

function _createCoreNamespace() {
	_core = Object.create(_root);
	_core.initNamespace().setPublic('.core');
	return (_core);
}

function _newRootNamespace() {
	let o = Object.create(_root);
	return (o.initNamespace());
}

function _newLocalNamespace(name, owner) {
	let o = Object.create(_local);
	o.initNamespace(owner);
	_setLocalName(o, name.symbol(), owner, name);
	return (o);
}

_namespace = {
	typeName: 'Namespace',
	initNamespace(parent) {
		this._space = {};
		this._parent = parent === undefined ? this : parent;
		return (this);
	},
	release() {
		if (isPublic())
			return;
		_release(this);
		return (this);
	},
	setPublic(sName) {
		this._name = yc.AtomNamespace.new(sName, this);
		_core.addStringBinding(sName, this._name);
		return (this);
	},
	setPrivate() {
		this._id = ++_nextID;
		return (this);
	},
	setName(atomspace) {
		return (this._name = atomspace);
	},
	name() {
		if (this._name === null) {
			return (yc.AtomNamespace.new(`PrivateNamespace:${this._id}`, this));
		}
		return (this._name);
	},
	isPrivate() {
		return (this._name === null);
	},
	isPublic() {
		return (_name !== null);
	},
	isLocal: () => false,
	isRoot: () => false,
	parent() {
		return (this._parent);
	},
	tryLocalBind(name) {
		return (this.tryLocalBindSymbol(name.symbol()));
	},
	tryLocalBindSymbol(sym) {
		let s = sym.asjString();
		if (!this._space.hasOwnProperty(s)) return (null);
		return (this._space[s]);
	},
	localbind(name) {
		return (this.localBindSymbol(name.symbol(), name));
	},
	localBindSymbol(sym, e) {
		let entry = this.tryLocalBindSymbol(sym);
		if (entry === null)
			throw yc.errors.NamespaceException(e, `Unable to locally bind name '${sym.asjString()}'`);
		return (entry);
	},
	tryBind(name) {
		return (this.tryBindSymbol(name.symbol()));
	},
	tryBindSymbol(sym) {
		let entry = this._space[sym.asjString()];
		if (!entry)
			return (null);
		return (entry);
	},
	bind(name) {
		return (this.bindSymbol(name.symbol(), name));
	},
	bindSymbol(sym, e) {
		let entry = this.tryBindSymbol(sym);
		if (entry === null)
			throw yc.errors.NamespaceException(e, `Unable to bind name '${sym.asjString()}'`);
		return (entry);
	},
	checkLocalBind(name) {
		return (tryLocalBind(name) !== null);
	},
	checkLocalBindSymbol(sym) {
		return (tryLocalBindSymbol(sym) !== null);
	},
	checkBind(name) {
		return (tryBind(name) !== null);
	},
	checkBindSymbol(sym) {
		return (tryBindSymbol(sym) !== null);
	},
	addBinding(name, e) {
		return (addSymbolBinding(name.symbol(), e, name));
	},
	addSymbolBinding(sym, e, src) {
		let s = sym.asjString();
		if (checkLocalBindSymbol(sym))
			throw yc.errors.NamespaceException(src, `Name '${s}' is already bound`);
		this._space[_s] = {
			namespace: this,
			element: e
		};
		return (e);
	},
	removeBinding(name) {
		let s = name.symbol().asjString();
		if (!this._space.hasOwnProperty(s)) return (false);
		delete this._space[s];
		return (true);
	}
};

_root = Object.assign(Object.create(_namespace), {
	typeName: 'Namespace.Root',
	addStringBinding(s, e) {
		// Used to initialise key public entries at startup
		this._space[s] = {
			namespace: this,
			element: e
		};
		return (e);
	},
	isRoot: () => true,
});

_local = Object.assign(Object.create(_namespace), {
	typeName: 'Namespace.Local',
	isPrivate: () => false,
	isPublic: () => false,
	isLocal: () => true,
});

function _setLocalName(that, sym, owner, src) {
	owner.addSymbolBinding(sym, that.setName(_prepareLocalName(sym, owner)), src);
}

function _prepareLocalName(sym, owner) {
	return (yc.AtomNamespace.new(_getOwnerPrefix(owner) + sym.asjString(), this));
}

function _getOwnerPrefix(owner) {
	if (owner.isPublic())
		return (owner.name().asjString() + "::");
	return (_getOwnerPrefix(owner.parent()) + owner.name().asjString() + "::");
}
*/
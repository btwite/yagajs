/*
 *  Namespace: @file
 *
 *  Defines the key behaviours for Namespaces
 */
"use strict";

var yc, _namespace, _core, _root, _local;
module.exports = {
	Public: {
		new: _newPublicNamespace,
	},
	Private: {
		new: _newPrivateNamespace,
	},
	Local: {
		new: _newLocalNamespace,
	},
	Root: {
		new: _newRootNamespace,
	},
	core: undefined,
	Initialise(y) {
		if (yc) return;
		yc = y;
		_createCoreNamespace();
		this.core = _core;
	},
	PostInitialise() {
		_core.addStringBinding('.ristic', yc.Ristic.DotRistic);
	}
};

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
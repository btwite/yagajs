/*
 *  AtomNamespace: @file
 *
 *  Name atoms are associated with Symbols that correspond to the name.
 *  Instances of this class are unbound. Binding will produce a BoundName
 *  atom.
 */
"use strict";

var yc, _prot;
module.exports = {
	new: _newAtomNamespace,
	prototype: undefined,
	Initialise: _init,
};

function _newAtomNamespace(name, ns) {
	let o = Object.create(_prot);
	if (typeof name === 'string') o._name = yc.Symbol.get(name);
	else {
		o.setListParserPoint(name);
		name = o._name.symbol();
	}
	o._namespace = ns;
	return (o);
}

function _init(y) {
	if (yc) return;
	yc = y;
	_prot = Object.assign(Object.create(yc.AtomicList.prototype), {
		namespace() {
			return (this._namespace);
		},
		name() {
			return (this._name);
		},
		asjString() {
			return (this._name.asjString());
		},
		print(sb) {
			if (this._namespace.isPrivate())
				sb.append('#');
			sb.append(this.asjString());
		},
		isNamespace: () => true,
		asisNamespace() {
			return (this);
		},
		asNamespace() {
			return (this);
		},
		add(ctxt, e) {
			return (e.rAdd(ctxt, this));
		},
		sub(ctxt, e) {
			return (e.rSub(ctxt, this));
		},
		mul(ctxt, e) {
			return (e.rMul(ctxt, this));
		},
		div(ctxt, e) {
			return (e.rDiv(ctxt, this));
		},
		rem(ctxt, e) {
			return (e.rRem(ctxt, this));
		},
	});
	module.exports.prototype = _prot;
	Object.freeze(module.exports);
}
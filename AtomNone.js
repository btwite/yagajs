/*
 *  AtomNone : @file
 *
 *  Special Atom to signify that we have no argument or value.
 */
"use strict";

var yc, _prot;
module.exports = {
	new: _newAtomNone,
	VALUE: undefined,
	Initialise: _init,
};

function _init(y) {
	if (yc) return;
	yc = y;
	_prot = Object.assign(Object.create(yc.AtomicList.prototype, {
		zeroValue() {
			return (this);
		},
		isNone: () => true,
		print(sb) {
			yc.Symbol.printReserved(sb, yc.Symbol.Reserved.NONE);
		},
		neg(ctxt) {
			return (this);
		},
		add(ctxt, e) {
			return (this);
		},
		sub(ctxt, e) {
			return (this);
		},
		mul(ctxt, e) {
			return (this);
		},
		div(ctxt, e) {
			return (this);
		},
		rem(ctxt, e) {
			return (this);
		},
		rAdd(ctxt, e) {
			return (this);
		},
		rSub(ctxt, e) {
			return (this);
		},
		rMul(ctxt, e) {
			return (this);
		},
		rDiv(ctxt, e) {
			return (this);
		},
		rRem(ctxt, e) {
			return (this);
		},
	}));
	module.exports.VALUE = _newAtomNone();
	Object.freeze(module.exports);
}

function _newAtomNone() {
	return (Object.create(_prot));
}
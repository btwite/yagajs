/*
 * AtomNumber: @file
 *
 *  Abstract prototype for all numbers.
 */

"use strict";

var yc, _prot;
module.exports = {
	prototype: undefined,
	Initialise: _init,
};

function _notImplemented(s) {
	return (yc.errors.InternalException(`'${s}' has not been implemented`));
}

function _init(y) {
	if (yc) return;
	yc = y;
	_prot = Object.assign(Object.create(yc.AtomicList.prototype), {
		typeName: 'AtomFloat',
		floatValue() {
			throw _notImplemented('floatValue');
		},
		castLevel() {
			throw _notImplemented('castLevel');
		},
		checkCast(num) {
			throw _notImplemented('checkCast');
		},
		cast(num) {
			throw _notImplemented('cast');
		},

		add(num) {
			throw _notImplemented('add');
		},
		sub(num) {
			throw _notImplemented('sub');
		},
		mul(num) {
			throw _notImplemented('mul');
		},
		div(num) {
			throw _notImplemented('div');
		},
		rem(num) {
			throw _notImplemented('rem');
		},
		zero() {
			throw _notImplemented('zero');
		},
		asjString() {
			throw _notImplemented('asjString');
		},

		isReal: () => false,
		isRational: () => false,
		isFloatingPoint: () => false,
		isFloat: () => false,

		isNumber: () => true,
		asisNumber() {
			return (this);
		},
		asNumber() {
			return (this);
		},
		zeroValue() {
			return (this.zero());
		},
		neg(ctxt) {
			return (this.zero().sub(ctxt, this));
		},
		add(ctxt, e) {
			let n2 = e.asisNumber();
			if (n2 !== null)
				return (this.checkCast(n2).add(n2));
			let s2 = e.asisString();
			if (s2 !== null)
				return (yc.AtomString.new(this.asjString() + s2.asjString(), _point));
			let sym2 = e.asisSymbol();
			if (sym2 !== null)
				return (yc.AtomSymbol.new(this.asjString() + sym2.asjString(), _point));
			return (e.rAdd(ctxt, this));
		},
		sub(ctxt, e) {
			let n2 = e.asisNumber();
			if (n2 !== null)
				return (this.checkCast(n2).sub(n2));
			return (e.rSub(ctxt, this));
		},
		mul(ctxt, e) {
			let n2 = e.asisNumber();
			if (n2 !== null)
				return (this.checkCast(n2).mul(n2));
			if (e.isString() || e.isSymbol())
				return (e.mul(ctxt, this));
			return (e.rMul(ctxt, this));
		},
		div(ctxt, e) {
			let n2 = e.asisNumber();
			if (n2 !== null)
				return (this.checkCast(n2).div(n2));
			return (e.rDiv(ctxt, this));
		},
		rem(ctxt, e) {
			n2 = e.asisNumber();
			if (n2 !== null)
				return (this.checkCast(n2).rem(n2));
			return (e.rDiv(ctxt, this));
		},
	});
	module.exports.prototype = _prot;
	Object.freeze(module.exports);
}
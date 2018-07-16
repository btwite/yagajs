/*
 *  AtomFloat: @file
 *
 *  Standard JavaScript floating point atom.
 */
"use strict";

var yc, _prot;
module.exports = {
	new: _newAtomFloat,
	prototype: undefined,
	Initialise: _init,
};

function _newAtomFloat(f, point) {
	let o = Object.create(_prot);
	o.setParserPoint(point);
	o.setValue(f);
	return (o);
}

function _init(y) {
	if (yc) return;
	yc = y;
	_prot = Object.assign(Object.create(yc.AtomNumber.prototype), {
		typeName: 'AtomFloat',
		setValue(f) {
			this._float = f;
		},
		getValue() {
			return (this._float);
		},
		isFloat: () => true,
		isReal: () => true,
		isFloatingPoint: () => true,
		floatValue() {
			return (this._float);
		},
		castLevel: () => 2,
		checkCast(num) {
			return (num.castLevel() > this.castLevel() ? num.cast(this) : this);
		},
		cast(num) {
			return (_newAtomFloat(num.floatValue(), this._point));
		},
		add(num) {
			return (_newAtomFloat(this._float + num.floatValue(), this._point));
		},
		sub(num) {
			return (_newAtomFloat(this._float - num.floatValue(), this._point));
		},
		mul(num) {
			return (_newAtomFloat(this._float * num.floatValue(), this._point));
		},
		div(num) {
			return (_newAtomFloat(this._float / num.floatValue(), this._point));
		},
		rem(num) {
			return (_newAtomFloat(this._float % num.floatValue(), this._point));
		},
		zero: () => _zero,
		print(sb) {
			sb.append(String(this._float)).append('f');
		},
		asjString() {
			return (String(this._float));
		},
	});
	var _zero = _newAtomFloat(0.0);
	module.exports.prototype = _prot;
	Object.freeze(module.exports);
}
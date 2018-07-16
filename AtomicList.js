/** 
 *  Atomiclist : @file
 *
 *  Abstract root for all atomic list elements.
 */
"use strict";

var yc;
module.exports = {
	prototype: undefined,
	Initialise: _init,
}

function _init(y) {
	if (yc) return;
	yc = y;
	module.exports.prototype = Object.assign(Object.create(yc.List.prototype), {
		elements() {
			if (!this._elements)
				this._elements = yc.Elements.make(this);
			return (this._elements);
		},
		zeroValue() {
			return (yc.Lists.nil());
		},
		neg(ctxt) {
			return (this);
		},
		length: () => 1,
		asArgumentList(ctxt) {
			return (this);
		},
		isAtomic: () => true,
		isData: () => true,
		isEmpty: () => false,
		isBound: () => true,
		isReducible: () => false,
		canEvaluate: () => false,
		isTrivial: () => true,
		hasVariables: () => false,

		headElement() {
			return (this);
		},
		tailElement() {
			return (this);
		},
		headSubList() {
			return (yc.Lists.nil(this._point));
		},
		tailSubList() {
			return (yc.Lists.nil(this._point));
		},
		appendList(e) {
			if (e.isAtomic())
				return (yc.Lists.newData(yc.FixedElements.new([this, e]), this));
			return (yc.List.appendList.call(this, e));
		}
	});
	Object.freeze(module.exports);
}
/*
 * Container: @file
 *
 *  Abstract class that defines common behaviour for all container type
 *  lists. A container will reference zero or more element lists.
 *  Note that a Sequence list will never contain a singleton AtomicList
 *  or be nil. These occurrences are represented by the AtomicList.
 */
"use strict";

var yc, _template;
module.exports = {
	prototype: undefined,
	Initialise: _init,
}

function _init(y) {
	if (yc) return;
	yc = y;
	module.exports.prototype = Object.assign(Object.create(yc.List.prototype), _template);
	Object.freeze(module.exports);
}

_template = {
	typeName: 'Container',
	setElements(es) {
		this._elements = es;
	},
	elements() {
		return (this._elements);
	},
	zeroValue() {
		return (yc.Lists.nil());
	},
	asArgumentList(ctxt) {
		return (yc.Lists.newData(this));
	},
	isContainer: () => true,
	asFrameReference(ctxt, frame) {
		// Defaults to a Frame reference of non trivial.
		// May add more discerning detection of variable references in the
		// future.
		return (yc.Frame.Reference.new(frame, this));
	},
	neg(ctxt) {
		return (this.elDo(ctxt, (e) => e.neg(ctxt)));
	},
	add(ctxt, e) {
		if (e.isContainer())
			return (this.listDo(ctxt, e, (e1, e2) => e1.add(ctxt, e2)));
		return (this.elDo(ctxt, (e1) => e1.add(ctxt, e)));
	},
	sub(ctxt, e) {
		if (e.isContainer())
			return (this.listDo(ctxt, e, (e1, e2) => e1.sub(ctxt, e2)));
		return (this.elDo(ctxt, (e1) => e1.sub(ctxt, e)));
	},
	mul(ctxt, e) {
		if (e.isContainer())
			return (this.listDo(ctxt, e, (e1, e2) => e1.mul(ctxt, e2)));
		return (this.elDo(ctxt, (e1) => e1.mul(ctxt, e)));
	},
	div(ctxt, e) {
		if (e.isContainer())
			return (this.listDo(ctxt, e, (e1, e2) => e1.div(ctxt, e2)));
		return (this.elDo(ctxt, (e1) => e1.div(ctxt, e)));
	},
	rem(ctxt, e) {
		if (e.isContainer())
			return (this.listDo(ctxt, e, (e1, e2) => e1.rem(ctxt, e2)));
		return (this.elDo(ctxt, (e1) => e1.rem(ctxt, e)));
	},
	rAdd(ctxt, e) {
		if (e.isContainer())
			return (this.listDo(ctxt, e, (e1, e2) => e2.add(ctxt, e1)));
		return (this.elDo(ctxt, (e1) => e.add(ctxt, e1)));
	},
	rMul(ctxt, e) {
		if (e.isContainer())
			return (this.listDo(ctxt, e, (e1, e2) => e2.mul(ctxt, e1)));
		return (this.elDo(ctxt, (e1) => e.mul(ctxt, e1)));
	},
	elDo(ctxt, fn) {
		let es = this._elements.asExpandedArray(ctxt);
		if (es.length == 0)
			return (yc.Lists.nil(this._point));
		let eso = [];
		for (let i = 0; i < es.length; i++)
			eso[i] = fn(es[i]);
		return (yc.Lists.newData(yc.Elements.make(eso, this), _point));
	},
	listDo(ctxt, e, fn) {
		es1 = this._elements.asExpandedArray(ctxt);
		es2 = e.elements().asExpandedArray(ctxt);
		if (es1.length == 0)
			return (Lists.nil(_point));
		eso = Array.from(es1);
		let len = es1.length;
		if (len > es2.length)
			len = es2.length;
		for (let i = 0; i < len; i++)
			eso[i] = fn(es1[i], es2[i]);
		return (yc.Lists.newData(yc.Elements.make(eso, this), _point));
	}
}
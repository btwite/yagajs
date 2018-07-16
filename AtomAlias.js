/** 
 *  AtomAlias : @file
 *
 *	Container as an atomic element.
 */

'use strict';

var yc, _prot;
module.exports = {
	new: _newAtomAlias,
	Initialise: _init,
};
Object.freeze(module.exports);


function _newAtomAlias(e, point) {
	let o = Object.create(_prot);
	o.setParserPoint(point);
	if (e.isList) e = yc.Elements.make(e);
	o._elements = e;
	return (o);
}

function _init(y) {
	if (yc) return;
	yc = y;
	let prot = {
		typeName: 'AtomAlias',
		reduce(ctxt) {
			let _elements = this._elements,
				_point = this._point;
			if (_elements.isEmpty())
				return (yc.Lists.nil(_point));
			if (_elements.isSingle())
				return (_elements.reduce(ctxt, 0));
			return (yc.Lists.newData(_elements.reduce(ctxt), _point));
		},
		reduceFrame(ctxt, r) {
			return (r.frame().dispatch(ctxt, () => this.reduce(ctxt)));
		},
		dealias(ctxt) {
			let _elements = this._elements,
				_point = this._point;
			if (_elements.isEmpty())
				return (yc.Lists.nil(_point));
			if (_elements.isSingle())
				return (_elements.dealias(ctxt, 0));
			return (yc.Lists.newData(_elements.dealias(ctxt), _point));
		},
		asFrameReference(ctxt, frame) {
			// Defaults to a Frame reference.
			// May add more discerning detection of variable references in the
			// future.
			return (yc.Frame.Reference.new(frame, this));
		},
		getNameSymbol() {
			if (this._elements.isSingle())
				return (this._elements.element(0).getNameSymbol());
			return (null);
		},
		getNameType(ctxt) {
			if (this._elements.isSingle())
				return (this._elements.element(0).getNameType(ctxt));
			return (null);
		},
		reduceSymbolType(ctxt) {
			if (this._elements.isSingle())
				return (this._elements.element(0).reduceSymbolType(ctxt));
			return (null);
		},
		isBound() {
			return (this._elements.areBound());
		},
		isTrivial() {
			return (this._elements.areTrivial());
		},
		isReducible: () => true,
		hasVariables() {
			return (this._elements.hasVariables());
		},
		isAlias: () => true,
		print(sb) {
			sb.append("((");
			yc.Ristic.risticClassName(sb, yc.AliasRistic).append(") ");
			yc.Lists.printElements(sb, this._elements);
			sb.append(")");
		},
		xprint(sb) {
			sb.append("((");
			yc.Ristic.risticClassName(sb, yc.AliasRistic).append(") ");
			yc.Lists.xprintElements(sb, this._elements);
			sb.append(")");
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
	};
	_prot = Object.assign(Object.create(yc.List.prototype), prot);
}
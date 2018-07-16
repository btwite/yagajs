/**
 *  AtomTrivalent : @file
 *
 *  Trivalent atom, either true, false or maybe.
 */

var yc;
module.exports = {
	prototype: undefined,
	TRUE: undefined,
	FALSE: undefined,
	UNKNOWN: undefined,
	Initialise: _init,
};

function _init(y) {
	if (yc) return;
	yc = y;
	let _prot = Object.assign(Object.create(yc.List.prototype), {
		typeName: 'AtomTrivalent',
		setTrit(trit) {
			this._trit = trit;
		},
		getValue() {
			return (this._trit.ordinal);
		},
		getTrit() {
			return (this._trit);
		},
		zeroValue: () => _false,
		isTrivalent: () => true,
		print(sb) {
			yc.Symbol.printReserved(sb, this._trit);
		},
		xprint(sb) {
			yc.Symbol.xprintReserved(sb, this._trit, 'Trivalent');
		},
		add: (ctxt, e) => _unknown,
		sub: (ctxt, e) => _unknown,
		mul: (ctxt, e) => _unknown,
		div: (ctxt, e) => _unknown,
		rem: (ctxt, e) => _unknown,
	});

	let _true = Object.assign(Object.create(_prot), {
		typeName: 'TRUE',
		isTrue: () => true,
		trueSelect(eTrue, eElse) {
			return (eTrue);
		},
		falseSelect(eFalse, eElse) {
			return (eElse);
		},
		unknownSelect(eUnknown, eElse) {
			return (eElse);
		},
		trueFalseSelect(eTrue, eFalse, eElse) {
			return (eTrue);
		},
		selectTrueFalseUnknown(eTrue, eFalse, eUnknown) {
			return (eTrue);
		},
		selectTrueFalseUnknownElse(eTrue, eFalse, eUnknown, eElse) {
			return (eTrue);
		},
		neg(ctxt) {
			return (_false);
		}
	});
	_true.setTrit(yc.Symbol.Reserved.TRUE);

	let _false = Object.assign(Object.create(_prot), {
		typeName: 'FALSE',
		isFalse: () => true,
		trueSelect(eTrue, eElse) {
			return (eElse);
		},
		falseSelect(eFalse, eElse) {
			return (eFalse);
		},
		unknownSelect(eUnknown, eElse) {
			return (eElse);
		},
		trueFalseSelect(eTrue, eFalse, eElse) {
			return (eFalse);
		},
		selectTrueFalseUnknown(eTrue, eFalse, eUnknown) {
			return (eFalse);
		},
		selectTrueFalseUnknownElse(eTrue, eFalse, eUnknown, eElse) {
			return (eFalse);
		},
		neg(ctxt) {
			return (_true);
		}
	});
	_false.setTrit(yc.Symbol.Reserved.FALSE);

	let _unknown = Object.assign(Object.create(_prot), {
		typeName: 'UNKNOWN',
		isUnknown: () => true,
		trueSelect(eTrue, eElse) {
			return (eElse);
		},
		falseSelect(eFalse, eElse) {
			return (eElse);
		},
		unknownSelect(eUnknown, eElse) {
			return (eUnknown);
		},
		trueFalseSelect(eTrue, eFalse, eElse) {
			return (eElse);
		},
		selectTrueFalseUnknown(eTrue, eFalse, eUnknown) {
			return (eUnknown);
		},
		selectTrueFalseUnknownElse(eTrue, eFalse, eUnknown, eElse) {
			return (eUnknown);
		},
		neg(ctxt) {
			return (this);
		}
	});
	_false.setTrit(yc.Symbol.Reserved.UNKNOWN);

	module.exports.prototype = _prot;
	module.exports.TRUE = _true;
	module.exports.FALSE = _false;
	module.exports.UNKNOWN = _unknown;

	Object.freeze(module.exports);
}
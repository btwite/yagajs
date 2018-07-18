/** 
 *  listbol : @file
 *
 *  Yaga List type.
 */

'use strict';

var yaga, _list, _nil;

module.exports = {
	new: _newList,
	nil(optPoint) {
		if (!optPoint) return (_nil);
		return (_newList(_nil.elements, optPoint));
	},
	prototype: _list,
	Initialise(y) {
		yaga = yaga ? yaga : y;
	},
	PostInitialise: () => {
		_list.parserPoint = yaga.Parser.defaultParserPoint;
		_nil = _newList([]);
	},
};
Object.freeze(module.exports);

function _newList(arr, point) {
	if (arr.length == 0 && !point) return (_nil);
	let list = Object.create(_list);
	list.elements = arr;
	if (point) list.parserPoint = point;
	return (list);
}

_list = {
	typeName: 'List',
	isList: true,
	isaListOrAtom: true,
	parserPoint: undefined,
	asQuoted: _asQuoted,
	asQuasiQuoted: _asQuasiQuoted,
	asQuasiOverride: _asQuasiOverride,
	isQuoted: false,
	isQuasiQuoted: false,
	isQuasiOverride: false,
	isAtInjected: false,
	isEmpty() {
		return (this.elements.length == 0);
	},
	elements: undefined,

	bind(yi) {
		/* Add code here */
	},
	evaluate(yi) {
		return (this);
	},
	asString() {
		return (this._name);
	},
	print(stream) {
		return (stream.write(this._name));
	},

	headElement() {
		return (this.elements().head());
	},
	tailElement() {
		return (this.elements().end());
	},

	headSubList() {
		return (yc.Lists.newData(elements().front()));
	},
	tailSubList() {
		return (yc.Lists.newData(elements().tail()));
	},

	appendList(e) {
		return (yc.Lists.newData(elements().append(e), this._point));
	},
}


function _asQuoted() {
	let list = Object.create(this);
	list.typeName = 'QuotedList';
	list.isQuoted = true;
	list.bind = function (yi) {
		return (Object.getPrototypeOf(list));
	};
	list.evaluate = function (yi) {
		throw new yaga.errors.InternalException("'evaluate' method unsupported for QuotedList");
	}
	return (list);
}

function _asQuasiQuoted() {
	let list = Object.create(this);
	list.typeName = 'QuasiQuotedList';
	list.isQuasiQuoted = true;
	list.bind = function (yi) {
		// More work required here
		return (Object.getPrototypeOf(list));
	};
	list.evaluate = function (yi) {
		throw new yaga.errors.InternalException("'evaluate' method unsupported for QuasiQuotedList");
	}
	return (list);
}

// May change bind so that parent list is passed to handle quasi overrides rather than the parent having
// to check every element.
function _asQuasiOverride(flAtOp) {
	let list = Object.create(this);
	list.typeName = 'Quotedlistbol';
	list.isQuasiOverride = true;
	list.isAtInjected = flAtOp;
	list.bind = function (yi) {
		return (Object.getPrototypeOf(this).bind(yi))
	};
	list.evaluate = function (yi) {
		throw new yaga.errors.InternalException("'evaluate' method unsupported for QuasiOverridelistbol");
	}
	return (list);
}
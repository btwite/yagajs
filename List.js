/** 
 *  listbol : @file
 *
 *  Yaga List type.
 */

'use strict';

var yaga, _list, _nil;

module.exports = {
	new: _newList,
	nil: _newNil,
	prototype: _list,
	Initialise(y) {
		yaga = yaga ? yaga : y;
	},
	PostInitialise: () => {
		_list.parserPoint = yaga.Parser.defaultParserPoint;
		_nil = Object.create(_list);
		_nil.elements = _nil.value = [];
		_nil.isNil = true;
	},
};
Object.freeze(module.exports);

function _newList(arr, point) {
	if (arr.length == 0) return (point ? _newNil(point) : _nil);
	let list = Object.create(_list);
	list.elements = list.value = arr;
	if (point) list.parserPoint = point;
	return (list);
}

function _newNil(point) {
	if (!point) return (_nil);
	let nil = Object.create(_nil);
	nil.parserPoint = point;
	return (nil);
}

_list = {
	typeName: 'List',
	isaYagaType: true,
	parserPoint: undefined,
	asQuoted: _asQuoted,
	asQuasiQuoted: _asQuasiQuoted,
	asQuasiOverride: _asQuasiOverride,
	asQuasiInjection: _asQuasiInjection,
	isaList: true,
	isQuoted: false,
	isQuasiQuoted: false,
	isQuasiOverride: false,
	isQuasiInjection: false,
	isEmpty() {
		return (this.elements.length == 0);
	},
	elements: undefined,
	value: undefined,
	leadSyntax: '(',
	trailSyntax: ')',

	bind(yi) {
		/* Add code here */
	},
	evaluate(yi) {
		return (this);
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

	print(printer) {
		printer
			.printLead(this.leadSyntax)
			.increaseIndent(2);
		this.elements.forEach((e) => printer.printExpression(e));
		printer
			.decreaseIndent(2)
			.printTrail(this.trailSyntax);
	},
}


function _asQuoted() {
	let list = Object.create(this);
	list.typeName = 'QuotedList';
	list.isQuoted = true;
	list.leadSyntax = '\'(';
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
	list.leadSyntax = '`(';
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
function _asQuasiOverride() {
	let list = Object.create(this);
	list.typeName = 'QuasiOverrideList';
	list.isQuasiOverride = true;
	list.leadSyntax = ',(';
	list.bind = function (yi) {
		return (Object.getPrototypeOf(this).bind(yi))
	};
	list.evaluate = function (yi) {
		throw new yaga.errors.InternalException("'evaluate' method unsupported for QuasiOverrideList");
	}
	return (list);
}

function _asQuasiInjection() {
	let list = _asQuasiOverride();
	list.typeName = 'QuasiInjectionList';
	list.leadSyntax = ',@(';
	list.isQuasiInjection = true;
	list.bind = function (yi) {
		return (Object.getPrototypeOf(this).bind(yi))
	};
	return (list);
}
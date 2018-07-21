/** 
 *  listbol : @file
 *
 *  Yaga List type.
 */

'use strict';

var yaga, _list, _nil;

module.exports = {
	new: _newList,
	newInsertable: _newInsertableList,
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

function _newList(arr, point, refList) {
	if (arr.length == 0) return (point ? _newNil(point) : _nil);
	let list = Object.create(_list);
	list.elements = list.value = arr;
	list.length = arr.length;
	list.isEmpty = false;
	if (point) list.parserPoint = point;
	if (refList) list.referenceList = refList;
	return (list);
}

function _newInsertableList(arr, point) {
	let list = _newList(arr, point);
	list.isInsertable = true;
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
	isEmpty: true,
	elements: undefined,
	length: 0,
	value: undefined,
	referenceList: undefined, // Can be assigned to handle printer operations
	leadSyntax: '(',
	trailSyntax: ')',

	bind: _bindList,
	evaluate(yi) {
		return (this);
	},

	print(printer) {
		let list = this.referenceList || this;
		printer
			.printLead(list.leadSyntax)
			.increaseIndent(2);
		list.elements.forEach((e) => printer.printExpression(e));
		printer
			.decreaseIndent(2)
			.printTrail(list.trailSyntax);
	},
}

function _bindList(yi) {
	let isCallable, arr = [],
		es = this.elements;
	if (es.length == 0) return (this);
	let head = yaga.bindValue(yi, es[0]);
	if ((isCallable = yaga.isCallable(head)) && yaga.isaMacro(head)) {
		head = head.evaluate(yi); // Setup the context for the macro call
		head = head.call(yi, this); // Call will take the context and instaniate
		if (yaga.isaList(head) && !head.isInsertable) {
			return (_bindList.call(head, yi));
		}
		return (head);
	}
	if (!isCallable) throw yaga.errors.BindException(this, 'Head element must be a function or macro');
	arr.push(head);
	_bindElements(yi, arr, es, 1);
	return (_newList(arr, this.parserPoint));
}

function _bindElements(yi, arr, es, iStart) {
	for (let i = iStart; i < es.length; i++) {
		let e = es[i];
		if (!yaga.isaYagaType(e)) {
			arr.push(e);
			continue;
		}
		e = e.bind(yi);
		if (e.isInsertable) _bindElements(yi, arr, e.elements, 0);
		else arr.push(e);
	}
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
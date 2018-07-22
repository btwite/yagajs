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
	list.bind = _invalidOperation;
	list.evaluate = _invalidOperation;
	return (list);
}

function _invalidOperation(yi) {
	throw yaga.errors.InternalException('Invalid operation')
}

function _newBoundList(arr, point) {
	if (!Array.isArray(arr)) return (arr); // This can happen if macros transform a list into a value.
	let list = _newList(arr, point);
	list.typeName = 'BoundList';
	list.isaBoundList = true;
	list.bind = _returnThis;
	list.evaluate = function (yi) {
		return (_call(yi, this.elements, this.parserPoint));
	};
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

	bind(yi) {
		return (_newBoundList(_bindList(yi, this), this.parserPoint));
	},
	evaluate: _returnThis,

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

function _call(yi, es, point) {
	return (es[0].call(yi, _newList(_evaluateArray(yi, es.splice(1)), point)));
}


function _bindList(yi, list) {
	let isCallable, arr = [],
		es = list.elements;
	if (es.length == 0) return (this);
	let head = yi.bindValue(es[0]);
	if ((isCallable = yaga.isCallable(head)) && yaga.isaMacro(head)) {
		head = head.evaluate(yi); // Setup the context for the macro call
		head = head.call(yi, list); // Call will take the context and instaniate
		if (!yaga.isaYagaType(head) || (yaga.isaList(head) && head.isInsertable)) return (head);
		return (head.bind(yi));
	}
	if (!isCallable) throw yaga.errors.BindException(this, 'Head element must be a function or macro');
	arr.push(head);
	return (_bindElements(yi, arr, es, 1));
}

function _bindElements(yi, arr, es, iStart) {
	for (let i = iStart; i < es.length; i++) {
		let e = yi.bindValue(es[i]);
		if (yaga.isaYagaType(e) && e.isInsertable) _bindElements(yi, arr, e.elements, 0);
		else arr.push(e);
	}
	return (arr);
}

function _evaluateArray(yi, es) {
	let arr = [];
	es.forEach(e => {
		if (!yaga.isaYagaType(e)) {
			arr.push(e);
			return;
		}
		e = e.evaluate(yi);
		if (yaga.isaYagaType(e) && e.isInsertable) arr.concat(e.elements);
		else arr.push(e);
	});
	return (arr);
}

function _asQuoted() {
	let list = Object.create(this);
	list.typeName = 'QuotedList';
	list.isQuoted = true;
	list.leadSyntax = '\'(';
	list.bind = _returnPrototype;
	list.evaluate = _returnThis;
	return (list);
}

function _asQuasiQuoted() {
	let list = Object.create(this);
	list.typeName = 'QuasiQuotedList';
	list.isQuasiQuoted = true;
	list.leadSyntax = '`(';
	list.bind = function (yi) {
		let arr = [];
		this.elements.forEach(e => {
			if (yaga.isaYagaType(e) && e.isQuasiOverride) {
				e = e.bind(yi);
				if (yaga.isaYagaType(e) && e.isInsertable) {
					arr.concat(e.elements);
					return;
				}
			}
			arr.push(e);
		});
		return (_newList(arr, this.parserPoint));
	};
	list.evaluate = _returnThis;
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
		let e = Object.getPrototypeOf(this).bind(yi);
		if (yaga.isaYagaType(e)) e = e.evaluate(yi);
		return (e);
	};
	list.evaluate = function (yi) {
		throw new yaga.errors.YagaException(this, "Misplaced quasi override");
	}
	return (list);
}

function _asQuasiInjection() {
	let list = _asQuasiOverride.call(this);
	list.typeName = 'QuasiInjectionList';
	list.leadSyntax = ',@(';
	list.isQuasiInjection = true;
	list.bind = function (yi) {
		let e = Object.getPrototypeOf(this).bind(yi);
		if (yaga.isaYagaType(e)) e = e.evaluate(yi);
		if (yaga.isaYagaType(e) && e.isaList) e = yaga.List.newInsertable(e.elements, e.parserPoint);
		return (e);
	};
	list.evaluate = function (yi) {
		throw new yaga.errors.YagaException(this, "Misplaced quasi injection");
	}
	return (list);
}

function _returnThis() {
	return (this);
}

function _returnPrototype() {
	return (Object.getPrototypeOf(this));
}
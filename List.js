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
	Initialise: y => yaga = yaga ? yaga : y,
	PostInitialise: () => {
		yaga.newType(_list);
		_list.parserPoint = yaga.Parser.defaultParserPoint;
		_nil = Object.create(_list);
		_nil.elements = [];
		_nil.isNil = true;
	},
};
Object.freeze(module.exports);

function _newList(arr, point, refList) {
	if (arr.length == 0) return (point ? _newNil(point) : _nil);
	let list = Object.create(_list);
	list.elements = arr;
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
		let es = this.elements;
		return (es[0].call(yi, es.splice(1), point));
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


function _bindList(yi, list) {
	let isCallable, arr = [],
		es = list.elements;
	if (es.length == 0) return (this);
	let head = es[0].bind(yi);
	if ((isCallable = yaga.isCallable(head)) && head.isaMacro) {
		head = head.evaluate(yi); // Setup the context for the macro call
		head = head.call(yi, list); // Call will take the context and instaniate
		if (head.isaList && head.isInsertable) return (head);
		return (head.bind(yi));
	}
	if (!isCallable) throw yaga.errors.BindException(this, 'Head element must be a function or macro');
	arr.push(head);
	return (_bindElements(yi, arr, es, 1));
}

function _bindElements(yi, arr, es, iStart) {
	for (let i = iStart; i < es.length; i++) {
		let e = es[i].bind(yi);
		if (e.isInsertable) _bindElements(yi, arr, e.elements, 0);
		else arr.push(e);
	}
	return (arr);
}

function _evaluateArray(yi, es) {
	let arr = [];
	es.forEach(e => {
		e = e.evaluate(yi);
		if (e.isInsertable) arr.concat(e.elements);
		else arr.push(e);
	});
	return (arr);
}

function _asQuoted() {
	let list = Object.create(this);
	list.typeName = 'QuotedList';
	list.isQuoted = true;
	list.leadSyntax = '\'(';
	list.bind = _returnThis;
	list.evaluate = _returnPrototype;
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
			if (e.isQuasiOverride) e = e.bind(yi);
			arr.push(e);
		});
		return (_newBoundQuasiQuoted(arr, this.parserPoint));
	};
	list.evaluate = _returnThis;
	return (list);
}

function _newBoundQuasiQuoted(arr, point) {
	let list = _newList(arr, point);
	list.typeName = 'BoundQuasiQuotedList';
	list.isQuasiQuoted = true;
	list.leadSyntax = '`(';
	list.bind = _returnThis;
	list.evaluate = function (yi) {
		let arr = [];
		this.elements.forEach(e => {
			if (e.isQuasiOverride) {
				if ((e = e.evaluate(yi)).isInsertable) {
					arr.concat(e.elements);
					return;
				}
			}
			arr.push(e);
		});
		return (_newList(arr, this.parserPoint));
	};
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
		return (_newBoundQuasiOverride(Object.getPrototypeOf(this).bind(yi)));
	};
	list.evaluate = function (yi) {
		throw new yaga.errors.YagaException(this, "Misplaced quasi override");
	}
	return (list);
}

function _newBoundQuasiOverride(list) {
	// Evaluate method will default to the lists normal evaluate.
	list.typeName = 'BoundQuasiOverrideList';
	list.isQuasiOverride = true;
	list.leadSyntax = ',(';
	list.bind = _returnThis;
	return (list);
}

function _asQuasiInjection() {
	let list = _asQuasiOverride.call(this);
	list.typeName = 'QuasiInjectionList';
	list.leadSyntax = ',@(';
	list.isQuasiInjection = true;
	list.bind = function (yi) {
		return (_newBoundQuasiInjection(Object.getPrototypeOf(this).bind(yi)));
	};
	list.evaluate = function (yi) {
		throw new yaga.errors.YagaException(this, "Misplaced quasi injection");
	}
	return (list);
}

function _newBoundQuasiInjection(list) {
	list.typeName = 'BoundQuasiInjectionList';
	list.leadSyntax = ',@(';
	list.isQuasiOverride = true;
	list.isQuasiInjection = true;
	list.bind = _returnThis;
	let actEvaluate = list.evaluate;
	list.evaluate = function (yi) {
		let e = actEvaluate.call(this, yi);
		if (e.isaList) e = yaga.List.newInsertable(e.elements, e.parserPoint);
		return (e);
	};
	return (list);
}

function _returnThis() {
	return (this);
}

function _returnPrototype() {
	return (Object.getPrototypeOf(this));
}
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
	list.isBound = true;
	list.bind = _returnThis;
	list.evaluate = function (yi) {
		let es = this.elements;
		return (es[0].call(yi, es.slice(1), point));
	};
	return (list);
}

function _newUnboundList(list, rsn) {
	list = Object.create(list);
	list.typeName = 'UnboundList';
	list.isUnbound = true;
	list.bind = _returnThis;
	list.evaluate = function (yi) {
		throw yaga.errors.YagaException(this, rsn);
	};
	list.raiseError = function (yi) {
		yi.addError(this, rsn);
		return (this);
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
		return (_bindList(yi, this));
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
		// Evaluate prepares the context call will take the context and instaniate
		head = head.evaluate(yi).call(yi, list);
		if (head.isaList && head.isInsertable) return (head);
		return (head.bind(yi));
	}
	arr.push(head);
	_bindElements(yi, arr, es, 1);
	// Check if all the elements have been bound.
	if (_checkBindings(arr)) {
		if (!isCallable) console.log(arr[1].isUnbound, arr[1].spec, (arr[1].isUnbound && !arr[1].spec), arr);
		return (isCallable ? _newBoundList(arr, list.parserPoint) :
			(_newUnboundList(list, 'Head element must be a function or macro').raiseError(yi)));
	}
	// We have some unbound bindings so now we can attempt to process any operators, however
	// if our head is callable then we just raise errors and return an unboundlist
	if (isCallable) return (_raiseListErrors(yi, list, arr, 'List is a function or macro but has unbound elements or operators'));
	// Our head is not callable so now we can attempt to process operators
	arr = _parseOperators(yi, arr);
	if (!_checkBindings(arr)) return (_raiseListErrors(yi, list, arr));
	// Now have an expression with resolved operators, rearrange the expression into
	// nested bound lists that can be evaluated.
	return (_bindOperators(yi, arr, arr[0]).bind(yi));
}

function _bindElements(yi, arr, es, iStart) {
	for (let i = iStart; i < es.length; i++) {
		let e = es[i].bind(yi);
		if (e.isInsertable) _bindElements(yi, arr, e.elements, 0);
		else arr.push(e);
	}
	return (arr);
}

function _bindOperators(yi, es, er) {
	if (es.length === 0) throw yaga.errors.BindException(er, `Missing argument for operator '${er.value()}'`);
	if (es.length === 1) return (es[0]); // Down to the last element in this branch
	const dirPrec = {
		none: {},
		leftToRight: {
			rightToLeft: true,
			none: true
		},
		rightToLeft: {
			rightToLeft: true,
			none: true
		}
	};
	let curSpec, iOp;
	for (let i = 0; i < es.length; i++) {
		let e = es[i];
		if (!e.spec) continue;
		if (!curSpec || e.spec.precedence < curSpec.precedence) {
			curSpec = e.spec;
			iOp = i;
			continue;
		}
		if (e.spec.precedence > curSpec.precedence) continue;
		if (dirPrec[curSpec.direction][e.spec.direction]) {
			// Direction table will determine how a spec can take precedence at the same precedence level.
			curSpec = e.spec;
			iOp = i;
		}
	}
	if (!curSpec) throw yaga.errors.InternalException('Missing operator specification when binding an operator expression');
	if (iOp === 0) {
		if (curSpec.type !== 'prefix') throw yaga.errors.InternalException(`Expecting a prefix operator. Found('${curSpec.type}')`);
		let symFn = yaga.Symbol.new(curSpec.function, es[0].parserPoint);
		return (_newList([symFn, _bindOperators(yi, es.slice[1], es[0])]));
	}
	if (iOp === es.length - 1) {
		if (curSpec.type !== 'postfix') throw yaga.errors.InternalException(`Expecting a postfix operator Found('${curSpec.type}')`);
		let symFn = yaga.Symbol.new(curSpec.function, es[iOp].parserPoint);
		return (_newList([symFn, _bindOperators(yi, es.slice[0, iOp], es[iOp])]));
	}
	let symFn = yaga.Symbol.new(curSpec.function, es[iOp].parserPoint);
	switch (curSpec.type) {
		case 'binary':
			return (_newList([symFn, _bindOperators(yi, es.slice(0, iOp), es[iOp]), _bindOperators(yi, es.slice(iOp + 1), es[iOp])]));
		case 'prefix':
			return (_newList([symFn, _bindOperators(yi, es.slice(iOp + 1), es[iOp])]));
		case 'postfix':
			return (_newList([symFn, _bindOperators(yi, es.slice(0, iOp), es[iOp])]));
	}
	throw yaga.errors.InternalException(`Invalid operator specification type '${curSpec.type}'`);
}

function _parseOperators(yi, arr) {
	let es = [];
	// First of all split up any symbols that have been aggregated
	let i;
	for (i = 0; i < arr.length; i++) {
		let e = arr[i];
		if (!e.isUnbound || !e.isaSymbol) {
			es.push(e);
			continue;
		}
		es = es.concat(_splitSymbol(yi, e));
	}
	// Work through our resolved operator expression.
	let e, eNext, ePrevSpec, eNextSpecs, spec;
	for (i = 0; i < es.length; i++, ePrevSpec = spec) {
		e = es[i];
		eNext = i + 1 < es.length ? es[i + 1] : undefined;
		spec = undefined;
		if (!e.isanOperator) continue;
		let specs = e.specs;
		if (ePrevSpec) {
			switch (ePrevSpec.type) {
				case 'binary':
				case 'prefix':
					e.spec = spec = specs.prefix;
					break;
				case 'postfix':
					if (eNext) {
						if (!(spec = specs.binary)) spec = specs.postfix;
						e.spec = spec;
						break;
					}
					e.spec = spec = specs.postfix;
					break;
			}
		} else if (i == 0) {
			e.spec = spec = specs.prefix;
		} else if (eNext) {
			e.spec = spec = specs.binary;
		} else {
			e.spec = spec = specs.postfix;
		}
	}
	return (es);
}

function _splitSymbol(yi, e) {
	// Try and split the token up by know operators. Operator reduction is from the end to the front
	// shifting the front up on each failed pass.
	let arr = [];
	let s = e.name;
	let i, j, k, iStart;
	for (i = 0, iStart = 0; i < s.length; i++) {
		if (!yi._operators.includes(s[i])) continue;
		let specs, sOp;
		// Determine the end of this operator character sequence
		for (j = i + 1; j < s.length && yi._operators.includes(s[j]); j++);
		for (k = j; k > i; k--) {
			sOp = s.substring(i, k);
			if (specs = yi.dictionary.findString(yi.getOperatorName(sOp))) {
				specs = specs.value();
				break;
			}
		}
		if (!specs) continue;
		if (iStart < i) {
			let e1 = yi.parser.parseString(s.substring(iStart, i));
			e1.parserPoint = e.parserPoint;
			arr.push(e1);
		}
		arr.push(yaga.Symbol.newOperator(sOp, specs, e.parserPoint));
		iStart = k;
		i = k - 1; // Need to allow for loop incrementer
	}
	if (arr.length === 0) return ([e]);
	if (iStart < s.length) {
		let e1 = yi.parser.parseString(s.substr(iStart));
		e1.parserPoint = e.parserPoint;
		arr.push(e1);
	}
	return (arr);
}

function _raiseListErrors(yi, list, arr, msg) {
	arr.forEach(e => {
		// Allow unbound operators that have an implementation spec.
		if (e.isUnbound && !e.spec) e.raiseError(yi);
	});
	if (!msg) return (_newUnboundList(list, 'List had bind errors'))
	return (_newUnboundList(list, msg).raiseError(yi))
}

function _checkBindings(es) {
	for (let i = 0; i < es.length; i++) {
		let e = es[i];
		// Allow unbound operators that have an implementation spec.
		if (e.isUnbound && !e.spec) return (false);
	};
	return (true);
}


function _evaluateArray(yi, es) {
	let arr = [];
	es.forEach(e => {
		e = e.evaluate(yi);
		if (e.isInsertable) arr = arr.concat(e.elements);
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
					arr = arr.concat(e.elements);
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
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
	// Process any operators before we continue. Note that operators take precedence over
	// macros.
	es = _processOperators(yi, es);

	let head = es[0].bind(yi);
	if ((isCallable = yaga.isCallable(head)) && head.isaMacro) {
		// Evaluate prepares the context call will take the context and instaniate
		let args = _newList(es.slice(1), es[0].parserPoint);
		args.isaMacroCall = true;
		head = head.evaluate(yi).call(yi, args);
		if (head.isaList && head.isInsertable) return (head);
		return (head.bind(yi));
	}
	arr.push(head);
	_bindElements(yi, arr, es, 1);
	// Check if all the elements have been bound.
	if (_checkBindings(arr)) {
		return (isCallable ? _newBoundList(arr, list.parserPoint) :
			(_newUnboundList(list, 'Head element must be a function or macro').raiseError(yi)));
	}
	// If our head is callable then we just raise errors and return an unboundlist
	if (isCallable) return (_raiseListErrors(yi, list, arr, 'List is a function or macro but has unbound elements or operators'));
	// Our head is not callable so we just raise the errors in the bind list
	return (_raiseListErrors(yi, list, arr));
}

function _bindElements(yi, arr, es, iStart) {
	for (let i = iStart; i < es.length; i++) {
		let e = es[i].bind(yi);
		if (e.isInsertable) _bindElements(yi, arr, e.elements, 0);
		else arr.push(e);
	}
	return (arr);
}

function _processOperators(yi, es) {
	// Check for non-bindable symbols, and if there are any then we apply operator processing.
	let flBindable = true,
		arr = [];
	es.forEach(e => {
		if (e.isaSymbol && !e.isBindable(yi)) {
			flBindable = false;
			e = e.bind(yi);
		}
		arr.push(e);
	});
	if (flBindable) return (es); // Nothing that could be an operator so nothing to do
	if (!_checkOperators((arr = _parseOperators(yi, arr)))) return (es);
	//es = _bindOperators(yi, arr);
	//	yi.print(_newList(es));
	//	return (es);
	return (_bindOperators(yi, arr));
}

function _bindOperators(yi, es, er) {
	if (es.length === 0) throw yaga.errors.BindException(er, `Missing argument for operator '${er.value()}'`);
	if (es.length === 1) return (es); // Down to the last element in this branch
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
	if (!curSpec) throw yaga.errors.BindException(es[0], 'Missing operator specification when binding an operator expression');
	if (iOp === 0) {
		if (curSpec.type !== 'prefix' || curSpec.type !== 'list') {
			throw yaga.errors.BindException(es[0], `Expecting a prefix or list operator. Found('${curSpec.type}')`);
		}
		return (_bindSequenceOp(yi, curSpec, es, iOp));
	}
	if (iOp === es.length - 1) {
		if (curSpec.type !== 'postfix') throw yaga.errors.InternalException(`Expecting a postfix operator Found('${curSpec.type}')`);
		return (_bindSequenceOp(yi, curSpec, es, iOp));
	}
	switch (curSpec.type) {
		case 'binary':
			let symFn = yaga.Symbol.new(curSpec.function, es[iOp].parserPoint);
			return ([symFn, __bindOperators(yi, es.slice(0, iOp), es[iOp]), __bindOperators(yi, es.slice(iOp + 1), es[iOp])]);
		case 'list':
		case 'postfix':
		case 'prefix':
		case 'connector':
			return (_bindSequenceOp(yi, curSpec, es, iOp));
	}
	throw yaga.errors.BindException(es[iOp], `Invalid operator specification type '${curSpec.type}'`);
}

function __bindOperators(yi, es, er) {
	if (_checkOperators(es)) es = _bindOperators(yi, es, er);
	if (es.length == 1) return (es[0]); // Down to the last element in this branch
	return (_newList(es, es[0].parserPoint));
}

function _bindSequenceOp(yi, spec, es, iOp) {
	let arr = [],
		symFn = yaga.Symbol.new(spec.function, es[iOp].parserPoint);
	switch (spec.type) {
		case 'prefix':
			if (es.length == 2) return ([symFn, es[1]])
			if (iOp > 0) arr = es.slice(0, iOp);
			arr.push(_newList([symFn, es[iOp + 1]], es[iOp].parserPoint));
			if (iOp + 2 < es.length) arr = arr.concat(es.slice(iOp + 2));
			break;
		case 'postfix':
			if (es.length == 2) return ([symFn, es[0]])
			if (iOp > 1) arr = es.slice(0, iOp - 1);
			arr.push(_newList([symFn, es[iOp - 1]], es[iOp].parserPoint));
			if (iOp + 1 < es.length) arr = arr.concat(es.slice(iOp + 1));
			break;
		case 'list':
			let iEnd = _findEndOfList(yi, spec, es, iOp);
			if (iOp === 0 && iEnd === es.length - 1) return ([symfn].concat(es.slice(iOp + 1, iEnd)));
			if (iOp > 0) arr = es.slice(0, iOp);
			arr.push(_newList([symFn].concat(es.slice(iOp + 1, iEnd)), es[iOp].parserPoint));
			if (iEnd < es.length - 1) arr = arr.concat(es.slice(iEnd + 1));
			break;
		case 'connector':
			let seq = [symFn, es[iOp - 1], es[iOp + 1]];
			if (es.length === 3) return (seq);
			if (iOp > 1) arr = es.slice(0, iOp - 1);
			arr.push(_newList(seq, es[iOp].parserPoint));
			if (iOp + 1 < es.length - 1) arr = arr.concat(es.slice(iOp + 2));
			break;
		default:
			throw yaga.errors.InternalException('Invalid bind sequence');
	}
	if (_checkOperators(arr)) arr = _bindOperators(yi, arr, arr[0]);
	return (arr);
}

function _findEndOfList(yi, spec, es, iOp) {
	let sfx = spec.sfx;
	let i = iOp + 1,
		cnt = 1;
	for (; i < es.length; i++) {
		let e = es[i];
		if (!e.isanOperator || !e.spec) continue;
		if (e.spec.type === 'list' && e.spec.sfx === sfx) {
			// Must handle nested lists with the same suffix.
			cnt++;
			continue;
		}
		if (e.spec.type === 'endlist' && e.spec.op === sfx) {
			if (--cnt > 0) continue;
			let nArgs = i - iOp - 1;
			if (spec.minElements && nArgs < spec.minElements) yi.addError(es[iOp], 'Too few arguments for list operator');
			if (spec.maxElements && nArgs > spec.maxElements) yi.addError(es[iOp], 'Too many arguments for list operator');
			return (i);
		}
	}
	throw yaga.errors.BindException(es[iOp], 'Missing end of list');
}

function _parseOperators(yi, es) {
	let arr = [];
	// First of all find the operators splitting up any symbols that have been aggregated
	let i;
	for (i = 0; i < es.length; i++) {
		let e = es[i];
		if (!e.isUnbound || !e.isaSymbol) {
			arr.push(e);
			continue;
		}
		arr = arr.concat(_parseSymbol(yi, e));
	}
	// Work through our resolved operator expression.
	let e, eNext, ePrevSpec, eNextSpecs, spec;
	for (i = 0; i < arr.length; i++, ePrevSpec = spec) {
		e = arr[i];
		eNext = i + 1 < arr.length ? arr[i + 1] : undefined;
		spec = undefined;
		if (!e.isanOperator) continue;
		let specs = e.specs;
		if (ePrevSpec) {
			switch (ePrevSpec.type) {
				case 'endlist':
					spec = specs.list || specs.endlist || specs.binary || specs.connector || specs.suffix;
					break;
				case 'list':
					spec = specs.endlist || specs.prefix;
					break;
				case 'connector':
				case 'binary':
				case 'prefix':
					spec = specs.list || specs.prefix;
					break;
				case 'postfix':
					if (eNext) {
						spec = specs.list || specs.endlist || specs.binary || specs.connector || specs.postfix;
						break;
					}
					spec = specs.endlist || specs.postfix;
					break;
			}
		} else if (i == 0) spec = specs.list || specs.prefix;
		else if (eNext) spec = specs.list || specs.endlist || specs.binary || specs.connector;
		else spec = specs.endlist || specs.postfix;
		e.spec = spec;
	}
	return (arr);
}

function _parseSymbol(yi, e) {
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
			e1.parserPoint = e.parserPoint.increment(iStart);
			arr.push(e1);
		}
		arr.push(yaga.Symbol.newOperator(sOp, specs, e.parserPoint.increment(i)));
		iStart = k;
		i = k - 1; // Need to allow for loop incrementer
	}
	if (arr.length === 0) return ([e]);
	if (iStart < s.length) {
		let e1 = yi.parser.parseString(s.substr(iStart));
		e1.parserPoint = e.parserPoint.increment(iStart);
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
		if (es[i].isUnbound) return (false);
	};
	return (true);
}

function _checkOperators(es) {
	for (let i = 0; i < es.length; i++) {
		if (es[i].isanOperator && es[i].spec) return (true);
	};
	return (false);
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
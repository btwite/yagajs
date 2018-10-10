/** 
 *  listbol : @file
 *
 *  Yaga List type.
 */

'use strict';

let _ = undefined;

var Yaga = require('../Yaga');
var Common = require('./Common').Common;
var Mach;

let List = Yaga.Influence({
	name: 'yaga.machine.List',
	composition: [{
		prototype: {
			thisArg_: {
				asQuoted,
				asQuasiQuoted,
				asQuasiOverride,
				asQuasiInjection,
			},
			bind(ymc) {
				return (bindList(ymc, this));
			},
			evaluate: returnThis,
			print(printer) {
				let list = this.referenceList || this;
				printer
					.printLead(list.leadSyntax)
					.increaseIndent(2);
				list.elements.forEach(e => printer.printExpression(e));
				printer
					.decreaseIndent(2)
					.printTrail(list.trailSyntax);
			},
			isQuoted: false,
			isQuasiQuoted: false,
			isQuasiOverride: false,
			isQuasiInjection: false,
			leadSyntax: '(',
			trailSyntax: ')',
			isEmpty: false,
			isInsertable: false,
			isBound: false,
			isUnbound: false,
			isNil: false,
		},
		constructor(arr, point, refList) {
			this.elements = arr;
			this.length = arr.length;
			this.readPoint = point;
			this.referenceList = refList;
		},
		static: {
			get Nil() {
				return (Nil.create);
			},
			get nil() {
				return (Nil.create);
			},
			get Insertable() {
				return (InsertableList.create);
			},
			get Expression() {
				return (Expression.create);
			}
		}
	}, Common],
	createExit(arr, point) {
		if (arr.length === 0)
			return (Nil.create(point));
	},
	harmonizers: '.most.'
});

var InsertableList = Yaga.Influence({
	name: 'yaga.machine.InsertableList',
	composition: [{
		abstract: {
			isaList: true,
			isInsertable: true,
			bind: invalidOperation,
			evaluate: invalidOperation,
		},
	}, List],
	createExit(arr, point) {
		if (arr.length === 0)
			throw Mach.Error.InternalException('Atempting to create an empty InsertableList');
	},
});

var BoundList = Yaga.Influence({
	name: 'yaga.machine.BoundList',
	composition: [{
		abstract: {
			isaList: true,
			isBound: true,
			bind: returnThis,
			evaluate(ymc) {
				let es = this.elements;
				return (es[0].call(ymc, es.slice(1), this.readPoint));
			},
		},
	}, List],
	createExit(arr, point) {
		if (!Array.isArray(arr))
			return (arr); // This can happen if macros transform a list into a value.
	},
});

var DefaultNil, Nil = Yaga.Influence({
	name: 'yaga.machine.Nil',
	composition: [{
		prototype: {
			isaList: true,
			isNil: true,
			isEmpty: true,
			elements: [],
			length: 0
		},
		constructor(point) {
			this.readPoint = point;
		},
		static: {
			get default() {
				return (DefaultNil);
			}
		}
	}, List],
	createExit(readPoint) {
		if (!readPoint)
			return (DefaultNil);
	},
	harmonizers: '.most.'
});

var Expression = Yaga.Influence({
	name: 'yaga.machine.Expression',
	composition: [{
		prototype: {
			isaList: true,
			isaToken: true,
			isaExpression: true,
			add(tok) {
				this.elements.push(tok);
				this.length++;
			},
			nextReadPoint() {
				return (this.readPoint.increment(this.leadSyntax.length));
			},
			set startToken(tok) {
				this.readPoint = tok.readPoint;
			},
			set endToken(tok) {
				// Nothing to do
			},
		},
		constructor(readPoint, tok) {
			this.elements = [];
			this.length = 0;
			this.readPoint = readPoint;
			this.referenceList = _;
		}
	}, List]
});

module.exports = Object.freeze({
	List: List.create,
	Initialise(x) {
		Mach = x;
		DefaultNil = Nil.create(Yaga.Reader.ReadPoint.default);
	},
});

function UnboundList(list, rsn) {
	return (list.extend({
		typeName: 'yaga.machine.UnBoundList',
		isUnbound: true,
		rsn: rsn,
		bind: returnThis,
		evaluate(ymc) {
			throw Mach.Error.YagaException(this, this.rsn);
		},
		raiseError(ymc) {
			ymc.addError(this, this.rsn);
			return (this);
		}
	}));
}

function invalidOperation(ymc) {
	throw Mach.Error.InternalException('Invalid operation')
}

function bindList(ymc, list) {
	let isCallable, arr = [],
		es = list.elements;
	if (es.length == 0) return (this);
	// Process any operators before we continue. Note that operators take precedence over
	// macros.
	es = processOperators(ymc, es);

	let head = es[0].bind(ymc);
	if ((isCallable = Mach.isCallable(head)) && head.isaMacro) {
		// Evaluate prepares the context call will take the context and instaniate
		let args = List.create(es.slice(1), es[0].readPoint);
		args.isaMacroCall = true;
		head = head.evaluate(ymc).call(ymc, args);
		if (head.isaList && head.isInsertable) return (head);
		return (head.bind(ymc));
	}
	arr.push(head);
	bindElements(ymc, arr, es, 1);
	// Check if all the elements have been bound.
	if (checkBindings(arr)) {
		return (isCallable ? BoundList.create(arr, list.readPoint) :
			(UnboundList(list, 'Head element must be a function or macro').raiseError(ymc)));
	}
	// If our head is callable then we just raise errors and return an unboundlist
	if (isCallable) return (raiseListErrors(ymc, list, arr, 'List is a function or macro but has unbound elements or operators'));
	// Our head is not callable so we just raise the errors in the bind list
	return (raiseListErrors(ymc, list, arr));
}

function bindElements(ymc, arr, es, iStart) {
	for (let i = iStart; i < es.length; i++) {
		let e = es[i].bind(ymc);
		if (e.isInsertable) bindElements(ymc, arr, e.elements, 0);
		else arr.push(e);
	}
	return (arr);
}

function processOperators(ymc, es) {
	// Check for non-bindable symbols, and if there are any then we apply operator processing.
	let flBindable = true,
		arr = [];
	es.forEach(e => {
		if (e.isaSymbol && !e.isBindable(ymc)) {
			flBindable = false;
			e = e.bind(ymc);
		}
		arr.push(e);
	});
	if (flBindable) return (es); // Nothing that could be an operator so nothing to do
	if (!checkOperators((arr = parseOperators(ymc, arr)))) return (es);
	//es = _bindOperators(ymc, arr);
	//	ymc.print(_newList(es));
	//	return (es);
	return (bindOperators(ymc, arr));
}

function bindOperators(ymc, es, er) {
	if (es.length === 0) throw Mach.Error.BindException(er, `Missing argument for operator '${er.value()}'`);
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
	if (!curSpec) throw Mach.Error.BindException(es[0], 'Missing operator specification when binding an operator expression');
	if (iOp === 0) {
		if (curSpec.type !== 'prefix' || curSpec.type !== 'list') {
			throw Mach.Error.BindException(es[0], `Expecting a prefix or list operator. Found('${curSpec.type}')`);
		}
		return (bindSequenceOp(ymc, curSpec, es, iOp));
	}
	if (iOp === es.length - 1) {
		if (curSpec.type !== 'postfix') throw Mach.Error.InternalException(`Expecting a postfix operator Found('${curSpec.type}')`);
		return (bindSequenceOp(ymc, curSpec, es, iOp));
	}
	switch (curSpec.type) {
		case 'binary':
			let symFn = Mach.Symbol(curSpec.function, es[iOp].readPoint);
			return ([symFn, _bindOperators(ymc, es.slice(0, iOp), es[iOp]), _bindOperators(ymc, es.slice(iOp + 1), es[iOp])]);
		case 'list':
		case 'postfix':
		case 'prefix':
		case 'connector':
			return (bindSequenceOp(ymc, curSpec, es, iOp));
	}
	throw Mach.Error.BindException(es[iOp], `Invalid operator specification type '${curSpec.type}'`);
}

function _bindOperators(ymc, es, er) {
	if (checkOperators(es)) es = bindOperators(ymc, es, er);
	if (es.length == 1) return (es[0]); // Down to the last element in this branch
	return (List.create(es, es[0].readPoint));
}

function bindSequenceOp(ymc, spec, es, iOp) {
	let arr = [],
		symFn = Mach.Symbol(spec.function, es[iOp].readPoint);
	switch (spec.type) {
		case 'prefix':
			if (es.length == 2) return ([symFn, es[1]])
			if (iOp > 0) arr = es.slice(0, iOp);
			arr.push(List.create([symFn, es[iOp + 1]], es[iOp].readPoint));
			if (iOp + 2 < es.length) arr = arr.concat(es.slice(iOp + 2));
			break;
		case 'postfix':
			if (es.length == 2) return ([symFn, es[0]])
			if (iOp > 1) arr = es.slice(0, iOp - 1);
			arr.push(List.create([symFn, es[iOp - 1]], es[iOp].readPoint));
			if (iOp + 1 < es.length) arr = arr.concat(es.slice(iOp + 1));
			break;
		case 'list':
			let iEnd = findEndOfList(ymc, spec, es, iOp);
			if (iOp === 0 && iEnd === es.length - 1) return ([symfn].concat(es.slice(iOp + 1, iEnd)));
			if (iOp > 0) arr = es.slice(0, iOp);
			arr.push(List.create([symFn].concat(es.slice(iOp + 1, iEnd)), es[iOp].readPoint));
			if (iEnd < es.length - 1) arr = arr.concat(es.slice(iEnd + 1));
			break;
		case 'connector':
			let seq = [symFn, es[iOp - 1], es[iOp + 1]];
			if (es.length === 3) return (seq);
			if (iOp > 1) arr = es.slice(0, iOp - 1);
			arr.push(List.create(seq, es[iOp].readPoint));
			if (iOp + 1 < es.length - 1) arr = arr.concat(es.slice(iOp + 2));
			break;
		default:
			throw Mach.Error.InternalException('Invalid bind sequence');
	}
	if (checkOperators(arr)) arr = bindOperators(ymc, arr, arr[0]);
	return (arr);
}

function findEndOfList(ymc, spec, es, iOp) {
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
			if (spec.minElements && nArgs < spec.minElements) ymc.addError(es[iOp], 'Too few arguments for list operator');
			if (spec.maxElements && nArgs > spec.maxElements) ymc.addError(es[iOp], 'Too many arguments for list operator');
			return (i);
		}
	}
	throw Mach.Error.BindException(es[iOp], 'Missing end of list');
}

function parseOperators(ymc, es) {
	let arr = [];
	// First of all find the operators splitting up any symbols that have been aggregated
	let i;
	for (i = 0; i < es.length; i++) {
		let e = es[i];
		if (!e.isUnbound || !e.isaSymbol) {
			arr.push(e);
			continue;
		}
		arr = arr.concat(parseSymbol(ymc, e));
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

function parseSymbol(ymc, e) {
	// Try and split the token up by know operators. Operator reduction is from the end to the front
	// shifting the front up on each failed pass.
	let arr = [];
	let s = e.name;
	let i, j, k, iStart;
	for (i = 0, iStart = 0; i < s.length; i++) {
		if (!ymc.operators.includes(s[i])) continue;
		let specs, sOp;
		// Determine the end of this operator character sequence
		for (j = i + 1; j < s.length && ymc.operators.includes(s[j]); j++);
		for (k = j; k > i; k--) {
			sOp = s.substring(i, k);
			if (specs = ymc.gd.find(ymc.getOperatorName(sOp))) {
				specs = specs.value();
				break;
			}
		}
		if (!specs) continue;
		if (iStart < i) {
			let e1 = ymc.reader.readString(s.substring(iStart, i));
			e1.readPoint = e.readPoint.increment(iStart);
			arr.push(e1);
		}
		arr.push(Mach.Symbol.Operator(sOp, specs, e.readPoint.increment(i)));
		iStart = k;
		i = k - 1; // Need to allow for loop incrementer
	}
	if (arr.length === 0) return ([e]);
	if (iStart < s.length) {
		let e1 = ymc.reader.readString(s.substr(iStart));
		e1.readPoint = e.readPoint.increment(iStart);
		arr.push(e1);
	}
	return (arr);
}

function raiseListErrors(ymc, list, arr, msg) {
	arr.forEach(e => {
		// Allow unbound operators that have an implementation spec.
		if (e.isUnbound && !e.spec) e.raiseError(ymc);
	});
	if (!msg) return (UnboundList(list, 'List had bind errors'))
	return (UnboundList(list, msg).raiseError(ymc))
}

function checkBindings(es) {
	for (let i = 0; i < es.length; i++) {
		if (es[i].isUnbound) return (false);
	};
	return (true);
}

function checkOperators(es) {
	for (let i = 0; i < es.length; i++) {
		if (es[i].isanOperator && es[i].spec) return (true);
	};
	return (false);
}

function evaluateArray(ymc, es) {
	let arr = [];
	es.forEach(e => {
		e = e.evaluate(ymc);
		if (e.isInsertable) arr = arr.concat(e.elements);
		else arr.push(e);
	});
	return (arr);
}

// Quoted type lists
function asQuoted(list) {
	return (list.extend({
		typeName: 'yaga.machine.QuotedList',
		isQuoted: true,
		leadSyntax: '\'(',
		bind: returnThis,
		evaluate: Yaga.thisArg(returnRelated),
	}));
}

function asQuasiQuoted(list) {
	return (list.extend({
		typeName: 'yaga.machine.QuasiQuotedList',
		isQuasiQuoted: true,
		leadSyntax: '`(',
		bind(ymc) {
			let arr = [];
			this.elements.forEach(e => {
				if (e.isQuasiOverride) e = e.bind(ymc);
				arr.push(e);
			});
			return (BoundQuasiQuotedList.create(arr, this.readPoint));
		},
		evaluate: returnThis,
	}));
}

var BoundQuasiQuotedList = Yaga.Influence({
	name: 'yaga.machine.BoundQuasiQuotedList',
	composition: [{
		prototype: {
			isaList: true,
			isQuasiQuoted: true,
			leadSyntax: '`(',
			bind: returnThis,
			evaluate(ymc) {
				let arr = [];
				this.elements.forEach(e => {
					if (e.isQuasiOverride) {
						if ((e = e.evaluate(ymc)).isInsertable) {
							arr = arr.concat(e.elements);
							return;
						}
					}
					arr.push(e);
				});
				return (List.create(arr, this.readPoint));
			},
		},
	}, List],
	harmonizers: {
		constructor: List
	}
});

// May change bind so that parent list is passed to handle quasi overrides rather than the parent having
// to check every element.
function asQuasiOverride(list) {
	return (list.extend({
		typeName: 'yaga.machine.QuasiOverrideList',
		isQuasiOverride: true,
		leadSyntax: ',(',
		bind(ymc) {
			return (BoundQuasiOverrideList(returnRelated(this).bind(ymc)));
		},
		evaluate(ymc) {
			throw Mach.Error.YagaException(this, "Misplaced quasi override");
		},
	}));
}

function BoundQuasiOverrideList(list) {
	return (list.extend({
		typeName: 'yaga.machine.BoundQuasiOverrideList',
		isQuasiOverride: true,
		leadSyntax: ',(',
		bind: returnThis,
	}));
}

function asQuasiInjection(list) {
	return (list.extend({
		typeName: 'yaga.machine.QuasiInjectionList',
		isQuasiInjection: true,
		leadSyntax: ',@(',
		bind(ymc) {
			return (BoundQuasiInjectionList(returnRelated(this).bind(ymc)));
		},
		evaluate(ymc) {
			throw Mach.Error.YagaException(this, "Misplaced quasi injection");
		},
	}));
}

function BoundQuasiInjectionList(list) {
	return (list.extend({
		typeName: 'yaga.machine.BoundQuasiInjectionList',
		leadSyntax: ',@(',
		isQuasiOverride: true,
		isQuasiInjection: true,
		bind: returnThis,
		evaluate(ymc) {
			let e = this.relatedList.call(this, ymc);
			if (e.isaList) e = InsertableList.create(e.elements, e.readPoint);
			return (e);
		},
	}));
}

function returnThis() {
	return (this);
}

function returnRelated(oExtend) {
	return (Object.getPrototypeOf(oExtend));
}
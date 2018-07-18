/*
 * Elements: @file
 *
 *  Abstract object that defines the behaviour of all element collections
 *  representation.
 */
"use strict";

var yc, _elements;
module.exports = {
	EmptyElements: undefined,
	EmptyArray: undefined,
	prototype: undefined,
	Initialise: _init,
};

/*
static public final Elements EmptyElements = new Empty();
static public final List[] EmptyArray = new List[0];

static private enum Types {
	VARS,
	INJECTS,
	FIXED
}

static public Elements make(List e) {
	return (make(new List[] {
		e
	}, e));
}
static public Elements make(List e1, List e2) {
	return (make(new List[] {
		e1,
		e2
	}, e1));
}
static public Elements make(List e1, List e2, List e3) {
	return (make(new List[] {
		e1,
		e2,
		e3
	}, e1));
}
static public Elements make(List e1, List e2, List e3, List e4) {
	return (make(new List[] {
		e1,
		e2,
		e3,
		e4
	}, e1));
}
static public Elements make(List[] es) {
	if (es.length == 0)
		return (EmptyElements);
	return (makeElements(es, es[0]));
}
static public Elements make(List[] es, List r) {
	if (es.length == 0)
		return (EmptyElements);
	return (makeElements(es, r));
}

static private Elements makeElements(List[] es, List r) {
	// Analyse the array to determine best Elements representation.
	Types type = Types.FIXED;
	for (List e: es) {
		if (e.isInjectable())
			return (new InjectableElements(es, r));
		if (e.asisVariable() != null)
			type = Types.VARS;
	}
	if (type == Types.VARS)
		return (new FixedElements.Variables(es, r));
	return (new FixedElements(es, r));
}

static public Elements makeFixed(List e) {
	return (makeFixed(new List[] {
		e
	}, e));
}
static public Elements makeFixed(List e1, List e2) {
	return (makeFixed(new List[] {
		e1,
		e2
	}, e1));
}
static public Elements makeFixed(List e1, List e2, List e3) {
	return (makeFixed(new List[] {
		e1,
		e2,
		e3
	}, e1));
}
static public Elements makeFixed(List e1, List e2, List e3, List e4) {
	return (makeFixed(new List[] {
		e1,
		e2,
		e3,
		e4
	}, e1));
}
static public Elements makeFixed(List[] es) {
	if (es.length == 0)
		return (EmptyElements);
	return (makeFixed(es, es[0]));
}
static public Elements makeFixed(List[] es, List r) {
	if (es.length == 0)
		return (EmptyElements);
	for (List e: es)
		if (e.asisVariable() != null)
			return (new FixedElements.Variables(es, r));
	return (new FixedElements(es, r));
}


static public boolean areTrivial(List[] es) {
	for (List e: es)
		if (!e.isTrivial())
			return (false);
	return (true);
}

static public boolean hasInjectables(List[] es) {
	for (List e: es)
		if (!e.isInjectable())
			return (true);
	return (false);
}

static public boolean hasVariableElements(List[] es) {
	for (List e: es)
		if (e.asisVariable() != null)
			return (true);
	return (false);
}

public Elements(List r) {
	_relatedElement = r;
}
private final List _relatedElement;
*/
function _abstract() {
	throw yc.errors.InternalException('Not implemented');
};

_elements = {
	typeName: 'Elements',
	relatedElement() {
		return (_relatedElement);
	},
	isFixedLength: () => false,
	isInfiniteLength: () => false,
	isFixed: () => false,
	hasInjectables: () => false,

	element: (idx) => _abstract(),

	pipeStep: (ctxt, parms) => _abstract(),
	bindPipeStep: (ctxt, parms) => _abstract(),

	subset: (ctxt, iStart) => _abstract(),
	subset3: (ctxt, iStart, iEnd) => _abstract(),
	subset5: (ctxt, idx, iStart, es, ies) => _abstract(),

	bind: (ctxt) => _abstract(),
	evaluate: (ctxt) => _abstract(),
	bindingEvaluate: (ctxt) => _abstract(),
	reduce: (ctxt) => _abstract(),
	reduce2: (ctxt, idx) => _abstract(),
	dealias: (ctxt) => _abstract(),
	dealias2: (ctxt, idx) => _abstract(),
	head: () => _abstract(),
	tail: () => _abstract(),
	end: () => _abstract(),
	front: () => _abstract(),

	append: (e) => _abstract(),
	prepend(elements) {
		throw yc.InternalException.new(`Not Supported: ${this}`);
	},

	propagateReference: (ctxt, r) => _abstract(),
	expand: (ctxt) => _abstract(),
	bindNames: (ctxt) => _abstract(),

	asArray: () => _abstract(),
	asExpandedArray: (ctxt) => _abstract(),
	length: () => _abstract(),

	asArguments(ctxt) {
		let arr = this.asArray();
		let es = [];
		for (let i = 0; i < es.length; i++)
			es[i] = arr[i].resolveVariable(ctxt);
		return (es);
	},

	bindArgs(ctxt) {
		let arr = this.asArguments(ctxt);
		let es = [];
		for (let i = 0; i < es.length; i++)
			es[i] = arr[i].bind(ctxt).resolveVariable(ctxt);
		return (es);
	},
	evalBindParms(ctxt) {
		let arr = asParameters(ctxt);
		let es = [];
		for (let i = 0; i < es.length; i++)
			es[i] = arr[i].evaluate(ctxt).bind(ctxt).resolveVariable(ctxt);
		return (es);
	},

	isEmpty: () => _abstract(),
	isSingle: () => _abstract(),
	isAtomic: () => _abstract(),
	areReducible: () => _abstract(),
	areTrivial: () => _abstract(),
	hasVariables: () => _abstract(),
	canEvaluate: () => _abstract(),
	giveProduction: () => _abstract(),
	areBound: () => _abstract(),
	hasBoundElementsNoVariables: () => _abstract(),
	hasVariableElements: () => _abstract(),
	/*
		private static class Empty extends Elements {
			private Empty() {
				super(Lists.nil());
			}

			@Override
			public boolean isFixedLength() {
				return (true);
			}

			@Override
			public final List element(int idx) {
				return (Lists.nil());
			}
			@Override
			public final boolean isSingle() {
				return (false);
			}
			@Override
			public boolean isEmpty() {
				return (true);
			}
			@Override
			public List[] asArray() {
				return (EmptyArray);
			}
			@Override
			public List[] asExpandedArray(Context ctxt) {
				return (EmptyArray);
			}
			@Override
			public List[] asParameters(Context ctxt) {
				return (EmptyArray);
			}
			@Override
			public int length() {
				return (0);
			}

			@Override
			public List pipeStep(Context ctxt, List parms) throws YagaException {
				return (parms);
			}
			@Override
			public List bindPipeStep(Context ctxt, List parms) throws YagaException {
				return (parms);
			}

			@Override
			public Elements subset(Context ctxt, int iStart) {
				return (this);
			}
			@Override
			public Elements subset(Context ctxt, int iStart, int iEnd) {
				return (this);
			}
			@Override
			protected int subset(Context ctxt, int idx, int iStart, List[] es, int ies) {
				return (ies);
			}

			@Override
			public Elements bind(Context ctxt) {
				return (this);
			}
			@Override
			public Elements evaluate(Context ctxt) {
				return (this);
			}
			@Override
			public Elements bindingEvaluate(Context ctxt) {
				return (this);
			}
			@Override
			public Elements reduce(Context ctxt) {
				return (this);
			}
			@Override
			public List reduce(Context ctxt, int idx) {
				return (Lists.nil());
			}

			@Override
			public Elements dealias(Context ctxt) {
				return (this);
			}
			@Override
			public List dealias(Context ctxt, int idx) {
				return (Lists.nil());
			}

			@Override
			public List head() {
				return (Lists.nil());
			}
			@Override
			public Elements tail() {
				return (this);
			}
			@Override
			public List end() {
				return (Lists.nil());
			}
			@Override
			public Elements front() {
				return (this);
			}

			@Override
			public Elements append(List e) {
				return (e.elements());
			}

			@Override
			public Elements propagateReference(Context ctxt, Frame.Reference r) {
				return (this);
			}
			@Override
			public Elements expand(Context ctxt) {
				return (this);
			}
			@Override
			public Elements bindNames(Context ctxt) {
				return (this);
			}


			@Override
			public boolean isAtomic() {
				return (true);
			}
			@Override
			public boolean areReducible() {
				return (false);
			}
			@Override
			public boolean areTrivial() {
				return (true);
			}
			@Override
			public boolean hasVariables() {
				return (false);
			}
			@Override
			public boolean canEvaluate() {
				return (false);
			}
			@Override
			public boolean giveProduction() {
				return (false);
			}
			@Override
			public boolean areBound() {
				return (true);
			}
			@Override
			public boolean hasBoundElementsNoVariables() {
				return (true);
			}
			@Override
			public boolean hasVariableElements() {
				return (false);
			}
		}

		public void trace(String msg) {
			trace(System.out, msg);
		}
		public void trace(PrintStream stream, String msg) {
			stream.printf("Element trace(%s) :\n", msg);
			int i = 0;
			for (List e: asArray())
				e.trace(stream, i++ + ":" + msg);
		}
	*/
}
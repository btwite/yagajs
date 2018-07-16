/** 
 *  Symbol : @file
 *
 *  Prototype for all List types. Everything in Yaga is a list.
 *
 *  AtomicLists represent atomic elements such as numbers and strings but have
 *	unique property that they reference themselves. Hence the number 1 can
 *  represent any nested list of a single element that reduces to itself.
 *
 *  Container lists represent a collection of zero or more sub-list elements.
 *  Each container type has a set of specific behaviours.
 *  Sequence - Simple list of 1 or more elements. The empty list and
 *			   single element AtomicList sequence are represented by there
 *			   atomic form. Is the default list type.
 *  Ristic - List that defines characteristics for constructing container lists
 *	Trivial - Sequence of elements that can not be individually reduced further.
 *  Expression - List that supports binding.
 *  Pipeline - Lists of steps that can process an input list (arguments) and
 *			   produce an output list. Each step receives the output of the
 *			   previous step.
 *  Production - Special internal list created during bind that encapsulates a
 *				 sequence of parameters and pipelines for processing arguments.
 *  Alias - AtomicList that can contain mulitple elements.
 *
 *  Lists support the following core operations:
 *	Parse		- Generates a list of expressions by parsing a sequence of strings as
 *				  an input stream. Non string elements are directly embedded in the
 *				  current Expression list.
 *	Bind		- Translates an expression (with nested expressions) into other
 *				  container types. Ristics at the head of an expression will define
 *				  container type. Unbound names are resolved, and productive expressions
 *				  form Production lists. Other elements remain asis. Expressions that
 *				  cannot be bound remain as expression with an unbound characteristic.
 *				  Default list type will be a Data or Trivial if a ristic cannot
 *				  be applied. Binding pipelines can inject elements into the bind
 *				  stream and act like macros.
 *  Step		- No Parameters. Only productions step. All other elements
 *				  answer themselves. Variables will resolve and with Bound names 
 *				  will pass on. Evaluation is lazy allowing productions to be answered. 
 *				  Use step or reduce to recursively step.
 *  Step		- Parameters. Ristics, Pipelines step after applying arguments.
 *				  Productions will also step ignoring arguments. All other
 *				  list types answer themeselves.
 *  Evaluate	- Evaluates a list down to its minimal form by recursively 
 *				  stepping until no further steps are productive.
 *  Reduce		- The same as Evaluate except that single element Data lists are
 *				  reduced and aliases are dealiased.
 *  Dealias		- Reduce alias reference.
 */

'use strict';

var yc;

module.exports = {
	prototype: {
		typeName: 'List',

		setDefaultParserPoint() {
			this._point = yc.ParserPoint.Default;
			return (this);
		},
		setParserPoint(point) {
			this._point = point;
			return (this);
		},
		setListParserPoint(list) {
			this._point = list.parserPoint();
			return (this);
		},
		parserPoint() {
			if (!this._point) this._point = yc.ParserPoint.Default;
			return (this._point);
		},
		point() {
			return (this.parserPoint());
		},

		/**
		 * Allow an element to generate parsed outcome in the form of an
		 * expression.
		 * Elements that cannot be parsed can just answer themselves
		 * @param ctxt - Yaga context.
		 * @return - Answers an List that represents the result of the bind.
		 */
		parse(ctxt) {
			return (this);
		},

		/**
		 * Navigate the expression list and bind all names and run BindingPipelines.
		 * At the end we will have a new list that is new Container. Note that
		 * #expr ristic allows bind to create a new expression as data.
		 * Binding productions may generate an expression (ex. macros) that will 
		 * need to be bound. Compilers will only need to run the Bind phase to 
		 * prepare a form that can be optimised.
		 * Note that BindingPipelines must be able to accept UnboundExpressions that 
		 * contain one or more names that could not be bound. It is up to the
		 * BindingPipelines to ensure that the resultant expression can be fully
		 * bound. 
		 * Atoms that do not require binding can just answer themselves
		 * @param ctxt - Yaga context.
		 * @return - Answers an List that represents the result of the bind.
		 * @return - Answers an List that represents the result of the bind.
		 */
		bind(ctxt) {
			return (this);
		},
		bindFrame(ctxt, r) {
			return (r);
		},

		/**
		 * Steps through names and variables to get to a List. 
		 * @param ctxt - Yaga context.
		 * @return - Answers an List that represents the result of the step.
		 */
		step(ctxt) {
			return (this);
		},
		stepFrame(ctxt, r) {
			return (r);
		},

		/**
		 * Steps through names and variables and applies the arguments to the
		 * resultant list. Pipelines are also stepped through with the arguments
		 * applied to the pipeline process. Ristics will be executed.
		 * Productions will be evaluated and the step passed on to the result.
		 * @param ctxt - Yaga context.
		 * @param args - Arguments that are being passed
		 * @return - Answers a List that represents the result of the step.
		 *			 Production evaluators are executed.
		 */
		stepArgs(ctxt, args) {
			return (this);
		},
		stepFrameArgs(ctxt, r, args) {
			return (r);
		},

		/**
		 * Stepping during a binding process.
		 * @param ctxt - Yaga context.
		 * @return - Answers an List that represents the result of the step.
		 *   	     See step for more details.
		 */
		bindingStep(ctxt) {
			return (this);
		},
		bindingStepFrame(ctxt, r) {
			return (r);
		},

		/**
		 * Stepping during a binding process with arguments.
		 * @param ctxt - Yaga context.
		 * @param args - Arguments that are being passed
		 * @return - Answers a List that represents the result of the binding step.
		 */
		bindingStepArgs(ctxt, args) {
			return (this);
		},
		bindingStepFrameArgs(ctxt, r, args) {
			return (r);
		},

		/**
		 * Evaluate this List. The list is recursively stepped until it reaches a
		 * form that cannot be evaluated any further.
		 * @param ctxt - Yaga context.
		 * @return - Answers an List that represents the result of the evaluation.
		 */
		evaluate(ctxt) {
			return (this);
		},
		evaluateFrame(ctxt, r) {
			return (r);
		},

		/**
		 * Evaluate during the binding process.
		 * @param ctxt - Yaga context.
		 * @return - Answers an List that represents the result of the evaluation.
		 */
		bindingEvaluate(ctxt) {
			return (this);
		},
		bindingEvaluate(ctxt, r) {
			return (r);
		},

		/**
		 * Reduce this List to it's most primitive form. 
		 * Similar to evaluate except that single element Data lists are reduced
		 * to the element and Aliases are de-aliased. 
		 * @param ctxt - Yaga context.
		 * @return - Answers an List that represents the result of the reduction.
		 */
		reduce(ctxt) {
			return (this);
		},
		reduce(ctxt, r) {
			return (r);
		},

		/**
		 * Execution of a Production evaluator.
		 * @param ctxt - Yaga context.
		 * @return - Answers the List result if not an Evaluator.
		 */
		execute(ctxt) {
			return (this);
		},

		/**
		 * Binding execution of a Production evaluator.
		 * @param ctxt - Yaga context.
		 * @return - Answers the List result if not an Evaluator.
		 */
		bindingExecute(ctxt) {
			return (this);
		},

		isBound() {
			return (this.elements().areBound());
		},
		isTrivial() {
			return (this.elements().areTrivial());
		},
		isReducible() {
			return (this.elements().areReducible());
		},
		canEvaluate() {
			return (this.elements().canEvaluate());
		},

		/**
		 * Will need a Frame.Reference if the element can contain Variable elements.
		 * @param ctxt - Yaga context.
		 * @param frame - The active frame required for future evaluation.
		 * @return - The current element or a new Frame reference object.
		 */
		asFrameReference(ctxt, frame) {
			return (this);
		},
		cloneFrameReference(ctxt, r) {
			return (r.clone(this));
		},

		propagateReference(ctxt, r) {
			return (r);
		},

		asArgumentList(ctxt) {
			throw yc.errors.InternalException("'asArgumentList'has not been implemented");
		},

		/**
		 * Adds a printable representation to the supplied StringBuilder.
		 * Resultant representation must be in a form that will be accepted by the
		 * Yaga parser.
		 * @param sb - The StringBuilder that holds the printable representation.
		 */
		print(sb) {
			throw yc.errors.InternalException("'print'has not been implemented");
		},

		printString() {
			let sb = yc.StringBuilder.new();
			this.print(sb);
			return (sb.toString());
		},
		printStream(stream) {
			stream.write(this.print());
		},
		printlnStream(stream) {
			stream.write(this.printString()).write('\n');
		},

		/**
		 * Adds a detailed printable representation to the supplied StringBuilder.
		 * This form of printable representation can contain detail that cannot be
		 * passed back through a parser.
		 * Defaults to the standard print interface.
		 * @param sb - The StringBuilder that holds the printable representation.
		 */
		xprint(sb) {
			this.print(sb);
		},
		xprintString() {
			let sb = yc.StringBuilder.new();
			this.xprint(sb);
			return (sb.toString());
		},
		xprintStream(stream) {
			stream.write(this.xprintString());
		},
		xprintlnStream(stream) {
			stream.write(this.xprintString()).write('\n');
		},

		/**
		 * Answers the Elements representation associated with the list.
		 * @return - Answers the Elements object.
		 */
		elements() {
			throw yc.errors.InternalException("'elements'has not been implemented");
		},

		// List services

		element(idx) {
			return (this.elements().element(idx));
		},
		length() {
			return (this.elements().length());
		},
		hasVariables() {
			return (this.elements().hasVariables());
		},

		isEmpty() {
			return (this.elements().isEmpty());
		},
		isNil: () => false,
		isNone: () => false,
		isContainer: () => false,
		isInjectable: () => false,

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

		// Operator functions that must be handled by all List types.
		// The r<fn> are reverse functions that allow the types to be
		// determined.
		zeroValue() {
			throw yc.errors.InternalException("'zeroValue'has not been implemented");
		},
		neg(ctxt) {
			throw yc.errors.InternalException("'neg'has not been implemented");
		},
		add(ctxt, e) {
			throw yc.errors.InternalException("'add'has not been implemented");
		},
		sub(ctxt, e) {
			throw yc.errors.InternalException("'sub'has not been implemented");
		},
		mul(ctxt, e) {
			throw yc.errors.InternalException("'mul'has not been implemented");
		},
		div(ctxt, e) {
			throw yc.errors.InternalException("'div'has not been implemented");
		},
		rem(ctxt, e) {
			throw yc.errors.InternalException("'rem'has not been implemented");
		},

		rAdd(ctxt, e) {
			return (yc.AtomTrivalent.UNKNOWN);
		},
		rSub(ctxt, e) {
			return (yc.AtomTrivalent.UNKNOWN);
		},
		rMul(ctxt, e) {
			return (yc.AtomTrivalent.UNKNOWN);
		},
		rDiv(ctxt, e) {
			return (yc.AtomTrivalent.UNKNOWN);
		},
		rRem(ctxt, e) {
			return (yc.AtomTrivalent.UNKNOWN);
		},

		// Trivalent operations that must be defaulted.
		trueSelect(eTrue, eElse) {
			return (eElse);
		},
		falseSelect(eFalse, eElse) {
			return (eElse);
		},
		unknownSelect(eUnknown, eElse) {
			return (eElse);
		},
		trueFalseSelect(eTrue, eFalse, eElse) {
			return (eElse);
		},
		trueFalseUnkownSelect(eTrue, eFalse, eUnknown) {
			return (AtomTrivalent.UNKNOWN);
		},
		trueFalseUnknownElseSelect(eTrue, eFalse, eUnknown, eElse) {
			return (eElse);
		},

		// The following a convenience methods for determing the type of an List
		// where the specific type is unknown. Come in three forms. is? will
		// anwser a boolean, as? will answer a cast of the type or throw an
		// exception, while asis? will anwser a cast of the type or null.
		isList: true,
		isFrame: false,
		isAtomic: () => false,
		isData: () => false,
		isExpression: () => false,
		isProduction: () => false,
		isProductive: () => false,
		asisProductive: () => null,
		isStepProductive: () => false,
		isStep: () => false,
		asisStep: () => null,
		isPipeline: () => false,
		asisPipeline: () => null,
		isBindingPipeline: () => false,
		asisBindingPipeline: () => null,
		isRistic: () => false,
		risticDo: (ctxt, fn) => null,
		isEvaluator: () => false,
		asisEvaluator: () => null,
		isNumber: () => false,
		asisNumber: () => null,
		asNumber() {
			throw yc.errors.CastException(this, yc.AtomNumber);
		},

		isChar: () => false,
		asisChar: () => null,
		isString: () => false,
		asisString: () => null,
		isSymbol: () => false,
		asisSymbol: () => null,
		isName: () => false,
		asisName: () => null,
		asisVariable: () => null,
		isProductiveVariable: () => false,
		asisProductiveVariable: () => null,
		isNameType: () => false,
		asisNameType() {
			return (this.asisName());
		},
		getNameType: (ctxt) => null,
		reduceSymbolType(ctxt) {
			throw yc.errors.InternalException("'reduceSymbolType'has not been implemented");
		},
		getNameSymbol: () => null,
		resolveVariable(ctxt) {
			return (this);
		},
		isUnboundName: () => false,
		asisUnboundName: () => null,
		isBoundName: () => false,
		asisBoundName: () => null,
		isNamespace: () => false,
		asisNamespace: () => null,
		asNamespace() {
			throw yc.errors.CastException(this, yc.AtomNamespace);
		},
		isComment: () => false,
		isAlias: () => false,
		dealias(ctxt) {
			return (this);
		},
		isTrue: () => false,
		isFalse: () => false,
		isUnknown: () => false,
		isTrivalent: () => false,

		cast(prot) {
			return (yc.errors.CastException(this, prot));
		},

		trace() {
			trace(console.log);
		},
		traceLabel(s) {
			trace(console.log, s);
		},

		traceStream(stream) {
			stream.write(`Trace: ${this.xprint()}\n`);
		},
		traceStreamLabel(stream, s) {
			stream.write(`Trace(${s}): ${this.xprint()}\n`);
		},

		Initialise: (y) => yc = y,
	}
}

Object.freeze(module.exports);
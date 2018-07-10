/*
 *  Copyright (c) 2014-2015 Bruce Twite
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 *  Abstract class defining behaviour for all List types.
 *  Everything in Yaga is a list.
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
 *  Pipeline - Lists of steps that can process a input list (parameters) and
 *			   produce an output list. Each step receives the output of the
 *			   previous step.
 *  Production - Special internal list create during bind that encapsulates a
 *				 sequence of parameters and pipelines for processing parameters.
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
 *  Step		- Parameters. Ristics, Pipelines step after applying parameters.
 *				  Productions will also step ignoring parameters. All other
 *				  list types answer themeselves.
 *  Evaluate	- Evaluates a list down to its minimal form by recursively 
 *				  stepping until no further steps are productive.
 *  Reduce		- The same as Evaluate except that single element Data lists are
 *				  reduced and aliases are dealiased.
 *  Dealias		- Reduce alias reference.
 */

package yaga.core;

import yaga.core.exceptions.*;
import java.io.PrintStream;
import yaga.core.ristic.Ristic;

/**
 *
 * @author Bruce
 */
public abstract class List 
{
	protected List(ParserPoint point)
		{ _point = point; }
	protected List()
		{ _point = ParserPoint.Default; }
	
	protected ParserPoint _point;
	
	public List setParserPoint(ParserPoint point)
		{ _point = point; return (this); }
	public List setParserPoint(List e)
		{ _point = e.parserPoint(); return (this); }
	public final ParserPoint parserPoint()
		{ return (_point); }
	public final ParserPoint point()
		{ return (_point); }
	
	/**
	 * Allow an element to generate parsed outcome in the form of an
	 * expression.
	 * Elements that cannot be parsed can just answer themselves
	 * @param ctxt - Yaga context.
	 * @return - Answers an List that represents the result of the bind.
	 * @throws yaga.core.exceptions.YagaException
	 */
	public List parse(Context ctxt)
		throws YagaException
		{ return (this); }
	
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
	 * @throws yaga.core.exceptions.YagaException
	 */
	public List bind(Context ctxt)
		throws YagaException
		{ return (this); }
	
	public List bind(Context ctxt, Frame.Reference r)
		throws YagaException
		{ return (r); }


	/**
	 * Steps through names and variables to get to a List. 
	 * @param ctxt - Yaga context.
	 * @return - Answers an List that represents the result of the step.
	 * @throws yaga.core.exceptions.YagaException
	 */
	public List step(Context ctxt)
		throws YagaException
		{ return (this); }

	public List step(Context ctxt, Frame.Reference r)
		throws YagaException
		{ return (r); }
	

	/**
	 * Steps through names and variables and applies the parameters to the
	 * resultant list. Pipelines are also stepped through with the parameters
	 * applied to the pipeline process. Ristics will be executed.
	 * Productions will be evaluated and the step passed on to the result.
	 * @param ctxt - Yaga context.
	 * @param parms - Parameters that are being passed
	 * @return - Answers a List that represents the result of the step.
	 *			 Production evaluators are executed.
	 * @throws yaga.core.exceptions.YagaException
	 */
	public List step(Context ctxt, List parms)
		throws YagaException
		{  return (this); }

	public List step(Context ctxt, Frame.Reference r, List parms)
		throws YagaException
		{  return (r); }
	

	/**
	 * Stepping during a binding process.
	 * @param ctxt - Yaga context.
	 * @return - Answers an List that represents the result of the step.
		     See step for more details.
	 * @throws yaga.core.exceptions.YagaException
	 */
	public List bindingStep(Context ctxt)
		throws YagaException
		{ return (this); }

	public List bindingStep(Context ctxt, Frame.Reference r)
		throws YagaException
		{ return (r); }
	
	
	/**
	 * Stepping during a binding process with parameters.
	 * @param ctxt - Yaga context.
	 * @param parms - Parameters that are being passed
	 * @return - Answers a List that represents the result of the binding step.
	 * @throws yaga.core.exceptions.YagaException
	 */
	public List bindingStep(Context ctxt, List parms)
		throws YagaException
		{ return (this); }

	public List bindingStep(Context ctxt, Frame.Reference r, List parms)
		throws YagaException
		{ return (r); }

	/**
	 * Evaluate this List. The list is recursively stepped until it reaches a
	 * form that cannot be evaluated any further.
	 * @param ctxt - Yaga context.
	 * @return - Answers an List that represents the result of the evaluation.
	 * @throws yaga.core.exceptions.YagaException
	 */
	public List evaluate(Context ctxt)
		throws YagaException
		{ return (this); }

	public List evaluate(Context ctxt, Frame.Reference r)
		throws YagaException
		{ return (r); }

	/**
	 * Evaluate during the binding process.
	 * @param ctxt - Yaga context.
	 * @return - Answers an List that represents the result of the evaluation.
	 * @throws yaga.core.exceptions.YagaException
	 */
	public List bindingEvaluate(Context ctxt)
		throws YagaException
		{ return (this); }

	public List bindingEvaluate(Context ctxt, Frame.Reference r)
		throws YagaException
		{ return (r); }
	
	/**
	 * Reduce this List to it's most primitive form. 
	 * Similar to evaluate except that single element Data lists are reduced
	 * to the element and Aliases are de-aliased. 
	 * @param ctxt - Yaga context.
	 * @return - Answers an List that represents the result of the reduction.
	 * @throws yaga.core.exceptions.YagaException
	 */
	public List reduce(Context ctxt)
		throws YagaException
		{ return (this); }

	public List reduce(Context ctxt, Frame.Reference r)
		throws YagaException
		{ return (r); }
	
	
	
	/**
	 * Execution of a Production evaluator.
	 * @param ctxt - Yaga context.
	 * @return - Answers the List result if not an Evaluator.
	 * @throws yaga.core.exceptions.YagaException
	 */
	protected List execute(Context ctxt)
		throws YagaException
		{ return (this); }

	
	/**
	 * Binding execution of a Production evaluator.
	 * @param ctxt - Yaga context.
	 * @return - Answers the List result if not an Evaluator.
	 * @throws yaga.core.exceptions.YagaException
	 */
	protected List bindingExecute(Context ctxt)
		throws YagaException
		{ return (this); }
	
	/**
	 * Indicates whether the List has been bound.
	 * @return - True if bound otherwise False.
	 */
	public boolean isBound()
		{ return (elements().areBound()); }
	
	/**
	 * Indicates whether the List is a Trivial.
	 * @return - True if trivial otherwise False.
	 */
	public boolean isTrivial()
		{ return (elements().areTrivial()); }
	
	/**
	 * Indicates whether the List reducible.
	 * @return - True if reducible otherwise False.
	 */
	public boolean isReducible()
		{ return (elements().areReducible()); }
	
	/**
	 * Indicates whether the List can be evaluated.
	 * @return - True if can be evaluated otherwise False.
	 */
	public boolean canEvaluate()
		{ return (elements().canEvaluate()); }
	
	/**
	 * Will need a Frame.Reference if the element can contain Variable elements.
	 * @param ctxt - Yaga context.
	 * @param frame - The active frame required for future evaluation.
	 * @return - The current element or a new Frame reference object.
	 * @throws yaga.core.exceptions.YagaException
	 */
	public List asFrameReference(Context ctxt, Frame frame) throws YagaException
		{ return (this); }
	
	public List asFrameReference(Context ctxt, Frame.Reference r) throws YagaException
		{ return (r.clone(this)); }
	
	public List propagateReference(Context ctxt, Frame.Reference r) throws YagaException
		{ return (r); }
	
	public abstract List asParameterList(Context ctxt) throws YagaException;
	
	/**
	 * Adds a printable representation to the supplied StringBuilder.
	 * Resultant representation must be in a form that will be accepted by the
	 * Yaga parser.
	 * @param sb - The StringBuilder that holds the printable representation.
	 */
	public abstract void print(StringBuilder sb);
	
	public final String print()
		{ StringBuilder sb; print(sb = new StringBuilder()); return (sb.toString()); }
	public final void print(PrintStream stream)
		{  stream.print(print()); }
	public final void println(PrintStream stream)
		{  stream.println(print()); }
	
	/**
	 * Adds a detailed printable representation to the supplied StringBuilder.
	 * This form of printable representation can contain detail that cannot be
	 * passed back through a parser.
	 * Defaults to the standard print interface.
	 * @param sb - The StringBuilder that holds the printable representation.
	 */
	public void xprint(StringBuilder sb)
		{ print(sb); }
	
	public final String xprint()
		{ StringBuilder sb; List.this.xprint(sb = new StringBuilder()); return (sb.toString()); }
	public final void xprint(PrintStream stream)
		{  stream.print(List.this.xprint()); }
	public final void xprintln(PrintStream stream)
		{  stream.println(List.this.xprint()); }

	/**
	 * Answers the Elements representation associated with the list.
	 * @return - Answers the Elements object.
	 */
	public abstract Elements elements();
	
	// List services
	
	public List element(int idx)
		{ return (elements().element(idx)); }
	
	public int length()
		{ return (elements().length()); }
	
	public boolean hasVariables()
		{ return (elements().hasVariables()); }
	
	public boolean isEmpty()
		{ return (elements().isEmpty()); }
	public boolean isNil()
		{ return (false); }
	public boolean isNone()
		{ return (false); }
	public boolean isContainer()
		{ return (false); }
	public boolean isInjectable()		
		{ return (false); }

	public List headElement()
		{ return (elements().head()); }
	public List tailElement()
		{ return (elements().end()); }
	
	public List headSubList()
		{ return (Lists.newData(elements().front())); }
	public List tailSubList()
		{ return (Lists.newData(elements().tail())); }
	
	public List appendList(List e)	
		{  return (Lists.newData(elements().append(e), _point)); }
	
	// Operator functions that must be handled by all List types.
	// The r<fn> are reverse functions that allow the types to be
	// determined.
	public abstract List zeroValue() throws YagaException;
	public abstract List neg(Context ctxt) throws YagaException;
	public abstract List add(Context ctxt, List e) throws YagaException;
	public abstract List sub(Context ctxt, List e) throws YagaException;
	public abstract List mul(Context ctxt, List e) throws YagaException;
	public abstract List div(Context ctxt, List e) throws YagaException;
	public abstract List rem(Context ctxt, List e) throws YagaException;

	public List rAdd(Context ctxt, List e) throws YagaException
		{ return (AtomTrivalent.UNKNOWN); }
	public List rSub(Context ctxt, List e) throws YagaException
		{ return (AtomTrivalent.UNKNOWN); }
	public List rMul(Context ctxt, List e) throws YagaException
		{ return (AtomTrivalent.UNKNOWN); }
	public List rDiv(Context ctxt, List e) throws YagaException
		{ return (AtomTrivalent.UNKNOWN); }
	public List rRem(Context ctxt, List e) throws YagaException
		{ return (AtomTrivalent.UNKNOWN); }
	
	// Trivalent operations that must be defaulted.
	public List trueSelect(List eTrue, List eElse)
		{ return (eElse); }
	public List falseSelect(List eFalse, List eElse)
		{ return (eElse); }
	public List unknownSelect(List eUnknown, List eElse)
		{ return (eElse); }
	public List trueFalseSelect(List eTrue, List eFalse, List eElse)
		{ return (eElse); }
	public List select(List eTrue, List eFalse, List eUnknown)
		{ return (AtomTrivalent.UNKNOWN); }
	public List select(List eTrue, List eFalse, List eUnknown, List eElse)
		{ return (eElse); }
	
	// The following a convenience methods for determing the type of an List
	// where the specific type is unknown. Come in three forms. is? will
	// anwser a boolean, as? will answer a cast of the type or throw an
	// exception, while asis? will anwser a cast of the type or null.
	
	public boolean isAtomic()
		{ return (false); }
	public boolean isData()
		{ return (false); }

	public boolean isExpression()
		{ return (false); }
	
	public boolean isProduction()
		{ return (false); }
	
	public boolean isProductive()
		{ return (false); }
	public Productive asisProductive()
		{ return (null); }
	
	public boolean isStepProductive()
		{ return (false); }
	public boolean isStep()
		{ return (false); }
	public Pipeline.Step asisStep()
		{ return (null); }
	
	public boolean isPipeline()
		{ return (false); }
	public Pipeline asisPipeline()
		{ return (null); }
	
	public boolean isBindingPipeline()
		{ return (false); }
	public Pipeline.Binding asisBindingPipeline()
		{ return (null); }
	
	public boolean isRistic()
		{ return (false); } 
	static public interface RisticDo
		{ public List run(Ristic l) throws YagaException; }
	public List risticDo(Context ctxt, RisticDo fn) throws YagaException
		{ return (null); } 
	
	public boolean isEvaluator()
		{ return (false); }
	public Production.Evaluator asisEvaluator()
		{ return (null); } 
	
	public boolean isNumber()
		{ return (false); }
	public AtomNumber asisNumber()
		{ return (null); } 
	public AtomNumber asNumber() throws CastException
		{ throw cast(AtomNumber.class); } 
	
	public boolean isChar()
		{ return (false); }
	public AtomChar asisChar()
		{ return (null); } 
	
	public boolean isString()
		{ return (false); }
	public AtomString asisString()
		{ return (null); } 
	
	public boolean isSymbol()
		{ return (false); }
	public AtomSymbol asisSymbol()
		{ return (null); } 

	public boolean isName()
		{ return (false); }
	public Name asisName() throws YagaException
		{ return (null); } 
	
	public Variable asisVariable()
		{ return (null); }
	public boolean isProductiveVariable()
		{ return (false); }
	public Variable.ProductiveVariable asisProductiveVariable()
		{ return (null); }
	
	public boolean isNameType()
		{ return (false); }
	public Name asisNameType() throws YagaException
		{ return (asisName()); } 
	public Name getNameType(Context ctxt) throws YagaException
		{ return (null); }
	public Symbol reduceSymbolType(Context ctxt) throws YagaException
		{ throw new UnsupportedOperationException("Not Supported"); }
	public Symbol getNameSymbol()
		{ return (null); }

	public List resolveVariable(Context ctxt) throws YagaException
		{ return (this); }
	
	public boolean isUnboundName()					
		{ return (false); }
	public Name.Unbound asisUnboundName()		
		{ return (null); } 
	
	public boolean isBoundName()					
		{ return (false); }
	public Name.Bound asisBoundName()			
		{ return (null); } 
	
	public boolean isNamespace()
		{ return (false); }
	public AtomNamespace asisNamespace()
		{ return (null); } 
	public AtomNamespace asNamespace() throws CastException 
		{ throw cast(AtomNamespace.class); } 
	
	public boolean isComment()
		{ return (false); }
	
	public boolean isAlias()
		{ return (false); }
	public List dealias(Context ctxt) throws YagaException
		{ return (this); }

	public boolean isTrue()
		{ return (false); }
	public boolean isFalse()
		{ return (false); }
	public boolean isUnknown()
		{ return (false); }
	public boolean isTrivalent()
		{ return (false); }

	public CastException cast(Class cls)
		{ return (new CastException(this, cls)); }
	
	public final void trace()
		{ trace(System.out); }
	public final void trace(String s)
		{ trace(System.out, s); }
	
	public final void trace(PrintStream stream)
		{ stream.printf("Trace: %s\n", xprint()); }
	public final void trace(PrintStream stream, String s)
		{ stream.printf("Trace(%s): %s\n", s, xprint()); }
}

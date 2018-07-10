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
 *  Takes an expression of the form ([e1] ep1 [[e2] ep2 [e3]] ...)
 *  to produce a normalised form in Polish notaion for evaluation. Each
 *  ep is a pipeline where each pipeline has an assigned precedence.
 *  For example (1 + 2 * 3) -> (+ 1 (* 2 3)) * has greater precedence.
 *
 *  Productions are created as a consequence of binding an expression and can
 *  therefore contain binding pipelines. In this case the binding pipeline
 *  must be evaluated with all elements to the right of the binding pipeline
 *  and injected into the element list to continue the bind.
 *
 *  The Production element list is broken down into an Evaluator structure
 *  in Polish notation form.
 *
 *  When a production is evaluated, the evalutor sequence is excecuted. We
 *  never answer an Evaluator. Lazy evaluation means that a result could be
 *  a Production, or a Container that contains Productions.
 */
package yaga.core;

import yaga.core.exceptions.EvaluateException;
import yaga.core.exceptions.YagaException;

/**
 *
 * @author Bruce
 */
public class Production extends Container
{
	static protected List newProduction(Context ctxt, Elements elements, ParserPoint point)
		throws YagaException
	{
		List e = newEvaluator(ctxt, elements, point);
		if (!e.isEvaluator())
			return (e);
		return ((new Production(elements, e.asisEvaluator())).setParserPoint(point));
	}
	
	/**
	 * Reduce the element list down to a single Evaluator by iteratively
	 * finding the highest precedent pipeline and substituting an
	 * Evaluator that represents the pipeline and it's parameters into the 
	 * element list. The process is finished when there is only one Evaluator 
	 * remaining.
	 * 
	 * Productions that have a single productive element are candidates for 
	 * generating stepped pipelines. This allows incomplete parameter lists
	 * to be pre-mapped to a pipeline in the form of a Pipeline.Step. This can
	 * then be passed as a parameter to other pipelines and evaluated or stepped
	 * by completing the parameter list.
	 * 
	 * Productions that have a single step productive element will upgrade the
	 * the element to productive rather that just a parameter.
	 *   Ex. ((1 +) 2) will result in (1+) generating a Pipeline.Step that will
	 *		 then be promoted to being productive in the outer Production.
	 *		 If this is not the desired outcome then change expression to
	 *		 [(1 +) 2] to force a data list to be constructed.
	 * 
	 * Note Productive implies that the List is productive from a Production
	 * perspective while step productive means that the List will be
	 * productive if stepped with parameters.
	 * 
	 * @param ctxt - Yaga context
	 * @param elements - List of elements associated with Production
	 * @param point - Parser position associated with Production
	 * @return - List that is either an Evaluator or a non productive List
	 */
	static private List newEvaluator(Context ctxt, Elements elements, ParserPoint point)
		throws YagaException
	{
		List[] es = elements.asArray();
		boolean flChildEvaluator = false;
		int nSteps = 0; Pipeline.Step step = null;
		int nProds = 0;
		for (;;)
		{
			int iep = -1; Productive bestProd = null;
			for (int i = 0; i < es.length; i++)
			{
				List ep = es[i];
				if (ep.isStep() && bestProd == null)
				{
					nSteps++; step = ep.asisStep();
					iep = i;
					continue;
				}
				Productive prod = ep.asisProductive();
				if (prod == null)
					continue;
				nProds++;
				if (bestProd == null || prod.precedence() < bestProd.precedence())
					{ bestProd = prod; iep = i; }
			}
			if (bestProd == null)
			{
				// If we have a single step then we will apply the parameters
				// to the step and answer that.
				if (nSteps == 1 && step != null)
					{ return (step.mapStep(ctxt, es, iep).prod.asisStep()); }
				
				// The list has been reduced down removing all pipelines.
				// Constuct the appropriate list, or if we are down to just
				// a single element then we answer that.
				elements = Elements.make(es);
				if (elements.areBound())
				{
					if (flChildEvaluator)
						return (new ListEvaluator(elements, point));
					if (es.length == 1)
						return (es[0]);
					return (Lists.newData(elements, point));
				}
				return (new Expression.BoundProd(elements, false, false, point));
			}

			// Locate the element range for the best candidate
			int iep1 = 0, iep2 = es.length - 1;
			for (int i = iep - 1; i >= 0; i--)
				if (es[i].isProductive())
					{ iep1 = i + 1; break; }
			for (int i = iep + 1; i < es.length; i++)
				if (es[i].isProductive())
					{ iep2 = i - 1; break; }

			// If we only have a single productive then we allow this to map
			// down to a stepped pipeline.
			Map map;
			if (nProds == 1)
			{
				map = bestProd.mapStep(ctxt, es, iep);
				if (map.prod.isStep())
					return (map.prod.asisStep());
			}
			else
				map = bestProd.mapExecute(ctxt, es, iep, iep1, iep2);
			if (map.elements.length <= 1)
				return (newEvaluator(map.prod, map.eProd, map.parms));

			// Need to keep reducing
			(es = map.elements)[map.iep] = newEvaluator(map.prod, map.eProd, map.parms);
			flChildEvaluator = true;
		}
	}
	
	static private List newEvaluator(Productive prod, List ep, List[] parms)
	{
		boolean flVar = false;
		for (List e : parms)
		{
			if (e.isBoundName() && e.asisBoundName().isVariable())
				flVar = true;
			else if (e.isEvaluator())
				return (new Evaluator(prod, ep, parms));
		}
		if (flVar)
			return (new VariableEvaluator(prod, ep, parms));
		return (new StaticEvaluator(prod, ep, parms));
	}
	
	private Production(Elements elements, Evaluator e)
		throws YagaException
		{ super(elements); _eval = e; }

	private final Container _eval;

	@Override
	public List step(Context ctxt, List parms)
		throws YagaException
		{  return (evaluate(ctxt).step(ctxt, parms)); }
	
	@Override
	public List step(Context ctxt, Frame.Reference r, List parms)
		throws YagaException
		{  return (r.frame().dispatch(ctxt, () -> evaluate(ctxt).step(ctxt, parms))); }

	@Override
	public List bindingStep(Context ctxt, List parms)
		throws YagaException
		{  return (bindingEvaluate(ctxt).bindingStep(ctxt, parms)); }
	
	@Override
	public List bindingStep(Context ctxt, Frame.Reference r, List parms)
		throws YagaException
		{  return (r.frame().dispatch(ctxt, () -> bindingEvaluate(ctxt).bindingStep(ctxt, parms))); }
	
	@Override
	public List evaluate(Context ctxt)
		throws YagaException
		{ return (_eval.execute(ctxt).evaluate(ctxt)); }
	@Override
	public List evaluate(Context ctxt, Frame.Reference r)
		throws YagaException
		{ return (r.frame().dispatch(ctxt, () ->_eval.execute(ctxt).evaluate(ctxt))); }
	
	@Override
	public List bindingEvaluate(Context ctxt)
		throws YagaException
		{ return (_eval.bindingExecute(ctxt).bindingEvaluate(ctxt)); }
	@Override
	public List bindingEvaluate(Context ctxt, Frame.Reference r)
		throws YagaException
		{ return (r.frame().dispatch(ctxt, () ->_eval.bindingExecute(ctxt).bindingEvaluate(ctxt))); }
	
	@Override
	public List reduce(Context ctxt)
		throws YagaException
		{ return (_eval.execute(ctxt).reduce(ctxt)); }
	@Override
	public List reduce(Context ctxt, Frame.Reference r)
		throws YagaException
		{ return (r.frame().dispatch(ctxt, () ->_eval.execute(ctxt).reduce(ctxt))); }
	
	@Override
	public boolean isReducible()		{ return (true); }
	@Override
	public boolean canEvaluate()		{ return (true); }
	
	@Override
	public boolean isProduction()		{ return (true); }
	
	@Override
	public void print(StringBuilder sb) 
		{ sb.append("( "); Lists.printElements(sb, _elements); sb.append(")"); }

	@Override
	public void xprint(StringBuilder sb) 
		{ sb.append("[Prod]"); _eval.xprint(sb); }


	static protected class Evaluator extends Container
	{
		private Evaluator(Productive prod, List ep, List[] parms)
			{  super(Elements.make(parms), prod.parserPoint()); _prod = prod; _eProd = ep; }
		private Evaluator(List[] parms, ParserPoint point)
			{  super(Elements.make(parms), point); _prod = null; _eProd = null; }
		private Evaluator(Elements parms, ParserPoint point)
			{  super(parms, point); _prod = null; _eProd = null; }

		protected final Productive	_prod;
		protected final List		_eProd;

		@Override
		public List bindingStep(Context ctxt)
			throws YagaException
			{ throw new EvaluateException(EvaluateException.ErrorType.EVALUATOR, this, "Invalid call to 'bindingStep'"); }

		@Override
		public List evaluate(Context ctxt)
			throws YagaException
			{ throw new EvaluateException(EvaluateException.ErrorType.EVALUATOR, this, "Invalid call to 'evaluate'"); }

		@Override
		public List reduce(Context ctxt)
			throws YagaException
			{ throw new EvaluateException(EvaluateException.ErrorType.EVALUATOR, this, "Invalid call to 'reduce'"); }

		@Override
		public List step(Context ctxt)
			throws YagaException
			{ throw new EvaluateException(EvaluateException.ErrorType.EVALUATOR, this, "Invalid call to 'step'"); }

		@Override
		public List bindingExecute(Context ctxt)
			throws YagaException
		{ 
			ctxt.pushFlow(_eProd);
			List[] arr = _elements.asArray();
			List[] es = new List[arr.length];
			for (int i = 0; i < es.length; i++)
				es[i] = arr[i].resolveVariable(ctxt).bindingExecute(ctxt);
			List res = _prod.bindingStep(ctxt, Lists.newData(es, _point));
			ctxt.popFlow();
			return (res);
		}

		@Override
		public List execute(Context ctxt)
			throws YagaException
		{ 
			ctxt.pushFlow(_eProd);
			List[] arr = _elements.asArray();
			List[] es = new List[arr.length];
			for (int i = 0; i < es.length; i++)
				es[i] = arr[i].resolveVariable(ctxt).execute(ctxt);
			List res = _prod.step(ctxt, Lists.newData(es, _point));
			ctxt.popFlow();
			return (res);
		}

		@Override
		public void print(StringBuilder sb) 
			{ xprint(sb); }

		@Override
		public void xprint(StringBuilder sb) 
		{
			sb.append("[Evaluator "); _eProd.xprint(sb); sb.append("]( ");
			List[] es = _elements.asArray();
			int i = 0;
			for (; i < es.length - 1; i++)
				{ es[i].xprint(sb); sb.append(','); }
			es[i].xprint(sb); sb.append(" )");
		}

		@Override
		public boolean isEvaluator()		{ return (true); }
		@Override
		public Evaluator asisEvaluator()	{ return (this); }
	}

	static protected class StaticEvaluator extends Evaluator
	{
		private StaticEvaluator(Productive prod, List ep, List[] parms)
			{  super(prod, ep, parms); _parms = Lists.newData(parms); }
		
		private final List _parms;

		@Override
		public List bindingExecute(Context ctxt)
			throws YagaException
		{ 
			ctxt.pushFlow(_eProd);
			List res = _prod.bindingStep(ctxt, _parms);
			ctxt.popFlow();
			return (res);
		}

		@Override
		public List execute(Context ctxt)
			throws YagaException
		{ 
			ctxt.pushFlow(_eProd);
			List res = _prod.step(ctxt, _parms);
			ctxt.popFlow();
			return (res);
		}
	}

	static protected class VariableEvaluator extends Evaluator
	{
		private VariableEvaluator(Productive prod, List ep, List[] parms)
			{  super(prod, ep, parms); }

		@Override
		public List bindingExecute(Context ctxt)
			throws YagaException
		{ 
			ctxt.pushFlow(_eProd);
			List[] arr = _elements.asArray();
			List[] es = new List[arr.length];
			for (int i = 0; i < es.length; i++)
				es[i] = arr[i].resolveVariable(ctxt);
			List res = _prod.bindingStep(ctxt, Lists.newData(es, _point));
			ctxt.popFlow();
			return (res);
		}

		@Override
		public List execute(Context ctxt)
			throws YagaException
		{ 
			ctxt.pushFlow(_eProd);
			List[] arr = _elements.asArray();
			List[] es = new List[arr.length];
			for (int i = 0; i < es.length; i++)
				es[i] = arr[i].resolveVariable(ctxt);
			List res = _prod.step(ctxt, Lists.newData(es, _point));
			ctxt.popFlow();
			return (res);
		}
	}

	static protected class ListEvaluator extends Evaluator
	{
		private ListEvaluator(Elements parms, ParserPoint point)
			{  super(parms, point); }

		@Override
		public List bindingExecute(Context ctxt)
			throws YagaException
		{ 
			List[] arr = _elements.asArray();
			List[] es = new List[arr.length];
			for (int i = 0; i < es.length; i++)
				es[i] = arr[i].resolveVariable(ctxt).bindingExecute(ctxt);
			return (Lists.newData(es, _point));
		}

		@Override
		public List execute(Context ctxt)
			throws YagaException
		{ 
			List[] arr = _elements.asArray();
			List[] es = new List[arr.length];
			for (int i = 0; i < es.length; i++)
				es[i] = arr[i].resolveVariable(ctxt).execute(ctxt);
			return (Lists.newData(es, _point));
		}

		@Override
		public void xprint(StringBuilder sb) 
		{
			sb.append("[ListEvaluator]( ");
			List[] es = _elements.asArray();
			int i = 0;
			for (; i < es.length - 1; i++)
				{ es[i].xprint(sb); sb.append(','); }
			es[i].xprint(sb); sb.append(" )");
		}
	}
	
	static public class Map
	{
		public Map(Productive p, List ep, List[] es, List[] ps, int i)
			{ prod = p; eProd = ep; elements = es; parms = ps; iep = i; }
		
		public final Productive	prod;
		public final List		eProd;	// Need original in case is referenced.
		public List[]			elements;
		public final List[]		parms;
		public int				iep;
		
		public final Map inject(Context ctxt, List e)
			throws YagaException
		{
			// If we get back an Injection then we need to inject the elements of
			// the list into the mapping position of the pipeline otherwise we
			// go with the element that we have been provided.
			if (!e.isInjectable())
			{ 
				elements[iep] = e; 
				// If we have an alias returned, then we dealias and start from the next position
				if (e.isAlias())
					{ elements[iep] = e.dealias(ctxt); iep++; }
				return (this); 
			}
			List[] es = e.elements().asExpandedArray(ctxt);
			List[] res = new List[elements.length + es.length - 1];
			System.arraycopy(elements, 0, res, 0, iep);
			System.arraycopy(es, 0, res, iep, es.length);
			System.arraycopy(elements, iep + 1, res, iep + es.length, elements.length - (iep + 1));
			elements = es;
			return (this);
		}
	}

	@Override
	public List neg(Context ctxt)
		throws YagaException
		{ return (evaluate(ctxt).neg(ctxt)); }
	
	@Override
	public List add(Context ctxt, List e)
		throws YagaException
		{ return (evaluate(ctxt).add(ctxt, e)); }
	
	@Override
	public List sub(Context ctxt, List e)
		throws YagaException
		{ return (evaluate(ctxt).sub(ctxt, e)); }
	
	@Override
	public List mul(Context ctxt, List e)
		throws YagaException
		{ return (evaluate(ctxt).mul(ctxt, e)); }
	
	@Override
	public List div(Context ctxt, List e)
		throws YagaException
		{ return (evaluate(ctxt).div(ctxt, e)); }
	
	@Override
	public List rem(Context ctxt, List e)
		throws YagaException
		{ return (evaluate(ctxt).rem(ctxt, e)); }

	
	@Override
	public List rAdd(Context ctxt, List e)
		throws YagaException
		{ return (e.add(ctxt, evaluate(ctxt))); }
	
	@Override
	public List rSub(Context ctxt, List e)
		throws YagaException
		{ return (e.sub(ctxt, evaluate(ctxt))); }
	
	@Override
	public List rMul(Context ctxt, List e)
		throws YagaException
		{ return (e.mul(ctxt, evaluate(ctxt))); }
	
	@Override
	public List rDiv(Context ctxt, List e)
		throws YagaException
		{ return (e.div(ctxt, evaluate(ctxt))); }
	
	@Override
	public List rRem(Context ctxt, List e)
		throws YagaException
		{ return (e.rem(ctxt, evaluate(ctxt))); }
}

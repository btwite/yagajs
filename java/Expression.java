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
 *  Container of elements that have not been bound or evaluated. An expression
 *  is called a Trivial if after binding the result is a list that is
 *  equal to the original expression. Can be used unchanged. Note that
 *  atomic elements are also examples of Trivials.
 */
package yaga.core;

import java.util.Arrays;
import yaga.core.exceptions.YagaException;
import yaga.core.ristic.ExprRistic;
import yaga.core.ristic.Ristic;

/**
 *
 * @author Bruce
 */
public abstract class Expression extends Container
{
	public Expression(Elements e, ParserPoint point)
		{ super(e, point); }
	
	@Override
	public List dealias(Context ctxt)
		{ return (this); }
	
	@Override
	public boolean isReducible()	
		{ return (false); }
	@Override
	public boolean isBound()		
		{ return (false); }

	@Override
	public List bindingStep(Context ctxt)
		throws YagaException
		{ return (bind(ctxt).bindingStep(ctxt)); }
	@Override
	public List bindingStep(Context ctxt, Frame.Reference r)
		throws YagaException
		{ return (r.frame().dispatch(ctxt, () -> bindingStep(ctxt))); }
	
	@Override
	public List bind(Context ctxt)
		throws YagaException
	{
		if (_elements.isEmpty())
			return (Lists.nil(_point));
		ctxt.pushFlow(this);
		List e = bindExpression(ctxt, this, _elements);
		ctxt.popFlow();
		return (e);
	}

	@Override
	public List bind(Context ctxt, Frame.Reference r)
		throws YagaException
		{ return (r.frame().dispatch(ctxt, () -> bind(ctxt))); }
	
	@Override
	public boolean isExpression()		{ return (true); }
	
	protected abstract List bindExpression(Context ctxt, List source, Elements iElements)
		throws YagaException;

	static public class ProdExpr extends Expression
	{
		public ProdExpr(Elements e, ParserPoint point)
			{ super(e, point); }
		
		@Override
		protected List bindExpression(Context ctxt, List source, Elements iElements)
			throws YagaException
		{
			if (iElements.isEmpty())
				return (Lists.nil(source.parserPoint()));

			boolean flReducing = false;
			List[] arr = iElements.asExpandedArray(ctxt);
			List[] eso = Arrays.copyOf(arr, arr.length);
			// Work through the expression and bind each element. 
			for (int i = 0; i < eso.length; )
			{
				List e = eso[i] = eso[i].bind(ctxt);
				if (i == 0 && e.isRistic())
				{
					// Ristics are only activated if at head of list.
					final List es[] = eso;
					List res = e.risticDo(ctxt, (r) ->
					{
						if (r.isBound())
							return (Ristic.headRisticReduction(ctxt, source, r, es));
						return (AtomNone.VALUE);
					});
					if (!res.isNone())
						return (res);
				}
				Pipeline.Binding pipe = e.asisBindingPipeline();
				if (pipe != null)
				{
					flReducing = true; 
					Production.Map map = runBindingPipeline(ctxt, pipe, eso, i);
					eso = map.elements;
					i = map.iep; // Reprocess from the map position
					continue;
				}
				eso[i++] = e;
			}
			return (reduceExpression(ctxt, source, Elements.make(eso, source), flReducing));
		}

		private Production.Map runBindingPipeline(Context ctxt, Pipeline.Binding pipe, List[] elements, int idx)
			throws YagaException
		{
			Production.Map map = pipe.mapExecute(ctxt, elements, idx, idx, elements.length - 1);
			List e = map.prod.bindingStep(ctxt, Lists.newData(map.parms, pipe.parserPoint()));
			return (map.inject(ctxt, e));
		}
		
		private List reduceExpression(Context ctxt, List source, Elements iElements, boolean flReducing)
			throws YagaException
		{
			// Can't use isSingle() here as we want to reduce injecting lists.
			if (flReducing && iElements.asArray().length == 1)
				return (iElements.asArray()[0]);

			if (iElements.giveProduction())
				return (Production.newProduction(ctxt, iElements, source.parserPoint()));
			if (!iElements.areBound())
				return (new Expression.BoundProd(iElements, false, false, source.parserPoint()));
			return (Lists.newData(iElements, source.parserPoint()));
		}

		@Override
		public List appendList(List e)	
			{ return (new Expression.ProdExpr(_elements.append(e), _point)); }

		@Override
		public void print(StringBuilder sb) 
			{ sb.append("( "); Lists.printElements(sb, _elements); sb.append(')'); }

		@Override
		public void xprint(StringBuilder sb) 
			{ sb.append("[Expr]( "); Lists.xprintElements(sb, _elements); sb.append(")"); }
	}

	static public class DataExpr extends Expression
	{
		public DataExpr(Elements e, ParserPoint point)
			{ super(e, point); }

		
		@Override
		protected List bindExpression(Context ctxt, List source, Elements iElements)
			throws YagaException
		{
			if (iElements.isEmpty())
				return (Lists.nil(source.parserPoint()));

			boolean flBound = true, flUnchanged = true;
			List[] arr = iElements.asExpandedArray(ctxt);
			List[] eso = new List[arr.length];
			// Work through the expression and bind each element. 
			for (int i = 0; i < eso.length; i++)
			{
				if (arr[i].isBound())
					{ eso[i] = arr[i]; continue; }
				eso[i] = arr[i].bind(ctxt);
				flUnchanged = false;
				if (!eso[i].isBound())
					flBound = false;
			}
			if (eso.length == 1 && eso[0].isAtomic())
				return (eso[0]);
			if (!flBound)
				return (new Expression.BoundData(Elements.make(eso, source), false, false, source.parserPoint()));
			return (Lists.newData(flUnchanged ? iElements : Elements.make(eso, source), source.parserPoint()));
		}

		@Override
		public List appendList(List e)	
			{ return (new Expression.DataExpr(_elements.append(e), _point)); }

		@Override
		public void print(StringBuilder sb) 
			{ sb.append("[ "); Lists.printElements(sb, _elements); sb.append(']'); }

		@Override
		public void xprint(StringBuilder sb) 
			{ sb.append("[Expr][ "); Lists.xprintElements(sb, _elements); sb.append("]"); }
	}
	
	static public class BoundProd extends ProdExpr
	{
		public BoundProd(Elements e, boolean flBind, boolean flNames, ParserPoint point)
			{ super(e, point); _flBind = flBind; _flNames = flNames; }

		private final boolean _flBind;
		private final boolean _flNames;
		
		@Override
		public List bindingStep(Context ctxt)
			throws YagaException
			{ return (this); }
	
		@Override
		public boolean isBound()
			{ return (true); }
		@Override
		public boolean isTrivial()		
			{ return (true); }

		@Override
		public void print(StringBuilder sb) 
		{ 
			printHeader(sb, _elements, true, _flBind, _flNames); 
			Lists.printElements(sb, _elements); sb.append(')'); 
		}

		@Override
		public void xprint(StringBuilder sb) 
		{ 
			printHeader(sb, _elements, true, _flBind, _flNames); 
			Lists.xprintElements(sb, _elements); sb.append(')'); 
		}
	}
	
	static public class BoundData extends DataExpr
	{
		public BoundData(Elements e, boolean flBind, boolean flNames, ParserPoint point)
			{ super(e, point); _flBind = flBind; _flNames = flNames; }

		private final boolean _flBind;
		private final boolean _flNames;
		
		@Override
		public List bindingStep(Context ctxt)
			throws YagaException
			{ return (this); }
	
		@Override
		public boolean isBound()
			{ return (true); }
		@Override
		public boolean isTrivial()		
			{ return (true); }

		@Override
		public void print(StringBuilder sb) 
		{ 
			printHeader(sb, _elements, false, _flBind, _flNames); 
			Lists.printElements(sb, _elements); sb.append(')'); 
		}

		@Override
		public void xprint(StringBuilder sb) 
		{ 
			printHeader(sb, _elements, false, _flBind, _flNames); 
			Lists.xprintElements(sb, _elements); sb.append(')'); 
		}
	}

	static private StringBuilder printHeader(StringBuilder sb, Elements elements, 
											boolean flProd, boolean flBind, boolean flNames) 
	{
		sb.append("(("); 
		Ristic.risticClassName(sb, ExprRistic.class).append(flProd ? " #prod" : " #data");
		if (flBind)
			sb.append(" #bind");
		if (flNames)
			sb.append(" #names");
		if (!elements.areBound())
			sb.append(" #unbound");
		sb.append(") ");
		return (sb);
	}
}

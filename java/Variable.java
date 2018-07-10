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
 *  Variable type names.
 */
package yaga.core;

import yaga.core.exceptions.BinderException;
import yaga.core.exceptions.YagaException;
import yaga.core.ristic.PipeRistics;

public class Variable extends Name.Bound
	implements VariableBinder
{
	static public final char PIPELEAD	= '|';
	static public final char PRODLEAD	= '!';
	static public final char INJLEAD	= '^';
	
	protected Variable(Name n, PipeRistics pipe, int idx)
		{ super(n, pipe); _idx = idx; _pipe = pipe; }
	protected Variable(AtomSymbol n, PipeRistics pipe, int idx)
		{ super(n, pipe); _idx = idx; _pipe = pipe; }

	private final int _idx;
	private final PipeRistics _pipe;

	@Override
	public Variable asisVariable()
		{ return (this); }

	@Override
	public Variable bindName(Unbound name) 
		{ return (name.symbol() == symbol() ? this : null); }

	@Override
	public final List asParameterList(Context ctxt)
		throws YagaException
		{ return (resolveVariable(ctxt).asParameterList(ctxt)); }

	@Override
	public List resolveVariable(Context ctxt)
		throws YagaException
		{ return (ctxt.currentFrame().readVariable(ctxt, this).resolveVariable(ctxt)); }

	@Override
	public List step(Context ctxt) throws YagaException
		{ return (resolveVariable(ctxt).step(ctxt)); }
	@Override
	public List step(Context ctxt, Frame.Reference r)
		throws YagaException
		{ return (r.frame().dispatch(ctxt, () -> resolveVariable(ctxt).step(ctxt))); }

	@Override
	public List step(Context ctxt, List parms) throws YagaException
		{ return (resolveVariable(ctxt).step(ctxt, parms)); }
	@Override
	public List step(Context ctxt, Frame.Reference r, List parms)
		throws YagaException
		{ return (r.frame().dispatch(ctxt, () -> resolveVariable(ctxt).step(ctxt, parms))); }

	@Override
	public List bindingStep(Context ctxt) throws YagaException
		{ return (resolveVariable(ctxt).bindingStep(ctxt)); }
	@Override
	public List bindingStep(Context ctxt, Frame.Reference r)
		throws YagaException
		{ return (r.frame().dispatch(ctxt, () -> resolveVariable(ctxt).bindingStep(ctxt))); }

	@Override
	public List bindingStep(Context ctxt, List parms) throws YagaException
		{ return (resolveVariable(ctxt).bindingStep(ctxt, parms)); }
	@Override
	public List bindingStep(Context ctxt, Frame.Reference r, List parms)
		throws YagaException
		{ return (r.frame().dispatch(ctxt, () -> resolveVariable(ctxt).bindingStep(ctxt, parms))); }

	@Override
	public List evaluate(Context ctxt) throws YagaException
		{ return (resolveVariable(ctxt).evaluate(ctxt)); }
	@Override
	public List evaluate(Context ctxt, Frame.Reference r) throws YagaException
		{ return (r.frame().dispatch(ctxt, () -> resolveVariable(ctxt).evaluate(ctxt))); }

	@Override
	public List bindingEvaluate(Context ctxt) throws YagaException
		{ return (resolveVariable(ctxt).bindingEvaluate(ctxt)); }
	@Override
	public List bindingEvaluate(Context ctxt, Frame.Reference r) throws YagaException
		{ return (r.frame().dispatch(ctxt, () -> resolveVariable(ctxt).bindingEvaluate(ctxt))); }

	@Override
	public List reduce(Context ctxt) throws YagaException
		{ return (resolveVariable(ctxt).reduce(ctxt)); }
	@Override
	public List reduce(Context ctxt, Frame.Reference r) throws YagaException
		{ return (r.frame().dispatch(ctxt, () -> resolveVariable(ctxt).reduce(ctxt))); }

	@Override
	public Name getNameType(Context ctxt) 
		throws YagaException
		{ return (resolveVariable(ctxt).getNameType(ctxt)); }

	@Override
	public Symbol reduceSymbolType(Context ctxt) 
		throws YagaException
		{ return (resolveVariable(ctxt).reduceSymbolType(ctxt)); }

	public final int index()
		{ return (_idx); }
	@Override
	public final PipeRistics ristic()
		{ return (_pipe); }

	@Override
	public boolean isVariable()
		{ return (true); }
	@Override
	public boolean hasVariables()
		{ return (true); }

	@Override
	public boolean isAtomic()
		{ return (false); }
	@Override
	public boolean isPipeline()
		{ return (false); }
	@Override
	public Pipeline asisPipeline()
		{ return (null); }

	@Override
	public void xprint(StringBuilder sb) 
		{  sb.append("[var]"); print(sb); }

	@Override
	public List bind(Context ctxt) throws YagaException
		{ throw new UnsupportedOperationException(NotSupportedMessage()); }
	@Override
	public List bind(Context ctxt, Frame.Reference r)
		throws YagaException
		{ throw new UnsupportedOperationException(NotSupportedMessage()); }

	@Override
	public boolean isTrivial() 
		{ return (false); }
	@Override
	public boolean isReducible() 
		{ return (true); }
	@Override
	public boolean canEvaluate()
		{ return (true); }

	@Override
	public Elements elements()
		{ throw new UnsupportedOperationException(NotSupportedMessage()); }
	@Override
	public List element(int idx)
		{ throw new UnsupportedOperationException(NotSupportedMessage()); }

	@Override
	public int length()
		{ throw new UnsupportedOperationException(NotSupportedMessage()); }

	@Override
	public boolean isEmpty()
		{ throw new UnsupportedOperationException(NotSupportedMessage()); }
	@Override
	public boolean isNil()
		{ throw new UnsupportedOperationException(NotSupportedMessage()); }
	@Override
	public boolean isContainer()
		{ throw new UnsupportedOperationException(NotSupportedMessage()); }

	@Override
	public List headElement()
		{ throw new UnsupportedOperationException(NotSupportedMessage()); }
	@Override
	public List tailElement()
		{ throw new UnsupportedOperationException(NotSupportedMessage()); }

	@Override
	public List headSubList()
		{ throw new UnsupportedOperationException(NotSupportedMessage()); }
	@Override
	public List tailSubList()
		{ throw new UnsupportedOperationException(NotSupportedMessage()); }

	@Override
	public List appendList(List e)	
		{ throw new UnsupportedOperationException(NotSupportedMessage()); }

	@Override
	public boolean isData()
		{ throw new UnsupportedOperationException(NotSupportedMessage()); }

	@Override
	public boolean isExpression()
		{ throw new UnsupportedOperationException(NotSupportedMessage()); }

	@Override
	public boolean isProduction()
		{ throw new UnsupportedOperationException(NotSupportedMessage()); }
	
	@Override
	public boolean isProductive()
		{ return (false); }
	@Override
	public Productive asisProductive()
		{ return (null); }
	@Override
	public boolean isStepProductive()
		{ return (false); }
	@Override
	public boolean isStep()
		{ return (false); }
	@Override
	public Pipeline.Step asisStep()
		{ return (null); }

	@Override
	public boolean isBindingPipeline()
		{ throw new UnsupportedOperationException(NotSupportedMessage()); }
	@Override
	public Pipeline.Binding asisBindingPipeline()
		{ return (null); }

	@Override
	public boolean isRistic()
		{ return (false); }
	@Override
	public List risticDo(Context ctxt, RisticDo fn) throws YagaException
		{ throw new UnsupportedOperationException(NotSupportedMessage()); }

	@Override
	public boolean isEvaluator()
		{ throw new UnsupportedOperationException(NotSupportedMessage()); }
	@Override
	public Production.Evaluator asisEvaluator()
		{ throw new UnsupportedOperationException(NotSupportedMessage()); }

	@Override
	public boolean isNumber()
		{ throw new UnsupportedOperationException(NotSupportedMessage()); }
	@Override
	public AtomNumber asisNumber()
		{ throw new UnsupportedOperationException(NotSupportedMessage()); }
	@Override
	public AtomNumber asNumber()
		{ throw new UnsupportedOperationException(NotSupportedMessage()); }

	@Override
	public boolean isChar()
		{ throw new UnsupportedOperationException(NotSupportedMessage()); }
	@Override
	public AtomChar asisChar()
		{ throw new UnsupportedOperationException(NotSupportedMessage()); }

	@Override
	public boolean isString()
		{ throw new UnsupportedOperationException(NotSupportedMessage()); }
	@Override
	public AtomString asisString()
		{ throw new UnsupportedOperationException(NotSupportedMessage()); }

	@Override
	public boolean isSymbol()
		{ throw new UnsupportedOperationException(NotSupportedMessage()); }
	@Override
	public AtomSymbol asisSymbol()
		{ throw new UnsupportedOperationException(NotSupportedMessage()); }

	@Override
	public boolean isNamespace()
		{ throw new UnsupportedOperationException(NotSupportedMessage()); }
	@Override
	public AtomNamespace asisNamespace()
		{ throw new UnsupportedOperationException(NotSupportedMessage()); }
	@Override
	public AtomNamespace asNamespace()
		{ throw new UnsupportedOperationException(NotSupportedMessage()); }

	@Override
	public boolean isComment()
		{ throw new UnsupportedOperationException(NotSupportedMessage()); }

	@Override
	public boolean isAlias()
		{ throw new UnsupportedOperationException(NotSupportedMessage()); }
	@Override
	public List dealias(Context ctxt)
		{ throw new UnsupportedOperationException(NotSupportedMessage()); }

	@Override
	public boolean isTrue()
		{ throw new UnsupportedOperationException(NotSupportedMessage()); }
	@Override
	public boolean isFalse()
		{ throw new UnsupportedOperationException(NotSupportedMessage()); }
	@Override
	public boolean isUnknown()
		{ throw new UnsupportedOperationException(NotSupportedMessage()); }
	@Override
	public boolean isTrivalent()
		{ throw new UnsupportedOperationException(NotSupportedMessage()); }

	protected String NotSupportedMessage()
		{ return ("Not Supported: Var(" + asjString() + ")"); }
	
	
	static public class InjectingVariable extends Variable
	{
		protected InjectingVariable(Name n, PipeRistics pipe, int idx)
			{ super(n, pipe, idx);  }
		protected InjectingVariable(AtomSymbol n, PipeRistics pipe, int idx)
			{ super(n, pipe, idx);  }
		
		@Override
		public boolean isInjectable()		
			{ return (true); }
		
		@Override
		public List resolveVariable(Context ctxt)
			throws YagaException
			{ return (ctxt.currentFrame().readInjectingVariable(ctxt, this).resolveVariable(ctxt)); }
	}
	
	static public class ProductiveVariable extends Variable
		implements Productive
	{
		protected ProductiveVariable(Name n, PipeRistics pipe, int idx)
			{ super(n, pipe, idx);  }
		protected ProductiveVariable(AtomSymbol n, PipeRistics pipe, int idx)
			{ super(n, pipe, idx);  }
		
		
		@Override
		public boolean isProductive()
			{ return (true); }
		@Override
		public Productive asisProductive()
			{ return (this); }
		@Override
		public boolean isStepProductive()
			{ return (true); }
		
		@Override
		public boolean isProductiveVariable()
			{ return (true); }
		@Override
		public Variable.ProductiveVariable asisProductiveVariable()
			{ return (this); }

		@Override
		public int precedence() 
			{ return (0); }
		
		@Override
		public List step(Context ctxt, List parms)
			throws YagaException
			{ return (resolveVariable(ctxt).reduce(ctxt).step(ctxt, parms)); }
		
		@Override
		public List bindingStep(Context ctxt, List parms)
			throws YagaException
			{ return (resolveVariable(ctxt).reduce(ctxt).bindingStep(ctxt, parms)); }

		@Override
		public Production.Map mapExecute(Context ctxt, List[] esi, int iep, int ies, int iee) 
				throws BinderException 
		{
			List ep = esi[iep];
			int nParms = (iep - ies) + (iee - iep);

			// Allocate the parameters array
			List parms[];
			if (nParms == 0)
				parms = Elements.EmptyArray;
			else
			{
				parms = new List[nParms];
				if (ies < iep)
					System.arraycopy(esi, ies, parms, 0, iep - ies);
				if (iee > iep)
					System.arraycopy(esi, iep + 1, parms, iep - ies, iee - iep);
			}

			// Compress the original element array to remove the parameters
			List[] es = new List[esi.length - nParms];
			if (ies > 0)
				System.arraycopy(esi, 0, es, 0, ies);
			if (iee < (esi.length - 1))
				System.arraycopy(esi, iee + 1, es, ies + 1, esi.length - (iee + 1));
			return (new Production.Map(this, ep, es, parms, ies));
		}

		@Override
		public Production.Map mapStep(Context ctxt, List[] es, int iep) 
			throws BinderException 
			{ return (mapExecute(ctxt, es, iep, 0, es.length - 1)); }
	}
	
	
	static public class PipeVariable extends Variable
		implements VariableBinder
	{
		public PipeVariable(Name n, PipeRistics pipe, int idx)
			{ super(n, pipe, idx);  }
		public PipeVariable(AtomSymbol n, PipeRistics pipe, int idx)
			{ super(n, pipe, idx);  }
		
		private Pipeline _pipe;
		
		public final void setPipeline(Pipeline pipe)
			{ _pipe = pipe; }
		protected final Pipeline pipe()
			{ return (_pipe); }

		@Override
		public Variable bindName(Unbound name) 
			{ throw new UnsupportedOperationException(NotSupportedMessage()); }

		@Override
		public List step(Context ctxt, List parms) throws YagaException
		{ 
			Frame frame = ctxt.currentFrame();
			return (frame.setPipeVariable(ctxt, this, parms)); 
		}
		
		@Override
		public List bindingStep(Context ctxt, List parms) throws YagaException
			{ return (step(ctxt, parms)); }
	
		@Override
		public void print(StringBuilder sb) 
			{ sb.append('|').append(asjString()); }
	}
}

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
 *	Lists where all elements are treated equally as data. This includes
 *  all productive type elements.
 */
package yaga.core;

import yaga.core.exceptions.YagaException;
import yaga.core.ristic.InjRistic;
import yaga.core.ristic.Ristic;

/**
 *
 * @author Bruce
 */
public class Data extends Container
{
	protected Data(Elements e)
		{ super(e); }
	protected Data(Elements e, ParserPoint point)
		{ super(e, point); }

	@Override
	public List parse(Context ctxt)
		throws YagaException
		{ return (Lists.parse(ctxt, elements(), this)); }
	
	@Override
	public List evaluate(Context ctxt)
		throws YagaException
	{ 
		if (!_elements.areReducible())
			return (this);
		return (Lists.newData(_elements.evaluate(ctxt), _point));
	}
	
	@Override
	public List evaluate(Context ctxt, Frame.Reference r)
		throws YagaException
		{ return (r.frame().dispatch(ctxt, () -> evaluate(ctxt))); }
	
	@Override
	public List bindingEvaluate(Context ctxt)
		throws YagaException
	{ 
		if (!_elements.areReducible())
			return (this);
		return (Lists.newData(_elements.bindingEvaluate(ctxt), _point));
	}
	
	@Override
	public List bindingEvaluate(Context ctxt, Frame.Reference r)
		throws YagaException
		{ return (r.frame().dispatch(ctxt, () -> bindingEvaluate(ctxt))); }
	
	@Override
	public List reduce(Context ctxt)
		throws YagaException
	{ 
		if (!_elements.areReducible())
			return (this);
		if (_elements.isSingle())
		{
			List e = _elements.element(0);
			if (!e.isInjectable())
				return (_elements.element(0).reduce(ctxt));
		}
		return (Lists.newData(_elements.reduce(ctxt), _point));
	}
	
	@Override
	public List reduce(Context ctxt, Frame.Reference r)
		throws YagaException
		{ return (r.frame().dispatch(ctxt, () -> reduce(ctxt))); }

	@Override
	public boolean isData()			
		{ return (true); }

	@Override
	public boolean isBound()		
		{ return (true); }

	@Override
	public List appendList(List e)
		{ return (new Data(elements().append(e), _point)); }

	@Override
	public final List asParameterList(Context ctxt)
		{ return (this); }
	
	@Override
	public List propagateReference(Context ctxt, Frame.Reference r) 
		throws YagaException
		{ return (Lists.newData(_elements.propagateReference(ctxt, r), _point)); }

	@Override
	public void print(StringBuilder sb) 
		{ sb.append("[ "); Lists.printElements(sb, _elements); sb.append(']');  }

	@Override
	public void xprint(StringBuilder sb) 
		{ sb.append("[data][ "); Lists.xprintElements(sb, _elements); sb.append(']'); }
	
	static public class Trivial extends Data
	{
		protected Trivial(Elements e)
			{ super(e); }
		protected Trivial(Elements e, ParserPoint point)
			{ super(e, point); }

		@Override
		public List asFrameReference(Context ctxt, Frame frame)
			{ return (this); }
	
		@Override
		public List propagateReference(Context ctxt, Frame.Reference r) 
			throws YagaException
			{ return (this); }
		
		@Override
		public boolean isTrivial()					{ return (true); }

		@Override
		public void xprint(StringBuilder sb) 
			{ sb.append("[Trivial][ "); Lists.xprintElements(sb, _elements); sb.append(']'); }
	}
	
	static public class Injection extends Data
	{
		protected Injection(Elements e)
			{ super(e); }
		protected Injection(Elements e, ParserPoint point)
			{ super(e, point); }
	
		@Override
		public boolean isInjectable()		
			{ return (true); }
		@Override
		public boolean isReducible() 
			{ return (true); }

		@Override
		public void print(StringBuilder sb) 
		{ 
			sb.append("(("); Ristic.risticClassName(sb, InjRistic.class).append(')'); 
			Lists.printElements(sb, _elements); sb.append(')');  
		}
		@Override
		public void xprint(StringBuilder sb) 
			{ sb.append("[Inject]( "); Lists.xprintElements(sb, _elements); sb.append(')'); }
	}
}

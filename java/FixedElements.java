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
 *  Fixed element collection. Has a fixed size and separate implementations for
 *  variables and no variables. Can have all other name types.
 */
package yaga.core;

import java.util.Arrays;
import yaga.core.exceptions.YagaException;

/**
 *
 * @author Bruce
 */
public class FixedElements extends Elements
{
	protected FixedElements(List[] es, List r)
		{ super(r); _array = es; }

	private final List[] _array;
	
	@Override
	public final List[] asArray()
		{ return (_array); }
	@Override
	public List[] asExpandedArray(Context ctxt)
		 throws YagaException
		{ return (_array); }
	@Override
	public List[] asParameters(Context ctxt)
		throws YagaException
		{ return (_array); }
	@Override
	public int length()
		{ return (_array.length); }

	@Override
	public final boolean isFixedLength()
		{ return (true); }
	@Override
	public boolean isFixed()
		{ return (true); }

	@Override
	public final List element(int idx)
	{  
		if (idx < 0 || idx >= _array.length)
			return (AtomNone.VALUE);
		return (_array[idx]); 
	}
	@Override
	public final boolean isSingle()
		{  return (_array.length == 1); }
	@Override
	public boolean isEmpty()
		{ return (_array.length == 0); }
	
	@Override
	public List bindPipeStep(Context ctxt, List parms)
		throws YagaException
	{
		List result = parms; int i = 0;
		for (; i < _array.length - 1; i++)
			result = _array[i].bindingStep(ctxt, result.asParameterList(ctxt)).bindingEvaluate(ctxt);
		return (_array[i].bindingStep(ctxt, result.asParameterList(ctxt)));
	}
	
	@Override
	public List pipeStep(Context ctxt, List parms)
		throws YagaException
	{
		List result = parms; int i = 0;
		for (; i < _array.length - 1; i++)
			result = _array[i].step(ctxt, result.asParameterList(ctxt)).evaluate(ctxt);
		return (_array[i].step(ctxt, result.asParameterList(ctxt)));
	}

	@Override
	public Elements subset(Context ctxt, int iStart)
		{ return (subset(ctxt, iStart, _array.length)); }
	@Override
	public Elements subset(Context ctxt, int iStart, int iEnd)
		{ return (new FixedElements(Arrays.copyOfRange(_array, iStart, iEnd), relatedElement())); }
	@Override
	protected int subset(Context ctxt, int idx, int iStart, List[] es, int ies)
	{ 
		for (List e : _array)
		{
			if (idx++ < iStart)
				continue;
			es[ies++] = e;
			if (ies >= es.length)
				return (ies);
		}
		return (ies); 
	}

	@Override
	public Elements bind(Context ctxt)
		throws YagaException
	{
		if (areBound())
			return (this);
		List[] es = new List[_array.length];
		for (int i = 0; i < es.length; i++)
			es[i] = _array[i].bind(ctxt);
		return (Elements.make(es, relatedElement()));
	}
	@Override
	public Elements evaluate(Context ctxt)
		throws YagaException
	{
		if (!canEvaluate())
			return (this);
		List[] es = new List[_array.length];
		for (int i = 0; i < es.length; i++)
			es[i] = _array[i].evaluate(ctxt);
		return (new FixedElements(es, relatedElement()));
	}
	@Override
	public Elements bindingEvaluate(Context ctxt)
		throws YagaException
	{
		if (!canEvaluate())
			return (this);
		List[] es = new List[_array.length];
		for (int i = 0; i < es.length; i++)
			es[i] = _array[i].bindingEvaluate(ctxt);
		return (new FixedElements(es, relatedElement()));
	}
	@Override
	public Elements reduce(Context ctxt)
		throws YagaException
	{
		List[] es = new List[_array.length];
		for (int i = 0; i < es.length; i++)
			es[i] = _array[i].reduce(ctxt);
		return (new FixedElements(es, relatedElement()));
	}
	@Override
	public List reduce(Context ctxt, int idx)
		throws YagaException
		{ return (_array[idx].reduce(ctxt)); }
		
	@Override
	public Elements dealias(Context ctxt)
		throws YagaException
	{
		List[] es = new List[_array.length];
		for (int i = 0; i < es.length; i++)
			es[i] = _array[i].dealias(ctxt);
		return (new FixedElements(es, relatedElement()));
	}
	@Override
	public List dealias(Context ctxt, int idx)
		throws YagaException
		{ return (_array[idx].dealias(ctxt)); }
		
	@Override
	public List head()
		{ return (_array[0]); }
	@Override
	public Elements	tail()
	{
		if (_array.length == 1)
			return (EmptyElements);
		return (new FixedElements(Arrays.copyOfRange(_array, 1, _array.length), relatedElement()));
	}
	@Override
	public List	end()
		{ return (_array[_array.length - 1]); }
	@Override
	public Elements	front()
	{
		if (_array.length == 1)
			return (EmptyElements);
		return (new FixedElements(Arrays.copyOfRange(_array, 0, _array.length - 1), relatedElement()));
	}

	@Override
	public Elements append(List e)
	{
		if (e.isAtomic())
		{
			if (e.isNil())
				return (this);
			List[] es = Arrays.copyOf(_array, _array.length + 1); es[_array.length] = e;
			return (new FixedElements(es, relatedElement()));
		}
		Elements elements = e.elements();
		if (elements.getClass() == FixedElements.class)
		{
			List[] a = elements.asArray();
			List[] es = Arrays.copyOf(_array, _array.length + a.length);
			System.arraycopy(a, 0, es, _array.length, a.length);
			return (new FixedElements(es, relatedElement()));
		}
		return (elements.prepend(this)); 
	}
	
	@Override
	public Elements propagateReference(Context ctxt, Frame.Reference r)
		throws YagaException
	{
		List[] es = new List[_array.length];
		for (int i = 0; i < es.length; i++)
			es[i] = _array[i].asFrameReference(ctxt, r);
		return (new FixedElements(es, relatedElement()));
	}
	@Override
	public Elements	expand(Context ctxt)
		throws YagaException
		{ return (this); }
	
	@Override
	public Elements bindNames(Context ctxt)
		throws YagaException
	{ 
		List[] es = new List[_array.length];
		for (int i = 0; i < es.length; i++)
		{
			es[i] = _array[i].resolveVariable(ctxt);
			List e = es[i].asisUnboundName();
			if (e != null)
				es[i] = e.bind(ctxt);
		}
		return (Elements.makeFixed(es, relatedElement()));
	}

	@Override
	public final boolean isAtomic()
		{ return (_array.length == 1 && _array[0].isAtomic()); }

	@Override
	public final boolean areReducible()
	{
		for (List e : _array)
			if (e.isReducible())
				return (true);
		return (false);
	}

	@Override
	public final boolean areTrivial()
	{
		for (List e : _array)
			if (!e.isTrivial())
				return (false);
		return (true);
	}

	@Override
	public final boolean hasVariables()
	{
		for (List e : _array)
			if (e.hasVariables())
				return (true);
		return (false);
	}
	
	@Override
	public final boolean canEvaluate()
	{
		for (List e : _array)
			if (!e.canEvaluate())
				return (false);
		return (true);
	}
	
	@Override
	public final boolean giveProduction()
	{
		for (List e : _array)
			if (e.isProductive() || e.isStep())
				return (true);
		return (false);
	}
	
	@Override
	public final boolean areBound()
	{
		for (List e : _array)
			if (!e.isBound())
				return (false);
		return (true);
	}

	@Override
	public boolean hasBoundElementsNoVariables()
		{ return (areBound()); }

	@Override
	public boolean hasVariableElements()
		{ return (false); }

	static public class Variables extends FixedElements
	{
		protected Variables(List[] es, List r)
			{ super(es, r); }

		@Override
		public List[] asExpandedArray(Context ctxt)
			throws YagaException
		{ 
			List[] arr = asArray();
			List[] es = new List[arr.length];
			for (int i = 0; i < es.length; i++)
				es[i] = arr[i].resolveVariable(ctxt);
			return (es); 
		}
		@Override
		public List[] asParameters(Context ctxt)
			throws YagaException
			{ return (asExpandedArray(ctxt)); }
		
		@Override
		public Elements subset(Context ctxt, int iStart, int iEnd)
			{ return (Elements.makeFixed(Arrays.copyOfRange(asArray(), iStart, iEnd), relatedElement())); }

		@Override
		public Elements bind(Context ctxt)
			throws YagaException
		{
			List[] arr = asArray();
			List[] es = new List[arr.length];
			for (int i = 0; i < es.length; i++)
				es[i] = arr[i].resolveVariable(ctxt).bind(ctxt);
			return (new FixedElements(es, relatedElement()));
		}
		@Override
		public Elements evaluate(Context ctxt)
			throws YagaException
		{
			List[] arr = asArray();
			List[] es = new List[arr.length];
			for (int i = 0; i < es.length; i++)
				es[i] = arr[i].resolveVariable(ctxt).step(ctxt);
			return (new FixedElements(es, relatedElement()));
		}
		@Override
		public Elements reduce(Context ctxt)
			throws YagaException
		{
			List[] arr = asArray();
			List[] es = new List[arr.length];
			for (int i = 0; i < es.length; i++)
				es[i] = arr[i].resolveVariable(ctxt).reduce(ctxt);
			return (new FixedElements(es, relatedElement()));
		}
		@Override
		public List reduce(Context ctxt, int idx)
			throws YagaException
			{ return (asArray()[idx].resolveVariable(ctxt).reduce(ctxt)); }

		@Override
		public Elements dealias(Context ctxt)
			throws YagaException
		{
			List[] arr = asArray();
			List[] es = new List[arr.length];
			for (int i = 0; i < es.length; i++)
				es[i] = arr[i].resolveVariable(ctxt).dealias(ctxt);
			return (new FixedElements(es, relatedElement()));
		}
		@Override
		public List dealias(Context ctxt, int idx)
			throws YagaException
			{ return (asArray()[idx].resolveVariable(ctxt).dealias(ctxt)); }

		@Override
		public Elements	tail()
		{
			List[] arr = asArray();
			if (arr.length == 1)
				return (EmptyElements);
			return (Elements.makeFixed(Arrays.copyOfRange(arr, 1, arr.length), relatedElement()));
		}
		@Override
		public Elements	front()
		{
			List[] arr = asArray();
			if (arr.length == 1)
				return (EmptyElements);
			return (Elements.makeFixed(Arrays.copyOfRange(arr, 0, arr.length - 1), relatedElement()));
		}

		@Override
		public Elements append(List e)
		{
			List[] arr = asArray();
			if (e.isAtomic())
			{
				if (e.isNil())
					return (this);
				List[] es = Arrays.copyOf(arr, arr.length + 1); es[arr.length] = e;
				return (new Variables(es, relatedElement()));
			}
			Elements elements = e.elements();
			if (FixedElements.class.isAssignableFrom(elements.getClass()))
			{
				List[] a = elements.asArray();
				List[] es = Arrays.copyOf(arr, arr.length + a.length);
				System.arraycopy(a, 0, es, arr.length, a.length);
				return (new Variables(es, relatedElement()));
			}
			return (elements.prepend(this)); 
		}

		@Override
		public Elements prepend(Elements elements)
		{
			List[] arr = asArray();
			List[] a = elements.asArray();
			List[] es = Arrays.copyOf(a, a.length + arr.length);
			System.arraycopy(arr, 0, es, a.length, arr.length);
			return (new Variables(es, relatedElement()));
		}

		@Override
		public Elements propagateReference(Context ctxt, Frame.Reference r)
			throws YagaException
		{
			List[] arr = asArray();
			List[] es = new List[arr.length];
			for (int i = 0; i < es.length; i++)
				es[i] = arr[i].asFrameReference(ctxt, r);
			return (new Variables(es, relatedElement()));
		}
		@Override
		public Elements	expand(Context ctxt)
			throws YagaException
			{ return (new FixedElements(asExpandedArray(ctxt), relatedElement())); }

		@Override
		public final boolean hasBoundElementsNoVariables()
		{
			for (List e : asArray())
				if (e.asisVariable() != null || !e.isBound())
					return (false);
			return (true);
		}

		@Override
		public boolean hasVariableElements()
			{ return (true); }
	}
}

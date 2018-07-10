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
 *  Element collection that contains one or more injectable elements. Includes
 *  support for 
Has a fixed size and separate implementations for
 *  variables and no variables. Can have all other name types.
 */
package yaga.core;

import java.util.Arrays;
import yaga.core.exceptions.YagaException;

/**
 *
 * @author Bruce
 */
public class InjectableElements extends Elements
{
	protected InjectableElements(List[] es, List r)
		{ super(r); _array = es; }

	private final List[] _array;

	@Override
	public boolean hasInjectables()		
		{ return (true); }
	
	@Override
	public final List[] asArray()
		{ return (_array); }
	@Override
	public List[] asExpandedArray(Context ctxt)
		throws YagaException
	{
		List[] es = new List[length(ctxt)]; int idx = 0;
		for (List e : _array)
		{
			if (!e.isInjectable())
				{ es[idx++] = e.resolveVariable(ctxt); continue; } 
			List[] es1 = e.resolveVariable(ctxt).elements().asExpandedArray(ctxt);
			System.arraycopy(es1, 0, es, idx, es1.length);
			idx += es1.length;
		}
		return (es); 
	}
	@Override
	public List[] asParameters(Context ctxt)
		throws YagaException
	{ 
		List[] es = new List[_array.length];
		for (int i = 0; i < es.length; i++)
			es[i] = _array[i].resolveVariable(ctxt);
		return (es); 
	}
	@Override
	public int length()
	{ 
		int len = 0;
		for (List e : _array)
		{
			if (!e.isInjectable())
				{ len++; continue; } 
			len += e.elements().length();
		}
		return (len); 
	}
	protected int length(Context ctxt)
		throws YagaException
	{ 
		int len = 0;
		for (List e : _array)
		{
			if (!e.isInjectable())
				{ len++; continue; } 
			len += e.resolveVariable(ctxt).elements().length();
		}
		return (len); 
	}

	@Override
	public final boolean isFixedLength()
		{ return (!isInfiniteLength()); }
	@Override
	public final boolean isInfiniteLength()
	{ 
		for (List e : _array)
			if (e.isInjectable() && e.elements().isInfiniteLength())
				return (true);
		return (false); 
	}

	@Override
	public final List element(int idx)
	{  
		int i = 0;
		for (List e : _array)
		{
			if (!e.isInjectable())
			{ 
				if (i++ == idx)
					return (e);
				continue; 
			}
			int len = e.elements().length();
			if ((idx - i) < len)
				return (e.element(idx - i));
			i += len;
		}
		return (AtomNone.VALUE);
	}
	@Override
	public final boolean isSingle()
	{  
		int cnt = 0;
		for (List e : _array)
		{
			if (e.isInjectable() && e.asisVariable() == null &&
				!e.elements().isSingle())
				return (false);
			if (++cnt > 1)
				return (false);
		}
		return (cnt == 1); 
	}
	@Override
	public boolean isEmpty()
	{
		for (List e : _array)
			if (!e.isInjectable() || e.asisVariable() != null || 
				!e.elements().isEmpty())
				return (false);
		return (true); 
	}
	
	@Override
	public List bindPipeStep(Context ctxt, List parms)
		throws YagaException
	{
		List result = parms, e; int i = 0;
		for (; i < _array.length - 1; i++)
		{
			e = _array[i];
			if (!e.isInjectable())
			{ 
				result = e.bindingStep(ctxt, result.asParameterList(ctxt)).bindingEvaluate(ctxt);
				continue; 
			}
			result = e.elements().bindPipeStep(ctxt, result).bindingEvaluate(ctxt);
		}
		e = _array[i];
		if (!e.isInjectable())
			return (e.bindingStep(ctxt, result.asParameterList(ctxt)));
		return (e.elements().bindPipeStep(ctxt, result));
	}
	
	@Override
	public List pipeStep(Context ctxt, List parms)
		throws YagaException
	{
		List result = parms, e; int i = 0;
		for (; i < _array.length - 1; i++)
		{
			e = _array[i];
			if (!e.isInjectable())
			{ 
				result = e.step(ctxt, result.asParameterList(ctxt)).evaluate(ctxt);
				continue; 
			}
			result = e.elements().pipeStep(ctxt, result).evaluate(ctxt);
		}
		e = _array[i];
		if (!e.isInjectable())
			return (e.step(ctxt, result.asParameterList(ctxt)));
		return (e.elements().pipeStep(ctxt, result));
	}

	@Override
	public Elements subset(Context ctxt, int iStart)
		throws YagaException
	{ 
		List[] es = asExpandedArray(ctxt);
		return (Elements.make(Arrays.copyOfRange(es, iStart, es.length), relatedElement()));
	}
	@Override
	public Elements subset(Context ctxt, int iStart, int iEnd)
		throws YagaException
	{
		List es[] = new List[iEnd - iStart];
		int ies = subset(ctxt, 0, iStart, es, 0);
		if (ies < es.length)
			es = Arrays.copyOfRange(es, 0, ies);
		return (Elements.make(es, relatedElement())); 
	}
	@Override
	protected int subset(Context ctxt, int idx, int iStart, List[] es, int ies)
		throws YagaException
	{
		for (List e : _array)
		{
			if (!e.isInjectable())
			{ 
				if (idx++ < iStart)
					continue;
				es[ies++] = e;
			}
			else
				ies = e.elements().subset(ctxt, idx, iStart, es, ies);
			if (ies >= es.length)
				return (ies);
		}
		return (ies); 
	}

	@Override
	public Elements bind(Context ctxt)
		throws YagaException
	{
		List[] es = new List[_array.length];
		for (int i = 0; i < es.length; i++)
			es[i] = _array[i].resolveVariable(ctxt).bind(ctxt);
		return (new InjectableElements(es, relatedElement()));
	}
	@Override
	public Elements evaluate(Context ctxt)
		throws YagaException
	{
		List[] es = new List[_array.length];
		for (int i = 0; i < es.length; i++)
			es[i] = _array[i].resolveVariable(ctxt).evaluate(ctxt);
		return (new InjectableElements(es, relatedElement()));
	}
	@Override
	public Elements bindingEvaluate(Context ctxt)
		throws YagaException
	{
		List[] es = new List[_array.length];
		for (int i = 0; i < es.length; i++)
			es[i] = _array[i].resolveVariable(ctxt).bindingEvaluate(ctxt);
		return (new InjectableElements(es, relatedElement()));
	}
	@Override
	public Elements reduce(Context ctxt)
		throws YagaException
	{
		List[] arr = asExpandedArray(ctxt);
		List[] es = new List[arr.length];
		for (int i = 0; i < es.length; i++)
			es[i] = arr[i].reduce(ctxt);
		return (Elements.make(es, relatedElement()));
	}
	@Override
	public List reduce(Context ctxt, int idx)
		throws YagaException
		{ return (asExpandedArray(ctxt)[idx].reduce(ctxt)); }

	@Override
	public Elements dealias(Context ctxt)
		throws YagaException
	{
		List[] arr = asExpandedArray(ctxt);
		List[] es = new List[arr.length];
		for (int i = 0; i < es.length; i++)
			es[i] = arr[i].dealias(ctxt);
		return (Elements.make(es, relatedElement()));
	}
	@Override
	public List dealias(Context ctxt, int idx)
		throws YagaException
		{ return (asExpandedArray(ctxt)[idx].resolveVariable(ctxt).dealias(ctxt)); }
		
	@Override
	public List head()
	{ 
		if (!_array[0].isInjectable())
			return (_array[0]);
		return (_array[0].elements().head());
	}
	@Override
	public Elements	tail()
	{
		if (!_array[0].isInjectable())
		{
			if (_array.length == 1)
				return (EmptyElements);
			return (Elements.make(Arrays.copyOfRange(_array, 1, _array.length), relatedElement()));
		}
		Elements t = _array[0].elements().tail();
		if (_array.length == 1)
			return (t);
		List[] es = Arrays.copyOf(_array, _array.length);
		if (t.isSingle())
		{
			es[0] = t.element(0);
			return (Elements.make(es, relatedElement()));
		}
		es[0] = new Data.Injection(t, relatedElement().parserPoint());
		return (new InjectableElements(es, relatedElement()));
	}
	@Override
	public List	end()
	{ 
		if (!_array[_array.length - 1].isInjectable())
			return (_array[_array.length - 1]);
		return (_array[_array.length - 1].elements().end());
	}
	@Override
	public Elements	front()
	{
		if (!_array[_array.length].isInjectable())
		{
			if (_array.length == 1)
				return (EmptyElements);
			return (Elements.make(Arrays.copyOfRange(_array, 0, _array.length - 1), relatedElement()));
		}
		Elements t = _array[_array.length - 1].elements().front();
		if (_array.length == 1)
			return (t);
		List[] es = Arrays.copyOf(_array, _array.length);
		if (t.isSingle())
		{
			es[_array.length - 1] = t.element(0);
			return (Elements.make(es, relatedElement()));
		}
		es[_array.length - 1] = new Data.Injection(t, relatedElement().parserPoint());
		return ((new InjectableElements(es, relatedElement())));
	}

	@Override
	public Elements append(List e)
	{
		List[] arr = asArray();
		if (e.isAtomic() || e.isInjectable())
		{
			if (e.isNil())
				return (this);
			List[] es = Arrays.copyOf(arr, arr.length + 1); es[arr.length] = e;
			return (new InjectableElements(es, relatedElement()));
		}
		Elements elements = e.elements();
		List[] a = elements.asArray();
		List[] es = Arrays.copyOf(arr, arr.length + a.length);
		System.arraycopy(a, 0, es, arr.length, a.length);
		return (new InjectableElements(es, relatedElement()));
	}

	@Override
	public Elements prepend(Elements elements)
	{
		List[] a = elements.asArray();
		List[] es = Arrays.copyOf(a, a.length + _array.length);
		System.arraycopy(_array, 0, es, a.length, _array.length);
		return (new InjectableElements(es, relatedElement()));
	}
	
	@Override
	public Elements propagateReference(Context ctxt, Frame.Reference r)
		throws YagaException
	{
		List[] es = new List[_array.length];
		for (int i = 0; i < es.length; i++)
			es[i] = _array[i].asFrameReference(ctxt, r);
		return (new InjectableElements(es, relatedElement()));
	}
	@Override
	public Elements	expand(Context ctxt)
		throws YagaException
		{ return (Elements.make(asExpandedArray(ctxt), relatedElement())); }

	@Override
	public final boolean hasBoundElementsNoVariables()
	{
		for (List e : asArray())
			if (e.asisVariable() != null || !e.isBound())
				return (false);
		return (true);
	}
	
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
		return (Elements.make(es, relatedElement()));
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
	public boolean hasVariableElements()
	{ 
		for (List e : asArray())
			if (e.asisVariable() != null)
				return (true);
		return (false);
	}
}

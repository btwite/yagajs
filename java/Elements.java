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
 *  Abstract object that defines the behaviour of all element collections
 *  representation.
 */
package yaga.core;

import java.io.PrintStream;
import yaga.core.exceptions.YagaException;

/**
 *
 * @author Bruce
 */
public abstract class Elements
{
	static public final Elements	EmptyElements = new Empty();
	static public final List[]		EmptyArray = new List[0];
	
	static private enum Types		{ VARS, INJECTS, FIXED }
	
	static public Elements make(List e)
		{ return (make(new List[] { e }, e)); }
	static public Elements make(List e1, List e2)
		{ return (make(new List[] { e1, e2 }, e1)); }
	static public Elements make(List e1, List e2, List e3)
		{ return (make(new List[] { e1, e2, e3 }, e1)); }
	static public Elements make(List e1, List e2, List e3, List e4)
		{ return (make(new List[] { e1, e2, e3, e4 }, e1)); }
	static public Elements make(List[] es)
	{
		if (es.length == 0)
			return (EmptyElements);
		return (makeElements(es, es[0]));
	}
	static public Elements make(List[] es, List r)
	{
		if (es.length == 0)
			return (EmptyElements);
		return (makeElements(es, r));
	}

	static private Elements makeElements(List[] es, List r)
	{
		// Analyse the array to determine best Elements representation.
		Types type = Types.FIXED;
		for (List e : es)
		{
			if (e.isInjectable())
				return (new InjectableElements(es, r));
			if (e.asisVariable() != null)
				type = Types.VARS;
		}
		if (type == Types.VARS)
			return (new FixedElements.Variables(es, r));
		return (new FixedElements(es, r));
	}
	
	static public Elements makeFixed(List e)
		{ return (makeFixed(new List[] { e }, e)); }
	static public Elements makeFixed(List e1, List e2)
		{ return (makeFixed(new List[] { e1, e2 }, e1)); }
	static public Elements makeFixed(List e1, List e2, List e3)
		{ return (makeFixed(new List[] { e1, e2, e3 }, e1)); }
	static public Elements makeFixed(List e1, List e2, List e3, List e4)
		{ return (makeFixed(new List[] { e1, e2, e3, e4 }, e1)); }
	static public Elements makeFixed(List[] es)
	{
		if (es.length == 0)
			return (EmptyElements);
		return (makeFixed(es, es[0]));
	}
	static public Elements makeFixed(List[] es, List r)
	{
		if (es.length == 0)
			return (EmptyElements);
		for (List e : es)
			if (e.asisVariable() != null)
				return (new FixedElements.Variables(es, r));
		return (new FixedElements(es, r));
	}
	
	public Elements(List r)
		{ _relatedElement = r; }
			
	private final List _relatedElement;
	
	public List relatedElement()
		{ return (_relatedElement); }

	public boolean isFixedLength()		{ return (false); }
	public boolean isInfiniteLength()	{ return (false); }
	
	public boolean isFixed()			{ return (false); }
	public boolean hasInjectables()		{ return (false); }
	
	public abstract List		element(int idx);
	
	public abstract List		pipeStep(Context ctxt, List parms) throws YagaException;
	public abstract List		bindPipeStep(Context ctxt, List parms) throws YagaException;
	
	public abstract Elements	subset(Context ctxt, int iStart) throws YagaException;
	public abstract Elements	subset(Context ctxt, int iStart, int iEnd) throws YagaException;
	protected abstract int		subset(Context ctxt, int idx, int iStart, List[] es, int ies) throws YagaException;
	
	public abstract Elements	bind(Context ctxt) throws YagaException;
	public abstract Elements	evaluate(Context ctxt) throws YagaException;
	public abstract Elements	bindingEvaluate(Context ctxt) throws YagaException;
	public abstract Elements	reduce(Context ctxt) throws YagaException;
	public abstract List		reduce(Context ctxt, int idx) throws YagaException;
	public abstract Elements	dealias(Context ctxt) throws YagaException;
	public abstract List		dealias(Context ctxt, int idx) throws YagaException;
	public abstract List		head();
	public abstract Elements	tail();
	public abstract List		end();
	public abstract Elements	front();

	public abstract Elements	append(List e);
	public Elements	prepend(Elements elements)
		{ throw new UnsupportedOperationException("Not Supported: " + this); }
	
	public abstract Elements	propagateReference(Context ctxt, Frame.Reference r) throws YagaException;
	public abstract Elements	expand(Context ctxt) throws YagaException;
	public abstract Elements	bindNames(Context ctxt) throws YagaException;
	
	public abstract List[]		asArray();
	public abstract List[]		asExpandedArray(Context ctxt) throws YagaException;
	public abstract int			length();
	
	public List[] asParameters(Context ctxt) throws YagaException
	{
		List[] arr = asArray(); List[] es = new List[arr.length];
		for (int i = 0; i < es.length; i++)
			es[i] = arr[i].resolveVariable(ctxt);
		return (es);
	}

	public List[] bindParms(Context ctxt) throws YagaException
	{
		List[] arr = asParameters(ctxt); List[] es = new List[arr.length];
		for (int i = 0; i < es.length; i++)
			es[i] = arr[i].bind(ctxt).resolveVariable(ctxt);
		return (es);
	}
	public List[] evalBindParms(Context ctxt) throws YagaException
	{
		List[] arr = asParameters(ctxt); List[] es = new List[arr.length];
		for (int i = 0; i < es.length; i++)
			es[i] = arr[i].evaluate(ctxt).bind(ctxt).resolveVariable(ctxt);
		return (es);
	}
	
	public abstract boolean		isEmpty();
	public abstract boolean		isSingle();
	public abstract boolean		isAtomic();
	public abstract boolean		areReducible();
	public abstract boolean		areTrivial();
	public abstract boolean		hasVariables();
	public abstract boolean		canEvaluate();
	public abstract boolean		giveProduction();
	public abstract boolean		areBound();
	public abstract boolean		hasBoundElementsNoVariables();
	public abstract boolean		hasVariableElements();
	
	
	private static class Empty extends Elements
	{
		private Empty()
			{ super(Lists.nil()); }
		
		@Override
		public boolean isFixedLength()
			{ return (true); }
		
		@Override
		public final List element(int idx)
			{  return (Lists.nil()); }
		@Override
		public final boolean isSingle()
			{  return (false); }
		@Override
		public boolean isEmpty()
			{ return (true); }
		@Override
		public List[] asArray()
			{ return (EmptyArray); }
		@Override
		public List[] asExpandedArray(Context ctxt)
			{ return (EmptyArray); }
		@Override
		public List[] asParameters(Context ctxt)
			{ return (EmptyArray); }
		@Override
		public int length()
			{ return (0); }
		
		@Override
		public List pipeStep(Context ctxt, List parms) throws YagaException
			{ return (parms); }
		@Override
		public List bindPipeStep(Context ctxt, List parms) throws YagaException
			{ return (parms); }
		
		@Override
		public Elements	subset(Context ctxt, int iStart)
			{ return (this); }
		@Override
		public Elements	subset(Context ctxt, int iStart, int iEnd)
			{ return (this); }
		@Override
		protected int subset(Context ctxt, int idx, int iStart, List[] es, int ies)
			{ return (ies); }
		
		@Override
		public Elements bind(Context ctxt)
			{ return (this); }
		@Override
		public Elements evaluate(Context ctxt)
			{ return (this); }
		@Override
		public Elements bindingEvaluate(Context ctxt)
			{ return (this); }
		@Override
		public Elements reduce(Context ctxt)
			{ return (this); }
		@Override
		public List reduce(Context ctxt, int idx)
			{ return (Lists.nil()); }
		
		@Override
		public Elements dealias(Context ctxt)
			{ return (this); }
		@Override
		public List dealias(Context ctxt, int idx)
			{ return (Lists.nil()); }
		
		@Override
		public List head()
			{ return (Lists.nil()); }
		@Override
		public Elements	tail()
			{ return (this); }
		@Override
		public List	end()
			{ return (Lists.nil()); }
		@Override
		public Elements	front()
			{ return (this); }

		@Override
		public Elements append(List e)
			{ return (e.elements()); }
		
		@Override
		public Elements	propagateReference(Context ctxt, Frame.Reference r)
			{ return (this); }
		@Override
		public Elements	expand(Context ctxt)
			{ return (this); }
		@Override
		public Elements bindNames(Context ctxt)
			{ return (this); }
		
		
		@Override
		public boolean isAtomic()
			{ return (true); }
		@Override
		public boolean areReducible()
			{ return (false); }
		@Override
		public boolean areTrivial()
			{ return (true); }
		@Override
		public boolean hasVariables()
			{ return (false); }
		@Override
		public boolean canEvaluate()
			{ return (false); }
		@Override
		public boolean giveProduction()
			{ return (false); }
		@Override
		public boolean areBound()
			{ return (true); }
		@Override
		public boolean hasBoundElementsNoVariables()
			{ return (true); }
		@Override
		public boolean hasVariableElements()
			{ return (false); }
	}
	
	static public boolean areTrivial(List[] es)
	{
		for (List e : es)
			if (!e.isTrivial())
				return (false);
		return (true);
	}

	static public boolean hasInjectables(List[] es)
	{
		for (List e : es)
			if (!e.isInjectable())
				return (true);
		return (false);
	}

	static public boolean hasVariableElements(List[] es)
	{
		for (List e : es)
			if (e.asisVariable() != null)
				return (true);
		return (false);
	}
	
	public void trace(String msg)
		{ trace(System.out, msg); }
	public void trace(PrintStream stream, String msg)
	{
		stream.printf("Element trace(%s) :\n", msg);
		int i = 0;
		for (List e : asArray())
			e.trace(stream, i++ + ":" + msg);
	}
}

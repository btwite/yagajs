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
 *  Abstract root for all atomic list elements.
 */
package yaga.core;

import yaga.core.exceptions.YagaException;

/**
 *
 * @author Bruce
 */
public abstract class AtomicList extends List
{
	protected AtomicList()
		{ super(); }
	protected AtomicList(ParserPoint point)
		{ super(point); }

	private Elements _elements;
	
	@Override
	public Elements elements()
	{ 
		if (_elements == null)
			_elements = Elements.make(this);
		return (_elements);
	}
	
	@Override
	public List zeroValue()
		{ return (Lists.nil()); }
	@Override
	public List neg(Context ctxt)
		throws YagaException
		{ return (this); }
	
	@Override
	public int length()
		{ return (1); }
	
	@Override
	public final List asParameterList(Context ctxt)
		{ return (this); }
	
	@Override
	public final boolean isAtomic()					{ return (true); }
	@Override
	public final boolean isData()				{ return (true); }
	@Override
	public boolean isEmpty()						{ return (false); }
	@Override
	public boolean isBound()						{ return (true); }
	@Override
	public boolean isReducible()					{ return (false); }
	@Override
	public boolean canEvaluate()					{ return (false); }
	@Override
	public boolean isTrivial()						{ return (true); }
	@Override
	public boolean hasVariables()					{ return (false); }
	
	@Override
	public List headElement()						{ return (this); }
	@Override
	public List tailElement()						{ return (this); }
	@Override
	public List headSubList()						{ return (Lists.nil(_point)); }
	@Override
	public List tailSubList()						{ return (Lists.nil(_point)); }
	
	@Override
	public List appendList(List e)	
	{  
		if (e.isAtomic())
			return (Lists.newData(new FixedElements( new List[] { this, e }, this)));
		return (super.appendList(e)); 
	}
}

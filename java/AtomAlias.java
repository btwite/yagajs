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
 *	Container as an atomic element.
 */
package yaga.core;

import yaga.core.exceptions.YagaException;
import yaga.core.ristic.AliasRistic;
import yaga.core.ristic.Ristic;

/**
 *
 * @author Bruce
 */
public class AtomAlias extends AtomicList
{
	public AtomAlias(Elements e, ParserPoint point)
		{ super(point); _elements = e; }
	public AtomAlias(List e, ParserPoint point)
		{ super(point); _elements = Elements.make(e); }

	private final Elements _elements;

	@Override
	public List reduce(Context ctxt)
		throws YagaException
	{ 
		if (_elements.isEmpty())
			return (Lists.nil(_point));
		if (_elements.isSingle())
			return (_elements.reduce(ctxt, 0));
		return (Lists.newData(_elements.reduce(ctxt), _point));
	}
	@Override
	public List reduce(Context ctxt, Frame.Reference r)
		throws YagaException
		{ return (r.frame().dispatch(ctxt, () -> reduce(ctxt))); }
	
	@Override
	public List dealias(Context ctxt)
		throws YagaException
	{ 
		if (_elements.isEmpty())
			return (Lists.nil(_point));
		if (_elements.isSingle())
			return (_elements.dealias(ctxt, 0));
		return (Lists.newData(_elements.dealias(ctxt), _point));
	}
	
	@Override
	public List asFrameReference(Context ctxt, Frame frame)
	{
		// Defaults to a Frame reference.
		// May add more discerning detection of variable references in the
		// future.
		return (new Frame.Reference(frame, this));
	}
	
	@Override
	public Symbol getNameSymbol()
	{ 
		if (_elements.isSingle())
			return (_elements.element(0).getNameSymbol()); 
		return (null);
	}

	@Override
	public Name getNameType(Context ctxt) 
		throws YagaException
	{ 
		if (_elements.isSingle())
			return (_elements.element(0).getNameType(ctxt)); 
		return (null);
	}

	@Override
	public Symbol reduceSymbolType(Context ctxt) 
		throws YagaException
	{ 
		if (_elements.isSingle())
			return (_elements.element(0).reduceSymbolType(ctxt)); 
		return (null);
	}

	@Override
	public boolean isBound()
		{ return (_elements.areBound()); }

	@Override
	public boolean isTrivial()
		{ return (_elements.areTrivial()); }

	@Override
	public boolean isReducible()
		{ return (true); }

	@Override
	public boolean hasVariables()
		{ return (_elements.hasVariables()); }

	@Override
	public boolean isAlias()			{ return (true); }

	@Override
	public void print(StringBuilder sb) 
	{
		sb.append("(("); Ristic.risticClassName(sb, AliasRistic.class).append(") ");
		Lists.printElements(sb, _elements);
		sb.append(")");
	}

	@Override
	public void xprint(StringBuilder sb) 
	{
		sb.append("(("); Ristic.risticClassName(sb, AliasRistic.class).append(") ");
		Lists.xprintElements(sb, _elements);
		sb.append(")");
	}
	
	@Override
	public List add(Context ctxt, List e)
		throws YagaException
		{ return (e.rAdd(ctxt, this)); }
	@Override
	public List sub(Context ctxt, List e)
		throws YagaException
		{ return (e.rSub(ctxt, this)); }
	@Override
	public List mul(Context ctxt, List e)
		throws YagaException
		{ return (e.rMul(ctxt, this)); }
	@Override
	public List div(Context ctxt, List e)
		throws YagaException
		{ return (e.rDiv(ctxt, this)); }
	@Override
	public List rem(Context ctxt, List e)
		throws YagaException
		{ return (e.rRem(ctxt, this)); }
}

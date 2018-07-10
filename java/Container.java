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
 *  Abstract class that defines common behaviour for all container type
 *  lists. A container will reference zero or more element lists.
 *  Note that a Sequence list will never contain a singleton AtomicList
 *  or be nil. These occurrences are represented by the AtomicList.
 */
package yaga.core;

import java.util.Arrays;
import yaga.core.exceptions.YagaException;

/**
 *
 * @author Bruce
 */
public abstract class Container extends List
{
	protected Container(Elements elements)
		{ _elements = elements; }
	protected Container(Elements elements, ParserPoint point)
		{ super(point); _elements = elements; }
	
	protected final Elements _elements;

	@Override
	public final Elements elements()
		{ return (_elements); }
	
	@Override
	public List zeroValue()
		{ return (Lists.nil()); }

	@Override
	public List asParameterList(Context ctxt)
		{ return (Lists.newData(this)); }

	@Override
	public boolean isContainer()
		{ return (true); }

	@Override
	public List asFrameReference(Context ctxt, Frame frame)
	{
		// Defaults to a Frame reference of non trivial.
		// May add more discerning detection of variable references in the
		// future.
		return (new Frame.Reference(frame, this));
	}

	@Override
	public List neg(Context ctxt)
		throws YagaException
		{ return (elDo(ctxt, (e) -> e.neg(ctxt))); }
	
	@Override
	public List add(Context ctxt, List e)
		throws YagaException
	{ 
		if (e.isContainer())
			return (listDo(ctxt, e, (e1,e2) -> e1.add(ctxt, e2)));
		return (elDo(ctxt, (e1) -> e1.add(ctxt, e)));
	}
	
	@Override
	public List sub(Context ctxt, List e)
		throws YagaException
	{ 
		if (e.isContainer())
			return (listDo(ctxt, e, (e1,e2) -> e1.sub(ctxt, e2)));
		return (elDo(ctxt, (e1) -> e1.sub(ctxt, e)));
	}
	
	@Override
	public List mul(Context ctxt, List e)
		throws YagaException
	{ 
		if (e.isContainer())
			return (listDo(ctxt, e, (e1,e2) -> e1.mul(ctxt, e2)));
		return (elDo(ctxt, (e1) -> e1.mul(ctxt, e)));
	}
	
	@Override
	public List div(Context ctxt, List e)
		throws YagaException
	{ 
		if (e.isContainer())
			return (listDo(ctxt, e, (e1,e2) -> e1.div(ctxt, e2)));
		return (elDo(ctxt, (e1) -> e1.div(ctxt, e)));
	}
	
	@Override
	public List rem(Context ctxt, List e)
		throws YagaException
	{ 
		if (e.isContainer())
			return (listDo(ctxt, e, (e1,e2) -> e1.rem(ctxt, e2)));
		return (elDo(ctxt, (e1) -> e1.rem(ctxt, e)));
	}
	
	@Override
	public List rAdd(Context ctxt, List e)
		throws YagaException
	{ 
		if (e.isContainer())
			return (listDo(ctxt, e, (e1,e2) -> e2.add(ctxt, e1)));
		return (elDo(ctxt, (e1) -> e.add(ctxt, e1)));
	}
	
	@Override
	public List rMul(Context ctxt, List e)
		throws YagaException
	{ 
		if (e.isContainer())
			return (listDo(ctxt, e, (e1,e2) -> e2.mul(ctxt, e1)));
		return (elDo(ctxt, (e1) -> e.mul(ctxt, e1)));
	}

	private interface Elfn
		{ public List run(List e) throws YagaException; }
	private List elDo(Context ctxt, Elfn fn)
		throws YagaException
	{ 
		List[] es = _elements.asExpandedArray(ctxt);
		if (es.length == 0)
			return (Lists.nil(_point));
		List[] eso = new List[es.length];
		for (int i = 0; i < es.length; i++)
			eso[i] = fn.run(es[i]);
		return (Lists.newData(Elements.make(eso, this), _point)); 
	}
	
	private interface Listfn
		{ public List run(List e1, List e2) throws YagaException; }
	private List listDo(Context ctxt, List e, Listfn fn)
		throws YagaException
	{ 
		List[] es1 = _elements.asExpandedArray(ctxt);
		List[] es2 = e.elements().asExpandedArray(ctxt);
		if (es1.length == 0)
			return (Lists.nil(_point));
		List[] eso = Arrays.copyOf(es1, es1.length);
		int len = es1.length;
		if (len > es2.length)
			len = es2.length;
		for (int i = 0; i < len; i++)
			eso[i] = fn.run(es1[i], es2[i]);
		return (Lists.newData(Elements.make(eso, this), _point)); 
	}
}

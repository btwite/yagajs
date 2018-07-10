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
 *  List processing services.
 */

package yaga.core;

import yaga.core.exceptions.EvaluateException;
import yaga.core.exceptions.YagaException;

/**
 *
 * @author Bruce
 */
public abstract class Lists 
{
	static private final ParserPoint	_nilPoint = new ParserPoint("<Nil>", 0, -1);
	static private final List			_nil = Lists.nil(_nilPoint);
	
	static public List nil(ParserPoint point)
		{ return (new AtomNil(point)); }
	static public List nil()
		{ return (_nil); }
	
	static public List newData(List e)
		{ return (Lists.newData(e, e.parserPoint())); }
	static public List newData(List e, ParserPoint point)
	{ 
		if (e.isAtomic())
			return (e);
		return (_newData(Elements.make(e), point)); 
	}
	
	static public List newData(List[] es)
	{ 
		if (es.length == 0)
			return (_nil);
		return (Lists.newData(es, es[0].parserPoint())); 
	}
	static public List newData(List[] es, ParserPoint point)
	{ 
		if (es.length == 0)
			return (nil(point));
		if (es.length == 1 && es[0].isAtomic())
			return (es[0]);
		return (_newData(Elements.make(es), point)); 
	}
	
	static public List newData(Elements elements)
		{ return (newData(elements, elements.relatedElement().parserPoint())); }
	static public List newData(Elements elements, ParserPoint point)
	{
		if (elements.isEmpty())
			return (nil(point));
		return (_newData(elements, point));
	}
	static private List _newData(Elements elements, ParserPoint point)
	{
		return (elements.areTrivial() ?
					new Data.Trivial(elements, point) :
					new Data(elements, point));
	}

	static public List newInjectedData(List e)
		{ return (Lists.newInjectedData(e, e.parserPoint())); }
	static public List newInjectedData(List e, ParserPoint point)
	{ 
		if (e.isAtomic())
			return (e);
		return (new Data.Injection(Elements.make(e), point));
	}
	
	static public List newInjectedData(List[] es)
	{ 
		if (es.length == 0)
			return (_nil);
		return (Lists.newInjectedData(es, es[0].parserPoint())); 
	}
	static public List newInjectedData(List[] es, ParserPoint point)
	{ 
		if (es.length == 0)
			return (nil(point));
		if (es.length == 1 && es[0].isAtomic())
			return (es[0]);
		return (new Data.Injection(Elements.make(es), point)); 
	}
	static public List newInjectedData(Elements elements)
		{ return (newInjectedData(elements, elements.relatedElement().parserPoint())); }
	static public List newInjectedData(Elements elements, ParserPoint point)
	{
		if (elements.isEmpty())
			return (nil(point));
		return (new Data.Injection(elements, point));
	}
	
	static public List parse(Context ctxt, List e)
		throws YagaException
		{ return (parse(ctxt, e.elements(), e)); }
	
	static public List parse(Context ctxt, Elements elements, List src)
		throws YagaException
	{
		Parser parser = Parser.parse(ctxt, new Parser.ListInput()
		{
			@Override
			public Elements elements() { return (elements); }
			@Override
			public String sourceName() { return ("<List>"); }
		});
		if (parser.hasErrors())
		{ 
			Parser.Error err = parser.errors()[0];
			throw new EvaluateException(EvaluateException.ErrorType.PARSE, src, err.message());
		}
		List[] exprs = parser.expressions();
		return (exprs.length == 0 ? Lists.nil(src.parserPoint()) : 
				(exprs.length == 1 ? exprs[0] : Lists.newData(exprs, src.parserPoint())));
	}
	
	static public List[] propagateReference(Context ctxt, Frame.Reference r, List[] elements)
		throws YagaException
	{
		List[] es = new List[elements.length];
		for (int i = 0; i < es.length; i++)
			es[i] = elements[i].asFrameReference(ctxt, r);
		return (es); 
	}

	static public void printElements(StringBuilder sb, Elements elements) 
	{
		if (elements == null || elements.isEmpty())
			return;
		List[] es = elements.asArray();
		for (List e : es) 
			{ e.print(sb); sb.append(' '); }
	}

	static protected void xprintElements(StringBuilder sb, Elements elements) 
	{
		if (elements == null || elements.isEmpty())
			return;
		List[] es = elements.asArray();
		for (List e : es) 
			{ e.xprint(sb); sb.append(' '); }
	}

	static protected void trace(String msg, Elements elements) 
	{
		if (elements == null || elements.isEmpty())
			return;
		List[] es = elements.asArray();
		int i = 0;
		for (List e : es) 
			{ e.trace(i++ + ":" + msg); }
	}
	
	static protected void trace(String msg, List[] es) 
	{
		if (es == null || es.length == 0)
			return;
		int i = 0;
		for (List e : es) 
			{ e.trace(i++ + ":" + msg); }
	}
}

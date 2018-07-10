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
 *  Symbols are represented as atoms.
 */
package yaga.core;

import yaga.core.exceptions.YagaException;

/**
 *
 * @author Bruce
 */
public class AtomSymbol extends AtomicList
{
	public AtomSymbol(String v)
		{ this(Symbolspace.getSymbol(v)); }
	public AtomSymbol(String v, ParserPoint point)
		{ this(Symbolspace.getSymbol(v), point); }
	public AtomSymbol(Symbol v)
		{ _sym = v; }
	public AtomSymbol(Symbol v, ParserPoint point)
		{ super(point); _sym = v; }
	
	protected final Symbol _sym;
	
	public String asjString()
		{ return (_sym.asjString()); }
	public String asPrintString()
		{ return (_sym.asPrintSymbol()); }
	public Symbol symbol()
		{ return (_sym); }

	@Override
	public boolean isNameType()	{ return (true); }
	@Override
	public final Name asisNameType()
		throws YagaException
		{ return (Name.newUnboundName(this, _point)); } 
	@Override
	public Symbol getNameSymbol()
		{ return (_sym); }

	@Override
	public final Name getNameType(Context ctxt) 
		throws YagaException
		{ return (asisNameType()); }

	@Override
	public final Symbol reduceSymbolType(Context ctxt) 
		{ return (_sym); }
	
	@Override
	public void print(StringBuilder sb) 
		{ Symbol.printSymbol(sb, _sym.asjString()); }

	@Override
	public void xprint(StringBuilder sb) 
		{ Symbol.xprintSymbol(sb, _sym.asjString()); }
	
	@Override
	public boolean isSymbol()			{ return (true); }
	@Override
	public AtomSymbol asisSymbol()		{ return (this); } 
	
	
	@Override
	public List add(Context ctxt, List e)
		throws YagaException
	{ 
		AtomString s2 = e.asisString();
		if (s2 != null)
			return (new AtomSymbol(asjString() + s2.asjString(), _point));
		AtomChar c2 = e.asisChar();
		if (c2 != null)
			return (new AtomSymbol(asjString() + c2.asjChar(), _point));
		AtomNumber n2 = e.asisNumber();
		if (n2 != null)
			return (new AtomSymbol(asjString() + n2.asjString(), _point));
		AtomSymbol sym2 = e.asisSymbol();
		if (sym2 != null)
			return (new AtomSymbol(asjString() + sym2.asjString(), _point));
		return (e.rAdd(ctxt, this));
	}
	
	@Override
	public List sub(Context ctxt, List e)
		throws YagaException
	{ 
		AtomString s2 = e.asisString();
		if (s2 != null)
		{
			String s = s2.asjString();
			String res = asjString(); int i;
			while ((i = res.indexOf(s)) >= 0)
				res = res.substring(0, i) + res.substring(i + s.length());
			return (new AtomSymbol(res, _point));
		}
		AtomChar c2 = e.asisChar();
		if (c2 != null)
		{
			char c = c2.asjChar();
			String res = asjString(); int i;
			while ((i = res.indexOf(c)) >= 0)
				res = res.substring(0, i) + res.substring(i + 1);
			return (new AtomSymbol(res, _point));
		}
		AtomNumber n2 = e.asisNumber();
		if (n2 != null)
			return (sub(ctxt, new AtomSymbol(n2.asjString())));
		AtomSymbol sym2 = e.asisSymbol();
		if (sym2 != null)
			return (sub(ctxt, new AtomString(sym2.asjString())));
		return (e.rSub(ctxt, this));
	}
	
	@Override
	public List mul(Context ctxt, List e)
		throws YagaException
	{ 
		AtomNumber n2 = e.asisNumber();
		if (n2 != null)
		{
			StringBuilder b = new StringBuilder();
			int i = n2.int32Value();
			for (; i > 0; i--)
				b.append(asjString());
			return (new AtomSymbol(b.toString(), _point));
		}
		return (e.rMul(ctxt, this));
	}
	
	@Override
	public List div(Context ctxt, List e)
		throws YagaException
	{ 
		AtomNumber n2 = e.asisNumber();
		if (n2 != null)
		{
			int i = n2.int32Value();
			if (i == 0)
				return (AtomTrivalent.UNKNOWN);
			String str = asjString();
			return (new AtomString(str.substring(0, str.length() / i), _point));
		}
		return (e.rDiv(ctxt, this));
	}
	
	@Override
	public List rem(Context ctxt, List e)
		throws YagaException
	{ 
		AtomNumber n2 = e.asisNumber();
		if (n2 != null)
		{
			int i = n2.int32Value();
			if (i == 0)
				return (AtomTrivalent.UNKNOWN);
			String str = asjString();
			i = str.length() % i;
			return (new AtomString(str.substring(str.length() - i), _point));
		}
		return (e.rDiv(ctxt, this));
	}
}

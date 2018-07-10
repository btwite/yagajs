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
 *  String atom.
 */
package yaga.core;

import java.util.Arrays;
import yaga.core.exceptions.YagaException;

/**
 *
 * @author Bruce
 */
public class AtomChar extends AtomicList
{
	static public AtomChar Space = new AtomChar(' ');
	
	public AtomChar(char c)
		{ _c = c; }
	public AtomChar(char c, ParserPoint point)
		{ super(point); _c = c; }
	
	private final char _c;
	
	public char asjChar()
		{ return (_c); }
	
	@Override
	public boolean isChar()
		{ return (true); }
	@Override
	public AtomChar asisChar()
		{ return (this); } 

	@Override
	public void print(StringBuilder sb) 
		{ sb.append(AtomString.forPrinting(String.valueOf(_c), '\'')); }
	
	
	@Override
	public List add(Context ctxt, List e)
		throws YagaException
	{ 
		AtomChar c2 = e.asisChar();
		if (c2 != null)
			{ return (add(ctxt, new AtomString(String.valueOf(new char[] { _c, c2.asjChar() }), _point))); }
		AtomNumber n2 = e.asisNumber();
		if (n2 != null)
		{
			int ic = _c + n2.int32Value();
			if (!Character.isDefined(ic))
				return (AtomTrivalent.UNKNOWN);
			return (new AtomChar((char)ic, _point)); 
		}
		AtomString s2 = e.asisString();
		if (s2 != null)
			return (new AtomString(_c + s2.asjString(), _point));
		AtomSymbol sym2 = e.asisSymbol();
		if (sym2 != null)
			return (new AtomSymbol(_c + sym2.asjString(), _point));
		return (e.rAdd(ctxt, this));
	}
	
	@Override
	public List sub(Context ctxt, List e)
		throws YagaException
	{ 
		AtomNumber n2 = e.asisNumber();
		if (n2 != null)
		{
			int ic = _c - n2.int32Value();
			if (!Character.isDefined(ic))
				return (AtomTrivalent.UNKNOWN);
			return (new AtomChar((char)ic, _point)); 
		}
		return (e.rSub(ctxt, this));
	}
	
	@Override
	public List mul(Context ctxt, List e)
		throws YagaException
	{ 
		AtomNumber n2 = e.asisNumber();
		if (n2 != null)
		{
			int len = n2.int32Value();
			char[] cs = new char[len]; Arrays.fill(cs, _c);
			return (new AtomString(String.valueOf(cs))); 
		}	
		return (e.rMul(ctxt, this));
	}
	
	@Override
	public List div(Context ctxt, List e)
		throws YagaException
		{ return (e.rDiv(ctxt, this)); }
	
	@Override
	public List rem(Context ctxt, List e)
		throws YagaException
		{ return (e.rDiv(ctxt, this)); }
}

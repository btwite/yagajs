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

import java.io.PrintStream;
import java.util.Arrays;
import yaga.core.exceptions.YagaException;

/**
 *
 * @author Bruce
 */
public class AtomString extends AtomicList
{
	static public AtomString EmptyString = new AtomString("");
	
	public AtomString(String v)
		{ _str = v; }
	public AtomString(String v, ParserPoint point)
		{ super(point); _str = v; }
	
	private final String _str;
	
	public String asjString()
		{ return (_str); }

	@Override
	public AtomString zeroValue()
		{ return (EmptyString); }

	@Override
	public List parse(Context ctxt)
		throws YagaException
		{ return (Lists.parse(ctxt, this)); }
	
	// String printing needs a lot more work to handle special characters.
	@Override
	public void print(StringBuilder sb) 
		{ sb.append(forPrinting(_str, '"')); }

	@Override
	public boolean isString()		{ return (true); }
	@Override
	public AtomString asisString()	{ return (this); } 
	
	static public void printIndent(PrintStream stream, int indent)
	{
		if (indent == 0)
			return;
		char[] chars = new char[indent];
		Arrays.fill(chars, ' ');
		stream.print(new String(chars));
	}
	
	static public String forPrinting(String s, char delim)
	{
		StringBuilder str  = new StringBuilder();
		str.append(delim);
		char[] chs = s.toCharArray();
		for (char c : chs)
		{
			switch (c)
			{
			case '\n' :	str.append("\\n");		break;
			case '\t' :	str.append("\\t");		break;
			case '\b' :	str.append("\\b");		break;
			case '\f' :	str.append("\\f");		break;
			case '\r' :	str.append("\\r");		break;
			default :
				if (c == delim)
					str.append("\\");
				str.append(c);
			}
		}
		str.append(delim);
		return (str.toString());
	}
	
	@Override
	public List add(Context ctxt, List e)
		throws YagaException
	{ 
		AtomString s2 = e.asisString();
		if (s2 != null)
			return (new AtomString(_str + s2.asjString(), _point));
		AtomChar c2 = e.asisChar();
		if (c2 != null)
			return (new AtomString(_str + c2.asjChar(), _point));
		AtomNumber n2 = e.asisNumber();
		if (n2 != null)
			return (new AtomString(_str + n2.asjString(), _point));
		AtomSymbol sym2 = e.asisSymbol();
		if (sym2 != null)
			return (new AtomString(_str + sym2.asjString(), _point));
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
			String res = _str; int i;
			while ((i = res.indexOf(s)) >= 0)
				res = res.substring(0, i) + res.substring(i + s.length());
			return (new AtomString(res, _point));
		}
		AtomChar c2 = e.asisChar();
		if (c2 != null)
		{
			char c = c2.asjChar();
			String res = _str; int i;
			while ((i = res.indexOf(c)) >= 0)
				res = res.substring(0, i) + res.substring(i + 1);
			return (new AtomString(res, _point));
		}
		AtomNumber n2 = e.asisNumber();
		if (n2 != null)
			return (sub(ctxt, new AtomString(n2.asjString())));
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
				b.append(_str);
			return (new AtomString(b.toString(), _point));
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
			return (new AtomString(_str.substring(0, _str.length() / i), _point));
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
			i = _str.length() % i;
			return (new AtomString(_str.substring(_str.length() - i), _point));
		}
		return (e.rDiv(ctxt, this));
	}
	
	static public abstract class Real extends AtomNumber
	{
		@Override
		public boolean isReal()
			{ return (true); }
	}
	
	static public abstract class Rational extends Real
	{
		@Override
		public boolean isRational()
			{ return (true); }
	}
	
	static public abstract class FloatingPoint extends Real
	{
		@Override
		public boolean isFloatingPoint()
			{ return (true); }
	}
}

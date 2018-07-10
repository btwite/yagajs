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

import java.util.HashMap;
import java.util.Map.Entry;

/**
 *
 * @author Bruce
 */
public class Symbol
{
	static public final Symbol LOCAL	= Symbolspace.getSymbol("local");
	static public final Symbol BIND		= Symbolspace.getSymbol("bind");
	static public final Symbol NAMES	= Symbolspace.getSymbol("names");
	static public final Symbol UNBOUND	= Symbolspace.getSymbol("unbound");
	static public final Symbol ARGS		= Symbolspace.getSymbol("args");
	static public final Symbol VARGS	= Symbolspace.getSymbol("vargs");
	static public final Symbol NPARMS	= Symbolspace.getSymbol("nparms");
	static public final Symbol PROD		= Symbolspace.getSymbol("prod");
	static public final Symbol DATA		= Symbolspace.getSymbol("data");
	
	static protected enum Reserved
		{ UNKNOWN, TRUE, FALSE, NONE };

	static final private HashMap<String, Reserved> _reserved;
	static 
	{
		_reserved = new HashMap();
		_reserved.put("true",			Reserved.TRUE);
		_reserved.put("false",			Reserved.FALSE);
		_reserved.put("unknown",		Reserved.UNKNOWN);
		_reserved.put("_#",				Reserved.NONE);
	}
	
	static public List symbolToElement(String sym)
	{
		// Handle escaped reserved symbols first
		if (sym.charAt(0) == '#')
		{
			String s = sym.substring(1);
			if (_reserved.get(s) != null)
				sym = s;
			return (new AtomSymbol(Symbolspace.getSymbol(sym)));
		}
		
		// Try for a reserved Symbol
		Reserved type = _reserved.get(sym);
		if (type == null)
			return (new AtomSymbol(Symbolspace.getSymbol(sym)));
		
		switch (type)
		{
		default :
		case TRUE :					return (AtomTrivalent.TRUE);
		case FALSE :				return (AtomTrivalent.FALSE);
		case UNKNOWN :				return (AtomTrivalent.UNKNOWN);
		case NONE :					return (AtomNone.VALUE);
		}
	}
	
	static public void printReserved(StringBuilder sb, Reserved sym)
	{
		for (Entry<String, Reserved> e : _reserved.entrySet())
		{
			if (e.getValue() != sym)
				continue;
			sb.append('#').append(e.getKey());
			return;
		}
	}
	
	static public void xprintReserved(StringBuilder sb, Reserved sym, String type)
	{
		for (Entry<String, Reserved> e : _reserved.entrySet())
		{
			if (e.getValue() != sym)
				continue;
			sb.append("[").append(type).append("]#").append(e.getKey());
			return;
		}
	}
	
	static public void printSymbol(StringBuilder sb, String sym)
		{ sb.append(asPrintSymbol(sym)); }

	static public void xprintSymbol(StringBuilder sb, String sym)
	{
		if (_reserved.containsKey(sym))
			sb.append("[#]");
		sb.append('#').append(sym);
	}
	
	static public String asPrintSymbol(String sym)
	{
		String lead = "#";
		if (_reserved.containsKey(sym))
			lead += '#';
		return (lead + sym);
	}
	
	public Symbol(String v)
		{ _sym = v; }
	
	private final String _sym;

	public String asjString()
		{ return (_sym); }
	public String asPrintSymbol()
		{ return (Symbol.asPrintSymbol(_sym)); }
}

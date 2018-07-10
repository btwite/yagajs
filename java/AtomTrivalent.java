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
 *  Trivalent atom, either true, false or maybe.
 */
package yaga.core;

/**
 *
 * @author Bruce
 */
public abstract class AtomTrivalent extends AtomicList
{
	static public AtomTrivalent TRUE =		new True();
	static public AtomTrivalent FALSE =		new False();
	static public AtomTrivalent UNKNOWN =	new Unknown();
	
	private AtomTrivalent(Symbol.Reserved trit)
		{ _trit = trit; }
	
	private final Symbol.Reserved _trit;
	
	public int getValue()
		{ return (_trit.ordinal()); }
	public Symbol.Reserved getTrit()
		{ return (_trit); }
	
	@Override
	public AtomTrivalent zeroValue()
		{ return (FALSE); }
	
	@Override
	public final boolean isTrivalent()
		{ return (true); }

	@Override
	public void print(StringBuilder sb) 
		{ Symbol.printReserved(sb, _trit); }

	@Override
	public void xprint(StringBuilder sb) 
		{ Symbol.xprintReserved(sb, _trit, "Trivalent"); }

	@Override
	public List add(Context ctxt, List e)
		{ return (UNKNOWN); }
	@Override
	public List sub(Context ctxt, List e)
		{ return (UNKNOWN); }
	@Override
	public List mul(Context ctxt, List e)
		{ return (UNKNOWN); }
	@Override
	public List div(Context ctxt, List e)
		{ return (UNKNOWN); }
	@Override
	public List rem(Context ctxt, List e)
		{ return (UNKNOWN); }
	
	static private class True extends AtomTrivalent
	{
		private True()
			{ super(Symbol.Reserved.TRUE); }
		
		@Override
		public final boolean isTrue()
			{ return (true); }

		@Override
		public final List trueSelect(List eTrue, List eElse)
			{ return (eTrue); }
		@Override
		public final List falseSelect(List eFalse, List eElse)
			{ return (eElse); }
		@Override
		public final List unknownSelect(List eUnknown, List eElse)
			{ return (eElse); }
		@Override
		public List trueFalseSelect(List eTrue, List eFalse, List eElse)
			{ return (eTrue); }
		@Override
		public final List select(List eTrue, List eFalse, List eUnknown)
			{ return (eTrue); }
		@Override
		public List select(List eTrue, List eFalse, List eUnknown, List eElse)
			{ return (eTrue); }
	
		@Override
		public AtomTrivalent neg(Context ctxt)
			{ return (FALSE); }
	}
	
	static private class False extends AtomTrivalent
	{
		private False()
			{ super(Symbol.Reserved.FALSE); }

		@Override
		public final boolean isFalse()
			{ return (true); }

		@Override
		public final List trueSelect(List eTrue, List eElse)
			{ return (eElse); }
		@Override
		public final List falseSelect(List eFalse, List eElse)
			{ return (eFalse); }
		@Override
		public final List unknownSelect(List eUnknown, List eElse)
			{ return (eElse); }
		@Override
		public List trueFalseSelect(List eTrue, List eFalse, List eElse)
			{ return (eFalse); }
		@Override
		public final List select(List eTrue, List eFalse, List eUnknown)
			{ return (eFalse); }
		@Override
		public List select(List eTrue, List eFalse, List eUnknown, List eElse)
			{ return (eFalse); }
	
		@Override
		public AtomTrivalent neg(Context ctxt)
			{ return (TRUE); }
	}
	
	static private class Unknown extends AtomTrivalent
	{
		private Unknown()
			{ super(Symbol.Reserved.UNKNOWN); }
		
		@Override
		public final boolean isUnknown()
			{ return (true); }

		@Override
		public final List trueSelect(List eTrue, List eElse)
			{ return (eElse); }
		@Override
		public final List falseSelect(List eFalse, List eElse)
			{ return (eElse); }
		@Override
		public final List unknownSelect(List eUnknown, List eElse)
			{ return (eUnknown); }
		@Override
		public List trueFalseSelect(List eTrue, List eFalse, List eElse)
			{ return (eElse); }
		@Override
		public final List select(List eTrue, List eFalse, List eUnknown)
			{ return (eUnknown); }
		@Override
		public List select(List eTrue, List eFalse, List eUnknown, List eElse)
			{ return (eUnknown); }
	
		@Override
		public AtomTrivalent neg(Context ctxt)
			{ return (this); }
	}
}

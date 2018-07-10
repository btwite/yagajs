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
 *  Special Atom to signify that we have no argument or value.
 */
package yaga.core;

/**
 *
 * @author Bruce
 */
public class AtomNone extends AtomicList
{
	static public AtomNone VALUE = new AtomNone();
			
	private AtomNone()
		{ super(ParserPoint.Default); }
	
	@Override
	public AtomNone zeroValue()
		{ return (this); }
	
	@Override
	public boolean isNone()
		{ return (true); }

	@Override
	public void print(StringBuilder sb) 
		{ Symbol.printReserved(sb, Symbol.Reserved.NONE); }
	
	@Override
	public List neg(Context ctxt)
		{ return (this); }
	@Override
	public List add(Context ctxt, List e)
		{ return (this); }
	@Override
	public List sub(Context ctxt, List e)
		{ return (this); }
	@Override
	public List mul(Context ctxt, List e)
		{ return (this); }
	@Override
	public List div(Context ctxt, List e)
		{ return (this); }
	@Override
	public List rem(Context ctxt, List e)
		{ return (this); }
	
	@Override
	public List rAdd(Context ctxt, List e)
		{ return (this); }
	@Override
	public List rSub(Context ctxt, List e)
		{ return (this); }
	@Override
	public List rMul(Context ctxt, List e)
		{ return (this); }
	@Override
	public List rDiv(Context ctxt, List e)
		{ return (this); }
	@Override
	public List rRem(Context ctxt, List e)
		{ return (this); }
}
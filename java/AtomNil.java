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
 *  AtomNil node representing () the empty Trivial sequence.
 */
package yaga.core;

import yaga.core.exceptions.YagaException;

/**
 *
 * @author Bruce
 */
public class AtomNil extends AtomicList
{
	protected AtomNil(ParserPoint point)
		{ super(point); }
	
	@Override
	public Elements elements()
		{ return (Elements.EmptyElements); }
	
	@Override
	public AtomNil zeroValue()
		{ return (this); }

	@Override
	public List asFrameReference(Context ctxt, Frame frame)
		{ return (this); }
	
	@Override
	public boolean isEmpty()	{ return (true); }
	@Override
	public boolean isNil()		{ return (true); }
	
	@Override
	public List appendList(List e)	
		{  return (!e.isEmpty() ? e : this ); }

	@Override
	public void print(StringBuilder sb) 
		{ sb.append("()"); }
	
	@Override
	public List neg(Context ctxt)
		{ return (this); }
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

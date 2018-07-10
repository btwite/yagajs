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
 *  32 bit integer atom.
 */
package yaga.core;

import java.math.BigDecimal;
import java.math.BigInteger;

/**
 *
 * @author Bruce
 */
public class AtomInt32 extends AtomNumber.Rational
{
	public AtomInt32(int v)
		{ _int32 = v; }
	public AtomInt32(int v, ParserPoint point)
		{ _int32 = v; _point = point; }
	
	private final int _int32;
	
	public int getInt()
		{ return (_int32); }

	@Override
	public void print(StringBuilder sb) 
		{ sb.append(Integer.toString(_int32)).append('i'); }
	@Override
	public String asjString() 
		{ return (Integer.toString(_int32)); }

	@Override
	public int int32Value() 
		{ return (_int32); }

	@Override
	public long int64Value()
		{ return (_int32); }

	@Override
	public double floatValue()
		{ return (_int32); }

	@Override
	public BigDecimal decimalValue()
		{ return (BigDecimal.valueOf(_int32)); }

	@Override
	public BigInteger integerValue()
		{ return (BigInteger.valueOf(_int32)); }

	@Override
	public final int castLevel() { return (0); }
	
	@Override
	public final AtomNumber checkCast(AtomNumber num)
		{  return (num.castLevel() > castLevel() ? num.cast(this) :this); }

	@Override
	public final AtomNumber cast(AtomNumber num)
		{ return (new AtomInt32(num.int32Value(), _point)); }

	@Override
	public AtomNumber add(AtomNumber num) 
		{ return (new AtomInt32(_int32 + num.int32Value(), _point)); }

	@Override
	public AtomNumber sub(AtomNumber num)
		{ return (new AtomInt32(_int32 - num.int32Value(), _point)); }

	@Override
	public AtomNumber mul(AtomNumber num)
		{ return (new AtomInt32(_int32 * num.int32Value(), _point)); }

	@Override
	public AtomNumber div(AtomNumber num)
		{ return (new AtomInt32(_int32 / num.int32Value(), _point)); }

	@Override
	public AtomNumber rem(AtomNumber num)
		{ return (new AtomInt32(_int32 % num.int32Value(), _point)); }

	static public AtomInt32 zero = new AtomInt32(0);
	@Override
	public AtomNumber zero() 
		{ return (zero); }
}

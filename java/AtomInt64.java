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
 *  64 bit integer atom.
 */
package yaga.core;

import java.io.PrintStream;
import java.math.BigDecimal;
import java.math.BigInteger;

/**
 *
 * @author Bruce
 */
public class AtomInt64 extends AtomNumber.Rational
{
	public AtomInt64(long v)
		{ _int64 = v; }
	public AtomInt64(long v, ParserPoint point)
		{ _int64 = v; _point = point; }
	
	private final long _int64;

	public long getLong()
		{ return (_int64); }

	@Override
	public int int32Value() 
		{ return ((int)_int64); }

	@Override
	public long int64Value()
		{ return (_int64); }

	@Override
	public double floatValue()
		{ return (_int64); }

	@Override
	public BigDecimal decimalValue()
		{ return (BigDecimal.valueOf(_int64)); }

	@Override
	public BigInteger integerValue()
		{ return (BigInteger.valueOf(_int64)); }

	@Override
	public final int castLevel() { return (1); }
	
	@Override
	public final AtomNumber checkCast(AtomNumber num)
		{  return (num.castLevel() > castLevel() ? num.cast(this) : this); }

	@Override
	public final AtomNumber cast(AtomNumber num)
		{ return (new AtomInt64(num.int64Value(), _point)); }

	@Override
	public AtomNumber add(AtomNumber num) 
		{ return (new AtomInt64(_int64 + num.int64Value(), _point)); }

	@Override
	public AtomNumber sub(AtomNumber num)
		{ return (new AtomInt64(_int64 - num.int64Value(), _point)); }

	@Override
	public AtomNumber mul(AtomNumber num)
		{ return (new AtomInt64(_int64 * num.int64Value(), _point)); }

	@Override
	public AtomNumber div(AtomNumber num)
		{ return (new AtomInt64(_int64 / num.int64Value(), _point)); }

	@Override
	public AtomNumber rem(AtomNumber num)
		{ return (new AtomInt64(_int64 % num.int64Value(), _point)); }

	static public AtomInt64 zero = new AtomInt64(0);
	@Override
	public AtomNumber zero() 
		{ return (zero); }

	@Override
	public void print(StringBuilder sb) 
		{ sb.append(Long.toString(_int64)).append('l'); }
	@Override
	public String asjString() 
		{ return (Long.toString(_int64)); }
}
 
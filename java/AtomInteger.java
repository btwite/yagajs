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
 *  Arbitrary precision Integer.
 */
package yaga.core;

import java.math.BigDecimal;
import java.math.BigInteger;

/**
 *
 * @author Bruce
 */
public class AtomInteger extends AtomNumber.Rational
{
	public AtomInteger(BigInteger v)
		{ _integer = v; }
	public AtomInteger(BigInteger v, ParserPoint point)
		{ _integer = v; _point = point; }
	
	private final BigInteger _integer;

	public BigInteger getInteger()
		{ return (_integer); }
	
	@Override
	public boolean isInteger()			
		{ return (true); }

	@Override
	public int int32Value() 
		{ return (_integer.intValue()); }

	@Override
	public long int64Value()
		{ return (_integer.longValue()); }

	@Override
	public double floatValue()
		{ return (_integer.doubleValue()); }

	@Override
	public BigDecimal decimalValue()
		{ return (new BigDecimal(_integer)); }

	@Override
	public BigInteger integerValue()
		{ return (_integer); }

	@Override
	public final int castLevel() { return (3); }
	
	@Override
	public final AtomNumber checkCast(AtomNumber num)
	{
		if (num.isFloat())
			return (new AtomDecimal(decimalValue(), _point));
		return (num.castLevel() > castLevel() ? num.cast(this) : this); 
	}

	@Override
	public final AtomNumber cast(AtomNumber num)
		{ return (new AtomInteger(num.integerValue(), _point)); }

	@Override
	public AtomNumber add(AtomNumber num) 
		{ return (new AtomInteger(_integer.add(num.integerValue()), _point)); }

	@Override
	public AtomNumber sub(AtomNumber num)
		{ return (new AtomInteger(_integer.subtract(num.integerValue()), _point)); }

	@Override
	public AtomNumber mul(AtomNumber num)
		{ return (new AtomInteger(_integer.multiply(num.integerValue()), _point)); }

	@Override
	public AtomNumber div(AtomNumber num)
		{ return (new AtomInteger(_integer.divide(num.integerValue()), _point)); }

	@Override
	public AtomNumber rem(AtomNumber num)
		{ return (new AtomInteger(_integer.remainder(num.integerValue()), _point)); }

	static public AtomInteger zero = new AtomInteger(BigInteger.ZERO);
	@Override
	public AtomNumber zero() 
		{ return (zero); }

	@Override
	public void print(StringBuilder sb) 
		{ sb.append(_integer.toString()).append('g'); }
	@Override
	public String asjString() 
		{ return (_integer.toString()); }
}

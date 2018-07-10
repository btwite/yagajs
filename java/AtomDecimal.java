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
 *  Arbitrary precision Decimal consisting of an arbirary precision integer 
 *  and scale. Defined as <integer> * 10 ** -<scale>
 */
package yaga.core;

import java.math.BigDecimal;
import java.math.BigInteger;

/**
 *
 * @author Bruce
 */
public class AtomDecimal extends AtomNumber.FloatingPoint
{
	public AtomDecimal(BigDecimal v)
		{ _dec = v; }
	public AtomDecimal(BigDecimal v, ParserPoint point)
		{ _dec = v; _point = point; }
	
	private final BigDecimal _dec;

	public BigDecimal getDecimal()
		{ return (_dec); }

	@Override
	public int int32Value() 
		{ return (_dec.intValue()); }

	@Override
	public long int64Value()
		{ return (_dec.longValue()); }

	@Override
	public double floatValue()
		{ return (_dec.doubleValue()); }

	@Override
	public BigDecimal decimalValue()
		{ return (_dec); }

	@Override
	public BigInteger integerValue()
		{ return (_dec.toBigInteger()); }

	@Override
	public final int castLevel() { return (4); }
	
	@Override
	public final AtomNumber checkCast(AtomNumber num)
		{  return (num.castLevel() > castLevel() ? num.cast(this) : this); }

	@Override
	public final AtomNumber cast(AtomNumber num)
		{ return (new AtomDecimal(num.decimalValue(), _point)); }

	@Override
	public AtomNumber add(AtomNumber num) 
		{ return (new AtomDecimal(_dec.add(num.decimalValue()), _point)); }

	@Override
	public AtomNumber sub(AtomNumber num)
		{ return (new AtomDecimal(_dec.subtract(num.decimalValue()), _point)); }

	@Override
	public AtomNumber mul(AtomNumber num)
		{ return (new AtomDecimal(_dec.multiply(num.decimalValue()), _point)); }

	@Override
	public AtomNumber div(AtomNumber num)
		{ return (new AtomDecimal(_dec.divide(num.decimalValue()), _point)); }

	@Override
	public AtomNumber rem(AtomNumber num)
		{ return (new AtomDecimal(_dec.remainder(num.decimalValue()), _point)); }

	static public AtomDecimal zero = new AtomDecimal(BigDecimal.ZERO);
	@Override
	public AtomNumber zero() 
		{ return (zero); }

	@Override
	public void print(StringBuilder sb) 
		{ sb.append(_dec.toString()).append('d'); }
	@Override
	public String asjString() 
		{ return (_dec.toString()); }
}

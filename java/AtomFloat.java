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
 *  64 floating point atom.
 */
package yaga.core;

import java.math.BigDecimal;
import java.math.BigInteger;

/**
 *
 * @author Bruce
 */
public class AtomFloat extends AtomNumber.FloatingPoint
{
	public AtomFloat(double v)
		{ _float = v; }
	public AtomFloat(double v, ParserPoint point)
		{ _float = v; _point = point; }
	
	private final double _float;

	public double getValue()
		{ return (_float); }
	
	@Override
	public boolean isFloat()			
		{ return (true); }

	@Override
	public int int32Value() 
		{ return ((int)_float); }

	@Override
	public long int64Value()
		{ return ((long)_float); }

	@Override
	public double floatValue()
		{ return (_float); }

	@Override
	public BigDecimal decimalValue()
		{ return (BigDecimal.valueOf(_float)); }

	@Override
	public BigInteger integerValue()
		{ return (BigDecimal.valueOf(_float).toBigInteger()); }

	@Override
	public final int castLevel() { return (2); }
	
	@Override
	public final AtomNumber checkCast(AtomNumber num)
	{
		if (num.isInteger())
			return (new AtomDecimal(decimalValue(), _point));
		return (num.castLevel() > castLevel() ? num.cast(this) : this); 
	}

	@Override
	public final AtomNumber cast(AtomNumber num)
		{ return (new AtomFloat(num.floatValue(), _point)); }

	@Override
	public AtomNumber add(AtomNumber num) 
		{ return (new AtomFloat(_float + num.floatValue(), _point)); }

	@Override
	public AtomNumber sub(AtomNumber num)
		{ return (new AtomFloat(_float - num.floatValue(), _point)); }

	@Override
	public AtomNumber mul(AtomNumber num)
		{ return (new AtomFloat(_float * num.floatValue(), _point)); }

	@Override
	public AtomNumber div(AtomNumber num)
		{ return (new AtomFloat(_float / num.floatValue(), _point)); }

	@Override
	public AtomNumber rem(AtomNumber num)
		{ return (new AtomFloat(_float % num.floatValue(), _point)); }

	static public AtomFloat zero = new AtomFloat(0.0);
	@Override
	public AtomNumber zero() 
		{ return (zero); }

	@Override
	public void print(StringBuilder sb) 
		{ sb.append(Double.toString(_float)).append('f'); }
	@Override
	public String asjString() 
		{ return (Double.toString(_float)); }
}

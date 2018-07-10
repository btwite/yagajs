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
import yaga.core.exceptions.YagaException;

/**
 *
 * @author Bruce
 */
public abstract class AtomNumber extends AtomicList
{
	abstract public int				int32Value();
	abstract public long			int64Value();
	abstract public double			floatValue();
	abstract public BigDecimal		decimalValue();
	abstract public BigInteger		integerValue();
	abstract public int				castLevel();
	abstract public AtomNumber		checkCast(AtomNumber num);
	abstract public AtomNumber		cast(AtomNumber num);
	
	abstract public AtomNumber		add(AtomNumber num);
	abstract public AtomNumber		sub(AtomNumber num);
	abstract public AtomNumber		mul(AtomNumber num);
	abstract public AtomNumber		div(AtomNumber num);
	abstract public AtomNumber		rem(AtomNumber num);
	abstract public AtomNumber		zero();
	abstract public String			asjString();
	
	public boolean isReal()				{ return (false); }
	public boolean isRational()			{ return (false); }
	public boolean isFloatingPoint()	{ return (false); }
	public boolean isFloat()			{ return (false); }
	public boolean isInteger()			{ return (false); }
	
	@Override
	public boolean isNumber()		{ return (true); }
	@Override
	public AtomNumber asisNumber()	{ return (this); } 
	@Override
	public AtomNumber asNumber()	{ return (this); } 
	
	@Override
	public AtomNumber zeroValue()
		{ return (zero()); }

	@Override
	public List neg(Context ctxt)
		throws YagaException
		{ return (zero().sub(ctxt, this)); }
	
	@Override
	public List add(Context ctxt, List e)
		throws YagaException
	{ 
		AtomNumber n2 = e.asisNumber();
		if (n2 != null)
			return (checkCast(n2).add(n2)); 
		AtomString s2 = e.asisString();
		if (s2 != null)
			return (new AtomString(asjString() + s2.asjString(), _point));
		AtomChar c2 = e.asisChar();
		if (c2 != null)
			{ return (add(new AtomInt32(c2.asjChar()))); }
		AtomSymbol sym2 = e.asisSymbol();
		if (sym2 != null)
			return (new AtomSymbol(asjString() + sym2.asjString(), _point));
		return (e.rAdd(ctxt, this));
	}
	
	@Override
	public List sub(Context ctxt, List e)
		throws YagaException
	{ 
		AtomNumber n2 = e.asisNumber();
		if (n2 != null)
			return (checkCast(n2).sub(n2)); 
		AtomChar c2 = e.asisChar();
		if (c2 != null)
			{ return (sub(new AtomInt32(c2.asjChar(), _point))); }
		return (e.rSub(ctxt, this));
	}
	
	@Override
	public List mul(Context ctxt, List e)
		throws YagaException
	{ 
		AtomNumber n2 = e.asisNumber();
		if (n2 != null)
			return (checkCast(n2).mul(n2)); 
		if (e.isString() || e.isChar() || e.isSymbol())
			return (e.mul(ctxt, this));
		return (e.rMul(ctxt, this));
	}
	
	@Override
	public List div(Context ctxt, List e)
		throws YagaException
	{ 
		AtomNumber n2 = e.asisNumber();
		if (n2 != null)
			return (checkCast(n2).div(n2)); 
		return (e.rDiv(ctxt, this));
	}
	
	@Override
	public List rem(Context ctxt, List e)
		throws YagaException
	{ 
		AtomNumber n2 = e.asisNumber();
		if (n2 != null)
			return (checkCast(n2).rem(n2)); 
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

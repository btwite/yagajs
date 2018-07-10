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
 *	Operators primitives.
 *  Note that for many number operations the presence of a single parameter
 *  is treated as 0 <op> Operators. 
 */
package yaga.core.prim;

import yaga.core.*;
import yaga.core.exceptions.YagaException;
import yaga.core.ristic.PrimRistic;

/**
 *
 * @author Bruce
 */
public class Operators
{
	static public List Add(Context ctxt, PrimRistic.Primitive prim, List parms)
		throws YagaException
		{ return (runOpFn(ctxt, parms, (e1, e2) -> e1.add(ctxt, e2))); }
	
	static public List Subtract(Context ctxt, PrimRistic.Primitive prim, List parms)
		throws YagaException
		{ return (runOpFn(ctxt, parms, (n1, n2) -> n1.sub(ctxt, n2))); }
	
	static public List Multiply(Context ctxt, PrimRistic.Primitive prim, List parms)
		throws YagaException
		{ return (runOpFn(ctxt, parms, (n1, n2) -> n1.mul(ctxt, n2))); }
	
	static public List Divide(Context ctxt, PrimRistic.Primitive prim, List parms)
		throws YagaException
		{ return (runOpFn(ctxt, parms, (n1, n2) -> n1.div(ctxt, n2))); }
	
	static public List Remainder(Context ctxt, PrimRistic.Primitive prim, List parms)
		throws YagaException
		{ return (runOpFn(ctxt, parms, (n1, n2) -> n1.rem(ctxt, n2))); }
	
	static public List Negate(Context ctxt, PrimRistic.Primitive prim, List parms)
		throws YagaException
		{ return (Core.runStdPrimFn(ctxt, parms, 
									(e) -> e.step(ctxt).neg(ctxt), 
									() -> Lists.nil(parms.parserPoint()))); }
	
	static private interface OpFn
		{ public List run(List e1, List e2) throws YagaException; }
	
	static private List runOpFn(Context ctxt, List parms, OpFn fn)
		throws YagaException
		{ return (runOpFn(ctxt, parms, fn, () -> Lists.nil())); }

	static private List runOpFn(Context ctxt, List parms, OpFn fn, Core.StdPrimEmptyFn efn)
		throws YagaException
	{
		List[] es = parms.elements().asParameters(ctxt);
		if (es.length == 0)
			return (efn.run());

		List e = es[0].step(ctxt);
		if (es.length == 1)
			return (fn.run(e.zeroValue(), e));
		for (int i = 1; i < es.length; i++)
			e = fn.run(e, es[i].step(ctxt));
		return (e);
	}
}

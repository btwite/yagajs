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
 *  Ristic Class
 *		#prim - Invokes java primitive function to implement a custom ristic
 *			    behaviour. Allows creation of a custom Container type that
 *			    overrides standard list binding and evaluation process.
 *				Can also be used to implement processing steps within
 *				pipelines.
 *				Parms :
 *					. Symbol represented name of Java class
 *					. Symbol representing static method.
 *					. Remaining parameters as required. NOT VALIDATED
 *				Primitive is passed the Ristic and the pipeline parameters.
 */
package yaga.core.ristic;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import yaga.core.AtomSymbol;
import yaga.core.Context;
import yaga.core.Elements;
import yaga.core.List;
import yaga.core.ParserPoint;
import yaga.core.Symbol;
import yaga.core.exceptions.EvaluateException;
import yaga.core.exceptions.RisticValidationException;
import yaga.core.exceptions.YagaException;

/**
 *
 * @author Bruce
 */
public class PrimRistic extends Ristic.RisticClass
{
	static public Ristic.RisticClass newRisticClass(Context ctxt, Symbol name, ParserPoint point)
		{ return (new PrimRistic(name, point)); }
	
	protected PrimRistic(Symbol name, ParserPoint point)
		{ super(name, point); }

	@Override
	public List risticReduce(Context ctxt, List parms)
		throws YagaException
	{ 
		Elements elements = parms.elements().expand(ctxt).bind(ctxt);
		List[] es = elements.asArray();
		if (elements.hasVariableElements() || es.length < 2)
			return (Ristic.newRistic(this, es, parms.parserPoint()));
		AtomSymbol sym1 = es[0].asisSymbol();
		if (sym1 == null)
			throw new RisticValidationException(parms, elements, "Symbol expected for primitive class name");
		AtomSymbol sym2 = es[1].asisSymbol();
		if (sym2 == null)
			throw new RisticValidationException(parms, elements, "Symbol expected for primitive method name");

		try
		{
			Class cls = java.lang.Class.forName(sym1.asjString());
			Method meth = cls.getMethod(sym2.asjString(), Context.class, Primitive.class, List.class);
			return (new Primitive(this, elements, parms, cls, meth));
		}
		catch (ClassNotFoundException | NoSuchMethodException | IllegalArgumentException e)
			{ throw new RisticValidationException(parms, es, e.toString()); }
	}
	
	static public class Primitive extends RisticInstance
	{
		public Primitive(RisticClass rClass, Elements elements, List source, Class cls, Method meth)
			throws YagaException
			{  super(rClass, elements, source.parserPoint()); _class = cls; _meth =  meth; }

		private final Class _class;
		private final Method _meth;

		@Override
		public List risticReduce(Context ctxt, List parms)
			throws YagaException
			{ return (step(ctxt, parms)); }

		@Override
		public List step(Context ctxt, List parms)
			throws YagaException
		{ 
			try
				{ return ((List)_meth.invoke(_class, ctxt, this, parms)); }
			catch (IllegalAccessException | InvocationTargetException e)
			{
				Throwable t = e.getCause();
				if (t != null)
				{
					if (YagaException.class.isAssignableFrom(t.getClass()))
						throw (YagaException)t;
					throw new EvaluateException(EvaluateException.ErrorType.RISTIC, this, t.toString(), t); 
				}
				throw new EvaluateException(EvaluateException.ErrorType.RISTIC, this, e.toString()); 
			}
		}
	}
}

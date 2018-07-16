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
 *		#alias	- Container that contains bound elements only rather than a
 *				  bound expression. For example (1 + 2) will normally create 
 *				  a Productive list if expression is bound, whereas
 *				  ((#ristic #alias) 1 + 2) will create a list that
 *				  contains the elements 1 + and 2. Aliases are also treated
 *				  as an atomic elements, meaning that normal list
 *				  operations do not apply. Must be dealiased first.
 */
package yaga.core.ristic;

import yaga.core.AtomAlias;
import yaga.core.Context;
import yaga.core.Elements;
import yaga.core.List;
import yaga.core.ParserPoint;
import yaga.core.Symbol;
import yaga.core.exceptions.RisticValidationException;
import yaga.core.exceptions.YagaException;

/**
 *
 * @author Bruce
 */
public class AliasRistic extends Ristic.RisticClass
{
	static public Ristic.RisticClass newRisticClass(Context ctxt, Symbol name, ParserPoint point)
		{ return (new AliasRistic(name, point)); }
	
	protected AliasRistic(Symbol name, ParserPoint point)
		{ super(name, point); }

	@Override
	public List risticReduce(Context ctxt, List parms)
		throws YagaException
	{ 
		if (!parms.elements().isEmpty())
			throw new RisticValidationException(parms, parms.elements(), "No parameters required");
		return (new Alias(this, parms.elements(), parms));
	}
	
	static public class Alias extends RisticInstance
	{
		public Alias(RisticClass rClass, Elements elements, List source)
			throws YagaException
			{  super(rClass, elements, source.parserPoint()); }
		
		@Override
		public List risticReduce(Context ctxt, List parms)
			throws YagaException
			{ return (new AtomAlias(parms.elements().bind(ctxt), parms.parserPoint())); }
	}
}

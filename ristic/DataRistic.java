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
 *		#data	- Ristic that forces the creation of a data list. 
 *				  Allows all elements to be treated as data.
 */
package yaga.core.ristic;

import yaga.core.Context;
import yaga.core.Elements;
import yaga.core.List;
import yaga.core.Lists;
import yaga.core.ParserPoint;
import yaga.core.Symbol;
import yaga.core.exceptions.RisticValidationException;
import yaga.core.exceptions.YagaException;

/**
 *
 * @author Bruce
 */
public class DataRistic extends Ristic.RisticClass
{
	static public Ristic.RisticClass newRisticClass(Context ctxt, Symbol name, ParserPoint point)
		{ return (new DataRistic(name, point)); }
	
	protected DataRistic(Symbol name, ParserPoint point)
		{ super(name, point); }

	@Override
	public List risticReduce(Context ctxt, List parms)
		throws YagaException
	{ 
		if (!parms.elements().isEmpty())
			throw new RisticValidationException(parms, parms.elements(), "No parameters required");
		return (new Data(this, parms.elements(), parms));
	}
	
	static public class Data extends RisticInstance
	{
		public Data(RisticClass rClass, Elements elements, List source)
			throws YagaException
			{  super(rClass, elements, source.parserPoint()); }
		
		@Override
		public List risticReduce(Context ctxt, List parms)
			throws YagaException
			{  return (Lists.newData(parms.elements().bind(ctxt), parms.parserPoint())); }
	}
}

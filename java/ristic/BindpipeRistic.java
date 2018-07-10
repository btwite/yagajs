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
 *		#bindpipe	- Pipeline that is evaluated during a bind process.
 *					  Must be single head pipe in production.
 *					  Shared Parms :
 *						. (#args <name1> <name2> ... )
 *						. (#more <name>) - Variable args as list.
 *						. (#locals <name1> <name2> ... )
 *							Can only be set once and as evaluated expression in
 *							(.let <name> <expr>)
 */
package yaga.core.ristic;

import yaga.core.Context;
import yaga.core.Elements;
import yaga.core.List;
import yaga.core.ParserPoint;
import yaga.core.Pipeline;
import yaga.core.Symbol;
import yaga.core.Variable;
import yaga.core.exceptions.YagaException;

/**
 *
 * @author Bruce
 */
public class BindpipeRistic extends Ristic.RisticClass
{
	
	static public Ristic.RisticClass newRisticClass(Context ctxt, Symbol name, ParserPoint point)
		{ return (new BindpipeRistic(name, point)); }
	
	protected BindpipeRistic(Symbol name, ParserPoint point)
		{ super(name, point); }

	@Override
	public List risticReduce(Context ctxt, List parms)
		throws YagaException
	{ 
		Elements elements = parms.elements().expand(ctxt).bind(ctxt);
		if (elements.hasVariableElements())
			return (Ristic.newRistic(this, elements, parms.parserPoint()));
		PipeRistics.checkPipeOptions(ctxt, true, elements, parms);
		return (new Bindpipe(ctxt, this, elements, parms));
	}
	
	static public class Bindpipe extends PipeRistics
	{
		public Bindpipe(Context ctxt, RisticClass rClass, Elements elements, List source)
			throws YagaException
			{  super(ctxt, rClass, elements, source.parserPoint()); }
		
		@Override
		public Pipeline newPipeline(List[] es, Variable.PipeVariable[] sinks, boolean flHaveRoot, ParserPoint point)
			{ return (new Pipeline.Binding(this, Elements.make(es, this), sinks, flHaveRoot, point)); }
	}
}

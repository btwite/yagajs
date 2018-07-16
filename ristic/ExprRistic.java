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
 *		#expr	- Redefines pipeline parameters list as an Expression.
 *				  Parms :
 *					. Optional 
 *						#names - Name binding performed only.
 *						#bind - Bind all elements.
 *						#unbound - Allow unbound elements.
 */
package yaga.core.ristic;

import java.util.ArrayList;
import yaga.core.Context;
import yaga.core.Elements;
import yaga.core.List;
import yaga.core.ParserPoint;
import yaga.core.Symbol;
import yaga.core.Error;
import yaga.core.Expression;
import yaga.core.exceptions.RisticValidationException;
import yaga.core.exceptions.YagaException;

/**
 *
 * @author Bruce
 */
public class ExprRistic extends Ristic.RisticClass
{
	static public Ristic.RisticClass newRisticClass(Context ctxt, Symbol name, ParserPoint point)
		{ return (new ExprRistic(name, point)); }
	
	protected ExprRistic(Symbol name, ParserPoint point)
		{ super(name, point); }

	@Override
	public List risticReduce(Context ctxt, List parms)
		throws YagaException
	{ 
		boolean flBind = false, flUnbound = false, flNames = false;
		boolean flProd = false, flData = false;
		Elements elements = parms.elements().expand(ctxt).bind(ctxt);
		List[] es = elements.asArray();
		if (elements.hasVariableElements() || es.length == 0)
			return (Ristic.newRistic(this, es, parms.parserPoint()));
		ArrayList<yaga.core.Error> errors = new ArrayList();
		if (es.length > 0)
		{
			if (Elements.hasVariableElements(es))
				return (Ristic.newRistic(this, es, parms.parserPoint()));
			for (List e : es)
			{
				if (!e.isSymbol())
					errors.add(new Error(e, "Invalid parameter for expression ristic"));
				if (checkOption(flProd, e, Symbol.PROD, errors))
					flProd = true;
				else if (checkOption(flData, e, Symbol.DATA, errors))
					flData = true;
				else if (checkOption(flBind, e, Symbol.BIND, errors))
					flBind = true;
				else if (checkOption(flNames, e, Symbol.NAMES, errors))
					flNames = true;
				else if (checkOption(flUnbound, e, Symbol.UNBOUND, errors))
					flUnbound = true;
				else
					errors.add(new Error(e, "Invalid option for expression ristic. Must be #prod, #data, #bind, #names or #unbound"));
			}
			if (!flProd && !flData)
				errors.add(new Error(parms, "A type option of #prod or #data must be provided"));
			else if (flProd && flData)
				errors.add(new Error(parms, "Type options #prod or #data are mutually exclusive"));
		}
		if (!errors.isEmpty())
			throw new RisticValidationException(parms, es, errors.toArray(new Error[errors.size()]));
		return (new Expr(this, elements, parms, flProd, flBind, flNames, flUnbound));
	}
	
	private boolean checkOption(boolean fl, List e, Symbol match, ArrayList<Error> errors)
		throws YagaException
	{
		if (e.asisSymbol().symbol() != match)
			return (false);
		if (fl)
			errors.add(new Error(e, String.format("Duplicate option '%s'", match.asjString())));
		return (true);
	}
	
	static public class Expr extends Ristic.RisticInstance
	{
		public Expr(RisticClass rClass, Elements elements, List source, 
					boolean flProd, boolean flBind, boolean flNames, boolean flUnbound)
			throws YagaException
		{  
			super(rClass, elements, source.parserPoint());
			_flProd = flProd; _flBind = flBind; _flNames = flNames; _flUnbound = flUnbound; 
		}
		
		private final boolean _flProd, _flBind, _flNames, _flUnbound;
	
		@Override
		public List risticReduce(Context ctxt, List parms)
			throws YagaException
		{
			Elements elements = parms.elements();
			if (_flBind)
			{
				elements = _flNames ?
					elements.bindNames(ctxt) :
					elements.bind(ctxt);
				if (!_flUnbound && !elements.areBound())
					ctxt.addBindError(parms, "Expression contains unbound elements");
			}
			else
				elements = elements.expand(ctxt);
			if (_flProd)
				return (new Expression.BoundProd(elements, _flBind, _flNames, parms.parserPoint()));
			return (new Expression.BoundData(elements, _flBind, _flNames, parms.parserPoint()));
		}
	}
}

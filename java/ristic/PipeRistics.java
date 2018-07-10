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
 *		#pipe		- Evaluation pipeline. 
 *					  Parms :
 *						. Optional numeric precedence.
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

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import yaga.core.Context;
import yaga.core.Elements;
import yaga.core.Error;
import yaga.core.List;
import yaga.core.Lists;
import yaga.core.Name;
import yaga.core.ParserPoint;
import yaga.core.Pipeline;
import yaga.core.Symbol;
import yaga.core.Variable;
import yaga.core.VariableBinder;
import yaga.core.exceptions.BindException;
import yaga.core.exceptions.RisticValidationException;
import yaga.core.exceptions.YagaException;

/**
 *
 * @author Bruce
 */
public abstract class PipeRistics extends Ristic.RisticInstance
	implements VariableBinder
{
	static private final Name[]						_emptyNames = new Name[0];
	static private final Variable.PipeVariable[]	_noPipeVars = new Variable.PipeVariable[0];

	protected PipeRistics(Context ctxt, RisticClass rClass, Elements elements, ParserPoint point)
		throws YagaException
	{ 
		super(rClass, elements, point); 
		
		int prec = Pipeline.DefaultPrecedence; 
		int nParms = -1; int nPparms = -1;
		Name[] args = _emptyNames; Name[] vargs = _emptyNames;
		boolean flVargs = false;
		for (List opt : elements.asArray()) 
		{
			if (opt.isNumber())
			{ prec = opt.asisNumber().int32Value(); continue; }
			List[] es = opt.elements().asExpandedArray(ctxt);
			Symbol sym = es[0].asisSymbol().symbol();
			if (sym == Symbol.NPARMS)
			{ 
				nParms = es[1].asisNumber().int32Value();
				if (es.length > 2)
					nPparms = es[2].asisNumber().int32Value();
				continue; 
			}
			if (sym == Symbol.VARGS)
			{
				flVargs = true;
				if (es.length == 1)
					continue;
			}

			Name[] vars = new Name[es.length - 1];
			for (int j = 1; j < es.length; j++)
				vars[j - 1] = es[j].asisNameType();

			if (sym == Symbol.ARGS)
				args = vars;
			else if (sym == Symbol.VARGS)
				vargs = vars;
		}
		if (nParms < 0 && args != _emptyNames && !flVargs)
			nParms = args.length;

		// Prepare a HashMap of the variables.
		int sz = args.length + vargs.length;
		if (sz > 0)
		{
			_vars = new HashMap(sz, 1.0f);
			int idx = 0;
			for (Name n : args)
				_vars.put(n.symbol(), Name.newVariable(n, this, idx++));
			for (Name n : vargs)
				_vars.put(n.symbol(), Name.newVariable(n, this, idx++));
		}
		else
			_vars = null;
		
		_prec = prec; _args = args; _vargs = vargs; _nParms = nParms; _nPparms = nPparms;
	}

	// Note that _parmCount sets the number of parameters that the pipeline
	// requires. -1 indicates that all available will be accepted.
	private final int			_prec;
	private final Name[]		_args;
	private final Name[]		_vargs;
	private final int			_nParms;
	private final int			_nPparms;

	private final HashMap<Symbol,Variable> _vars;

	public final Name[] args()				{ return (_args); }
	public final Name[] vargs()				{ return (_vargs); }
	public final int precedence()			{ return (_prec); }

	public final int nVars()				{ return (_vars == null ? 0 : _vars.size()); }
	public final int nArgs()				{ return (_args.length); }

	public final boolean hasVars()			{ return (_vars != null); }
	public final boolean hasArgs()			{ return (_args != _emptyNames || _vargs.length > 0); }
	public final boolean hasVargs()			{ return (_vargs.length > 0); }

	public final int parmCount()			{ return (_nParms); }
	public final int pfxParmCount()			{ return (_nPparms); }

	@Override
	public final Variable bindName(Name.Unbound name)
	{ 
		if (_vars == null)
			return (null);
		return (_vars.get(name.symbol())); 
	}
	
	@Override
	public final PipeRistics ristic()
		{ return (this); }

	@Override
	public List risticReduce(Context ctxt, List parms)
		throws YagaException
	{  
		boolean flHaveRoot = ctxt.isRootVariableBinder() && !parms.elements().hasVariables();
		int nBinders = 1;
		ctxt.pushVariableBinder(this);
		try
		{ 
			List[] es = parms.elements().asExpandedArray(ctxt);
			Variable.PipeVariable[] vars = bindPipelineElements(ctxt, (es = Arrays.copyOf(es, es.length)));
			nBinders += vars.length;
			Pipeline pipe = newPipeline(es, vars, flHaveRoot, parms.parserPoint()); 
			for (Variable.PipeVariable v : vars)
				v.setPipeline(pipe);
			ctxt.popVariableBinders(nBinders);
			return (pipe);		
		}
		catch (Throwable t)
			{ ctxt.popVariableBinders(nBinders); throw t; }
	}

	protected abstract Pipeline newPipeline(List[] es, Variable.PipeVariable[] sinks, boolean flHaveRoot, ParserPoint point); 

	private Variable.PipeVariable[] bindPipelineElements(Context ctxt, List[] parms)
		throws YagaException
	{
		ArrayList<Variable.PipeVariable> vars = new ArrayList();
		int idx = _vars == null ? 0 : _vars.size();
		try
		{ 
			for (int i = 0; i < parms.length; i++)
			{
				List e = parms[i] = parms[i].bind(ctxt);
				Variable.PipeVariable v = null;
				if (!e.isName() || (v = e.asisName().asPipeVariable(this, idx)) == null)
					continue;
				for (Variable.PipeVariable vv : vars)
					if (vv.symbol() == v.symbol())
					{
						ctxt.addBindError(v, "Duplicate pipe variable in pipeline");
						throw new BindException(ctxt);
					}
				// Have an unbound name so we can setup a sink.
				// Note that we push a normal variable for future reference.
				vars.add(v); parms[i] = v;
				ctxt.pushVariableBinder(Name.newVariable(v, this, idx));
				idx++;
			}
			return (vars.isEmpty() ? _noPipeVars : vars.toArray(new Variable.PipeVariable[vars.size()]));
		}
		catch (Throwable t)
			{ ctxt.popVariableBinders(vars.size()); throw t; }
	}

	public void printVars(StringBuilder sb)
	{
		if (_nParms >= 0 && 
			((_args == _emptyNames) || _nParms != _args.length || _nPparms > 0))
		{
			sb.append(" (#nparms ").append(Integer.toString(_nParms));
			if (_nPparms > 0)
				sb.append(' ').append(Integer.toString(_nPparms));
			sb.append(')');
		}
		printVars(sb, Symbol.ARGS, _args);
		printVars(sb, Symbol.VARGS, _vargs);
	}

	private void printVars(StringBuilder sb, Symbol type, Name syms[])
	{
		if (syms == null || syms == _emptyNames)
			return;
		sb.append(" (#").append(type.asjString());
		for (Name sym : syms)
			sb.append(' ').append(sym.asjString());
		sb.append(')');
	}
	
	static protected void checkPipeOptions(Context ctxt, boolean flBind, Elements elements, List source)
		throws YagaException
	{
		ArrayList<Error> errors = new ArrayList();
		ArrayList<Symbol> vars = null;
		boolean flPrec = false, flArgs = false, flVargs = false,
				flPargs = false, flParms = false;
		List eParms = Lists.nil(), ePparms = Lists.nil(); 
		List[] esi = elements.asArray();
		int nArgs = esi.length;
		for (List e : esi)
		{
			if (e.isAtomic())
			{
				if (flPrec)
					errors.add(new Error(e, "Precedence has already been defined"));
				else if (!e.isNumber())
					errors.add(new Error(e, "Invalid precedence for pipeline ristic"));
				else if (e.asisNumber().int32Value() < 0)
					errors.add(new Error(e, "Precedence cannot be negative"));
				if (flBind)
					errors.add(new Error(e, "Precedence not valid for binding pipeline ristic"));
				else
					flPrec = true;
				continue;
			}
			List[] es = e.elements().asExpandedArray(ctxt);
			if (es.length == 0)
			{
				errors.add(new Error(e, "Option list is empty"));
				continue;
			}
			e = es[0];
			if (!e.isSymbol())
				errors.add(new Error(e, "Invalid option " + e));
			else
			{
				if (checkOption(flArgs, e, Symbol.ARGS, errors))
					{ flArgs = true; nArgs = es.length; }
				else if (checkOption(flVargs, e, Symbol.VARGS, errors))
				{
					flVargs = true;
					if (es.length == 1)
						continue;		// Have only signalled that we can have vargs
					if (es.length > 2)
						errors.add(new Error(e, "Only one optional variable required for #vargs"));
				}
				else if (checkOption(flParms, e, Symbol.NPARMS, errors))
				{
					if (es.length == 1 || es.length > 3)
						errors.add(new Error(e, "Only parameter count and optional prefix parameter count required for #nparms"));
					if (!(eParms = es[1]).isNumber())
						errors.add(new Error(es[1], "Invalid parameter count for #nparms"));
					if (es[1].asisNumber().int32Value() < 0)
						errors.add(new Error(es[1], "#nparms parameter count cannot be negative"));
					if (es.length > 2)
					{
						if (!(ePparms = es[2]).isNumber())
							errors.add(new Error(es[2], "Invalid prefix parameter count for #nparms"));
						if (es[2].asisNumber().int32Value() < 1)
							errors.add(new Error(es[2], "#nparms prefix parameter count must be greater than zero"));
						if (flBind)
							errors.add(new Error(es[2], "#nparms prefix parameter count is not valid for binding pipeline ristic"));
					}
					flParms = true;
					continue;
				}
				else
					errors.add(new Error(e, "Invalid option list type"));
			}

			if (vars == null)
				vars = new ArrayList();
			for (int j = 1; j < es.length; j++)
			{
				if (!es[j].isNameType())
					{ errors.add(new Error(es[j], "Invalid variable name")); continue; }
				Symbol sym = es[j].getNameSymbol();
				if (vars.contains(sym))
					errors.add(new Error(es[j], "Variable has aleady been declared"));
				vars.add(sym);
			}
		}
		if (flArgs && flParms && eParms.asisNumber().int32Value() < nArgs - 1)
			errors.add(new Error(eParms, "Parameter count is less than argument count"));
		if (flPargs && (!flArgs || ePparms.asisNumber().int32Value() > nArgs - 1))
			errors.add(new Error(ePparms, "Prefix argument count is greater than argument count"));
		
		if (!errors.isEmpty())
			throw new RisticValidationException(source, elements, errors.toArray(new Error[errors.size()]));
	}
	
	static private boolean checkOption(boolean fl, List e, Symbol match, ArrayList<Error> errors)
		throws YagaException
	{
		if (e.asisSymbol().symbol() != match)
			return (false);
		if (fl)
			errors.add(new Error(e, String.format("Duplicate option '%s'", match.asjString())));
		return (true);
	}
}

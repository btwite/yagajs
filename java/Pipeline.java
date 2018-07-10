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
 *	Container of elements which can be evaluated by the pipeline rule:
 *			ei -> (e1 e2 e3 ...) => 
 *				ei -> e1 -> ei1 -> (e2 e3 ...) =>
 *				ei1 -> e2 -> ei2 -> (e3 ...) =>
 *				ei2 -> e3 -> ei3 -> (...) =>
 *				er
 *		where ei is an input list to a sub-pipeline or primitive. 
 *		e1,e1,e3 maybe also be any production or list which will discard the ei '
 *		and answer itself or a new ei to be passed on.
 *		er is the resultant element.
 */
package yaga.core;

import java.util.Arrays;
import yaga.core.exceptions.BinderException;
import yaga.core.exceptions.EvaluateException;
import yaga.core.exceptions.YagaException;
import yaga.core.ristic.BindpipeRistic;
import yaga.core.ristic.PipeRistic;
import yaga.core.ristic.PipeRistics;
import yaga.core.ristic.Ristic;

/**
 *
 * @author Bruce
 */
public class Pipeline extends Container
	implements Productive
{
	static final public int DefaultPrecedence = 100;
			
	public Pipeline(PipeRistics ristic, Elements e, Variable.PipeVariable[] vars, boolean flIsRoot, ParserPoint point)
		{ super(e, point); _ristic = ristic; _vars = vars; _flIsRoot = flIsRoot; }

	private final PipeRistics				_ristic;
	private final boolean					_flIsRoot;
	private final Variable.PipeVariable[]	_vars;
	
	protected final Variable.PipeVariable[] vars()
		{ return (_vars); }
	
	@Override
	public int precedence()
		{ return (_ristic.precedence()); }
	
	public final boolean isRoot()
		{ return (_flIsRoot); }
	
	protected final PipeRistics ristic()
		{ return (_ristic); }
	
	protected final boolean hasVars()
		{ return (_ristic.hasVars() || _vars.length > 0); }
	
	@Override
	public List bindingStep(Context ctxt, List parms)
		throws YagaException
		{  return (Frame.dispatch(ctxt, this, () -> _elements.bindPipeStep(ctxt, parms), parms)); }
	
	@Override
	public List bindingStep(Context ctxt, Frame.Reference r, List parms)
		throws YagaException
		{  return (r.frame().dispatch(ctxt, () -> bindingStep(ctxt, parms))); }

	@Override
	public List step(Context ctxt, List parms)
		throws YagaException
		{  return (Frame.dispatch(ctxt, this, () -> _elements.pipeStep(ctxt, parms), parms)); }
	
	@Override
	public List step(Context ctxt, Frame.Reference r, List parms)
		throws YagaException
		{  return (r.frame().dispatch(ctxt, () -> step(ctxt, parms))); }
	
	@Override
	public boolean isPipeline()		{ return (true); }
	@Override
	public Pipeline asisPipeline()	{ return (this); }
		
	@Override
	public boolean isProductive()
		{ return (true); }
	@Override
	public Productive asisProductive()
		{ return (this); }
	@Override
	public boolean isStepProductive()
		{ return (true); }
	
	@Override
	public List appendList(List e)	
		{ return (new Pipeline(_ristic, _elements.append(e), _vars, _flIsRoot, _point)); }

	@Override
	public Production.Map mapExecute(Context ctxt, List[] esi, int iep, int ies, int iee)
		throws BinderException
	{
		List ep = esi[iep];
		int nPrefix = iep - ies, nPostfix = iee - iep;
		int nParms = nPrefix + nPostfix; int nPipeParms = ristic().parmCount();

		// Reduce the prefix parameters to the prefix parameter count.
		int nPparms = ristic().pfxParmCount();
		if (nPparms >= 0 && nPparms != nPrefix)
		{
			int diff = nPrefix - nPparms;
			if (diff < 0)
				throw new BinderException(ctxt, "Insufficient prefix parameters for Pipeline");
			ies += diff; nParms -= diff;
		}
		if (nPipeParms > nParms)
			throw new BinderException(ctxt, "Insufficient parameters for Pipeline");

		return (finaliseMap(ctxt, esi, iep, ies, iee, ep, nParms, nPipeParms, nPparms));
	}
	
	@Override
	public Production.Map mapStep(Context ctxt, List[] esi, int iep)
		throws BinderException
	{
		List ep = esi[iep];
		int nPrefix = iep, nPostfix = esi.length - (iep + 1);
		int nParms = nPrefix + nPostfix; 
		int nPipeParms = _ristic.parmCount(); int nPparms = _ristic.pfxParmCount();
		List[] tplate = new List[nPipeParms < 0 ? nParms : nPipeParms];
		
		// Reduce the prefix parameters to the prefix parameter count.
		int nNone = 0, nPfxNone = 0;
		if (nPparms >= 0 && nPparms != nPrefix)
		{
			int diff = nPrefix - nPparms;
			if (diff < 0)
			{
				Arrays.fill(tplate, 0, (nPfxNone = nNone = Math.abs(diff)), AtomNone.VALUE);
				nParms += nPfxNone;
			}
			else
				throw new BinderException(ctxt, "Too many prefix parameters for Pipeline");
		}
		if (nPipeParms > nParms)
		{
			nNone += nPipeParms - nParms;
			Arrays.fill(tplate, nParms, tplate.length, AtomNone.VALUE);
		}
		
		// Check the parms array for parameter positions set to None and
		// allocate a Partial if we don't have all the parameters.
		for (List e : esi)
			if (e.isNone())
				nNone++;
		if (nNone > 0)
		{
			System.arraycopy(esi, 0, tplate, nPfxNone, iep);
			System.arraycopy(esi, iep + 1, tplate, nPfxNone + iep, esi.length - (iep + 1));
			return (new Production.Map(new Step(this, esi[iep], tplate, nNone), esi[iep], esi, tplate, iep));
		}
		return (finaliseMap(ctxt, esi, iep, 0, esi.length - 1, ep, nParms, -1, nPrefix));
	}

	protected final Production.Map finaliseMap(Context ctxt, List[] esi, int iep, int ies, int iee, 
											   List ep, int nParms, int nPipeParms, int nPparms)
	{
		if (nPipeParms >= 0)
		{
			// Adjust the end and or start of the parameter sequence if we have 
			// to many parameters
			if (nPipeParms < nParms)
			{
				int diff = nParms - nPipeParms;
				if (nPparms < 0 && ies < iep)
				{
					if (iep - ies > diff)
						{ ies += diff; diff = 0; }
					else
						{ ies = iep; diff -= (iep - ies); }
				}
				if (diff > 0)
					iee -= diff;
			}
			nParms = nPipeParms;
		}
		
		// Allocate the parameters array
		List parms[];
		if (nParms == 0)
			parms = Elements.EmptyArray;
		else
		{
			parms = new List[nParms];
			if (ies < iep)
				System.arraycopy(esi, ies, parms, 0, iep - ies);
			if (iee > iep)
				System.arraycopy(esi, iep + 1, parms, iep - ies, iee - iep);
		}
		
		// Compress the original element array to remove the parameters
		List[] es = new List[esi.length - nParms];
		if (ies > 0)
			System.arraycopy(esi, 0, es, 0, ies);
		if (iee < (esi.length - 1))
			System.arraycopy(esi, iee + 1, es, ies + 1, esi.length - (iee + 1));
		return (new Production.Map(this, ep, es, parms, ies));
	}

	@Override
	public void print(StringBuilder sb) 
	{
		sb.append("(("); 
		Ristic.risticClassName(sb, PipeRistic.class).append(' ').append(Integer.toString(precedence()));
		_ristic.printVars(sb); sb.append(") "); 
		Lists.printElements(sb, _elements); sb.append(")");
	}

	@Override
	public void xprint(StringBuilder sb) 
	{
		sb.append("((");
		Ristic.risticClassName(sb, PipeRistic.class).append(' ').append(Integer.toString(precedence()));
		_ristic.printVars(sb); sb.append(") "); 
		Lists.xprintElements(sb, _elements); sb.append(")");
	}
	
	static public class Binding extends Pipeline
	{
		public Binding(PipeRistics ristic, Elements e, Variable.PipeVariable[] sinks, boolean flIsRoot, ParserPoint point)
			{ super(ristic, e, sinks, flIsRoot, point); }

		@Override
		public List step(Context ctxt, List parameters)
			throws YagaException
			{  return (this); }

		@Override
		public List step(Context ctxt, Frame.Reference r, List parameters)
			throws YagaException
			{  return (r); }

		@Override
		public boolean isBindingPipeline()		{ return (true); }
		@Override
		public Pipeline.Binding asisBindingPipeline()	{ return (this); }
		
		@Override
		public boolean isProductive()
			{ return (false); }
		@Override
		public Productive asisProductive()
			{ return (null); }
		@Override
		public boolean isStepProductive()
			{ return (false); }

		@Override
		public List appendList(List e)	
			{ return (new Binding(ristic(), _elements.append(e), vars(), isRoot(), _point)); }

		@Override
		public void print(StringBuilder sb) 
		{
			sb.append("(("); Ristic.risticClassName(sb, BindpipeRistic.class);
			ristic().printVars(sb); sb.append(") "); 
			Lists.printElements(sb, _elements); sb.append(")");
		}

		@Override
		public void xprint(StringBuilder sb) 
		{
			sb.append("(("); Ristic.risticClassName(sb, BindpipeRistic.class);
			ristic().printVars(sb); sb.append(") "); 
			Lists.xprintElements(sb, _elements); sb.append(")");
		}
	}
	
	static public class Step extends Pipeline
	{
		public Step(Pipeline pipe, List ePipe, List[] parms, int nNone)
		{ 
			super(pipe.ristic(), pipe.elements(), pipe.vars(), pipe.isRoot(), pipe.parserPoint()); 
			_parms = parms; _nNone = nNone; _ePipe = ePipe;
		}
		
		private final List[]	_parms;
		private final int		_nNone;
		private final List		_ePipe;
		
		@Override
		public boolean isProductive()
			{ return (false); }
		@Override
		public boolean isStep()
			{ return (true); }
		@Override
		public Pipeline.Step asisStep()
			{ return (this); }
	
		@Override
		public List bindingStep(Context ctxt, List parms)
			throws YagaException
			{ return (doStep(parms, (p) -> Frame.dispatch(ctxt, this, () -> _elements.bindPipeStep(ctxt, p), p))); }

		@Override
		public List bindingStep(Context ctxt, Frame.Reference r, List parms)
			throws YagaException
		 	{  return (r.frame().dispatch(ctxt, () -> doStep(parms, (p) -> bindingStep(ctxt, p)))); }

		@Override
		public List step(Context ctxt, List parms)
			throws YagaException
			{ return (doStep(parms, (p) -> Frame.dispatch(ctxt, this, () -> _elements.pipeStep(ctxt, p), p))); } 

		@Override
		public List step(Context ctxt, Frame.Reference r, List parms)
			throws YagaException
			{ return (r.frame().dispatch(ctxt, () -> doStep(parms, (p) -> step(ctxt, p)))); }
		
		private interface DoStepFn
			{ public List run(List parms) throws YagaException; }
		private List doStep(List newParms, DoStepFn fn)
			throws YagaException
		{
			List[] es = newParms.elements().asArray();
			if (es.length == 0)
			{
				if (_nNone > 0)
					return (this);
				return (fn.run(Lists.newData(Elements.make(_parms, this), newParms.parserPoint())));
			}
			List[] parms = Arrays.copyOf(_parms, _parms.length);
			int nFill = fillStep(es, parms); 
			if (nFill < _nNone)
				return (new Step(this, _ePipe, parms, _nNone - nFill));
			return (fn.run(Lists.newData(Elements.make(parms, this), newParms.parserPoint())));
		}
		
		@Override
		public Production.Map mapStep(Context ctxt, List[] esi, int iep)
			throws BinderException
		{
			if (esi.length == 1)
				return (new Production.Map(this, esi[iep], esi, _parms, iep));
			try
			{ 
				List[] es = new List[esi.length - 1];
				System.arraycopy(esi, 0, es, 0, iep);
				System.arraycopy(esi, iep + 1, es, iep, esi.length - (iep + 1));
				List[] parms = Arrays.copyOf(_parms, _parms.length);
				int nFill = fillStep(es, parms); 
				return (new Production.Map(new Step(this, _ePipe, parms, _nNone - nFill), _ePipe, esi, es, iep));
			}
			catch (Exception x)
				{ throw new BinderException(ctxt, x.toString(), x); }
		}
		
		private int fillStep(List[] esi, List[] eso)
			throws YagaException
		{
			if (esi.length > _nNone)
				throw new EvaluateException(EvaluateException.ErrorType.PIPELINE, this, "Too many parameters for stepped Pipeline");
			int nFill = 0;
			for (int i = 0, j = 0; i < eso.length && j < esi.length; i++)
			{
				if (esi[j].isNone())
					{ j++; i--; continue; }
				if (eso[i].isNone())
					{ eso[i] = esi[j++]; nFill++; }
			}
			return (nFill);
		}

		@Override
		public List evaluate(Context ctxt)
			throws YagaException
			{ return (step(ctxt, Lists.nil())); }

		@Override
		public List evaluate(Context ctxt, Frame.Reference r)
			throws YagaException
			{ return (step(ctxt, r, Lists.nil())); }

		@Override
		public List bindingEvaluate(Context ctxt)
			throws YagaException
			{ return (bindingStep(ctxt, Lists.nil())); }

		@Override
		public List bindingEvaluate(Context ctxt, Frame.Reference r)
			throws YagaException
			{ return (bindingStep(ctxt, r, Lists.nil())); }

		@Override
		public List reduce(Context ctxt)
			throws YagaException
		{ 
			if (_nNone > 0)
				return (this);
			return (step(ctxt, Lists.nil()).reduce(ctxt));
		}

		@Override
		public List reduce(Context ctxt, Frame.Reference r)
			throws YagaException
		{ 
			if (_nNone > 0)
				return (this);
			return (step(ctxt, r, Lists.nil()).reduce(ctxt));
		}
		
		@Override
		public void print(StringBuilder sb) 
			{ doPrint(sb, (e) -> e.print(sb)); }

		@Override
		public void xprint(StringBuilder sb) 
			{ sb.append("[Step]"); doPrint(sb, (e) -> e.xprint(sb)); }
		
		private interface DoPrintFn
			{ public void run(List e); }
		private void doPrint(StringBuilder sb, DoPrintFn fn)
		{
			sb.append("( "); 
			int nPfx = Math.max(ristic().pfxParmCount(), 0);
			int i = 0;
			if (nPfx > 0)
			{
				// Skip leading parameters that are None
				while (i < nPfx && _parms[i].isNone())
					i++;
				for (; i < nPfx; i++)
					{ fn.run(_parms[i]); sb.append(' '); }
			}
			fn.run(_ePipe); sb.append(' ');
			int j = _parms.length - 1;
			// Skip trailing parameters that are None
			while (j >= i && _parms[j].isNone())
				j--;
			for (; i <= j; i++)
				{ fn.run(_parms[i]); sb.append(' '); }
			sb.append(')'); 
		}
	}
}

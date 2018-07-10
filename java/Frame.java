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
 *  Defines the execution frame for an evaluation path. A frame is created
 *  each time a pipeline is evaluated and the pipeline requires variable and
 *  arguments support.
 */
package yaga.core;

import java.util.Arrays;
import yaga.core.exceptions.CastException;
import yaga.core.exceptions.EvaluateException;
import yaga.core.exceptions.FrameException;
import yaga.core.exceptions.YagaException;
import yaga.core.ristic.PipeRistics;

public class Frame
{
	static public Frame DUMMY = new Frame();
	
	static public List dispatch(Context ctxt, Pipeline pipe, Frame.Dispatch fn, List parms)
		throws YagaException
	{
		if (!pipe.hasVars())
			return (fn.run());
		Frame frame = new Frame(ctxt, pipe.isRoot() ? null : ctxt.currentFrame(), pipe, parms);
		return (frame.dispatch(ctxt, fn));
	}
	
	private Frame()
		{ _pipe = null; _ristic = null; _parent = null; _vars = null; }
	
	public Frame(Context ctxt, Pipeline pipe, List parms)
		throws YagaException
		{ this(ctxt, null, pipe, parms); }

	public Frame(Context ctxt, Frame parent, Pipeline pipe, List parms)
		throws YagaException
	{ 
		_pipe = pipe; _ristic = pipe.ristic(); _parent = parent;

		// Map the parameters to variable slots. Add one at the end for the answer.
		// This may be unused if a variable has been declared.
		_vars = new List[_ristic.nVars() + pipe.vars().length + 1];
		List[] es = parms.elements().asArray();
		int iVars = 0;
		if (_ristic.hasArgs())
		{
			int nArgs = _ristic.nArgs(), nParms = _ristic.parmCount();
			if (nArgs > es.length || nParms > es.length)
				throw new EvaluateException(EvaluateException.ErrorType.PIPELINE, parms, "Insufficient parameters");
			for (; iVars < nArgs; iVars++)
				_vars[iVars] = es[iVars];
			if (_ristic.hasVargs())
			{
				_vars[iVars] = iVars == 0 ? 
						parms : Lists.newData(Arrays.copyOfRange(es, iVars, es.length), parms.parserPoint());
				iVars++;
			}
			if (nParms >= 0 && nParms < es.length)
				throw new EvaluateException(EvaluateException.ErrorType.PIPELINE, parms, "Too many parameters");
		}
		for (; iVars < _vars.length; iVars++)
			_vars[iVars] = null;
	}

	private final Frame				_parent;
	private final Pipeline			_pipe;
	private final PipeRistics		_ristic;
	private final List[]			_vars;
	
	public List readVariable(Context ctxt, Variable var)
		throws YagaException
	{
		if (var.ristic() == _ristic)
		{
			List e = _vars[var.index()]; 
			if (e == null)
				throw new FrameException(var, "Variable '" + var.asjString() + "' has not been assigned");
			return (e);
		}
		if (_parent == null)
			throw new FrameException.Read(var, "Variable '" + var.asjString() + "' not found in frame path");
		return (_parent.readVariable(ctxt, var));
	}
	
	public List readInjectingVariable(Context ctxt, Variable var)
		throws YagaException
	{
		List e = readVariable(ctxt, var);
		if (e.isInjectable() || e.isAtomic())
			return (e);
		return (new Data.Injection(e.reduce(ctxt).elements(), e.parserPoint()));
	}
	
	public List writeVariable(Context ctxt, Variable var, List e)
		throws YagaException
	{
		if (var.ristic() == _ristic)
		{
			if (_vars[var.index()] != null)
				throw new FrameException(var, "Variable '" + var.asjString() + "' is immutable");
			_vars[var.index()] = e;
			return (e); 
		}
		if (_parent == null)
			throw new FrameException.Write(var, e, "Variable '" + var.asjString() + "' not found in frame path");
		return (_parent.writeVariable(ctxt, var, e));
	}
	
	public List setPipeVariable(Context ctxt, Variable.PipeVariable var, List e)
		throws YagaException
	{
		if (_pipe != var.pipe())
			throw new EvaluateException(EvaluateException.ErrorType.PIPELINE, var, "Invalid pipeline for pipe variable");
		if (_vars[var.index()] != null)
			throw new FrameException(var, "Pipe Variable '" + var.asjString() + "' is immutable");
		_vars[var.index()] = e;
		return (e); 
	}

	
	public interface Dispatch
		{ public List run() throws YagaException; }
	public List dispatch(Context ctxt, Dispatch fn)
		throws YagaException
	{
		ctxt.pushFrame(this);
		try
		{
			List result = fn.run().asFrameReference(ctxt, this);
			ctxt.popFrame();
			return (result);
		}
		catch (Throwable t)
			{ ctxt.popFrame(); throw t; }
	}

	public interface Dispatch_Map
		{ public Production.Map run() throws YagaException; }
	public Production.Map dispatch(Context ctxt, Dispatch_Map fn)
		throws YagaException
	{
		ctxt.pushFrame(this);
		try
		{
			Production.Map map = fn.run();
			ctxt.popFrame();
			return (map);
		}
		catch (Throwable t)
			{ ctxt.popFrame(); throw t; }
	}
	
	public void trace(String msg)
	{
		if (_parent == null)
		{
			_pipe.trace("[Root]" + msg);
			return;
		}
		_pipe.trace(msg);
	}

	// Frame.Reference allows return elements to be wrapped with a supporting
	// frame where the List may have a dependency on variable references.
	static public class Reference extends List
	{
		public Reference(Frame frame, List e)
			{ super(e.parserPoint()); _frame = frame; _binding = e; }
			
		private final Frame	_frame;
		private final List  _binding;

		public final Frame frame()
			{ return (_frame); }
		
		public Reference clone(List e)
			{ return (new Reference(_frame, e)); }

		@Override
		public List parse(Context ctxt)
			throws YagaException
			{ return (_frame.dispatch(ctxt, () -> _binding.parse(ctxt))); }

		@Override
		public List bind(Context ctxt)
			throws YagaException
			{ return (_binding.bind(ctxt, this)); }
		@Override
		public List bind(Context ctxt, Frame.Reference r)
			throws YagaException
			{ throw new UnsupportedOperationException("Not Supported: " + this); }

		@Override
		public List step(Context ctxt)
			throws YagaException
			{ return (_binding.step(ctxt, this)); }
		@Override
		public List step(Context ctxt, Frame.Reference r)
			throws YagaException
			{ throw new UnsupportedOperationException("Not Supported: " + this); }

		@Override
		public List step(Context ctxt, List parms)
			throws YagaException
			{ return (_binding.step(ctxt, this, parms)); }
		@Override
		public List step(Context ctxt, Frame.Reference r, List parms)
			throws YagaException
			{ throw new UnsupportedOperationException("Not Supported: " + this); }

		@Override
		public List bindingStep(Context ctxt)
			throws YagaException
			{ return (_binding.bindingStep(ctxt, this)); }
		@Override
		public List bindingStep(Context ctxt, Frame.Reference r)
			throws YagaException
			{ throw new UnsupportedOperationException("Not Supported: " + this); }

		@Override
		public List bindingStep(Context ctxt, List parms)
			throws YagaException
			{ return (_binding.bindingStep(ctxt, this, parms)); }
		@Override
		public List bindingStep(Context ctxt, Frame.Reference r, List parms)
			throws YagaException
			{ throw new UnsupportedOperationException("Not Supported: " + this); }

		@Override
		public List evaluate(Context ctxt)
			throws YagaException
			{ return (_binding.evaluate(ctxt, this)); }
		@Override
		public List evaluate(Context ctxt, Frame.Reference r)
			throws YagaException
			{ throw new UnsupportedOperationException("Not Supported: " + this); }

		@Override
		public List bindingEvaluate(Context ctxt)
			throws YagaException
			{ return (_binding.bindingEvaluate(ctxt, this)); }
		@Override
		public List bindingEvaluate(Context ctxt, Frame.Reference r)
			throws YagaException
			{ throw new UnsupportedOperationException("Not Supported: " + this); }

		@Override
		public List reduce(Context ctxt)
			throws YagaException
			{ return (_binding.reduce(ctxt, this)); }
		@Override
		public List reduce(Context ctxt, Frame.Reference r)
			throws YagaException
			{ throw new UnsupportedOperationException("Not Supported: " + this); }

	
		@Override
		public List zeroValue()
			throws YagaException
			{ return (_binding.zeroValue()); }

		@Override
		public boolean isAtomic()				 
			{ return (_binding.isAtomic()); }
		@Override
		public boolean isBound()				 
			{ return (_binding.isBound()); }
		@Override
		public boolean isTrivial()				 
			{ return (_binding.isTrivial()); }
		@Override
		public boolean isReducible() 
			{ return (true); }
		@Override
		public boolean canEvaluate()
			{ return (_binding.canEvaluate()); }
		@Override
		public boolean hasVariables()
			{ return (_binding.hasVariables()); }
		
		@Override
		public boolean isInjectable()
			{ return (_binding.isInjectable()); }
		
		@Override
		public List asFrameReference(Context ctxt, Frame frame)
			throws YagaException
		{
			if (_binding.isTrivial())
				return (_binding);
			return (this);
		}
		
		@Override
		public List asFrameReference(Context ctxt, Frame.Reference r) throws YagaException
			{  return (this); }

		@Override
		public final List asParameterList(Context ctxt)
			throws YagaException
			{ return (_binding.asParameterList(ctxt).propagateReference(ctxt, this)); }

		@Override
		public boolean isExpression()
			{ return (_binding.isExpression()); }

		@Override
		public boolean isProduction()
			{ return (_binding.isProduction()); }
		
		@Override
		public boolean isProductive()
			{ return (_binding.isProductive()); }
		@Override
		public Productive asisProductive()
			{ return (_binding.asisProductive()); }
		@Override
		public boolean isStepProductive()
			{ return (_binding.isStepProductive()); }
		@Override
		public boolean isStep()
			{ return (_binding.isStep()); }
		@Override
		public Pipeline.Step asisStep()
			{ return (_binding.asisStep()); }

		@Override
		public boolean isPipeline()
			{ return (_binding.isPipeline()); }
		@Override
		public Pipeline asisPipeline()
			{ return (_binding.asisPipeline()); }

		@Override
		public boolean isBindingPipeline()
			{ return (_binding.isBindingPipeline()); }
		@Override
		public Pipeline.Binding asisBindingPipeline()
			{ return (_binding.asisBindingPipeline()); }

		@Override
		public boolean isRistic()
			{ return (_binding.isRistic()); } 
		@Override
		public List risticDo(Context ctxt, RisticDo fn)
			throws YagaException
			{ return (_frame.dispatch(ctxt, () -> _binding.risticDo(ctxt, fn))); } 

		@Override
		public boolean isNumber()
			{ return (_binding.isNumber()); }
		@Override
		public AtomNumber asNumber() throws CastException
			{ return (_binding.asNumber()); } 
		@Override
		public AtomNumber asisNumber()
			{ return (_binding.asisNumber()); }
	
		@Override
		public boolean isChar()
			{ return (_binding.isChar()); }
		@Override
		public AtomChar asisChar()
			{ return (_binding.asisChar()); }

		@Override
		public boolean isString()
			{ return (_binding.isString()); }
		@Override
		public AtomString asisString()
			{ return (_binding.asisString()); }

		@Override
		public boolean isSymbol()
			{ return (_binding.isSymbol()); }
		@Override
		public AtomSymbol asisSymbol()
			{ return (_binding.asisSymbol()); }

		@Override
		public boolean isName()
			{ return (_binding.isName()); }
		@Override
		public Name asisName() throws YagaException
			{ return (_binding.asisName()); }
		@Override
		public Variable asisVariable()
			{ return (_binding.asisVariable()); }

		@Override
		public boolean isNameType()
			{ return (_binding.isNameType()); }
		@Override
		public Name asisNameType() throws YagaException
			{ return (_binding.asisNameType()); }
		@Override
		public Name getNameType(Context ctxt) throws YagaException
			{ return (_binding.getNameType(ctxt)); }
		@Override
		public Symbol reduceSymbolType(Context ctxt) throws YagaException
			{ return (_binding.reduceSymbolType(ctxt)); }
		@Override
		public Symbol getNameSymbol()
			{ return (_binding.getNameSymbol()); }

		@Override
		public List resolveVariable(Context ctxt) throws YagaException
		{ 
			if (!_binding.isBoundName() || _binding.asisBoundName().isDefine())
				return (this);
			
			ctxt.pushFrame(_frame);
			try
			{
				List result = _binding.resolveVariable(ctxt);
				ctxt.popFrame();
				return (result);
			}
			catch (Throwable t)
				{ ctxt.popFrame(); throw t; }
		}

		@Override
		public boolean isUnboundName()					
			{ return (_binding.isUnboundName()); }
		@Override
		public Name.Unbound asisUnboundName()		
			{ return (_binding.asisUnboundName()); }

		@Override
		public boolean isBoundName()					
			{ return (_binding.isBoundName()); }
		@Override
		public Name.Bound asisBoundName()			
			{ return (_binding.asisBoundName()); }

		@Override
		public boolean isNamespace()
			{ return (_binding.isNamespace()); }
		@Override
		public AtomNamespace asNamespace() throws CastException
			{ return (_binding.asNamespace()); } 
		@Override
		public AtomNamespace asisNamespace()
			{ return (_binding.asisNamespace()); }

		@Override
		public boolean isComment()
			{ return (_binding.isComment()); }

		@Override
		public boolean isAlias()
			{ return (_binding.isAlias()); }
		@Override
		public List dealias(Context ctxt) throws YagaException
			{ return (_frame.dispatch(ctxt, () -> _binding.dealias(ctxt))); }

		@Override
		public boolean isTrue()
			{ return (_binding.isTrue()); }
		@Override
		public boolean isFalse()
			{ return (_binding.isFalse()); }
		@Override
		public boolean isUnknown()
			{ return (_binding.isUnknown()); }
		@Override
		public boolean isTrivalent()
			{ return (_binding.isTrivalent()); }

		@Override
		public Elements elements()
			{ return (_binding.elements()); }
		@Override
		public List element(int idx)
			{ return (_binding.element(idx)); }
		@Override
		public int length()
			{ return (_binding.length()); }
		
		@Override
		public boolean isEmpty()
			{ return (_binding.isEmpty()); }
		@Override
		public boolean isNil()
			{ return (_binding.isNil()); }
		@Override
		public boolean isContainer()
			{ return (_binding.isContainer()); }

		@Override
		public List headElement()
			{ return (_binding.headElement()); }
		@Override
		public final List tailElement()
			{ return (_binding.tailElement()); }
		@Override
		public List headSubList()
			{ return (_binding.headSubList()); }
		@Override
		public List tailSubList()
			{ return (_binding.tailSubList()); }
	
		@Override
		public List appendList(List e)	
			{ return (_binding.appendList(e)); }
		
		
		@Override
		public void print(StringBuilder sb) 
			{  _binding.print(sb);  }

		@Override
		public void xprint(StringBuilder sb) 
			{ sb.append("[ref:"); _frame._pipe.xprint(sb); sb.append(']'); _binding.xprint(sb); }
		
		@Override
		public List neg(Context ctxt)
			throws YagaException
			{ return (_binding.neg(ctxt)); }

		@Override
		public List add(Context ctxt, List e)
			throws YagaException
			{ return (_binding.add(ctxt, e)); }
		@Override
		public List sub(Context ctxt, List e)
			throws YagaException
			{ return (_binding.sub(ctxt, e)); }
		@Override
		public List mul(Context ctxt, List e)
			throws YagaException
			{ return (_binding.mul(ctxt, e)); }
		@Override
		public List div(Context ctxt, List e)
			throws YagaException
			{ return (_binding.div(ctxt, e)); }
		@Override
		public List rem(Context ctxt, List e)
			throws YagaException
			{ return (_binding.rem(ctxt, e)); }
	}
}

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
 *  Contains the base context required for binding and evaluating
 *	expressions. A separate context must exist for each thread of execution.
 *  A thread in this case could be logical or native. For example, expressions
 *  that are defined as concurrent may or maynot run in separate native threads,
 *	still require separate contexts to ensure consistency. The fork behaviour
 *  will create a separate instance of the current context.
 *
 *	A context can only have a single namespace at a time. Public namespaces
 *  are defined in the Core namespace. Private namespaces are created during
 *	binding and form a hierachy. Setting a new public namespace will force a
 *	change to the private namespace hierachy if it exists.
 */
package yaga.core;

import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.PrintStream;
import java.text.SimpleDateFormat;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Date;
import yaga.core.exceptions.BindException;
import yaga.core.exceptions.BinderException;
import yaga.core.exceptions.EvaluateException;
import yaga.core.exceptions.YagaException;

/**
 *
 * @author Bruce
 */
public class Context
{
	public Context()
	{
		_curNamespace = _publicNamespace = Namespace.core;
		_privateNamespace = null;
		_e = Lists.nil();
		_flowStack = new ArrayDeque();
		_frameStack = new ArrayDeque();
		_curFrame = Frame.DUMMY;
		_varBinders = new ArrayDeque();
		_bindErrors = new ArrayList();
	}

	private Context(Namespace publicNamespace, Namespace privateNamespace,
			        List e, ArrayDeque<List> flowStack,
					ArrayDeque<Frame> frameStack, Frame curFrame,
					ArrayDeque<VariableBinder> binders,
					ArrayList<Error> bindErrors)
	{
		_curNamespace = _publicNamespace = publicNamespace;
		if ((_privateNamespace = privateNamespace) != null)
			_curNamespace = privateNamespace;
		_e = e;
		_flowStack = flowStack.clone();
		_frameStack = frameStack.clone();
		_curFrame = curFrame;
		_varBinders = binders.clone();
		_bindErrors = (ArrayList<Error>)bindErrors.clone();
	}
	
	protected Namespace					_publicNamespace;
	protected Namespace					_privateNamespace;
	private Namespace					_curNamespace;
	protected List						_e;
	private final ArrayDeque<List>		_flowStack;
	private boolean						_flPhaseActive = false;
	private PrintStream					_logStream;
	private final ArrayDeque<Frame>		_frameStack;
	private Frame						_curFrame = null;

	public List element()
		{ return (_e); }
	
	public List bind(List e)
		throws BindException
		{ return ((List)runBind(e, () -> e.bind(this))); }

	public List step(List e)
		throws YagaException
		{  return (runOp(e, () -> e.step(this))); }
	
	public List evaluate(List e)
		throws YagaException
		{  return (runOp(e, () -> e.evaluate(this))); }
	
	public List reduce(List e)
		throws YagaException
		{ return (runOp(e, () -> e.reduce(this))); }
	
	public List[] bindParms(List exprs)
		throws YagaException
		{  return ((List[])runBind(exprs, () -> exprs.elements().bindParms(this))); }
	
	public List[] bindParms(List exprs, Elements elements)
		throws YagaException
		{  return ((List[])runBind(exprs, () -> elements.bindParms(this))); }
	
	public List[] evaluateBindParms(List parms)
		throws YagaException
	{
		// Used by ristics that can run in either Binding or Primitive mode
		return ((List[])runBind(parms, () -> parms.elements().evalBindParms(this)));
	}
	
	private void initialise(List e)
	{ 
		if (_flPhaseActive)
			return;
		_e = e; 
		_flowStack.clear(); 
		pushFlow(e);
		initBinder();
		_flPhaseActive = true; 
	}

	private interface RunOp
		{ public List run() throws YagaException; }
	private List runOp(List e, RunOp fn)
		throws YagaException
	{
		boolean flPhaseActive = _flPhaseActive;
		initialise(e);
		try 
			{ e = fn.run(); }
		catch (YagaException x)
			{ pushFlow(x.element()); _flPhaseActive = flPhaseActive; throw x; }
		catch (Exception x)
			{ _flPhaseActive = flPhaseActive; logException(x); throw x; }
		_flPhaseActive = flPhaseActive;
		return (e);
	}
	
	private interface RunBind
		{ public Object run() throws YagaException; }
	private Object runBind(List e, RunBind fn)
		throws BindException
	{
		Throwable rsn;
		boolean flPhaseActive = _flPhaseActive;
		initialise(e);
		try
		{  
			Object result = fn.run();
			if (hasBindErrors())
				throw new BindException(this);
			_flPhaseActive = flPhaseActive;
			return (result);
		}
		catch (BindException x) 
			{ _flPhaseActive = flPhaseActive; throw x;  }
		catch (YagaException x)
			{ rsn = x; addBindError(x.element(), x.getMessage()); }	
		catch (Exception x)
			{ rsn = x; addBindError(x.toString()); logException(x); }

		_flPhaseActive = flPhaseActive;
		throw new BindException(this, rsn);
	}
	
	public Context fork()
		{ return (new Context(_publicNamespace, _privateNamespace, _e, _flowStack, _frameStack, _curFrame,
							  _varBinders, _bindErrors)); }
	
	public void pushFrame(Frame frame)
		{ _frameStack.push(_curFrame); _curFrame = frame; }
	public void popFrame()
		throws YagaException
	{
		if (_frameStack.isEmpty())
			throw new EvaluateException(EvaluateException.ErrorType.CONTEXT, _e, "Frame stack is empty");
		_curFrame = _frameStack.pop();
	}
	public Frame currentFrame()
		{ return (_curFrame); }
	
	public Name definedName(Name.Unbound name)
	{
		Namespace.Entry def = null;
		if (_privateNamespace != null)
			def = _privateNamespace.tryBind(name);
		if (def == null)
			def = _publicNamespace.tryBind(name);
		return (def == null ? name : new Define(def.namespace, name, def.element));
	}
	
	public Namespace namespace()
		{ return (_curNamespace); }
	public Namespace publicNamespace()
		{ return (_publicNamespace); }
	
	public void setPublicNamespace(Namespace namespace)
	{ 
		_publicNamespace = namespace;
		if (_privateNamespace == null)
			_curNamespace = namespace;
	}
	
	public Namespace pushPrivateNamespace()
	{ 
		_curNamespace = _privateNamespace = Namespace.newPrivateNamespace(_privateNamespace);
		return (_curNamespace);
	}
	
	public Namespace popPrivateNamespace()
		throws YagaException
	{ 
		if (_privateNamespace == null)
			throw new EvaluateException(EvaluateException.ErrorType.CONTEXT, _e, "No private namespace to pop");
		if (_privateNamespace.isRoot())
		{
			_privateNamespace.release();
			_privateNamespace = null;
			return (_curNamespace = _publicNamespace);
		}
		Namespace parent = _privateNamespace.parent();
		_privateNamespace.release();
		return (_curNamespace = _privateNamespace = parent);
	}
	
	public void pushFlow(List e)
		{ _flowStack.push(e); }
	public void popFlow()
		{ _flowStack.pop(); }
	public boolean hasFlow()
		{ return (!_flowStack.isEmpty()); }
	
	public interface FlowDo
		{ public void run(List e); }
	public void printFlow(PrintStream stream)
		{ flowDo((e) -> stream.println(e.parserPoint().format())); }
	public void flowDo(FlowDo d)
		{ for (List e : reduceFlow()) d.run(e); }
	
	private ArrayList<List> reduceFlow()
	{
		ArrayList<List> flow = new ArrayList();
		List eLast = null;
		for (List e : _flowStack)
			if (eLast == null || !eLast.parserPoint().equals(e.parserPoint()))
				flow.add(eLast = e);
		return (flow);
	}
	
	public void openLog()
		throws FileNotFoundException
		{ openLog("yaga.log"); }
	public void openLog(String logPath)
		throws FileNotFoundException
	{ 
		_logStream = new PrintStream(new FileOutputStream(logPath, true)); 
		_logStream.println("Log opened @ " + new SimpleDateFormat("yyyy/MM/dd HH:mm:ss").format(new Date()));
	}
	
	public void logMessage(String msg, Object[] args)
	{
		if (_logStream != null)
			_logStream.printf(msg, args);
	}

	public void logException(Exception e)
	{
		if (_logStream != null)
			e.printStackTrace(_logStream);
	}
	
	public void closeLog()
	{
		if (_logStream == null)
			return;
		_logStream.printf("Log closed @ %s\n\n", new SimpleDateFormat("yyyy/MM/dd HH:mm:ss").format(new Date()));
		_logStream.close();
		_logStream = null;
	}

	// Binding related services and data.

	private final ArrayDeque<VariableBinder>	_varBinders;
	private final ArrayList<Error>				_bindErrors;
	
	private Context initBinder()
		{ _bindErrors.clear(); _varBinders.clear(); return (this); }

	public void pushVariableBinder(VariableBinder binder)
		{ _varBinders.push(binder); }
	public void popVariableBinder()
		throws YagaException
	{ 
		if (_varBinders.isEmpty())
			throw new BinderException(this, "VariableBinder stack is empty");
		_varBinders.pop(); 
	}
	public void popVariableBinders(int n)
		throws YagaException
	{ 
		if (_varBinders.size() < n)
			throw new BinderException(this, "VariableBinder stack has insufficient size");
		for (int i = n; i > 0; i--)
			_varBinders.pop(); 
	}
	
	public final boolean isDeclaredVariable(Variable v)
	{
		// If we have a variable that is linked to a Pipeline ristic that
		// is currently being processed then it has just been declared otherwise
		// it is a variable reference.
		for (VariableBinder b : _varBinders)
			if (v.ristic() == b.ristic())
				return (true);
		return (false);
	}
	
	public boolean isRootVariableBinder()
		{ return (_varBinders.isEmpty()); }

	public Name bindName(Name.Unbound name)
	{
		for (VariableBinder b : _varBinders)
		{
			Variable v = b.bindName(name);
			if (v != null)
				return (v);
		}
		return (definedName(name));
	}

	public Error[] bindErrors()
		{ return (_bindErrors.toArray(new Error[_bindErrors.size()])); }
	public boolean hasBindErrors()
		{ return (_bindErrors.size() > 0); }
	
	public interface BindErrorDo
		{ public void run(Error e); }
	public void bindErrorsDo(BindErrorDo d)
		{ _bindErrors.stream().forEach((e) -> d.run(e)); }

	public void printBindErrors(PrintStream stream)
		{ _bindErrors.stream().forEach((e) -> stream.println(e.formattedMessage())); }

	public Error addBindError(String msg)
		{ return (addBindError(_e, msg)); }
	public Error addBindError(Error er)
		{ _bindErrors.add(er); return (er); }
	public Error addBindError(List e, String msg)
		{ Error er = new Error(e, msg); _bindErrors.add(er); return (er); }
}

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
 *  Define type names.
 */
package yaga.core;

import yaga.core.exceptions.CastException;
import yaga.core.exceptions.YagaException;

public class Define extends Name.Bound
{
	public Define(Namespace namespace, Name n, List binding)
		{ super(n, binding); _namespace = namespace; _binding = binding; }

	private final Namespace _namespace;
	private final List _binding;

	@Override
	public final List asParameterList(Context ctxt)
		throws YagaException
		{ return (_binding.asParameterList(ctxt)); }

	@Override
	public Symbol reduceSymbolType(Context ctxt) 
		throws YagaException
	{ 
		if (_binding.isNameType())
			return (_binding.reduceSymbolType(ctxt)); 
		return (symbol());
	}

	public Namespace namespace()
		{ return (_namespace); }

	@Override
	public Namespace getDefineNamespace(Context ctxt)
		{ return (_namespace); }

	@Override
	public boolean isDefine()
		{ return (true); }

	@Override
	public List parse(Context ctxt)
		throws YagaException
		{ return (_binding.parse(ctxt)); }

	@Override
	public List bind(Context ctxt)
		throws YagaException
		{ return (_binding.bind(ctxt)); }
	@Override
	public List bind(Context ctxt, Frame.Reference r)
		throws YagaException
		{ return (r.frame().dispatch(ctxt, () ->_binding.bind(ctxt))); }

	@Override
	public List step(Context ctxt)
		throws YagaException
		{ return (_binding.step(ctxt)); }
	@Override
	public List step(Context ctxt, Frame.Reference r)
		throws YagaException
		{ return (r.frame().dispatch(ctxt, () ->_binding.step(ctxt))); }

	@Override
	public List step(Context ctxt, List parms)
		throws YagaException
		{ return (_binding.step(ctxt, parms)); }
	@Override
	public List step(Context ctxt, Frame.Reference r, List parms)
		throws YagaException
		{ return (r.frame().dispatch(ctxt, () ->_binding.step(ctxt, parms))); }

	@Override
	public List bindingStep(Context ctxt)
		throws YagaException
		{ return (_binding.bindingStep(ctxt)); }
	@Override
	public List bindingStep(Context ctxt, Frame.Reference r)
		throws YagaException
		{ return (r.frame().dispatch(ctxt, () ->_binding.bindingStep(ctxt))); }

	@Override
	public List bindingStep(Context ctxt, List parms)
		throws YagaException
		{ return (_binding.bindingStep(ctxt, parms)); }
	@Override
	public List bindingStep(Context ctxt, Frame.Reference r, List parms)
		throws YagaException
		{ return (r.frame().dispatch(ctxt, () ->_binding.bindingStep(ctxt, parms))); }

	@Override
	public List evaluate(Context ctxt)
		throws YagaException
		{ return (_binding.evaluate(ctxt)); }
	@Override
	public List evaluate(Context ctxt, Frame.Reference r)
		throws YagaException
		{ return (r.frame().dispatch(ctxt, () ->_binding.evaluate(ctxt))); }

	@Override
	public List bindingEvaluate(Context ctxt)
		throws YagaException
		{ return (_binding.bindingEvaluate(ctxt)); }
	@Override
	public List bindingEvaluate(Context ctxt, Frame.Reference r)
		throws YagaException
		{ return (r.frame().dispatch(ctxt, () ->_binding.bindingEvaluate(ctxt))); }

	@Override
	public List reduce(Context ctxt)
		throws YagaException
		{ return (_binding.reduce(ctxt)); }
	@Override
	public List reduce(Context ctxt, Frame.Reference r)
		throws YagaException
		{ return (r.frame().dispatch(ctxt, () ->_binding.reduce(ctxt))); }

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
	public boolean isInjectable()					
		{ return (_binding.isInjectable()); };

	@Override
	public List asFrameReference(Context ctxt, Frame frame)
		throws YagaException
	{
		if (_binding.isTrivial())
			return (_binding);
		return (this);
	}

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
	public List risticDo(Context ctxt, RisticDo fn) throws YagaException
		{ return (_binding.risticDo(ctxt, fn)); }

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
		{ return (_binding.dealias(ctxt)); }

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
		{ sb.append(_namespace.name().asjString()).append("::").append(symbol().asjString()); }

	@Override
	public void xprint(StringBuilder sb) 
		{ sb.append("[def "); print(sb); sb.append("]");
		_binding.xprint(sb);
	}
}

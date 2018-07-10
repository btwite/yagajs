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
 *  Abstract class for common Name behaviours.
 *	Names are not Atomic as they represent an an unknown list value.
 *  This can result in indirect references to a AtomicList elements where
 *  the element is contained in a list.
 */
package yaga.core;

import java.util.Arrays;
import yaga.core.exceptions.NameException;
import yaga.core.exceptions.YagaException;
import yaga.core.ristic.PipeRistics;

public abstract class Name extends List
{
	static public Name.Unbound newUnboundName(String n, ParserPoint point)
		throws NameException
		{ return (newUnboundName(Symbolspace.getSymbol(n), point)); }
	static public Unbound newUnboundName(Symbol n, ParserPoint point)
		throws NameException
		{ return (n.asjString().contains("::") ?
					newUnboundPath(n, point) : new Unbound(n, point)); }
	static public Unbound newUnboundName(AtomSymbol n, ParserPoint point)
		throws NameException
	{
		Unbound u = n.asisUnboundName();
		if (u != null)
			return (u);
		return (newUnboundName(n.symbol(), point));
	}
	
	static private Name.Unbound newUnboundPath(Symbol n, ParserPoint point)
		throws NameException
	{
		String s = n.asjString();
		if (s.substring(s.length() - 2).equals("::"))
			throw new NameException("Zero length name at end of path", point);
		String toks[] = s.split("::");
		boolean flIsRelative = toks[0].length() == 0;
		if (flIsRelative)
			toks = Arrays.copyOfRange(toks, 1, toks.length);
		Unbound[] segs = new Unbound[toks.length];
		for (int i = 0; i < toks.length; i++)
		{
			if (toks[i].length() == 0)
				throw new NameException("Zero length namespace segment name", point);
			segs[i] = new Unbound(Symbolspace.getSymbol(toks[i]), point);
		}
		return (flIsRelative ?
					new UnboundRelPath(n, segs, point) :
					new UnboundPath(n, segs, point));
	}
	
	static public Variable newVariable(Name name, PipeRistics ristic, int idx)
	{
		String sym = name.asjString();
		if (sym.length() > 1 && Character.isAlphabetic(sym.charAt(1)))
		{
			if (sym.charAt(0) == Variable.INJLEAD)
				return (new Variable.InjectingVariable(name, ristic, idx));
			if (sym.charAt(0) == Variable.PRODLEAD)
				return (new Variable.ProductiveVariable(name, ristic, idx));
		}
		return (new Variable(name, ristic, idx));
	}
	
	public Name(String v, ParserPoint point)
		{ super(point); _sym = Symbolspace.getSymbol(v); }
	public Name(Symbol v, ParserPoint point)
		{ super(point); _sym = v; }

	private final Symbol _sym;
	
	public final Symbol symbol()
		{ return (_sym); }
	public final String asjString()
		{ return (_sym.asjString()); }
	
	@Override
	public List zeroValue()
		throws YagaException
		{ return (Lists.nil()); }
		
	@Override
	public Elements elements()
		{ return (new FixedElements(new List[] { this }, this)); }
		
	public Namespace getDefineNamespace(Context ctxt)
		{ return (ctxt.namespace()); }
	
	@Override
	public boolean isEmpty()						{ return (false); }
	@Override
	public boolean isBound()						{ return (false); }
	@Override
	public boolean isReducible()					{ return (false); }
	@Override
	public boolean canEvaluate()					{ return (false); }
	@Override
	public boolean isTrivial()						{ return (false); }
	@Override
	public boolean hasVariables()					{ return (false); }
	
	@Override
	public boolean isName()	
		{ return (true); }
	@Override
	public Name asisName()
		{ return (this); }
	@Override
	public boolean isNameType()	
		{ return (true); }
	@Override
	public Symbol getNameSymbol()
		{ return (_sym); }

	@Override
	public Name getNameType(Context ctxt)  throws YagaException
		{ return (this); }

	public boolean isDefine()
		{ return (false); }
	public boolean isUndefined()
		{ return (false); }
	public boolean isUnboundPath()
		{ return (false); }
	public boolean isVariable()
		{ return (false); }
	
	public Variable.PipeVariable asPipeVariable(PipeRistics ristic, int idx)
	{
		String sym = _sym.asjString();
		if (sym.length() <= 1 || sym.charAt(0) != Variable.PIPELEAD || 
			(!Character.isAlphabetic(sym.charAt(1)) && 
			 !((sym.charAt(1) == Variable.INJLEAD || sym.charAt(1) == Variable.PRODLEAD) && 
			   sym.length() > 2 && Character.isAlphabetic(sym.charAt(2)))))
			return (null);
		return (new Variable.PipeVariable(new AtomSymbol(Symbolspace.getSymbol(sym.substring(1)), _point), ristic, idx));
	}
	
	@Override
	public List neg(Context ctxt)
		{ return (this); }
	
	@Override
		public void print(StringBuilder sb) 
		{ sb.append(_sym.asjString()); }

	@Override
	public List add(Context ctxt, List e)
		throws YagaException
		{ return (e.rAdd(ctxt, this)); }
	@Override
	public List sub(Context ctxt, List e)
		throws YagaException
		{ return (e.rSub(ctxt, this)); }
	@Override
	public List mul(Context ctxt, List e)
		throws YagaException
		{ return (e.rMul(ctxt, this)); }
	@Override
	public List div(Context ctxt, List e)
		throws YagaException
		{ return (e.rDiv(ctxt, this)); }
	@Override
	public List rem(Context ctxt, List e)
		throws YagaException
		{ return (e.rRem(ctxt, this)); }

	static public class Unbound extends Name
	{
		private Unbound(Symbol n, ParserPoint point)
			{ super(n, point); }
		public Unbound(String n, ParserPoint point)
			{ super(n, point); }

		@Override
		public final List asParameterList(Context ctxt)
			{ return (this); }

		@Override
		public List bind(Context ctxt)
			throws YagaException
			{ return (ctxt.bindName(this)); }
		@Override
		public List bind(Context ctxt, Frame.Reference r)
			throws YagaException
			{ return (r.frame().dispatch(ctxt, () -> ctxt.bindName(this))); }
		
		public Name bind(Context ctxt, List ns, Name source)
			throws YagaException
		{ 
			AtomNamespace space = ns.asisNamespace();
			if (space == null)
				throw new NameException(String.format("Namespace path segment '%s' is not a namespace", source.asjString()), 
										ns.parserPoint());
			return (bind(space.namespace()));
		}

		public Name bind(Namespace ns)
			throws YagaException
		{ 
			Namespace.Entry def = ns.tryLocalBind(this);
			return (def == null ? 
						new Undefined(ns, this) : 
						new Define(def.namespace, this, def.element));
		}
		
		@Override
		public boolean isBound()				{ return (false); }

		@Override
		public boolean isUnboundName()			{ return (true); }
		@Override
		public Unbound asisUnboundName()		{ return (this); }

		@Override
		public void xprint(StringBuilder sb) 
			{  sb.append("[Unbound]").append(asjString()); }
	}

	static public class UnboundPath extends Name.Unbound
	{
		private UnboundPath(Symbol n, Unbound[] segs, ParserPoint point)
			{  super(n, point); _segments = segs; }
		
		private final Name.Unbound[] _segments;

		protected final Unbound rootSegment()
			{ return (_segments[0]); }
		
		@Override
		public boolean isUnboundPath()
			{ return (true); }
		
		@Override
		public List bind(Context ctxt)
			throws YagaException
			{ return (bindFromRoot(ctxt, rootSegment().bind(Namespace.core), rootSegment())); }
		@Override
		public List bind(Context ctxt, Frame.Reference r)
			throws YagaException
			{ return (r.frame().dispatch(ctxt, () -> bind(ctxt))); }
		
		protected List bindFromRoot(Context ctxt, List e, Name source)
			throws YagaException
		{
			for (int i = 1; i < _segments.length; source = _segments[i++])
				e = _segments[i].bind(ctxt, e, source);
			return (e);
		}
	}

	static public class UnboundRelPath extends Name.UnboundPath
	{
		private UnboundRelPath(Symbol n, Unbound[] segs, ParserPoint point)
			{  super(n, segs, point); }

		@Override
		public List bind(Context ctxt)
			throws YagaException
			{ return (bindFromRoot(ctxt, ctxt.definedName(rootSegment()), rootSegment())); }
	}
	
	static public class Undefined extends Name.Unbound
	{
		public Undefined(Namespace namespace, Name n)
			{ super(n.symbol(), n.parserPoint()); _namespace = namespace; }
		public Undefined(Namespace namespace, Symbol n, ParserPoint point)
			{ super(n, point); _namespace = namespace; }

		private final Namespace _namespace;

		public Namespace namespace()
			{ return (_namespace); }
		
		@Override
		public Namespace getDefineNamespace(Context ctxt)
			{ return (_namespace); }
		
		@Override
		public boolean isUndefined()
			{ return (true); }
		
		@Override
		public void print(StringBuilder sb) 
		{ 
			if (_namespace.isLocal())
				sb.append(_namespace.name().asjString()).append("::"); 
			sb.append(symbol().asjString()); 
		}

		@Override
		public void xprint(StringBuilder sb) 
			{  sb.append("[Undefined]"); print(sb); }
	}

	static public abstract class Bound extends Name
	{
		protected Bound(Name name, List related)
			{ super(name.symbol(), name.parserPoint().clone(related)); }
		protected Bound(AtomSymbol name, List related)
			{ super(name.symbol(), name.parserPoint().clone(related)); }
		protected Bound(Symbol name, List related)
			{ super(name, related.parserPoint()); }
		
		@Override
		public boolean isBound()	 
			{ return (true); }

		@Override
		public boolean isBoundName()	
			{ return (true); }
		@Override
		public Bound asisBoundName() 
			{ return (this); }
		
		@Override
		public boolean isReducible() 
			{ return (true); }
	}
}

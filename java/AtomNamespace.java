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
 *  Name atoms are associated with Symbols that correspond to the name.
 *  Instances of this class are unbound. Binding will produce a BoundName
 *  atom.
 */
package yaga.core;

import yaga.core.exceptions.YagaException;

/**
 *
 * @author Bruce
 */
public class AtomNamespace extends AtomicList
{
	public AtomNamespace(AtomSymbol name, Namespace namespace)
		{ super(name.parserPoint()); _namespace = namespace; _name = name.symbol(); }
	public AtomNamespace(String name, Namespace namespace)
		{ super(); _namespace = namespace; _name = Symbolspace.getSymbol(name); }

	private final Namespace _namespace;
	private final Symbol	_name;
	
	public Namespace namespace()
		{ return (_namespace); }
	
	public Symbol name()
		{ return (_name); }
	public String asjString()
		{ return (_name.asjString()); }
	
	@Override
	public void print(StringBuilder sb) 
	{ 
		if (_namespace.isPrivate())
			sb.append('#'); 
		sb.append(asjString()); 
	}
	
	@Override
	public boolean isNamespace()			{ return (true); }
	@Override
	public AtomNamespace asisNamespace()	{ return (this); } 
	@Override
	public AtomNamespace asNamespace()		{ return (this); }
	
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
}

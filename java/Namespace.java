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
 *  Defines the key behaviours for Namespaces
 */

package yaga.core;

import java.util.ArrayDeque;
import java.util.HashMap;
import yaga.core.exceptions.NamespaceException;
import yaga.core.exceptions.YagaException;
import yaga.core.ristic.Ristic;

/**
 *
 * @author Bruce
 */
public class Namespace
{
	static private ArrayDeque<Namespace> _privateNamespaces = new ArrayDeque();
	
	static public synchronized Namespace newPrivateNamespace()
	{ 
		if (_privateNamespaces.isEmpty())
			return (new Root());
		return (_privateNamespaces.pop().initPrivateNamespace(null));
	}
	static public synchronized Namespace newPrivateNamespace(Namespace parent)
	{
		if (parent == null)
			return (newPrivateNamespace());
		if (_privateNamespaces.isEmpty())
			return (new Namespace(parent));
		return (_privateNamespaces.pop().initPrivateNamespace(parent));
	}
	static private synchronized void release(Namespace ns)
		{ _privateNamespaces.push(ns); }
	
	static final public Root core;
	static private int _nextID = 0;
	
	static
	{
		(core = new Root()).setPublic(".core");
		core.addBinding(".ristic", Ristic.DotRistic);
	}
	
	static private synchronized int nextID()
		{ return (_nextID++); }
	
	public Namespace()
		{ _space = new HashMap(); _parent = core; _id = nextID(); }
	public Namespace(String name)
		{ this(); setPublic(name); }
	public Namespace(Namespace parent)
		{ _space = new HashMap(); _parent = parent; _id = nextID(); }
	public Namespace(String name, Namespace parent)
		{ this(parent); setPublic(name); }
	
	protected HashMap<Symbol, Entry> _space;
	private AtomNamespace	_name;
	private Namespace		_parent;
	private final int		_id;

	private Namespace initPrivateNamespace(Namespace parent)
		{ _space.clear(); _parent = parent; return (this); }
	
	public void release()
	{
		if (isPublic())
			return;
		release(this);
	}
	
	protected final Namespace setPublic(String name)
	{ 
		_name = new AtomNamespace(name, this); 
		core.addBinding(_name.asjString(), _name);
		return (this);
	}
	protected AtomNamespace setName(AtomNamespace space)
		{ return (_name = space);  }
	
	public AtomNamespace name()
	{
		if (_name == null)
			return (new AtomNamespace("PrivateNamespace:" + _id, this));
		return (_name);
	}
	
	public boolean isPrivate()
		{ return (_name == null); }
	public boolean isPublic()
		{ return (_name != null); }
	public boolean isLocal()
		{ return (false); }
	public boolean isRoot()
		{ return (false); }
	
		
	protected void setParentToThis()
		{ _parent = this; }
	
	public Namespace parent()
		{ return (_parent); }
	
	public Entry tryLocalBind(Name name)
		{ return (tryLocalBind(name.symbol())); }
	public Entry tryLocalBind(AtomSymbol name)
		{ return (tryLocalBind(name.symbol())); }
	public Entry tryLocalBind(Symbol name)
		{ return (_space.get(name)); }
	
	public Entry localbind(AtomSymbol name)
		throws YagaException
		{ return (localBind(name.symbol(), name)); }
	public Entry localbind(Name name)
		throws YagaException
		{ return (localBind(name.symbol(), name)); }
	protected Entry localBind(Symbol name, List l)
		throws YagaException
	{
		Entry e = tryLocalBind(name);
		if (e == null)
			throw new NamespaceException(l, "Unable to bind name '" + name.asjString() + "'");
		return (e);
	}
	
	public Entry tryBind(Name name)
		{ return (tryBind(name.symbol())); }
	public Entry tryBind(AtomSymbol name)
		{ return (tryBind(name.symbol())); }
	public Entry tryBind(Symbol name)
	{
		Entry e = tryLocalBind(name);
		if (e != null)
			return (e);
		return (_parent.tryBind(name));
	}
	
	public Entry bind(AtomSymbol name)
		throws YagaException
		{ return (bind(name.symbol(), name)); }
	public Entry bind(Name name)
		throws YagaException
		{ return (bind(name.symbol(), name)); }
	
	protected Entry bind(Symbol name, List l)
		throws YagaException
	{
		Entry e = tryLocalBind(name);
		if (e != null)
			return (e);
		return (_parent.bind(name, l));
	}
	
	public boolean checkLocalBind(AtomSymbol name)
		{ return (tryLocalBind(name) != null); }
	public boolean checkLocalBind(Name name)
		{ return (tryLocalBind(name) != null); }
	public boolean checkLocalBind(Symbol name)
		{ return (tryLocalBind(name) != null); }
	
	public boolean checkBind(AtomSymbol name)
		{ return (checkBind(name.symbol())); }
	public boolean checkBind(Name name)
		{ return (checkBind(name.symbol())); }
	public boolean checkBind(Symbol name)
	{ 
		if (checkLocalBind(name))
			return (true);
		return (_parent.checkBind(name)); 
	}
	
	public List addBinding(AtomSymbol name, List e)
		throws YagaException
		{ return (addBinding(name.symbol(), e, name)); }
	public List addBinding(Name name, List e)
		throws YagaException
		{ return (addBinding(name.symbol(), e, name)); }
	protected synchronized List addBinding(Symbol name, List e, List src)
		throws YagaException
	{
		if (checkLocalBind(name))
			throw new NamespaceException(src, "Name '" + name.asjString() + "' is already bound");
		_space.put(name, new Entry(this, e));
		return (e);
	}
	
	public synchronized boolean removeBinding(AtomSymbol name)
		{ return (_space.remove(name.symbol()) != null); };
	public synchronized boolean removeBinding(Name name)
		{ return (_space.remove(name.symbol()) != null); };
	
	static public class Root extends Namespace
	{
		protected Root()
			{ super(); setParentToThis(); }

		@Override
		public Namespace parent()
			{ return (this); }

		@Override
		public Entry tryBind(Symbol name)
			{ return (_space.get(name)); }

		@Override
		protected Entry bind(Symbol name, List src)
			throws YagaException
		{
			Entry e = tryBind(name);
			if (e == null)
				throw new NamespaceException(src, "Unable to bind name '" + name.asjString() + "'");
			return (e);
		}

		@Override
		public boolean checkBind(Symbol name)
			{ return (tryBind(name) != null); }

		public synchronized List addBinding(String name, List e)
		{
			// Used to initialise key public entries at startup
			_space.put(Symbolspace.getSymbol(name), new Entry(this, e));
			return (e);
		}
		
		@Override
		public boolean isRoot()
			{ return (true); }
	}
	
	static public class Local extends Namespace
	{
		public Local(AtomSymbol name, Namespace owner)
			throws YagaException
			{ super(owner); setName(name.symbol(), owner, name); }
		public Local(Name name, Namespace owner)
			throws YagaException
			{ super(owner); setName(name.symbol(), owner, name); }
	
		private void setName(Symbol name, Namespace owner, List src)
			throws YagaException
			{ owner.addBinding(name, setName(prepareName(name, owner)), src); }
		
		private AtomNamespace prepareName(Symbol n, Namespace owner)
			{ return (new AtomNamespace(getOwnerPrefix(owner) + n.asjString(), this)); }
		private String getOwnerPrefix(Namespace owner)
		{
			if (owner.isPublic())
				return (owner.name().asjString() + "::");
			return (getOwnerPrefix(owner.parent()) + owner.name().asjString() + "::");
		}
		
		@Override
		public boolean isPrivate()
			{ return (false); }
		@Override
		public boolean isPublic()
			{ return (false); }
		@Override
		public boolean isLocal()
			{ return (true); }
	}
	
	static public class Entry
	{
		private Entry(Namespace n, List e)
			{ element = e; namespace = n; }
		
		public final List element;
		public final Namespace namespace;
	}
}

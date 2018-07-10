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
 *	Core primitives.
 */
package yaga.core.prim;

import java.util.Arrays;
import yaga.core.*;
import yaga.core.exceptions.PrimitiveException;
import yaga.core.exceptions.YagaException;
import yaga.core.ristic.PrimRistic;
import yaga.core.ristic.Ristic;

/**
 *
 * @author Bruce
 */
public class Core
{
	static public List Head(Context ctxt, PrimRistic.Primitive prim, List parms)
		throws YagaException
		{ return (runStdPrimFn(ctxt, parms, 
							   (e) -> e.headElement(), 
							   () -> parms)); }

	static public List Tail(Context ctxt, PrimRistic.Primitive prim, List parms)
		throws YagaException
		{ return (runStdPrimFn(ctxt, parms, 
							   (e) -> e.tailSubList(), 
							   () -> parms)); }
	
	static public List End(Context ctxt, PrimRistic.Primitive prim, List parms)
		throws YagaException
		{ return (runStdPrimFn(ctxt, parms, 
							   (e) -> e.tailElement(), 
							   () -> parms)); }

	static public List Front(Context ctxt, PrimRistic.Primitive prim, List parms)
		throws YagaException
		{ return (runStdPrimFn(ctxt, parms, 
							   (e) -> e.headSubList(), 
							   () -> parms)); }

	static public List Append(Context ctxt, PrimRistic.Primitive prim, List parms)
		throws YagaException
	{
		List[] es = parms.elements().asParameters(ctxt);
		if (es.length == 0)
			return (parms);
		if (es.length == 1)
			return (es[0]);
		
		List l = es[0].step(ctxt);
		for (int i = 1; i < es.length; i++)
			l = l.appendList(es[i].step(ctxt));
		return (l);
	}

	static public List DeAlias(Context ctxt, PrimRistic.Primitive prim, List parms)
		throws YagaException
		{ return (runStdPrimFn(ctxt, parms, 
							   (e) -> e.evaluate(ctxt).dealias(ctxt), 
							   () -> parms)); }
	
	static public List Parse(Context ctxt, PrimRistic.Primitive prim, List parms)
		throws YagaException
		{ return (runOperation(ctxt, parms, (e) -> Lists.parse(ctxt, ctxt.bind(e.evaluate(ctxt))))); }
	
	static public List Bind(Context ctxt, PrimRistic.Primitive prim, List parms)
		throws YagaException
		{ return (runOperation(ctxt, parms, (e) -> ctxt.bind(e.evaluate(ctxt)))); }
	
	static public List Step(Context ctxt, PrimRistic.Primitive prim, List parms)
		throws YagaException
	{ 
		return (runOperation(ctxt, parms, (e) ->
				{
					List e1 = ctxt.bind(e);
					if (!e1.isData())
						return (e1.step(ctxt));
					List[] es = e1.elements().asArray();
					if (es.length == 0)
						return (Lists.nil(parms.parserPoint()));
					if (es.length == 1)
						return (es[0].step(ctxt));
					return (es[0].step(ctxt, Lists.newData(Arrays.copyOfRange(es, 1, es.length))));
				}));
	}
	
	static public List Evaluate(Context ctxt, PrimRistic.Primitive prim, List parms)
		throws YagaException
		{ return (runOperation(ctxt, parms, (e) -> ctxt.bind(e.evaluate(ctxt)).evaluate(ctxt))); }
	
	static public List Reduce(Context ctxt, PrimRistic.Primitive prim, List parms)
		throws YagaException
		{ return (runOperation(ctxt, parms, (e) -> ctxt.bind(e.evaluate(ctxt)).reduce(ctxt))); }
	
	static public List Define(Context ctxt, PrimRistic.Primitive prim, List parms)
		throws YagaException
	{
		List[] es = parms.elements().asArray();
		if (es.length != 2 )
			throw new PrimitiveException(parms, "Define requires name and definition parameters");
		
		Name name = es[0].getNameType(ctxt);
		if (name == null)
			throw new PrimitiveException(parms, "Invalid name parameter");
		name = name.bind(ctxt).asisName();
		
		Namespace ns = name.getDefineNamespace(ctxt);
		if (name.isBoundName())
		{
			ns = ctxt.namespace();
			Name.Bound n = name.asisBoundName();
			if (n.isDefine() && ((Define)n).namespace() == ns)
				throw new PrimitiveException(name, "Name has already been defined");
		}
		List e = ns.addBinding(name, ctxt.bind(es[1].resolveVariable(ctxt)));
		return (new AtomAlias(new Define(ns, name, e), e.parserPoint()));
	}
	
	static public List Undefine(Context ctxt, PrimRistic.Primitive prim, List parms)
		throws YagaException
	{
		List[] es = parms.elements().asArray();
		List[] res = new List[es.length];
		for (int i = 0; i < res.length; i++)
		{
			Name name = es[i].getNameType(ctxt);
			if (name == null)
				throw new PrimitiveException(parms, "Invalid name parameter");
			// Don't allow names to be undefined from the non-current workspace
			// unless a qualified path has been provided.
			Namespace ns = ctxt.namespace();
			if (name.isUnboundPath())
			{
				name = name.bind(ctxt).asisName();
				ns = name.getDefineNamespace(ctxt);
			}
			res[i] = ns.removeBinding(name) ? ns.name() : Lists.nil();
		}
		return (Lists.newData(res, parms.parserPoint()));
	}
	
	static public List NewNamespace(Context ctxt, PrimRistic.Primitive prim, List parms)
		throws YagaException
	{
		List[] es = parms.elements().asArray();
		if (es.length == 0)
			return (Namespace(ctxt, prim, parms));
		if (es.length > 2)
			throw new PrimitiveException(parms, "Too many parameters");

		List[] esPrim = prim.elements().asArray();
		boolean isLocal = esPrim.length > 3 && 
						  esPrim[3].asisSymbol().symbol() == Symbol.LOCAL;
		
		es = ctxt.evaluateBindParms(parms);
		Namespace parent = isLocal ? ctxt.publicNamespace() : Namespace.core;
		if (es.length > 1)
		{
			AtomNamespace ns = es[1].resolveVariable(ctxt).asisNamespace();
			if (ns == null)
				throw new PrimitiveException(es[1], "Invalid parent namespace");
			parent = ns.namespace();
			if (parent.isPrivate())
				throw new PrimitiveException(es[1], "Private namespace cannot be parent of public of local namespace");
			if (!isLocal && parent.isLocal())
				throw new PrimitiveException(es[1], "Local namespace cannot be parent of public namespace");
		}
		
		List e = es[0];
		AtomNamespace ens = e.resolveVariable(ctxt).asisNamespace();
		if (ens != null)
		{
			Namespace ns = ens.namespace();
			if (ns.parent() != parent)
				throw new PrimitiveException(e, "Existing namespace has a different parent");
			return (ns.name());
		}
		
		Name name = parms.elements().asArray()[0].getNameType(ctxt);
		if (name == null)
			throw new PrimitiveException(parms, "Invalid namespace name parameter");
		name = name.bind(ctxt).asisName();
		
		if (!isLocal && !parent.isPublic())
			throw new PrimitiveException(e, "Name path not allowed for a public namespace");
		if (isLocal)
			return ((new Namespace.Local(name, parent)).name());
		return ((new Namespace(name.asjString(), parent)).name());
	}
	
	static public List SetNamespace(Context ctxt, PrimRistic.Primitive prim, List parms)
		throws YagaException
	{
		List[] es = parms.elements().asArray();
		if (es.length == 0)
			return (Namespace(ctxt, prim, parms));
		if (es.length > 1)
			throw new PrimitiveException(parms, "Too many parameters");
		
		es = ctxt.evaluateBindParms(parms);
		AtomNamespace ens = es[0].resolveVariable(ctxt).asisNamespace();
		if (ens == null)
			throw new PrimitiveException(es[0], "Invalid namespace name");
		
		Namespace namespace = ens.namespace();
		if (namespace.isPrivate())
			throw new PrimitiveException(es[0], "Cannot set local namespace as public namespace");
		
		ctxt.setPublicNamespace(namespace);
		return (namespace.name());
	}
	
	static public List Namespace(Context ctxt, PrimRistic.Primitive prim, List parms)
		throws YagaException
	{
		// If there are no parameters then we just answer the current namespace
		return (runStdPrimFn(ctxt, parms, 
							 (e) -> 
							 {
								Name name = e.getNameType(ctxt);
								if (name == null)
									return (Lists.nil());
								name = name.bind(ctxt).asisName();
								if (name.isBoundName() && name.asisBoundName().isDefine())
									return (((Define)name).namespace().name());
								return (Lists.nil());
							 }, 
							 () -> ctxt.namespace().name())); 
	}
	
	static public List ParentNamespace(Context ctxt, PrimRistic.Primitive prim, List parms)
		throws YagaException
	{
		// If there are no parameters then we just answer the parent of current name space.
		return (runStdPrimFn(ctxt.evaluateBindParms(parms), 
							 (e) -> 
							 {
								AtomNamespace ens = e.resolveVariable(ctxt).asisNamespace();
								if (ens != null)
									return (ens.namespace().parent().name());
								return (Lists.nil());
							 }, 
							 () -> ctxt.namespace().parent().name())); 
	}
	
	static public List PushPrivateNamespace(Context ctxt, PrimRistic.Primitive prim, List parms)
		throws YagaException
	{
		// Continue processing after setting a new PrivateNamespace.
		if (parms.isEmpty())
			{ return (parms); }

		ctxt.pushPrivateNamespace();
		
		List[] es = ctxt.evaluateBindParms(parms);
		if (Elements.areTrivial(es))
		{
			ctxt.popPrivateNamespace();
			return (parms);
		}
		// We don't have a trivial list so we need to form an expression and
		// bind.
		List res = ctxt.bind(new Expression.ProdExpr(Elements.make(es, parms), parms.parserPoint()));
		ctxt.popPrivateNamespace();
		return (res);
	}
	
	static public List PushPublicNamespace(Context ctxt, PrimRistic.Primitive prim, List parms)
		throws YagaException
	{
		// Continue processing after setting a new Public name space. Note
		// that in this case we create a new expression out of the trailing
		// elements following the namespace.
		List[] es = parms.elements().asArray();
		if (es.length < 2)
			{ return (parms); }

		List ens = ctxt.bind(es[0]).evaluate(ctxt);
		if (!ens.isNamespace())
			throw new PrimitiveException(es[0], "Missing namespace parameter");
		if (ens.asisNamespace().namespace().isPrivate())
			throw new PrimitiveException(es[0], "Invalid use of private namespace");
		Namespace oldNamespace = ctxt.publicNamespace();
		ctxt.setPublicNamespace(ens.asisNamespace().namespace());
		es = ctxt.evaluateBindParms(Lists.newData(Arrays.copyOfRange(es, 1, es.length), parms.parserPoint()));
		if (Elements.areTrivial(es))
		{
			ctxt.setPublicNamespace(oldNamespace);
			return (es.length == 1 ? es[0] : Lists.newData(Elements.make(es, parms), parms.parserPoint()));
		}
		// We don't have a trivial list so we need to form an expression and
		// bind.
		List res = ctxt.bind(new Expression.ProdExpr(Elements.make(es, parms), parms.parserPoint()));
		ctxt.setPublicNamespace(oldNamespace);
		return (res);
	}
	
	static public List DotRistic(Context ctxt, PrimRistic.Primitive prim, List parms)
		throws YagaException
		{ return (Ristic.DotRistic); }
	
	static public List Print(Context ctxt, PrimRistic.Primitive prim, List parms)
		throws YagaException
	{
		List[] esi = parms.elements().asArray();
		List[] es = prim.elements().asArray(); int id = 0;
		if (es.length >= 3)
			{ id = es[2].asNumber().int32Value(); }

		for (List e : esi)
		{
			switch (id)
			{
			case 0 : e.println(System.out);					break;
			case 1 : e.evaluate(ctxt).println(System.out);	break;
			case 2 : e.reduce(ctxt).println(System.out);	break;
			case 3 : ctxt.bind(e).println(System.out);		break;
			case 4 : e.println(System.out);					break;
			case 5 : e.xprintln(System.out);				break;
			case 6 : e.evaluate(ctxt).xprintln(System.out);	break;
			case 7 : e.reduce(ctxt).xprintln(System.out);	break;
			case 8 : ctxt.bind(e).xprintln(System.out);		break;
			case 9 : e.xprintln(System.out);				break;
			}
		}
		return (Lists.nil());
	}
	
	static private List runOperation(Context ctxt, List parms, StdPrimFn fn)
		throws YagaException
		{ return (runStdPrimFn(ctxt, parms, fn, () -> Lists.nil(parms.parserPoint()))); }
	
	static public interface StdPrimFn
		{ public List run(List e) throws YagaException; }
	static public interface StdPrimEmptyFn
		{ public List run() throws YagaException; }
	
	static public List runStdPrimFn(Context ctxt, List parms, StdPrimFn fn, StdPrimEmptyFn efn)
		throws YagaException
		{ return (runStdPrimFn(parms.elements().asParameters(ctxt), fn, efn)); }

	static public List runStdPrimFn(List[] es, StdPrimFn fn, StdPrimEmptyFn efn)
		throws YagaException
	{
		if (es.length == 0)
			return (efn.run());
		if (es.length == 1)
			return (fn.run(es[0]));
		List[] res = new List[es.length];
		for (int i = 0; i < es.length; i++)
			res[i] = fn.run(es[i]);
		return (Lists.newData(res));
	}
}

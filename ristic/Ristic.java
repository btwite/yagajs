public class Ristic extends Container {
	static final public DotRistic DotRistic = new DotRistic();

	static public List headRisticReduction(Context ctxt, List source, Ristic ristic, List[] es)
	throws YagaException {
		try {
			List parms = Lists.newData(Arrays.copyOfRange(es, 1, es.length), source.parserPoint());
			return (ristic.risticReduce(ctxt, parms));
		} catch (FrameException.Read x) {
			if (!ctxt.isDeclaredVariable(x.variable()))
				throw x;
			// The Ristic is tied to a pipeline that is being declared. Will need to 
			// recreate as an expression that can be re-parsed at a later stage.
			return (new Expression.ProdExpr(Elements.make(es, source), source.parserPoint()));
		} catch (RisticValidationException x) {
			for (Error err: x.errors())
				ctxt.addBindError(err);
			throw new BindException(ctxt, x);
		}
	}

	static protected List newRistic(RisticClass cls, Elements els, ParserPoint point) {
		return (newRistic(cls, els.asArray(), point));
	}
	static protected List newRistic(RisticClass cls, List[] esi, ParserPoint point) {
		List[] es = new List[esi.length + 1];
		es[0] = cls;
		System.arraycopy(esi, 0, es, 1, esi.length);
		return (new Ristic(Elements.make(es, cls), point));
	}

	private Ristic(Elements elements, ParserPoint point) {
		super(elements, point);
	}

	@Override
	public boolean isReducible() {
		return (false);
	}
	@Override
	public boolean isStepProductive() {
		return (true);
	}
	@Override
	public boolean isTrivial() {
		return (false);
	}

	// Only need to handle bind and bindingStep. Binding step is where
	// the real action happens. We just take advantage of a bind to get finish
	// trivialising the list.

	@Override
	public List bind(Context ctxt)
	throws YagaException {
		ctxt.pushFlow(this);
		List e = bindRistic(ctxt);
		ctxt.popFlow();
		return (e);
	}
	@Override
	public List bind(Context ctxt, Frame.Reference r)
	throws YagaException {
		return (r.frame().dispatch(ctxt, () - > bind(ctxt)));
	}

	@Override
	public List step(Context ctxt, List parms)
	throws YagaException {
		return (risticReduce(ctxt, parms));
	}
	@Override
	public List step(Context ctxt, Frame.Reference r, List parms)
	throws YagaException {
		return (r.frame().dispatch(ctxt, () - > risticReduce(ctxt, parms)));
	}

	@Override
	public List bindingStep(Context ctxt, List parms)
	throws YagaException {
		return (risticReduce(ctxt, parms));
	}
	@Override
	public List bindingStep(Context ctxt, Frame.Reference r, List parms)
	throws YagaException {
		return (r.frame().dispatch(ctxt, () - > risticReduce(ctxt, parms)));
	}

	protected List bindRistic(Context ctxt)
	throws YagaException {
		// Now must be able to bind and step the Ristic elements to get 
		// back to a bound representation. Validation errors at this point
		// will generate an exeption.
		try {
			List[] es = _elements.asParameters(ctxt);
			return (((RisticClass) es[0]).risticReduce(ctxt, Lists.newData(Arrays.copyOfRange(es, 1, es.length), _point)));
		} catch (RisticValidationException x) {
			for (Error err: x.errors())
				ctxt.addBindError(err);
			throw new BindException(ctxt, x);
		}
	}

	public List risticReduce(Context ctxt, List parms)
	throws YagaException {
		return (bindRistic(ctxt));
	}

	public boolean isDotRistic() {
		return (false);
	}
	public boolean isRisticClass() {
		return (false);
	}
	public boolean isRisticInstance() {
		return (false);
	}
	public boolean isUnboundRistic() {
		return (true);
	}

	@Override
	public boolean isRistic() {
		return (true);
	}
	@Override
	public List risticDo(Context ctxt, RisticDo fn) throws YagaException {
		return (fn.run(this));
	}


	@Override
	public List appendList(List e) {
		return (new Ristic(_elements.append(e), _point));
	}

	@Override
	public void print(StringBuilder sb) {
		sb.append("( ");
		List[] es = _elements.asArray();
		for (List e: es) {
			e.print(sb);
			sb.append(" ");
		}
		sb.append(")");
	}

	static abstract public class RisticType extends Ristic {
		public RisticType(Elements elements, ParserPoint point) {
			super(elements, point);
		}

		@Override
		public boolean isUnboundRistic() {
			return (false);
		}

		@Override
		public List bind(Context ctxt)
		throws YagaException {
			return (this);
		}
		@Override
		public List bind(Context ctxt, Frame.Reference r)
		throws YagaException {
			return (r);
		}

		@Override
		protected Ristic bindRistic(Context ctxt)
		throws YagaException {
			return (this);
		}

		@Override
		public abstract List risticReduce(Context ctxt, List parms)
		throws YagaException;
	}

	static abstract public class RisticClass extends RisticType {
		public RisticClass(Symbol name, ParserPoint point) {
			super(Elements.EmptyElements, point);
			_name = name;
		}

		private final Symbol _name;

		protected final Symbol name() {
			return (_name);
		}

		@Override
		public boolean isRisticClass() {
			return (true);
		}

		@Override
		public void print(StringBuilder sb) {
			risticClassName(sb, this.getClass());
		}
	}

	static abstract public class RisticInstance extends RisticType {
		public RisticInstance(RisticClass rClass, Elements elements, ParserPoint point) {
			super(elements, point);
			_rClass = rClass;
		}

		private final RisticClass _rClass;

		@Override
		public boolean isRisticInstance() {
			return (true);
		}

		@Override
		public void print(StringBuilder sb) {
			sb.append("(");
			_rClass.print(sb);
			sb.append(' ');
			List[] es = _elements.asArray();
			for (List e: es) {
				e.print(sb);
				sb.append(" ");
			}
			sb.append(")");
		}
	}

	static private final HashMap < Class, Symbol > _risticClasses = new HashMap();
	static private synchronized boolean addRisticClass(Class rClass, Symbol name)
	throws YagaException {
		if (_risticClasses.containsKey(rClass))
			return (false);
		_risticClasses.put(rClass, name);
		return (true);
	}
	static public String risticClassName(Class rClass) {
		return (risticClassName(new StringBuilder(), rClass).toString());
	}
	static public StringBuilder risticClassName(StringBuilder sb, Class rClass) {
		Symbol name = _risticClasses.get(rClass);
		if (name != null) {
			sb.append(name.asjString());
			return (sb);
		}
		sb.append("(.ristic #")
			.append(rClass.getSimpleName()).append(' ')
			.append(rClass.getCanonicalName())
			.append(")");
		return (sb);
	}

	static public class DotRistic extends RisticClass {
		private DotRistic() {
			super(Symbolspace.getSymbol("ristic"), ParserPoint.Default);
		}

		@Override
		public List risticReduce(Context ctxt, List parms)
		throws YagaException {
			// Try and construct a new Ristic class object. If we have an
			// incomplete parameter list or variables, then we create an
			// unbound ristic that will be rebound when required.
			Elements elements = parms.elements().bindNames(ctxt);
			List[] es = elements.asArray();
			if (es.length > 2)
				throw new RisticValidationException(parms, elements, "Only two parameters required");
			if (elements.hasVariableElements() || es.length < 2)
				return (Ristic.newRistic(this, es, parms.parserPoint()));
			AtomSymbol sym1 = es[0].asisSymbol();
			if (sym1 == null)
				throw new RisticValidationException(parms, elements, "Symbol expected for Ristic class name");
			AtomSymbol sym2 = es[1].asisSymbol();
			if (sym2 == null)
				throw new RisticValidationException(parms, elements, "Symbol expected for Ristic class implementation name");

			try {
				Class cls = java.lang.Class.forName(sym2.asjString());
				Method meth = cls.getMethod("newRisticClass", Context.class, Symbol.class, ParserPoint.class);
				if (!addRisticClass(cls, sym1.symbol()))
					throw new RisticValidationException(parms, elements, "Ristic class is already registered");

				RisticClass rClass = (RisticClass) meth.invoke(cls, ctxt, sym1.symbol(), parms.parserPoint());
				Namespace.core.addBinding(sym1, rClass);
				return (rClass);
			} catch (ClassNotFoundException | NoSuchMethodException | IllegalArgumentException |
				InvocationTargetException | IllegalAccessException e) {
				throw new RisticValidationException(parms, elements, e.toString());
			}
		}

		@Override
		public boolean isDotRistic() {
			return (true);
		}

		@Override
		public void print(StringBuilder sb) {
			sb.append(".ristic");
		}
	}
}
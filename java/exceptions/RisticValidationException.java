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
 *  List of elements that have not been bound or evaluated. An expression
 *  is called a Trivial if after binding the result is a list that is
 *  equal to the original expression. Can be used unchanged. Note that
 *  atomic elements are also examples of Trivials.
 */
package yaga.core.exceptions;

import java.io.PrintStream;
import yaga.core.AtomString;
import yaga.core.Elements;
import yaga.core.List;
import yaga.core.Error;
import yaga.core.ristic.Ristic;

/**
 *
 * @author Bruce
 */
public class RisticValidationException extends YagaException
{
	static final String _excMsg = "Ristic validation has failed";
	
	public RisticValidationException(Ristic r, Error[] errs)
		{ super(r, _excMsg); _ristic = r; _elements = r.elements(); _errors = errs; }
	public RisticValidationException(Ristic r, String msg)
		{ super(r, _excMsg); _ristic = r; _elements = r.elements(); _errors = new Error[] { new Error(r, msg) }; }
	public RisticValidationException(List source, Elements elements, Error[] errs)
		{ super(source, _excMsg); _ristic = null; _elements = elements; _errors = errs; }
	public RisticValidationException(List source, Elements elements, String msg)
		{ super(source, _excMsg); _ristic = null; _elements = elements; _errors = new Error[] { new Error(source, msg) }; }
	public RisticValidationException(List source, List[] es, Error[] errs)
		{ super(source, _excMsg); _ristic = null; _elements = Elements.make(es, source); _errors = errs; }
	public RisticValidationException(List source, List[] es, String msg)
		{ super(source, _excMsg); _ristic = null; _elements = Elements.make(es, source); _errors = new Error[] { new Error(source, msg) }; }
	
	private Ristic			_ristic;
	private final Elements	_elements;
	private final Error[]   _errors;
	
	@Override
	public List element()
	{
		if (_ristic != null)
			return (_ristic);
		return (super.element());
	}
	
	public void setRistic(Ristic r)
		{ _ristic = r; }
	public Ristic ristic()
		{ return (_ristic); }
	public Elements elements()
		{ return (_elements); }
	
	public Error[] errors()
		{ return (_errors); }
	
	public void print(PrintStream stream, int indent)
	{
		for (Error e : _errors)
		{
			AtomString.printIndent(stream, indent);
			stream.print(e.formattedMessage());
		}
	}
}

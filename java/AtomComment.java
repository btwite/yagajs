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
 *  Single or multi-line comment atom.
 */
package yaga.core;

import yaga.core.exceptions.YagaException;

/**
 *
 * @author Bruce
 */
public class AtomComment extends AtomicList
{
	static public AtomComment EmptyComment = new AtomComment(new String[0]);
	
	public AtomComment(String[] lines)
		{ _lines = lines; }
	public AtomComment(String[] lines, ParserPoint point)
		{ super(point); _lines = lines; }
	
	private final String[] _lines;
	
	public String[] getLines()
		{ return (_lines); }

	@Override
	public AtomComment zeroValue()
		{ return (EmptyComment); }
	
	// String printing needs a lot more work to handle special characters.
	@Override
	public void print(StringBuilder sb) 
	{
		sb.append(String.format("/\" %s", _lines[0])); 
		for (int i = 1; i < _lines.length; i++)
			{ sb.append('\n'); sb.append(_lines[i]); }
		sb.append(" \"/");
	}
	
	@Override
	public boolean isComment()	{ return (true); }
	
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

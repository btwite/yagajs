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
 */

package yaga.core;

/**
 *
 * @author Bruce
 */
public class ParserPoint 
{
	static final private String Unknown = "<Unknown>";
	static final public ParserPoint Default = new ParserPoint(Unknown, 0, 0);
	
	public ParserPoint(int lineNo, int offCol)
		{ _lineNo = (short)lineNo; _offCol = (short)offCol; _source = null; _parent = null; }
	public ParserPoint(String source, int lineNo, int offCol)
		{ _lineNo = (short)lineNo; _offCol = (short)offCol; _source = source; _parent = null; }
	public ParserPoint(ParserPoint parent, int lineNo, int offCol)
		{ _lineNo = (short)lineNo; _offCol = (short)offCol; _source = parent.source(); _parent = parent; }
	public ParserPoint(ParserPoint parent, String source, int lineNo, int offCol)
		{ _lineNo = (short)lineNo; _offCol = (short)offCol; _source = source; _parent = parent; }

	private final short			_lineNo;
	private final short			_offCol; 
	private final String		_source;
	private final ParserPoint	_parent;

	public int lineNo()
		{ return (_lineNo); }
	public int columnNo()
		{ return (_offCol + 1); }
	public String source()
		{ return (_source); }
	public ParserPoint parent()
		{ return (_parent); }
	
	public String format()
	{ 
		if (_source == Unknown)
			return (String.format("%s", _source)); 
		return (String.format("%s : [%d,%d]", _source, _lineNo, _offCol + 1)); 
	}

	public ParserPoint clone(ParserPoint parent)
		{ return (new ParserPoint(parent, _source, _lineNo, _offCol)); }
	public ParserPoint clone(List e)
		{ return (new ParserPoint(e.parserPoint(), _source, _lineNo, _offCol)); }
	
	public boolean equals(ParserPoint p)
	{
		return (_lineNo == p.lineNo() && columnNo() == p.columnNo() &&
				_source.equals(p.source()));
	}
}

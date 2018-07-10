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
 *  Parser for simple s-expression like syntax.
 */
package yaga.core;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.IOException;
import java.io.PushbackReader;
import java.io.StringReader;
import java.math.BigDecimal;
import java.math.BigInteger;
import java.util.ArrayDeque;
import java.util.ArrayList;
import yaga.core.exceptions.NameException;
import yaga.core.exceptions.ParserException;
import yaga.core.exceptions.YagaException;

@SuppressWarnings("empty-statement")
/**
 *
 * @author Bruce
 */
public class Parser
{
	public abstract interface Input
	{
		public String		sourceName();
		default public int	startLine()		{ return (1); }
		default public int	tabCount()		{ return (4); }
	}
	
	public interface FileInput extends Input
	{
		@Override
		default public String sourceName()
		{ 
			try { return ("file:\\" + file().getCanonicalPath()); }
			catch (IOException x) { return ("file:\\<unknown>"); }
		}
		public File file();
	}
	
	public interface ListInput extends Input
	{
		@Override
		default public String sourceName()
			{  return ("list:\\<input>"); }
		@Override
		default public int	startLine()		{ return (0); }
		
		public Elements elements();
	}
	
	private abstract class InputHandler
	{
		public abstract List nextExpression() throws YagaException;
		public abstract boolean hasMoreTextInput() throws YagaException;
		public abstract Input input();
		public void initialise() throws YagaException
			{ /* Do nothing */ } 
		public void finalise() throws YagaException
			{ /* Do nothing */ } 
	}
	
	private class FileHandler extends InputHandler
	{
		public FileHandler(FileInput in)
			{ _fi = in; }
				
		private final FileInput _fi;

		@Override
		public Input input()
			{ return (_fi); }

		@Override
		public void initialise()
			throws YagaException
		{
			try
				{ _reader = new PushbackReader(new FileReader(_fi.file())); }
			catch (FileNotFoundException x)
				{ throw new ParserException(ParserException.ErrorType.IO, "File IO error", x); }
		}

		@Override
		public void finalise()
			throws YagaException
		{
			try
				{ _reader.close(); }
			catch (IOException x)
				{ throw new ParserException(ParserException.ErrorType.IO, "File IO error", x); }
		}

		@Override
		public List nextExpression()
			throws YagaException
		{ 
			try
			{
				if (hasMoreTextInput())
					return (parseText());
			}
			catch (EndOfTextInput e) { }
			return (null);
		}

		@Override
		public boolean hasMoreTextInput()
			throws YagaException
			{ return (!isEndOfStream()); }
	}
	
	private class ListHandler extends InputHandler
	{
		public ListHandler(Context ctxt, ListInput in)
			throws YagaException
			{ _li = in; _elements = in.elements().asExpandedArray(ctxt); _idx = 0; }
				
		private final ListInput	_li;
		private int				_idx;
		private final List[]	_elements;
		
		@Override
		public Input input()
			{ return (_li); }
		
		@Override
		public List nextExpression()
			throws YagaException
		{
			try
			{
				if (hasMoreTextInput())
					return (parseText());
			}
			catch (EndOfTextInput e) { }

			if (_idx >= _elements.length)
				return (null);
			_lineNo++; _offCol = -1;
			return (_elements[_idx++]);
		}

		@Override
		public boolean hasMoreTextInput()
			throws YagaException
		{ 
			if (!isEndOfStream())
				return (true);
			if (_reader != null)
			{
				try { _reader.close(); }
				catch (IOException x) { addError(x.toString()); }
				_reader = null;
			}

			if (_idx >= _elements.length)
				return (false);
			if (!_elements[_idx].isString())
				return (false);

			// Have a string, so we can continue text parsing.
			_flEOS = false;
			List ein = _elements[_idx++];
			_lineNo++; _offCol = -1;
			_reader = new PushbackReader(new StringReader(ein.asisString().asjString()));
			return (true);
		}
	}
	
	static public Parser parse(Context ctxt, FileInput fi)
		{ return ((new Parser(ctxt, fi)).start()); }
	static public Parser parse(Context ctxt, ListInput li)
		throws YagaException
		{ return ((new Parser(ctxt, li)).start()); }

	private Parser(Context ctxt, FileInput in)
		{ _ctxt = ctxt; _hand = new FileHandler(in); }
	private Parser(Context ctxt, ListInput in)
		throws YagaException
		{ _ctxt = ctxt; _hand = new ListHandler(ctxt, in); }

	private final Context			_ctxt;
	private final InputHandler		_hand;
	
	private char					_curChar;
	private PushbackReader			_reader;
	private int						_lineNo;
	private int						_offCol;
	private int						_tabCount;
	private boolean					_flEOS;
	private String					_eol;
	private String					_sourceName;
	private ArrayList<Error>		_errors;
	private ParserPoint				_tokenPoint;
	private ArrayDeque<ParserPoint>	_parentPoints;
	private ParserPoint				_parentPoint;
	private ArrayList<List>			_exprs;
	private ArrayDeque<Character>	_lvlExpr;
	
	public Parser start()
	{ 
		Exception ex;
		boolean finalising = false;
		initialise();
		try
		{
			_hand.initialise();
			List e = _hand.nextExpression();
			for (; e != null; e = _hand.nextExpression())
				_exprs.add(e);
			finalising = true;
			_hand.finalise();
			return (this);
		}
		catch (YagaException x)
			{ addError(x.getMessage()); ex = x; }
		catch (Exception e)
			{ addError(e.toString()); ex = e; }
		_ctxt.logException(ex); 
		if (!finalising)
			{ try { _hand.finalise(); } catch (Exception x) { } }
		return (this);
	}
	
	private void initialise()
	{ 
		_lvlExpr		= new ArrayDeque(); 
		_lineNo			= _hand.input().startLine();
		_tabCount		= _hand.input().tabCount();
		_flEOS			= false;
		_eol			= System.lineSeparator();
		_errors			= new ArrayList();
		_exprs			= new ArrayList();
		_parentPoints	= new ArrayDeque();
		_parentPoint	= ParserPoint.Default;
		_sourceName		= _hand.input().sourceName();
		_reader			= null;
	}
	
	public List[] expressions()
		{ return (_exprs.toArray(new List[_exprs.size()])); }
		
	
	public int currentLine()
		{ return (_lineNo); }
	public int currentColumn()
		{ return (_offCol + 1); }
	public int currentColumnOffset()
		{ return (_offCol); }
	
	public Error[] errors()
		{ return (_errors.toArray(new Error[_errors.size()])); }
	public boolean hasErrors()
		{ return (_errors.size() > 0); }
	public interface ErrorsDo
		{ public void run(Error err); }
	public void errorsDo(ErrorsDo fn)
	{
		for (Error err : _errors)
			fn.run(err);
	}
	
	private List parseText()
		throws YagaException, EndOfTextInput
	{
		// Skip any initial white space
		while (Character.isWhitespace(readChar()))
		{
			if (_flEOS && !_hand.hasMoreTextInput())
				throw tEndOfTextInput;
		}

		switch (_curChar)
		{
		case ')' :
		case ']' :
			if (_lvlExpr.isEmpty())
				throw new ParserException(ParserException.ErrorType.STARTOFEXPRESSION, "Missing start of expression");
			if (_lvlExpr.pop() != _curChar)
				throw new ParserException(ParserException.ErrorType.BRACKETS, "Mismatching brackets");
			return (null); // End of expression detected.
			
		case '(' :
			return (parseExpression(')', (e,p) -> new Expression.ProdExpr(e, p)));
		case '[' :
			return (parseExpression(']', (e,p) -> new Expression.DataExpr(e, p)));
			
		case '#' :
			return (parseSymbol());
			
		case '\\' :
			if (Character.isWhitespace(readNextChar()))
				{ pushbackChar(_curChar); _curChar = '\\'; break; }
			// Anything that is escaped must be a name
			break;
			
		case '\'' :
			return (parseChar());
			
		case '"' :
			return (parseString());
			
		case '/' :
			if (readNextChar() != '"')
			{
				pushbackChar(_curChar); _curChar = '/';
				break;
			}
			return (parseComment());
			
		case '-' :
			char c = readNextChar();
			pushbackChar(_curChar); _curChar = '-';
			if (!Character.isDigit(c))
				break;
			return (parseNumber());
			
		case '+' :
			c = readNextChar();
			pushbackChar(_curChar); _curChar = '+';
			if (!Character.isDigit(c))
				break;
			return (parseNumber());
			
		default :
			if (Character.isDigit(_curChar))
				return (parseNumber());
			break;
		}
		// The default is a name atom.
		return (parseName());
	}

	static private interface ParseExprFn
		{ public List run(Elements elements, ParserPoint point) throws YagaException; }
	
	private List parseExpression(char bracket, ParseExprFn fn)
		throws YagaException
	{
		int lvlExpr = _lvlExpr.size(); _lvlExpr.push(bracket);
		ParserPoint point = newParentPoint();
		ArrayList<List> list = new ArrayList();
		boolean isTrivial = true;
		
		List e;
		while ((e = _hand.nextExpression()) != null)
		{
			if (!e.isTrivial())
				isTrivial = false;
			list.add(e);
		}
		if (lvlExpr != _lvlExpr.size())
			throw new ParserException(ParserException.ErrorType.ENDOFEXPRESSION, "Missing end of expression");
		
		List eList =
			list.isEmpty() ? Lists.nil(point) : 
				(isTrivial ?
					Lists.newData(list.toArray(new List[list.size()]), point) :
					fn.run(Elements.make(list.toArray(new List[list.size()])), point));

		popParentPoint();
		return (eList);
	}
	
	private List parseName()
		throws YagaException
		{ return (newName(readToken().toString())); }
	
	private List newName(StringBuilder name)
		{ return (newName(name.toString())); }
	private List newName(String name)
	{
		try
			{ return (Name.newUnboundName(name, _tokenPoint)); }
		catch (NameException e)
			{ addError(_tokenPoint, e.getMessage()); }
		return (new Name.Unbound(name, _tokenPoint));
	}
			
	
	private List parseSymbol()
		throws YagaException
	{ 
		StringBuilder tok = readToken();
		if (tok.length() == 1)
			return (newName(tok));
		return ((Symbol.symbolToElement(tok.substring(1))).setParserPoint(_tokenPoint)); 
	}
	
	private List parseChar()
		throws YagaException
	{
		String s = parseString('\'');
		if (s.length() == 1)
			return ((new AtomChar(s.charAt(0))).setParserPoint(_tokenPoint));
		addError(_tokenPoint, "Invalid character constant");
		return ((new AtomChar('?')).setParserPoint(_tokenPoint));
	}

	private List parseString()
		throws YagaException
		{ return ((new AtomString(parseString('"'))).setParserPoint(_tokenPoint)); }

	
	private String parseString(char delimiter)
		throws YagaException
	{
		_tokenPoint		  = newParserPoint();
		int curLine		  = _lineNo;
		int curOff		  = _offCol;
		int oEscape		  = -1;
		StringBuilder str  = new StringBuilder();
		/*
		*  Strings can are limited to a single line. String concatenation
		*  function can be used to merge multi-line strings.
		*/
		try
		{
			for (;;)
			{
				readChar();
				if (curLine != _lineNo)
				{
					addError(_tokenPoint, "String has not been terminated");
					if (oEscape >= 0)
						addError("Invalid use of escape in String constant");
					pushbackChar(_curChar);
					break;
				}
				if (_offCol > curOff + 1)
				{
					if (oEscape >= 0)
					{
						addError("Invalid use of escape in String constant");
						oEscape = -1;
					}
					// Fill in tabbing locations with spaces.
					for (int i = _offCol - (curOff + 1); i > 0; i--)
						str.append(' ');
				}
				curOff = _offCol;
				if (oEscape >= 0)
				{
					oEscape = -1;
					if (Character.isWhitespace(_curChar))
						addError("Invalid use of escape in String constant");
					switch (_curChar)
					{
					case 'n' :	str.append('\n');		break;
					case 't' :	str.append('\t');		break;
					case 'b' :	str.append('\b');		break;
					case 'f' :	str.append('\f');		break;
					case 'r' :	str.append('\r');		break;
					default :	str.append(_curChar);	break;
					}
					continue;
				}
				if (_curChar == '\\')
				{
					oEscape = _offCol;
					continue;
				}
				if (_curChar == delimiter)
					break;
				str.append(_curChar);
			}
			return (str.toString());
		}
		catch (ParserException e)
		{
			if (e.errorType() == ParserException.ErrorType.ENDOFSTREAM)
				addError(_tokenPoint, "String has not been terminated");
			throw e; // Might as well re-throw exception as no end of stream.
		}
	}
	
	private List parseComment()
		throws YagaException
	{
		_tokenPoint = newParserPoint();
		int curLine = _lineNo;
		int curOff  = _offCol;
		int lvl		= 1;
		StringBuilder str  = new StringBuilder();
		ArrayList<String> lines = new ArrayList();
		/*
		*  Comments can span multiple lies so we create a String representation
		*  for each line.
		*  We are currently position on the first '"' character.
		*/
		for (;;)
		{
			try
			{
				readChar();
				if (curLine != _lineNo)
				{
					curLine = _lineNo;
					lines.add(str.toString());
					if (str.length() > 0)
						str.delete(0, str.length());
				}
				else if (_offCol > curOff + 1)
				{
					// Fill in tabbing locations with spaces.
					for (int i = _offCol - (curOff + 1); i > 0; i--)
						str.append(' ');
				}
				curOff = _offCol;
				if (_curChar == '"')
				{
					if (readNextChar() == '/')
					{
						if (--lvl == 0)
							break;
					}
					pushbackChar(_curChar); _curChar = '"';
				}
				if (_curChar == '/')
				{
					if (readNextChar() == '"')
						lvl++;
					pushbackChar(_curChar); _curChar = '"';
				}
				str.append(_curChar);
			}
			catch (ParserException e)
			{
				if (e.errorType() == ParserException.ErrorType.ENDOFSTREAM)
				{
					if (_hand.hasMoreTextInput())
						continue;
					addError(_tokenPoint, "Missing end of comment");
				}
				throw e; // Might as well re-throw exception as no end of stream.
			}
		}
		lines.add(str.toString());

		return ((new AtomComment(lines.toArray(new String[lines.size()]))).setParserPoint(_tokenPoint));
	}

	private enum NumType
		{ INTEGER, DECIMAL, FLOAT, SIGNRADIX, USIGNRADIX }
	
	private List parseNumber()
		throws YagaException
	{
		StringBuilder tok = readToken();
		// Analyse the token and determine which number type if any applies.
		int i;
		if (tok.length() > 2 &&
			Character.digit(tok.charAt(0), 10) == 0 && (i = "xXbBoO".indexOf(tok.charAt(1))) >= 0)
		{
			final int radixs[] = new int[] { 16, 16, 2, 2, 8, 8 };
			final int nBits[] = new int[] { 4, 4, 1, 1, 3, 3 };
			final NumType types[] = new NumType[] { NumType.USIGNRADIX, NumType.USIGNRADIX, 
													NumType.USIGNRADIX, NumType.USIGNRADIX, 
													NumType.USIGNRADIX, NumType.USIGNRADIX };
			return (parseRadix(tok, radixs[i], nBits[i], types[i]));
		}
		
		// Don't have a defined radix, so check the validity of the number.
		NumType type = NumType.INTEGER;
		boolean flDecimal = false, flExponent = false, flExpSign = true, flType = false;
		char c = tok.charAt(i = 0);
		if (c == '+' || c == '-')
			i++;

		// If we don't have a valid number then just answer a name.
		// If this is actually an error then it will be picked up at bind
		// time by compilers.
		for (; i < tok.length(); i++)
		{
			if (flType)
				return (newName(tok));
			if (Character.isDigit(c = tok.charAt(i)))
				continue;
			switch (c)
			{
			case '.' :
				if (flDecimal)
					return (newName(tok));
				flDecimal = true;
				type = NumType.DECIMAL;
				continue;
			case 'e' :
			case 'E' :
				if (flExponent)
					return (newName(tok));
				flExponent = true;
				type = NumType.FLOAT;
				continue;
			case '+' :
				if (!flExponent || flExpSign)
					return (newName(tok));
				flExpSign = true;
				continue;
			case '-' :
				if (!flExponent || flExpSign)
					return (newName(tok));
				flExpSign = true;
				continue;
			default :
				if ("ildgf".indexOf(c) >= 0)
				{
					flType = true;
					continue;
				}
			}
			return (newName(tok));
		}
		String stok = flType ? tok.substring(0, tok.length() - 1) : tok.toString();
		if (type == NumType.INTEGER)
		{
			if (stok.length() > 18)
			{
				BigInteger g = new BigInteger(stok);
				if (flType)
					return (integerToType(tok, g, tok.length() - 1));
				if ((g.compareTo(BigInteger.ZERO) < 0 && g.compareTo(BigInteger.valueOf(Long.MIN_VALUE)) < 0) ||
					(g.compareTo(BigInteger.ZERO) > 0 && g.compareTo(BigInteger.valueOf(Long.MAX_VALUE)) > 0))
					return ((new AtomInteger(g)).setParserPoint(_tokenPoint));
				return ((new AtomInt64(g.longValue())).setParserPoint(_tokenPoint));
			}
			else
			{
				long l = Long.parseLong(stok);
				if (flType)
					return (longToType(tok, l, tok.length() - 1));
				if ((l < 0 && l < Integer.MIN_VALUE) || (l > 0 && l > Integer.MAX_VALUE))
					return ((new AtomInt64(l)).setParserPoint(_tokenPoint));
				return ((new AtomInt32((int)l)).setParserPoint(_tokenPoint));
			}
		}
		
		BigDecimal d = new BigDecimal(stok);
		if (flType)
			return (decimalToType(tok, d, tok.length() - 1));
		if ((d.compareTo(BigDecimal.ZERO) < 0 && d.compareTo(BigDecimal.valueOf(Double.MIN_VALUE)) < 0) ||
			(d.compareTo(BigDecimal.ZERO) > 0 && d.compareTo(BigDecimal.valueOf(Double.MAX_VALUE)) > 0))
			return ((new AtomDecimal(d)).setParserPoint(_tokenPoint));
		return ((new AtomFloat(d.floatValue())).setParserPoint(_tokenPoint));
	}
	
	private List parseRadix(StringBuilder tok, int radix, int nBits, NumType type)
	{
		int initialiser = 
			Character.digit(tok.charAt(2), radix) >= radix / 2 && 
				type == NumType.SIGNRADIX ? -1 : 0;
		int tokLength = tok.length();
		if ((tokLength - 2) * nBits <= 64)
		{
			long num = initialiser;
			for (int i = 2; i < tokLength; i++)
			{
				long digit = Character.digit(tok.charAt(i), radix);
				if (digit < 0)
					return (longToType(tok, num, i));
				num = (num << nBits) | digit;
			}
			if ((tokLength - 2) * nBits <= 32)
				return ((new AtomInt32((int)num)).setParserPoint(_tokenPoint));
			return ((new AtomInt64(num)).setParserPoint(_tokenPoint));
		}
		BigInteger num = BigInteger.valueOf(initialiser);
		for (int i = 2; i < tok.length(); i++)
		{
			long digit = Character.digit(tok.charAt(i), radix);
			if (digit < 0)
					return (integerToType(tok, num, i));
			num = num.shiftLeft(nBits).or(BigInteger.valueOf(digit));
		}
		return ((new AtomInteger(num)).setParserPoint(_tokenPoint));
	}
	
	private List longToType(StringBuilder tok, long num, int iTypeCode)
	{
		if (tok.length() - 1 > iTypeCode)
			return (newName(tok));
	
		switch (tok.charAt(iTypeCode))
		{
		case 'i' : // int32
			if ((num < 0 && num < Integer.MIN_VALUE) ||
				(num > 0 && num > Integer.MAX_VALUE))
				addError(_tokenPoint, "int32 value is out of range");
			return ((new AtomInt32((int)num)).setParserPoint(_tokenPoint));
		case 'l' : // int64
			return ((new AtomInt64(num)).setParserPoint(_tokenPoint));
		case 'g' : // integer
			return ((new AtomInteger(BigInteger.valueOf(num))).setParserPoint(_tokenPoint));
		case 'd' : // decimal
			return ((new AtomDecimal(BigDecimal.valueOf(num))).setParserPoint(_tokenPoint));
		case 'f' : // float
			return ((new AtomFloat(num)).setParserPoint(_tokenPoint));
		default :
			return (newName(tok));
		}
	}
	
	private List integerToType(StringBuilder tok, BigInteger num, int iTypeCode)
	{
		if (tok.length() - 1 > iTypeCode)
			return (newName(tok));
	
		switch (tok.charAt(iTypeCode))
		{
		case 'i' : // int32
			if ((num.compareTo(BigInteger.ZERO) < 0 && num.compareTo(BigInteger.valueOf(Integer.MIN_VALUE)) < 0) ||
				(num.compareTo(BigInteger.ZERO) > 0 && num.compareTo(BigInteger.valueOf(Integer.MAX_VALUE)) > 0))
				addError(_tokenPoint, "int32 value is out of range");
			return ((new AtomInt32(num.intValue())).setParserPoint(_tokenPoint));
		case 'l' : // int64
			if ((num.compareTo(BigInteger.ZERO) < 0 && num.compareTo(BigInteger.valueOf(Long.MIN_VALUE)) < 0) ||
				(num.compareTo(BigInteger.ZERO) > 0 && num.compareTo(BigInteger.valueOf(Long.MAX_VALUE)) > 0))
				addError(_tokenPoint, "int64 value is out of range");
			return ((new AtomInt64(num.longValue())).setParserPoint(_tokenPoint));
		case 'g' : // integer
			return ((new AtomInteger(num)).setParserPoint(_tokenPoint));
		case 'd' : // decimal
			return ((new AtomDecimal(new BigDecimal(num))).setParserPoint(_tokenPoint));
		case 'f' : // float
			BigDecimal dec = new BigDecimal(num);
			if ((num.compareTo(BigInteger.ZERO) < 0 && dec.compareTo(BigDecimal.valueOf(Double.MIN_VALUE)) < 0) ||
				(num.compareTo(BigInteger.ZERO) > 0 && dec.compareTo(BigDecimal.valueOf(Double.MAX_VALUE)) > 0))
				addError(_tokenPoint, "float value is out of range");
			return ((new AtomFloat(num.floatValue())).setParserPoint(_tokenPoint));
		default :
			return (newName(tok));
		}
	}
	
	private List decimalToType(StringBuilder tok, BigDecimal num, int iTypeCode)
	{
		if (tok.length() - 1 > iTypeCode)
			return (newName(tok));
	
		switch (tok.charAt(iTypeCode))
		{
		case 'i' : // int32
			addError(_tokenPoint, "Invalid int32 constant");
			return ((new AtomInt32(num.intValue())).setParserPoint(_tokenPoint));
		case 'l' : // int64
			addError(_tokenPoint, "Invalid int64 constant");
			return ((new AtomInt64(num.longValue())).setParserPoint(_tokenPoint));
		case 'g' : // integer
			addError(_tokenPoint, "Invalid integer constant");
			return ((new AtomInteger(num.toBigInteger())).setParserPoint(_tokenPoint));
		case 'd' : // decimal
			return ((new AtomDecimal(num)).setParserPoint(_tokenPoint));
		case 'f' : // float
			if ((num.compareTo(BigDecimal.ZERO) < 0 && num.compareTo(BigDecimal.valueOf(Double.MIN_VALUE)) < 0) ||
				(num.compareTo(BigDecimal.ZERO) > 0 && num.compareTo(BigDecimal.valueOf(Double.MAX_VALUE)) > 0))
				addError(_tokenPoint, "float value is out of range");
			return ((new AtomFloat(num.floatValue())).setParserPoint(_tokenPoint));
		default :
			return (newName(tok));
		}
	}

	private StringBuilder readToken()
		throws YagaException
	{
		_tokenPoint = newParserPoint();
		StringBuilder tok = new StringBuilder();
		tok.append(_curChar);
		while (readTokenChar() != 0)
			tok.append(_curChar);
		return (tok);
	}
	
	private char readTokenChar()
		throws YagaException
	{
		if (!Character.isWhitespace(readNextChar()) && 
			_curChar != ')' && _curChar != '(' && _curChar != ']' && _curChar != '[')
			return (_curChar);
		pushbackChar(_curChar);
		return (0);
	}

	// Assume that we have already consumed the intial character of the
	// token that we are processing. _offCol == colNo of previous char
	private ParserPoint newParserPoint()
		{ return (new ParserPoint(_parentPoint, _sourceName, _lineNo, _offCol)); }
	
	private void pushParentPoint(ParserPoint point)
	{
		_parentPoints.push(_parentPoint);
		_parentPoint = point;
	}
	
	private void popParentPoint()
		{ _parentPoint = _parentPoints.pop(); }
	
	private ParserPoint newParentPoint()
	{
		ParserPoint point = newParserPoint();
		pushParentPoint(point);
		return (point);
	}

	private Error addError(String msg)
		{ return (addError(newParserPoint(), msg)); }
	private Error addError(ParserPoint point, String msg)
		{ Error e = new Error(point, msg); _errors.add(e); return (e); }
	
	private char readChar()
		throws YagaException
	{
		if (readNextChar() == _eol.charAt(0))
		{
			if (_eol.length() > 1)
			{
				int ic = read();
				if (ic == -1)
					{ return (_curChar); }
				if ((char)ic != _eol.charAt(1))
					{ unread(ic); return (_curChar); }
			}
			_lineNo++; _offCol = -1;
			return (readChar());
		}
		else if (_curChar == '\n')
		{
			_lineNo++; _offCol = -1;
			return (readChar());
		}
		else if (_curChar == '\t')
		{
			_offCol = (_offCol + _tabCount) / _tabCount * _tabCount - 1;
			return (readChar());
		}
		return (_curChar);
	}

	private char readNextChar()
		throws YagaException
	{
		int ic = read();
		if (ic == -1)
		{ 
			if (_flEOS) 
				throw new ParserException(ParserException.ErrorType.ENDOFSTREAM, "End of stream detected");
			_flEOS = true; 
			ic = Character.SPACE_SEPARATOR;
		}
		_curChar = (char)ic; _offCol++;
		return (_curChar);
	}
	
	public boolean isEndOfStream()
	{
		if (_flEOS || _reader == null)
			return (true);
		try
			{ readNextChar(); pushbackChar(_curChar); }
		catch (Exception e)
			{ }
		return (_flEOS);
	}
	
	private void pushbackChar(char c)
		throws YagaException
		{ _offCol--; unread(c); }
	
	public class Error
	{
		private Error(ParserPoint point, String msg)
			{ _point = point; _msg = msg; }
		
		private final ParserPoint _point;
		private final String _msg;
		
		public ParserPoint parserPoint()
			{ return (_point); }
		public String message()
			{ return (_msg); }
		
		public String formattedMessage()
			{ return (String.format("%s - %s", _point.format(), _msg)); }
	}
	
	private int read()
		throws YagaException
	{
		try
			{ return (_reader.read()); }
		catch (IOException e)
			{ throw new ParserException(ParserException.ErrorType.IO, e.toString()); }
	}
	
	private void unread(char ch)
		throws YagaException
	{
		try
			{ _reader.unread(ch); }
		catch (IOException e)
			{ throw new ParserException(ParserException.ErrorType.IO, e.toString()); }
	}
	
	private void unread(int ch)
		throws YagaException
	{
		try
			{ _reader.unread(ch); }
		catch (IOException e)
			{ throw new ParserException(ParserException.ErrorType.IO, e.toString()); }
	}
	
	static private EndOfTextInput tEndOfTextInput = new EndOfTextInput();
	static private class EndOfTextInput extends Throwable
		{ }
}

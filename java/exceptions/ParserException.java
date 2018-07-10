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
package yaga.core.exceptions;

import yaga.core.Lists;

/**
 *
 * @author Bruce
 */
public class ParserException extends YagaException
{
	public enum ErrorType
		{ ENDOFSTREAM, STARTOFEXPRESSION, IO, ENDOFEXPRESSION, BRACKETS   }
	
	public ParserException(ErrorType type, String msg)
		{ super(Lists.nil(), msg); _type = type; }
	public ParserException(ErrorType type, String msg, Throwable rsn)
		{ super(Lists.nil(), msg, rsn); _type = type; }
	
	private final ErrorType _type;
	
	public ErrorType errorType()
		{ return (_type); }
}

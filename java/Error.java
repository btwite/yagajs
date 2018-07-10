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
 *  Common Error representation with message string and element
 */
package yaga.core;

public class Error
{
		public Error(String msg)
			{ this(Lists.nil(), msg); }
		public Error(List e, String msg)
			{ _eErr = e; _msg = msg; _point = e.parserPoint(); }
		public Error(String msg, ParserPoint point)
			{ _eErr = Lists.nil(); _msg = msg; _point = point; }

		private final List		_eErr;
		private final String		_msg;
		private final ParserPoint	_point;

		public List element()
			{ return (_eErr); }
		public String message()
			{ return (_msg); }

		public String formattedMessage()
			{ return (String.format("%s - %s", _point.format(), _msg)); }
}

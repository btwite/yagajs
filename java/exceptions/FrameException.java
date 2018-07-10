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

import yaga.core.Name;
import yaga.core.List;
import yaga.core.Variable;

/**
 *
 * @author Bruce
 */
public class FrameException extends YagaException
{
	public FrameException(Variable v, String msg)
		{ super(v, msg); _var = v; }
	public FrameException(Variable v, String msg, Throwable rsn)
		{ super(v, msg, rsn); _var = v; }
	
	private Variable _var;
	
	public Variable variable()
		{ return (_var); }
	
	static public class Read extends FrameException
	{
		public Read(Variable v, String msg)
			{ super(v, msg); }
		public Read(Variable v, String msg, Throwable rsn)
			{ super(v, msg, rsn); }
	}
	
	static public class Write extends FrameException
	{
		public Write(Variable v, List val, String msg)
			{ super(v, msg); }
		public Write(Variable v, List val, String msg, Throwable rsn)
			{ super(v, msg, rsn); }
		
		private List _value;
		
		public List value()
			{ return (_value); }
	}
}

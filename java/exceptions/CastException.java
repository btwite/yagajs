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

import yaga.core.List;

/**
 *
 * @author Bruce
 */
public class CastException extends YagaException
{
	public CastException(List e, Class cls)
	{ 
		super(e, String.format("%s cannot be cast to %s", e.getClass().getCanonicalName(), cls.getCanonicalName())); 
		_class = cls;
	}
	
	private final Class	  _class;
	
	public Class cls()
		{ return (_class); }
}

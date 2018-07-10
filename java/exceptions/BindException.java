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

import yaga.core.Context;

/**
 *
 * @author Bruce
 */
public class BindException extends YagaException
{
	public BindException(Context ctxt)
		{ super(ctxt.element(), ""); _ctxt = ctxt; }
	public BindException(Context ctxt, Throwable rsn)
		{ super(ctxt.element(), "", rsn); _ctxt = ctxt; }
	
	private final Context _ctxt;
	
	public Context context()
		{ return (_ctxt); }
}

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
 *  Symbols are unique across all yaga namespaces.
 */

package yaga.core;

import java.util.HashMap;

/**
 *
 * @author Bruce
 */
public final class Symbolspace
{
	static public final HashMap<String,Symbol> _symbols = new HashMap();
	
	static public final synchronized Symbol getSymbol(String symName)
	{
		Symbol sym = _symbols.get(symName);
		if (sym == null)
		{
			sym = new Symbol(symName);
			_symbols.put(symName, sym);
		}
		return (sym);
	}
}

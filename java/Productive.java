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
 *  Interface for those classes that implement productive behaviour that can
 *  be assigned to an evaluator.
 */
package yaga.core;

import java.io.PrintStream;
import yaga.core.exceptions.BinderException;
import yaga.core.exceptions.YagaException;

/**
 *
 * @author Bruce
 */
public interface Productive
{
	public boolean isProductive();
	public Productive asisProductive();
	
	public ParserPoint parserPoint();
	public int precedence();
	
	public boolean isProductiveVariable();
	public Variable.ProductiveVariable asisProductiveVariable();
	
	public boolean isPipeline();
	public Pipeline asisPipeline();
	
	public boolean isStep();
	public Pipeline.Step asisStep();
	
	Production.Map mapExecute(Context ctxt, List[] es, int iep, int ies, int iee)
		throws BinderException;
	Production.Map mapStep(Context ctxt, List[] es, int iep)
		throws BinderException;
	
	public List step(Context ctxt, List parms)
		throws YagaException;

	public List bindingStep(Context ctxt, List parms)
		throws YagaException;
	
	public void trace();
	public void trace(String s);
	public void trace(PrintStream stream);
	public void trace(PrintStream stream, String s);
}

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
 *  TestRig for yaga
 */
package yaga.core;

import java.io.File;
import java.util.Scanner;
import yaga.core.exceptions.BindException;
import yaga.core.exceptions.YagaException;

/**
 *
 * @author Bruce
 */
public class YagaCommand
{
	static public void main(String[] args)
		throws Exception
	{
		Context ctxt = new Context();
		if (args.length == 0)
		{
			System.out.println("Yaga files required. End with 'stdin' for command line");
			return;
		}
		ctxt.openLog();
		yagaFiles(ctxt, args);
		ctxt.closeLog();
	}
	
	static private void yagaFiles(Context ctxt, String[] args)
	{
		boolean flError = false;
		for (int i = 0; i < args.length - 1; i++)
		{
			// Only last file is evaluated. Initial files are assumed
			// to create definitions
			List[] exprs = parseFile(ctxt, args[i]);
			if (exprs == null)
				{ System.out.println(); flError = true; continue; }
			if (!bind(ctxt, exprs))
				flError = true;
		}
		if (flError)
			return;

		if (args[args.length - 1].equals("stdin"))
			{ yagaCommandLine(ctxt); return; }

		List[] exprs = parseFile(ctxt, args[args.length - 1]);
		if (exprs == null)
			return;
		
		for (List expr : exprs)
		{
			// Skip expressions that are simply comments.
			
			try
			{
				if (expr.isComment())
					continue;
				System.out.println("\nExpression : ");
				expr.print(System.out);
				System.out.println();
				List boundExpr;
				if ((boundExpr = bind(ctxt, expr)) == null)
					continue;

				List res = ctxt.reduce(boundExpr);
				System.out.println("Reduces to : " + res);
				res.print(System.out); System.out.println();
			}
			catch (YagaException x)
				{ printFlow(ctxt, x, x.getMessage()); }
			catch (Exception x)
				{ printFlow(ctxt, x, x.toString()); }
		}
	}
	
	static private void yagaCommandLine(Context ctxt)
	{
		try
		{  
			Namespace parent = Namespace.core.bind(new AtomSymbol(".yaga")).element.asNamespace().namespace();
			ctxt.setPublicNamespace(new Namespace("yaga", parent)); 
		}
		catch (YagaException x)
		{
			System.out.println("Unable to create the 'yaga' namespace. Exiting ...");
			ctxt.logException(x);
			return;
		}
		System.out.println("\nWelcome to the Yaga evaluator");
		System.out.println("Type a Yaga expression at the prompt and hit <enter> to evaluate");
		System.out.println("Type 'exit' to end the evaluator");

		Scanner in = new Scanner(System.in);
		for (;;)
		{
			System.out.printf("%s > ", ctxt.namespace().name().asjString());
			String line = in.nextLine();
			if (line.equals("exit"))
				return;
			try
			{
				List expr = parse(ctxt, line);
				if (expr == null)
					continue;
				
				List boundExpr = bind(ctxt, expr);
				if (boundExpr == null)
					continue;

				List res = ctxt.reduce(boundExpr);
				res.print(System.out); System.out.println();
			}
			catch (YagaException x)
				{ printFlow(ctxt, x, x.getMessage()); }
			catch (Exception x)
				{ printFlow(ctxt, x, x.toString()); }
		}
	}
	
	static private void printFlow(Context ctxt, Exception x, String msg)
	{
		System.out.println("Failed because : " + msg);
		if (ctxt.hasFlow())
		{
			System.out.println("Evaluation flow: ");
			ctxt.printFlow(System.out);
		}
		ctxt.logException(x);
	}
	
	static private List[] parseFile(Context ctxt, String fileName)
	{
		File file;
		try
			{ file = new File(fileName); }
		catch (Exception e) 
			{ System.out.printf("Error opening file. File(%s) Err(%s)", fileName, e.getMessage()); return(null); }
		
		Parser parser = Parser.parse(ctxt, () -> { return (file); });
		if (parser.hasErrors())
		{
			System.out.printf("Errors parsing file. File(%s) : ", fileName);
			parser.errorsDo((e) ->System.out.println(e.formattedMessage()));
			return (null);
		}
		return (parser.expressions());
	}
	
	static private List parse(Context ctxt, String sExpr)
		throws YagaException
	{
		Parser parser = Parser.parse(ctxt, new Parser.ListInput()
		{
			@Override
			public Elements elements() { return (Elements.make(new AtomString(sExpr))); }
			@Override
			public String sourceName() { return ("<stdin>"); }
		});
		if (parser.hasErrors())
		{ 
			parser.errorsDo((e) -> System.out.println(e.formattedMessage())); 
			return (null); 
		}
		List[] exprs = parser.expressions();
		return (exprs.length == 0 ? null : exprs[0]);
	}
	
	static private boolean bind(Context ctxt, List[] exprs)
	{ 
		boolean flSuccess = true;
		for (List expr : exprs)
		{
			if (bind(ctxt, expr) == null)
				flSuccess = false;
		}
		return (flSuccess);
	}

	static private List bind(Context ctxt, List expr)
	{
		try 
			{  return (ctxt.bind(expr)); }
		catch (BindException x)
		{
			x.context().printBindErrors(System.out);
			if (ctxt.hasFlow())
			{
				System.out.println("Bind evaluation flow : ");
				ctxt.printFlow(System.out);
			}
			ctxt.logException(x);
			System.out.println();
		}
		return (null);
	}
}

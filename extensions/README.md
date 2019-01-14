# @yagajs/extensions

The *extensions* library implements Javascript language customisations built on Babel version 7. Wherever possible customisations are transpiled via a Babel plugin. However, any new syntax will generate an error in Babel. To overcome this the *extensions* library includes a custom Babel parser that injects the new syntax into the output AST structure that can then be navigated by the *extensions* plugin.

## PREREQUISITES

* An ECAScript 2015 complient Javascript environment
* Node version 8.11.2 or greater
* @yagajs/toolbox
* @Babel/core version 7 and above
* fs and path

## INSTALLATION

* NPM Package - `npm install @yagajs/extensions'

## TESTING

See [yagajs](https://github.com/btwite/yagajs/blob/master/README.md#TESTING)

## JAVASCRIPT LANGUAGE EXTENSIONS

### Bind Operator `->`

The `->` bind operator is an enhanced and idempotent form of the `Function.prototype.bind()` function that answers a new function after binding the left hand parameter value to the *this* property of the function that is determined from the right hand parameter value of the operator. 

Apart from providing a simpler and more expressive syntax the `->` operator is idempotent in that the operator answers the same function for the same input.

The `->` operator has three forms:

#### Object Property Reference

> `foo->bar`

In the example above the `->` operator will bind the `foo` object to *this* of the function property `bar` of the `foo` object. 

This is similar to the expression `foo.bar.bind(foo)`.

#### Object Property Name Expression

> `foo->['bar']`

In this example the square brackets bounding `'bar'` indicate that the target function name will be determined by the string expression contained within the square brackets. The result is the same as our first example except that the property name is determined at run time. 

This is similar to the expression `foo['bar'].bind(foo)`.

#### Function Expression

> `foo->[bar]`

The square brackets can also be used to define an expression that returns a function, allowing any value to be provided as the left hand parameter of the `->` operator. In this example the `->` operator will bind the `foo` value to *this* of the function that is contained in the `bar` variable or constant that is defined within the scope of the `foo->[bar]` expression. The `bar` function property of a `foo` value that is an object will be excluded in this case. 

This is similar to the expression `bar.bind(foo)`.

#### NOTE

Javascript source editors may perform continuous or save time syntax checking of Javascript code resulting in identification of syntax errors and modification to the source. Such changes and can include the insertion of white space between unrecognised keywords and unrecognised operators.

To reduce the need to manually correct code for the yagajs transpiler the language syntax changes have been implemented to support the insertion of whitespace as follows:

* `foo- >bar` as an alternative of `foo->bar`
* `foo- > ['bar']` as an alternative of `foo->['bar']`

### '::' ThisArg operator
TBC

### private/public Object literal keywords

TBC  (Wrap all literals with private/ public in a function so that we extract the private/protected declaration and construct an object scope expression)

## API

Mode of operation when a Javascript application issues a `require('@yagajs/extensions')` call. The request will anwser an exports object that allows inline code transpiling.

#### transpile(code)
Transpiles the input code that may contain yagajs language extensions.

* *code* - `string` containing the code to transpile.

Answers an object that contains:
* *code* - `string` representing the transpiled code.
* *map* - The source map of the transpiled code.
* *ast* - The AST representation of the transpiled code.

#### transpileFile(inPath, outPath)
Transpiles the code contained in the input file and saves to the output location.

* *inPath* - Path of the file to be transpiled.
* *[outPath]* - Optional output directory or file name of where to write the transpiled code. If a directory then the input file name is appended to the directory to create the output path. If an *outPath* is not provided or the fully resolved outpath is the same as the input path, then the resultant file's name component will have '_y' appended. Note that the output file will always have a `.js` extension.

Answers an object that contains:
* *inPath* - The locally resolved input file path.
* *outPath* - The locally resolved output file path.

#### main(argv)
Callable version of the command line `main` entry point. Allows the yagajs transpiler to be imbedded in other command line tools.

* *argv* - Command line arguments. Only the yagajs transpiler arguments should be provided. See the disussion on the command line interface for further detail

## COMMAND LINE INTEFACE

```
    node @yagajs/extensions[/transpiler] 
        [-?] [-l] [-r] [-f regexpr] 
        inFile|inDir [outDir]
```

where:
* -? : Display the command usage
* -l : List the resolved input file paths without transpiling
* -r : Recursively process sub-directories
* -f : Regexp file filter for input directory. Default(\.js$)
* inFile | inDir : Single source file or input directory. If a directory is provided then all files that match the input filter will be transpiled. Sub-directories will be recursively navigated if the `-r` option is also specified.
* [outDir] : Optional output directory for writing transpiled files. If not provided then the output file is written to the source file directory and the target file name is refactored according to the formatting rule `*.js ---> *_y.js`.

Note that all output files will have a `.js` extension appended.


## CONTRIBUTING

TBC

## VERSIONS

0.1.0 - Beta: Bind operator

## AUTHORS

* Bruce Twite - Initial work

## LICENSE

ISC - Internet Systems Consortium

Copyright 2019 Bruce Twite

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

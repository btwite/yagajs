# @yagajs/toolbox

The *toolbox* library contains a number of helper objects that extend Javascript core functionality.

## PREREQUISITES

* An ECAScript 2015 complient Javascript environment
* Node version 8.11.2 or greater
* fs and path

## INSTALLATION

* NPM Package - `npm install @yagajs/toolbox'

## TESTING

See [yagajs](https://github.com/btwite/yagajs/blob/master/README.md#TESTING)

## HELPER OBJECTS

### [Character](https://github.com/btwite/yagajs/blob/master/toolbox/md/Character.md)

Character testing functions.

### [Exception](https://github.com/btwite/yagajs/blob/master/toolbox/md/Exception.md)

Exception creation factory as an extensions of Error.

### [File](https://github.com/btwite/yagajs/blob/master/toolbox/md/File.md)

Path management and file services

### [Influence](https://github.com/btwite/yagajs/blob/master/toolbox/md/Influence.md)

Object composer factory that collapses one or more object prototype definitions into a single influence prototype model. Objects can be arranged into loosely coupled hierachies that represent degrees of influence on instance objects.

### [Loader](https://github.com/btwite/yagajs/blob/master/toolbox/md/Loader.md)

Configuration based package loader that automatically exports internal & external interfaces to package modules and external interface to users of the package. Implemented as a two phase load process that assists in minimising load order conflicts.

### [Replicate](https://github.com/btwite/yagajs/blob/master/toolbox/md/Replicate.md)

Object replication functions.

### [Scopes](https://github.com/btwite/yagajs/blob/master/toolbox/md/Scopes.md)

Private scope services for POJOs. This includes support for mulitple private scopes for an object.

Note that *Influence* has a separate scoping implementation that supports both *private* and *protected* scopes which are integrated into the composer process.

### [StringBuilder](https://github.com/btwite/yagajs/blob/master/toolbox/md/StringBuilder.md)

String building object that efficiently handles the segmented construction of large strings.

### [Utilities](https://github.com/btwite/yagajs/blob/master/toolbox/md/Utilities.md)

A set of standalone helper functions.

## CONTRIBUTING

TBC

## VERSIONS

1.0.0 - Initial Version

## AUTHORS

* Bruce Twite - Initial work

## LICENSE

ISC - Internet Systems Consortium

Copyright 2019 Bruce Twite

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

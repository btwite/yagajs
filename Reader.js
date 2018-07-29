/*
 *  Reader: @file
 *
 *  Generic reader object that can read source and produce expressions based on the actions
 *  set in a readertable. Default action is to produce a sequence of tokens that are whitespace
 *  separated. Structure of the reader table as follows (Note that all values are functions):
 *      {
 *          startReader:    // Called before read begins.
 *          endReader:      // Called at the end of input.
 *          eol:            // Called when end of line is reached.
 *          tokenCreated:   // Called when a token is created. Handler responsibility to add to current expression
 *          patterns: {
 *              '<...>':    // One or more characters. Longest sequence matched first.
 *                          // If there is no pattern then will force a to be created and possible token split.
 *              '':         // No pattern, matches every character. Last function to be called. Must be a function
 *          }
 *          
 *      }
 */
"use strict";

let scopes = require('prop-scopes');

const ENDOFINPUT = 'ENDOFINPUT';
const ENDOFEXPRESSION = 'ENDOFEXPRESSION';
const ENDOFBLOCK = 'ENDOFBLOCK';
const BRACKETS = 'BRACKETS';

const EXPRESSION = 'EXPRESSION';
const RISTIC = 'RISTIC';
const PIPELINE = 'PIPELINE';
const PRIMITIVE = 'PRIMITIVE';
const CONTEXT = 'CONTEXT';
const INDEX = 'INDEX';
const PARSE = 'PARSE'

var yaga, _reader, _readerState, _Private, _readPoint, _defReadPoint;
let _tableMap = new WeakMap();

module.exports = {
    new: _newReader,
    splitToken: _splittoken,
    Point: {
        new: _newReadPoint,
    },
    defaultReadPoint: undefined,
    Initialise(y) {
        yaga = yaga ? yaga : y;
        _defReadPoint = _newReadPoint(undefined, '<None>');
        _defReadPoint.isDefault = true;
        this.defaultReadPoint = _defReadPoint;
        Object.freeze(this);
    }
};

function _newReader(yi, optReadTable) {
    let reader = Object.create(_reader);
    _Private(reader).readTable = _initReadTable(optReadTable || yaga.ReaderTable.yaga());
    _defineProtectedProperty(reader, 'yi', yi);
    return (reader);
}

function _newReadPoint(parent, srcName, line, col) {
    let point = Object.create(_readPoint);
    if (parent) point.parent = parent;
    point.sourceName = srcName;
    if (line) point.line = line;
    if (col) point.column = col;
    return (point);
}

_reader = scopes.read({
    typeName: 'Reader',
    readStream: _readStream,
    readFile: _readFile,
    readStrings: _readStrings,
    readString(s) {
        return (this.readStrings([s])[0]);
    },
    readToken: _readToken,
    private_var__state: undefined,
    private_var__readTable: undefined,
});
Object.freeze(_reader);
_Private = scopes.getScopeFns(_reader).private;
scopes.lock(_reader);

function _readFile(path) {
    let fs = require('fs');
    let fd;
    try {
        fd = fs.openSync(path, 'r');
        this.sourceName = fs.realpathSync(path);
    } catch (err) {
        throw yaga.errors.ParserException(undefined, `Failed to open yaga file. Rsn(${err.message})`);
    }
    let oPos = 0,
        buf = Buffer.alloc(8192),
        encoding = undefined;
    let state = _initReaderState(this, () => {
        let nBytes = fs.readSync(fd, buf, 0, buf.length, oPos);
        if (!encoding) {
            this.lineNo = 1;
            // Require a way of checking the encoding. For example package 'detect-character-encoding'
            encoding = 'ascii';
        }
        oPos += nBytes;
        return (nBytes == 0 ? null : buf.toString(encoding, 0, nBytes));
    });
    _read(state);
    fs.closeSync(fd);
    return (state.expressions);
}

function _readStrings(arr) {
    this.sourceName = 'Strings';
    let iArr = 0;
    let state = _initReaderState(this, () => {
        if (iArr >= arr.length) return (null);
        this.lineNo = 1;
        return (arr[iArr++]);
    });
    return (_read(state));
}

function _readStream(stream) {
    throw yaga.errors.InternalException(`Streams are not currently supported`);
}

function _readToken(tok) {
    if (!yaga.isaYagaType(tok) || !tok.isaToken) throw yaga.errors.YagaException(undefined, `Expecting a token. Found(${tok})`);
    // Call reader to create an instance once then on each call we just reset the 
    // parts of the state that re-initialisation.
    // For example, the ReadPoint of the token should be used to initialise position information.
    // Note that there should not be a requirement for start and end processing.
}

let _readTableTemplate = {
    startReader: _valTableFunction,
    endReader: _valTableFunction,
    eol: _valTableFunction,
    tokenCreated: _valTableFunction,
    patterns: _valTablePatterns,
};

function _initReadTable(readTable) {
    let table = _tableMap.get(readTable); // Have we been here before.
    if (table) return (table);

    if (typeof readTable !== 'object') throw yaga.erros.YagaException(undefined, 'Invalid reader table provided');
    // Validat that the table is correct.
    table = Object.assign({}, readTable);
    Object.keys(readTable).forEach(key => {
        if (!_readTableTemplate[key]) throw yaga.errors.YagaException(undefined, `Invalid Reader table entry '${key}'`);
        _readTableTemplate[key](key, readTable[key]);
    });
    table.maxPatternLength = _getMaxPatternLength(readTable.patterns);
    return (table);
}

function _valTableFunction(name, val) {
    if (typeof val !== 'function') throw yaga.erros.YagaException(undefined, `Function required for Reader table entry '${name}'`);
}

function _valTablePatterns(name, patterns) {
    if (typeof patterns !== 'object') throw yaga.errors.YagaException(undefined, `Object required for Reader table '${name}'`);
    Object.keys(patterns).forEach(pat => {
        _valTablePattern(pat, patterns[pat]);
    });
}

function _valTablePattern(name, pat, val) {
    if (typeof val !== 'function' && val !== undefined)
        throw yaga.errors.YagaException(undefined, `Pattern '${pat}' must be a function or undefined. Found '${val}' in '${name}'`);
    if (pat === '' && typeof val !== 'function')
        throw yaga.errors.YagaException(undefined, `Function required for empty string pattern in '${name}'`);
}

function _getMaxPatternLength(patterns) {
    if (!patterns) return (undefined);
    let maxlen = 0;
    Object.keys(patterns).forEach(pat => maxlen = maxlen < pat.length ? pat.length : maxlen);
    return (maxlen);
}

// Internal state of the reader.
_readerState = {
    typeName: 'ReaderState',
    reader: undefined,
    newPoint: _newPoint,
    readChar: _readChar,
    readNextChar: _readNextChar,
    peekNextChar: _peekNextChar,
    pushbackChar: _pushbackChar,
    lastReadPoint: undefined,
    exprStack: undefined,
    expressions: undefined,
    parentPoints: undefined,
    parentPoint: undefined,
    readState: undefined,
    readTable: undefined,
    readTableStack: undefined,
    tabCount: 4,

    lineNo: 0,
    column: 0,
    lastToken: undefined,
    tokBuf: undefined,

    startReader: __stateHandler('startReader', _newStartReader),
    endReader: __stateHandler('endReader', _newEndReader),
    eol: __stateHandler('eol', _newEOL),
    tokenCreated: __tokenCreated,
    patternMatch: _patternMatch,

    _flActive = false,
    _flEOS: false,
    _fnThrow: undefined,
    _fnRead: undefined,
    _iStr: 0,
    _strLength: 0,
    _str: undefined,
    _pushbackChar: undefined,
};

function _initReaderState(reader, fnRead) {
    let state = _Private(reader).state;
    if (state._flActive) throw yaga.errors.YagaException(undefined, 'Reader is already active');

    _Private(reader).state = (state = Object.create(_readerState));
    state.lastReadPoint = _newReadPoint(undefined, reader.sourceName);
    state.expressions = [];
    state.exprStack = [];
    state.curExpr = state.expressions;
    if (reader.yi._options.tabCount) state.tabCount = reader.yi._options.tabCount;
    state.parentPoints = [];
    state.parentPoint = _defReadPoint;
    state._fnRead = fnRead;
    state.readTable = _Private(reader).readTable;
    state.reader = reader;
    state.tokBuf = yaga.StringBuilder.new();
    state._fnThrow = msg => yaga.errors.YagaException(state.lastReadPoint, msg);
    state._pushReaderTable = table => _pushReaderTable(state, table);
    state._popReaderTable = () => _popReaderTable(state);
    return (state);
}

function __stateHandler(stateName, fn) {
    return function (...args) {
        if (!this.readTable[stateName]) return;
        this.readTable[stateName](fn(this, ...args));
    }
}

function _tokenCreated(...args) {
    if (!this.readTable.tokenCreated) {
        state.curExpr.push(tok);
        state.lastToken = tok;
        return;
    }
    this.readTable.tokenCreated(_newTokenCreated(this, ...args));
}

function _readChar(fnEOS) {
    let ch = this.readNextChar(fnEOS);
    switch (ch) {
        case '\r':
            let peek = this.peekNextChar();
            if (peek === '\n') this.readNextChar(fnEOS);
        case '\n':
            this.lineNo++;
            this.column = 0;
            return ('\n');
        case '\t':
            let tc = this.tabCount;
            this.column = (this.column + tc) / tc * tc + 1;
            return (' '); // Give back a single whitespace character
        default:
            return (ch);
    }
}

function _readNextChar(fnEOS) {
    let ch;
    if (this._pushbackChar) {
        ch = this._pushbackChar;
        this._pushbackChar = undefined;
    } else if (this._iStr >= this._strLength) {
        if (this._flEOS) {
            if (fnEOS) return (fnEOS());
            throw yaga.errors.ParserException(this.lastParserPoint, "End of input detected", ENDOFINPUT);
        }
        if ((this._str = this._fnRead()) == null) {
            this._flEOS = true;
            ch = ' '; // Just return whitespace now and throw on next call
        } else {
            if ((this._strLength = this._str.length) == 0) return (this.readNextChar());
            this._iStr = 1;
            ch = this._str[0];
        }
    } else {
        ch = this._str[this._iStr++]
    }
    this.column++;
    return (this.curChar = ch);
}

function _peekNextChar() {
    if (this._pushbackChar) return (this._pushbackChar);
    if (this._iStr >= this._strLength) {
        if (this._flEOS || (this._str = this._fnRead()) == null) {
            this._flEOS = true;
            return (' ');
        }
        this._iStr = 0;
        if ((thsi._strLength = this._str.length) == 0) return (this.peekNextChar());
        return (this._str[0]);
    }
    return (this._str[this._iStr]);
}

function _pushbackChar() {
    if (this._pushbackChar) {
        throw yaga.errors.InternalException(undefined, "Attempting mulitple state pushbacks");
    }
    this.column--;
    this._pushbackChar = this.curChar;
    this.curChar = ' ';
};

function _newPoint(parent, line, col) {
    if (parent === undefined) parent = this.parentPoint;
    if (line === undefined) line = this.lineNo;
    if (col === undefined) col = this.column;
    this.lastParserPoint = _newParserPoint(parent, this.sourceName, line, col);
    return (this.lastParserPoint)
}

_readPoint = {
    typeName: 'ReadPoint',
    isaReadPoint: true,
    sourceName: undefined,
    line: 0,
    column: 0,
    parent: undefined,
    increment(nCols) {
        return (_newReadPoint(this, this.sourceName, this.line, this.column + nCols));
    },
    format() {
        return (`${this.sourceName}[${this.line},${this.column}]`);
    }
}


function _pushParentPoint(state, point) {
    state.parentPoints.push(state.parentPoint);
    state.parentPoint = point;
}

function _popParentPoint(state) {
    state.parentPoint = state.parentPoints.pop();
}

function _newParentPoint(state) {
    let point = state.newPoint();
    _pushParentPoint(state, point);
    return (point);
}


function _read(state) {
    try {
        state._flActive = true;
        state.startReader();
        while (_nextElement(state));
        state.endReader();
        if (state.exprStack.length > 0)
            throw yaga.errors.ReaderException(state.lastReadPoint, "Missing end of expression");
    } catch (err) {
        _addError(state, `${err.name}: ${err.message}`, state.lastReadPoint, err);
    } finally {
        state._flActive = false;
    }
    return (state.expressions);
}

function _nextElement(state) {
    // Skip any initial white space
    let ch, peek;
    for (;;) {
        while (_isWhitespace(ch = _nextChar(state)));
        if (ch === '') {
            if (state.column !== 0) this.eol(); // Don't want two end of lines if EOS occurs straight after a NL
            return (false);
        }
        if (ch !== '\n') break;
        this.eol();
    }
    state.tokBuf.clear();
    let readPoint = state.lastReadPoint = state.newPoint();
    do {
        state.tokBuf.append(ch);
    } while (!_isWhitespace(ch = _nextChar(state)) && ch !== '' && ch !== '\n');

    // Can now process the pattern matching. This will take responsibility for creating tokens and
    // adding to the current expression.
    _patternMatch(state);
    if (ch === '\n') this.eol();
    return (ch !== '');
}

function _nextChar(state) {
    return (state.readChar(() => {
        return ('');
    }));
}

function _patternMatch(state) {
    if (state.readTable.patterns) {
        // Pattern matching goes here
        _matchPatterns; // ...............
    }
    // Handle any left over token string
    _emitToken(state);
}

function _emitToken(state, nChars) {
    let len = state.tokBuf.length();
    if (len === 0) return;
    if (nChars !== undefined && len < nChars)
        throw yaga.errors.InternalException(`Invalid request`);
    let str;
    if (nChars === undefined) str = state.tokBuf.toString();
    else str = state.tokBuf.substr(0, nChars);
    state.tokBuf.splice(0, str.length);
    let tok = yaga.Token.newReaderToken(str, state.lastReadPoint);
    state.lastReadPoint = state.lastReadPoint.increment(str.length);
    state.tokenCreated(tok); // This function has respossibility for ensuring that the token is added to the expression
}

function _pushReaderTable(state, newTable) {
    let table = _initReadTable(newTable);
    state.readTableStack.push(state.readTable);
    return (state.readTable = table);
}

function _popReaderTable(state) {
    return (state.readTable = state.readTableStack.pop());
}

// Will need to be extend the following functions properly handle ucs-2 extended characters

function _isSpecial(ch) {
    return (!_isAlphaNumeric(ch) && !_isWhitespace(ch) && !_isOperator(ch) && !_isControl(ch));
}

function _isAlpha(ch) {
    return ('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.includes(ch));
}

function _isAlphaNumeric(ch) {
    return ('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.includes(ch));
}

function _isDigit(ch) {
    return ('0123456789'.includes(ch));
}

function _isNumeric(ch) {
    return (_isDigit(ch));
}

function _isControl(ch) {
    return ('\n\t\b\f\r'.includes(ch));
}

function _isOperator(ch) {
    return ('~!@#$%^&*()_+-={}|[]\\:";\'<>?,./'.includes(ch));
}

function _isWhitespace(ch) {
    // Will need to be extended to handle ucs-2 extended whitespace
    return (ch === ' ');
}

function _addError(state, msg, e, attach) {
    if (attach && attach.isaYagaException) {
        if (!attach.element.isNil) e = attach.element;
        else if (!attach.readPoint.isDefault) e = attach.readPoint;
    }
    state.reader.yi.addError(e, msg, attach);
}

function _defineProtectedProperty(obj, name, val) {
    Object.defineProperty(obj, name, {
        value: val,
        enumerable: true,
        writable: false,
        configurable: false
    })
}

// State creation functions.
function _newStartReader(state) {
    return {
        typeName: 'State:StartReader',
        reader: state.reader,
        throw: state._fnThrow,
        pushReaderTable: state._fnPushReaderTable,
    }
}

function _newEndReader(state) {
    return {
        typeName: 'State:EndReader',
        reader: state.reader,
        throw: state._fnThrow,
    }
}

function _newEOL(state) {

}

function _newTokenCreated(state, tok) {

}

// Pattern match against the current token.
function _patternMatch(state) {
    if (!this.readTable.patterns) return;
    _matchPatterns;
}
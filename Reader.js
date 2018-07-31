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

var yaga, _reader, _readerContext, _Private, _readPoint, _defReadPoint;

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
    let ctxt, reader = Object.create(_reader);
    _Private(reader).context = (ctxt = Object.create(_readerContext));
    if (yi._options.tabCount) ctxt.tabCount = yi._options.tabCount;
    ctxt.initReadTable = yaga.ReaderTable.new(optReadTable || yaga.YagaReader.readerTable());
    ctxt.reader = reader;
    ctxt.stateFns = _getStateFunctions(ctxt);
    ctxt.startReaderState = _startReaderState(ctxt);
    ctxt.endReaderState = _endReaderState(ctxt);
    ctxt.eolState = _eolState(ctxt);
    ctxt.tokenCreatedState = _tokenCreatedState(ctxt);
    ctxt.patternState = _patternState(ctxt);
    ctxt.tokBuf = yaga.StringBuilder.new();
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
    readString: _readString,
    splitToken: _splitToken,
    private_var__context: undefined,
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
    let ctxt = _initReaderContext(this, () => {
        let nBytes = fs.readSync(fd, buf, 0, buf.length, oPos);
        if (!encoding) {
            // Require a way of checking the encoding. For example package 'detect-character-encoding'
            encoding = 'ascii';
        }
        oPos += nBytes;
        return (nBytes == 0 ? null : buf.toString(encoding, 0, nBytes));
    });
    ctxt.lineNo = 1;
    ctxt.column = 0;
    _read(ctxt);
    fs.closeSync(fd);
    return (ctxt.expression);
}

function _readStream(stream) {
    throw yaga.errors.InternalException(`Streams are not currently supported`);
}

function _readStrings(arr) {
    return (__readStrings(arr, 'Strings'));
}

function _readString(s) {
    return (__readStrings([s], 'String'));
}

function __readStrings(arr, srcName) {
    this.sourceName = srcName;
    let iArr = 0;
    let ctxt = _initReaderContext(this, () => iArr >= arr.length ? null : arr[iArr++]);
    this.lineNo = 1;
    this.column = 0;
    return (_read(ctxt));
}

function _splitToken(tok, readTable) {
    // Change this to just call the token pattern matching interface.
    // Will only use the pattern matching component of the reader table. Other handlers will not
    // come into play.
    if (!yaga.isaYagaType(tok) || !tok.isaToken) throw yaga.errors.YagaException(undefined, `Expecting a token. Found(${tok})`);
    readTable = yaga.ReaderTable.new(readTable); // Validate the reader table

    // Init code to all pattern matching

    // Call pattern matching interface
}

// Internal context of the reader.
_readerContext = {
    typeName: 'ReaderState',
    reader: undefined,
    newPoint: _newPoint,
    readChar: _readChar,
    readNextChar: _readNextChar,
    peekNextChar: _peekNextChar,
    pushbackChar: _pushbackChar,
    lastReadPoint: undefined,
    exprStack: undefined,
    expression: undefined,
    parentPoints: undefined,
    parentPoint: undefined,
    readState: undefined,
    initReadTable: undefined,
    readTable: undefined,
    readTableStack: undefined,
    tabCount: 4,

    lineNo: 0,
    column: 0,
    lastToken: undefined,
    curToken: undefined,
    tokStream: undefined,
    tokBuf: undefined,

    startReader: __stateHandler('startReader', _newStartReader),
    endReader: _endReader,
    eol: __stateHandler('eol', _newEOL),
    tokenCreated: _tokenCreated,
    patternMatch: _patternMatch,

    stateFns: undefined,
    startReaderState: undefined,
    endReaderState: undefined,
    eolState: undefined,
    tokenCreatedState: undefined,
    patternState: undefined,


    _flActive = false,
    _flEOS: false,
    _fnThrow: undefined,
    _fnRead: undefined,
    _iStr: 0,
    _strLength: 0,
    _str: undefined,
    _pushbackChar: undefined,
};

function _initReaderContext(reader, fnRead) {
    let ctxt = _Private(reader).context;
    if (ctxt._flActive) throw yaga.errors.YagaException(undefined, 'Reader is already active');

    ctxt.lastReadPoint = _newReadPoint(undefined, reader.sourceName);
    ctxt.expression = _newExpresson(ctxt.lastReadPoint);
    ctxt.exprStack = [];
    ctxt.parentPoints = [];
    ctxt.parentPoint = _defReadPoint;
    ctxt._fnRead = fnRead;
    ctxt.readTable = ctxt.initReadTable;
    ctxt.readTableStack = [];
    ctxt.tokStream = [];
    ctxt.curToken = undefined;
    return (ctxt);
}

function __stateHandler(stateName, fn) {
    return function (...args) {
        if (!this.readTable[stateName]) return;
        this.readTable[stateName](fn(this, ...args));
    }
}

function _endReader() {
    if (!this.readTable.endReader) {
        if (ctxt.exprStack.length > 0)
            throw yaga.errors.ReaderException(ctxt.lastReadPoint, "Missing end of expression");
        return (ctxt.expression);
    }
    return (this.readTable.endReader(_newEndReader(this, ctxt.expression, ctxt.exprStack)));
}

function _tokenCreated(tok) {
    if (!this.readTable.tokenCreated) {
        ctxt.expression.list.push(tok);
        ctxt.lastToken = tok;
        return;
    }
    this.readTable.tokenCreated(_newTokenCreated(this, tok));
}

// Pattern match against the current token.
function _patternMatch() {
    // Must handle EOS and EOL tokens. Returns true if not EOS and false otherwise.
    if (this.readTable.patterns)
        _matchPatterns(this);
    // Handle any left over token string
    _emitBufferToken(ctxt);
}

function _readChar(fnEOS) {
    let ch = this.readNextChar(fnEOS);
    switch (ch) {
        case '\r':
            let peek = this.peekNextChar();
            if (peek === '\n') this.readNextChar(fnEOS);
        case '\n':
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
    return (ch);
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
        throw yaga.errors.InternalException(undefined, "Attempting mulitple pushbacks");
    }
    /*    
    Needs to be rewritten once we work out the readtable functions will use peek and pushback.
        this.column--;
        this._pushbackChar = this.curChar;
        this.curChar = ' ';
        */
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


function _pushParentPoint(ctxt, point) {
    ctxt.parentPoints.push(ctxt.parentPoint);
    ctxt.parentPoint = point;
}

function _popParentPoint(ctxt) {
    ctxt.parentPoint = ctxt.parentPoints.pop();
}

function _newParentPoint(ctxt) {
    let point = ctxt.newPoint();
    _pushParentPoint(ctxt, point);
    return (point);
}


function _read(ctxt) {
    ctxt._flActive = true;
    try {
        ctxt.startReader();
        while (_moreTokens(ctxt));
    } catch (err) {
        _addError(ctxt, `${err.name}: ${err.message}`, ctxt.lastReadPoint, err);
    } finally {
        ctxt._flActive = false;
    }
    return (ctxt.endReader()); // The endReader handler must answer the expression object that is to be returned.
}

function _moreTokens(ctxt) {
    ctxt.lastToken = ctxt.curToken;
    if (ctxt.tokStream.length > 0) {
        ctxt.curToken = ctxt.tokStream.splice(0, 1)[0];
        return (_patternMatch(ctxt, ctxt.curToken));
    }
    return (_patternMatch(ctxt, ctxt.curToken = _nextToken(ctxt)));
}

function _nextToken(ctxt) {
    // Skip any initial white space
    let ch, ;
    while (_isWhitespace(ch = _nextChar(ctxt)));
    if (ch === '') {
        if (ctxt.column !== 0) {
            // Don't want two end of lines if EOS occurs straight after a NL
            ctxt.pushbackChar(ch);
            return (_newEOLToken(ctxt));
        }
        return (_newEOSToken(ctxt));
    }
    if (ch === '\n') return (_newEOLToken(ctxt));

    ctxt.tokBuf.clear();
    let readPoint = ctxt.lastReadPoint = ctxt.newPoint();
    do {
        ctxt.tokBuf.append(ch);
    } while (!_isEndToken(ch = _nextChar(ctxt)));
    ctxt.pushbackChar(ch);

    return (_newToken(ctxt.tokBuf.toString(), readPoint));
}

function _nextChar(ctxt) {
    return (ctxt.readChar(() => {
        return ('');
    }));
}

function _emitBufferToken(ctxt, nChars) {
    let len = ctxt.tokBuf.length();
    if (len === 0) return;
    if (nChars !== undefined && len < nChars)
        throw yaga.errors.InternalException(`Invalid request`);
    let str;
    if (nChars === undefined) str = ctxt.tokBuf.toString();
    else str = ctxt.tokBuf.substr(0, nChars);
    ctxt.tokBuf.splice(0, str.length);
    let tok = yaga.Token.newReaderToken(str, ctxt.lastReadPoint);
    ctxt.lastReadPoint = ctxt.lastReadPoint.increment(str.length);
    ctxt.tokenCreated(tok); // This function has respossibility for ensuring that the token is added to the expression
}

function _matchPatterns(ctxt) {
    let patterns = ctxt.readTable.patterns;
    let maxlen = patterns.maxPatternLength;
    if (maxlen < 0) return; // No patterns to match on
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

function _isEndtoken(ch) {
    return (_isWhitespace(ch) || ch === '' || ch === '\n');
}

function _addError(ctxt, msg, e, attach) {
    if (attach && attach.isaYagaException) {
        if (!attach.element.isNil) e = attach.element;
        else if (!attach.readPoint.isDefault) e = attach.readPoint;
    }
    ctxt.reader.yi.addError(e, msg, attach);
}

function _defineProtectedProperty(obj, name, val) {
    Object.defineProperty(obj, name, {
        value: val,
        enumerable: true,
        writable: false,
        configurable: false
    })
}

// Reader table callback functions
function _getStateFunctions(ctxt) {
    return {
        fnThrow: msg => yaga.errors.YagaException(ctxt.lastReadPoint, msg),
        fnPushReaderTable: newTable => {
            let table = _initReadTable(newTable);
            ctxt.readTableStack.push(ctxt.readTable);
            return (ctxt.readTable = table);
        },
        fnPopReaderTable: () => {
            return (ctxt.readTable = ctxt.readTableStack.pop());
        },
    };
}

// Reader table functions state object templates.

function _startReaderState(ctxt) {
    return {
        typeName: 'State:StartReader',
        reader: ctxt.reader,
        throw: ctxt.stateFns.fnThrow,
        pushReaderTable: ctxt.stateFns.fnPushReaderTable,
    };
}

function _endReaderState(ctxt) {
    return {
        typeName: 'State:EndReader',
        reader: ctxt.reader,
        throw: ctxt.stateFns.fnThrow,
        popReaderTable: ctxt.stateFns.fnPopReaderTable,
        endExpression: ctxt.stateFns.fnEndExpression,
    }
}

function _eolState(ctxt) {
    return {
        typeName: 'State:EndOfLine',
        reader: ctxt.reader,
        throw: ctxt.stateFns.fnThrow,
        pushReaderTable: ctxt.stateFns.fnPushReaderTable,
        popReaderTable: ctxt.stateFns.fnPopReaderTable,
        startExpression: ctxt.stateFns.fnStartExpression,
        endExpression: ctxt.stateFns.fnEndExpression,
    }
}

function _tokenCreatedState(ctxt) {
    return {
        typeName: 'State:TokenCreated',
        reader: ctxt.reader,
        throw: ctxt.stateFns.fnThrow,
        pushReaderTable: ctxt.stateFns.fnPushReaderTable,
        popReaderTable: ctxt.stateFns.fnPopReaderTable,
        startExpression: ctxt.stateFns.fnStartExpression,
        endExpression: ctxt.stateFns.fnEndExpression,
    }
}

function _patternState(ctxt) {
    return {
        typeName: 'State:Pattern',
        reader: ctxt.reader,
        throw: ctxt.stateFns.fnThrow,
        pushReaderTable: ctxt.stateFns.fnPushReaderTable,
        popReaderTable: ctxt.stateFns.fnPopReaderTable,
        startExpression: ctxt.stateFns.fnStartExpression,
        endExpression: ctxt.stateFns.fnEndExpression,
    }
}

// State creation functions.
function _newStartReader(ctxt) {
    return (Object.create(ctxt.startReaderState));
}

function _newEndReader(ctxt, expr, exprStack) {
    let st = Object.create(ctxt.endReaderState)
    st.expression = expr;
    st.expressionStack = exprStack; // Will be empty if all sub-expressions have been ended.
    return (st)
}

function _newEOL(ctxt) {

}

function _newTokenCreated(ctxt, tok) {

}

function _newToken(chs, readPoint) {
    return {
        typeName: 'ReaderToken',
        isaReaderToken: true,
        readPoint: readPoint,
        chars: chs,
    }
}

function _newEOLToken(ctxt) {
    let readPoint = ctxt.newPoint();
    ctxt.lineNo++;
    ctxt.column = 0;
    return {
        typeName: 'ReaderToken:EOL',
        isaReaderToken: true,
        isEOL,
        readPoint: readPoint,
    }
}

function _newEOSToken() {
    let readPoint = ctxt.newPoint();
    return {
        typeName: 'ReaderToken:EOS',
        isaReaderToken: true,
        isEOS,
        readPoint: readPoint,
    }
}

function _newExpresson(readPoint, startToken, endToken) {
    return {
        typeName: 'ReaderExpression',
        isaReaderExpression: true,
        readPoint: readPoint,
        startToken: startToken,
        endToken: endToken,
        list: [],
    }
}
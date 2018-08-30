/*
 *  Reader: @file
 *
 *  Generic reader object that can read source and produce expressions based on the actions
 *  defined in a ReaderTable. Default action is to produce a sequence of tokens that are whitespace
 *  separated.
 */
"use strict";

let _ = undefined;

var Yaga = require('../Yaga');
var Character = Yaga.Character;
var ReadPoint, ReaderTable;

var Reader = Yaga.Influence({
    name: 'Reader',
    prototype: {
        thisArg_: {
            readStream,
            readFile,
            readStrings,
            readString,
            currentSource
        },
    },
    constructor: {
        private_: {
            contextStack: [],
            context: _
        }
    }
});

module.exports = Object.freeze({
    Reader: Reader.create,
    Initialise(pack) {
        ReadPoint = pack.ReadPoint;
        ReaderTable = pack.ReaderTable;
    }
});

function pushReaderContext(r, ctxt) {
    let ps = Reader.private(r);
    ps.contextStack.push(ps.context);
    ps.context = ctxt;
}

function popReaderContext(r) {
    let ps = Reader.private(r);
    if (ps.contextStack.length === 0)
        throw new Error('No Reader context to pop');
    ps.context = ps.contextStack.pop();
}


function _newReader(yi, optReadTable) {
    let ctxt, reader = Object.create(_reader);
    _Private(reader).context = (ctxt = Object.create(_readerContext));
    if (yi._options.tabCount) ctxt.tabCount = yi._options.tabCount;
    ctxt.initReadTable = Yaga.ReaderTable.new(optReadTable || Yaga.YagaReader.readerTable());
    ctxt.reader = reader;
    ctxt.stateFns = _getStateFunctions(ctxt);
    ctxt.startReaderState = _startReaderState(ctxt);
    ctxt.endReaderState = _endReaderState(ctxt);
    ctxt.eolState = _eolState(ctxt);
    ctxt.tokenCreatedState = _tokenCreatedState(ctxt);
    ctxt.patternState = _patternState(ctxt);
    ctxt.tokBuf = Yaga.StringBuilder.new();
    _defineProtectedProperty(reader, 'yi', yi);
    return (reader);
}

var ReaderContext = Yaga.Influence({
    name: 'ReaderContext',
    prototype: {
        reader: _,
        sourceName: _,
        fnRead: _,
        line: 0,
        column: 0,
        expression: _,
        lastToken: _,
        curToken: _,
        tokStream: _,
        tokBuf: _,

        lastReadPoint: _,
        parentPoints: _,
        parentPoint: _,
        get currentPoint() {
            return (this.lastReadPoint = ReadPoint(this.sourceName, this.line, this.column, this.parentPoint));
        },

        /*
        newPoint: _newPoint,
        readChar: _readChar,
        readNextChar: _readNextChar,
        peekNextChar: _peekNextChar,
        pushbackChar: _pushbackChar,
        */
        exprStack: undefined,
        expression: undefined,
        readState: undefined,
        initReadTable: undefined,
        readTable: undefined,
        readTableStack: undefined,
        tabCount: 4,

        /*
                startReader: __stateHandler('startReader', _newStartReader),
                endReader: _endReader,
                eol: __stateHandler('eol', _newEOL),
                tokenCreated: _tokenCreated,
                patternMatch: _patternMatch,
        */
        stateFns: undefined,
        startReaderState: undefined,
        endReaderState: undefined,
        eolState: undefined,
        tokenCreatedState: undefined,
        patternState: undefined,


        _flEOS: false,
        _fnThrow: undefined,
        _iStr: 0,
        _strLength: 0,
        _str: undefined,
        _pushbackChar: undefined,
    },
    constructor: [
        function (r, srcName, fnRead) {
            this.reader = r;
            this.sourceName = srcName;
            this.fnRead = fnRead;
        },
        {

        }
    ],
});

function _initReaderContext(reader, fnRead) {
    let ctxt = _Private(reader).context;

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

function readFile(r, path) {
    let fs = require('fs');
    let fd = fs.openSync(path, 'r');
    let encoding, oPos = 0,
        buf = Buffer.alloc(8192);
    let ctxt = ReaderContext(r, fs.realpathSync(path), () => {
        let nBytes = fs.readSync(fd, buf, 0, buf.length, oPos);
        if (!encoding) {
            // Require a way of checking the encoding. For example package 'detect-character-encoding'
            encoding = 'ascii';
        }
        oPos += nBytes;
        return (nBytes == 0 ? null : buf.toString(encoding, 0, nBytes));
    });
    let expr = read(ctxt);
    fs.closeSync(fd);
    return (expr);
}

function readStream(r, stream) {
    throw new Error('Streams are not currently supported');
}

function readStrings(r, a) {
    return (_readStrings(r, a, 'Strings'));
}

function readString(r, s) {
    return (_readStrings(r, [s], 'String'));
}

function _readStrings(r, a, srcName) {
    let iArr = 0;
    let ctxt = ReaderContext(r, srcName, () => iArr >= arr.length ? null : arr[iArr++]);
    return (read(ctxt));
}

function currentSource(r) {
    let ps = Reader.private(r);
    return ((ps.context && ps.context.sourceName) || '<None>');
}

function _splitToken(tok, readTable) {
    // Change this to a different object that provides a simple interface over a token.
    // Doesn't need the complete overhead of a reader and context.


    // Change this to just call the token pattern matching interface.
    // Will only use the pattern matching component of the ReaderTable. Other handlers will not
    // come into play.
    if (!Yaga.isaYagaType(tok) || !tok.isaToken) throw Yaga.errors.YagaException(undefined, `Expecting a token. Found(${tok})`);
    readTable = Yaga.ReaderTable.new(readTable); // Validate the ReaderTable

    // Init code to all pattern matching

    // Call pattern matching interface
}


function read(ctxt, line, col) {
    pushReaderContext(ctxt.reader, ctxt);
    ctxt.line = line !== undefined ? line : 1;
    ctxt.column = col !== undefined ? col : 0;
    try {
        ctxt.startReader();
        while (moreTokens(ctxt));
    } catch (err) {
        addError(ctxt, `${err.name}: ${err.message}`, ctxt.lastReadPoint, err);
    }
    popReaderContext(ctxt.reader);
    return (ctxt.endReader()); // The endReader handler must answer the expression object that is to be returned.
}

function moreTokens(ctxt) {
    ctxt.lastToken = ctxt.curToken;
    if (ctxt.tokStream.length > 0) {
        ctxt.curToken = ctxt.tokStream.splice(0, 1)[0];
        return (patternMatch(ctxt, ctxt.curToken));
    }
    return (patternMatch(ctxt, ctxt.curToken = nextToken(ctxt)));
}

function nextToken(ctxt) {
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
    let readPoint = ctxt.currentPoint;
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


function __stateHandler(stateName, fn) {
    return function (...args) {
        if (!this.readTable[stateName]) return;
        this.readTable[stateName](fn(this, ...args));
    }
}

function _endReader() {
    if (!this.readTable.endReader) {
        if (ctxt.exprStack.length > 0)
            throw Yaga.errors.ReaderException(ctxt.lastReadPoint, "Missing end of expression");
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
            throw Yaga.errors.ParserException(this.lastParserPoint, "End of input detected", ENDOFINPUT);
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
        throw Yaga.errors.InternalException(undefined, "Attempting mulitple pushbacks");
    }
    /*    
    Needs to be rewritten once we work out the readtable functions will use peek and pushback.
        this.column--;
        this._pushbackChar = this.curChar;
        this.curChar = ' ';
        */
};

function pushParentPoint(ctxt, point) {
    ctxt.parentPoints.push(ctxt.parentPoint);
    ctxt.parentPoint = point;
}

function popParentPoint(ctxt) {
    ctxt.parentPoint = ctxt.parentPoints.pop();
}

function newParentPoint(ctxt) {
    let point = ctxt.currentPoint;
    pushParentPoint(ctxt, point);
    return (point);
}


function _emitBufferToken(ctxt, nChars) {
    let len = ctxt.tokBuf.length();
    if (len === 0) return;
    if (nChars !== undefined && len < nChars)
        throw Yaga.errors.InternalException(`Invalid request`);
    let str;
    if (nChars === undefined) str = ctxt.tokBuf.toString();
    else str = ctxt.tokBuf.substr(0, nChars);
    ctxt.tokBuf.splice(0, str.length);
    let tok = Yaga.Token.newReaderToken(str, ctxt.lastReadPoint);
    ctxt.lastReadPoint = ctxt.lastReadPoint.increment(str.length);
    ctxt.tokenCreated(tok); // This function has respossibility for ensuring that the token is added to the expression
}

function _matchPatterns(ctxt) {
    let patterns = ctxt.readTable.patterns;
    let maxlen = patterns.maxPatternLength;
    if (maxlen < 0) return; // No patterns to match on
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
        fnThrow: msg => Yaga.errors.YagaException(ctxt.lastReadPoint, msg),
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
    let readPoint = ctxt.currentPoint;
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
    let readPoint = ctxt.currentPoint;
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
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
var chEOS = Character.EndOfStream;

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
        private_: {
            readerTable: _,
            options: _,
            context: _,
            contextStack: _
        }
    },
    constructor(rt, options) {
        rt = ReaderTable(rt);
        let ps = Reader.private(this);
        ps.readerTable = rt;
        ps.options = options;
        ps.contextStack = [];
    }
});

module.exports = Object.freeze({
    Reader: Reader.create,
    Initialise(exps) {
        ReadPoint = exps.ReadPoint;
        ReaderTable = exps.ReaderTable;
    }
});

var ReaderContext = Yaga.Influence({
    name: 'ReaderContext',
    prototype: {
        reader: _,
        fnRead: _,
        readerTable: _,
        readerTableStack: _,

        sourceName: _,
        line: 0,
        column: 0,
        expression: _,
        exprStack: _,
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

        text: _,
        textPosition: 0,
        textLength: 0,
        tabCount: 4,
        eos: false,
        pushbackChar: _,
    },
    constructor(r, srcName, fnRead) {
        this.reader = r;
        this.sourceName = srcName;
        this.fnRead = fnRead;
        this.parentPoint = ReadPoint.default;
        this.exprStack = [];
        this.parentPoints = [];
        this.readerTableStack = [];
        this.tokStream = [];
        this.tokBuf = Yaga.StringBuilder();
        let ps = Reader.private(r);
        this.readerTable = ps.readerTable;
        this.state = statePrototypes(this);
        if (ps.options) {
            if (ps.options.tabCount)
                this.tabcount = ps.options.tabCount;
        }
    },
});

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
    let ia = 0;
    let ctxt = ReaderContext.create(r, srcName, () => ia >= a.length ? null : a[ia++]);
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
        while (moreTokens(ctxt));
    } catch (err) {
        if (!error(ctxt, `${err.name}: ${err.message}`, ctxt.lastReadPoint, err))
            throw err
    }
    return (popReaderContext(ctxt));
}

function pushReaderContext(r, ctxt) {
    let ps = Reader.private(r);
    if (ps.contextStack.length == 0)
        startReader(ctxt);
    startStream(ctxt);
    ps.contextStack.push(ps.context);
    ps.context = ctxt;
}

function popReaderContext(ctxt) {
    let ps = Reader.private(ctxt.reader);
    if (ps.contextStack.length === 0)
        throw new Error('No Reader context to pop');
    let expr = endStream(ctxt);
    ps.context = ps.contextStack.pop();
    if (ps.contextStack.length == 0)
        endReader(ctxt);
    return (expr);
}

function moreTokens(ctxt) {
    ctxt.lastToken = ctxt.curToken;
    ctxt.curToken = ctxt.tokStream.shift() || nextToken(ctxt);
    return (performTokenAction(ctxt, ctxt.curToken));
}

function nextToken(ctxt) {
    // Skip any initial white space
    let ch;
    do {
        ch = readChar(ctxt);
        if (Character.isEndOfLine(ch))
            return (EOLToken(ctxt));
        if (ch === chEOS) {
            // Don't want two end of lines if EOS occurs straight after a NL
            if (ctxt.column !== 0) {
                ctxt.tokStream.push(EOSToken(ctxt));
                return (EOLToken(ctxt));
            }
            return (EOSToken(ctxt));
        }
    } while (Character.isWhitespace(ch));

    ctxt.tokBuf.clear();
    let readPoint = ctxt.currentPoint;
    do {
        ctxt.tokBuf.append(ch);
        ch = readChar(ctxt);
    } while (!Character.isWhitespace(ch) && ch !== chEOS);
    pushbackChar(ctxt, ch);
    return (Token(ctxt, ctxt.tokBuf.toString(), readPoint));
}

function readChar(ctxt) {
    let ch = readNextChar(ctxt);
    switch (ch) {
        case '\r':
            if (peekNextChar(ctxt) !== '\n')
                return (ch);
            return (readNextChar(ctxt));
        case '\t':
            let tc = this.tabCount;
            this.column = (this.column + tc) / tc * tc + 1;
        default:
            return (ch);
    }
}

function readNextChar(ctxt) {
    let ch = ctxt.pushbackChar;
    if (ch) {
        ctxt.pushbackChar = _;
        return (ch);
    } else if (ctxt.textPosition >= ctxt.textLength) {
        if (ctxt.eos)
            throw EndOfStream(ctxt.currentPoint);
        if ((ctxt.text = ctxt.fnRead()) == null) {
            ctxt.eos = true;
            ch = chEOS;
        } else {
            if ((ctxt.textLength = ctxt.text.length) == 0)
                return (readNextChar(ctxt));
            ctxt.textPosition = 1;
            ch = ctxt.text[0];
        }
    } else
        ch = ctxt.text[ctxt.textPosition++]
    ctxt.column++;
    return (ch);
}

function peekNextChar(ctxt) {
    if (ctxt.pushbackChar)
        return (ctxt.pushbackChar);
    if (ctxt.textPosition >= ctxt.textLength) {
        if (ctxt.eos || (ctxt.text = ctxt.fnRead()) == null) {
            ctxt.eos = true;
            return (chEOS);
        }
        ctxt.textPosition = 0;
        if ((ctxt.textLength = ctxt.text.length) == 0)
            return (peekNextChar(ctxt));
        return (ctxt.text[0]);
    }
    return (ctxt.text[ctxt.textPosition]);
}

function pushbackChar(ctxt, ch) {
    if (ctxt.pushbackChar)
        throw new Error('Attempting mulitple pushbacks');
    ctxt.pushbackChar = ch;
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

function performTokenAction(ctxt, tok) {
    return (tok.action(ctxt));
}

function Token(chs, readPoint) {
    return {
        token: {
            typeName: 'ReaderToken',
            isaReaderToken: true,
            readPoint: readPoint,
            chars: chs,
        },
        action(ctxt) {
            // Pattern matching goes here etc goes here
            return (true);
        }
    }
}

function EOLToken(ctxt) {
    let readPoint = ctxt.currentPoint;
    ctxt.lineNo++;
    ctxt.column = 0;
    return {
        token: {
            typeName: 'ReaderToken:EOL',
            isaReaderToken: true,
            isEOL: true,
            readPoint: readPoint,
        },
        action(ctxt) {
            if (ctxt.readerTable.endLine)
                ctxt.readerTable.endLine(endLineState(ctxt, this.token));
            return (true);
        }
    }
}

function EOSToken(ctxt) {
    let readPoint = ctxt.currentPoint;
    return {
        token: {
            typeName: 'ReaderToken:EOS',
            isaReaderToken: true,
            isEOS: true,
            readPoint: readPoint,
        },
        action(ctxt) {
            if (ctxt.exprStack.length > 0)
                throw ReaderError(ctxt.lastReadPoint, 'Missing end of expression');
            return (false);
        }
    }
}

function Expression(readPoint = ReadPoint.default, startToken, endToken) {
    return {
        typeName: 'ReaderExpression',
        isaReaderExpression: true,
        readPoint: readPoint,
        startToken: startToken,
        endToken: endToken,
        list: [],
    }
}

function startReader(ctxt) {
    if (ctxt.readerTable.startReader)
        ctxt.readerTable.startReader(startReaderState(ctxt));
}

function endReader(ctxt) {
    if (ctxt.readerTable.endReader)
        ctxt.readerTable.endReader(endReaderState(ctxt));
}

function startStream(ctxt) {
    // The startStream handler must answer the expression object that is the root expression.
    let expr = Expression();
    if (ctxt.readerTable.startStream)
        expr = ctxt.readerTable.startStream(startStreamState(ctxt, expr));
    ctxt.expression = expr;
}

function endStream(ctxt) {
    // The endReader handler must answer the expression object that is to be returned.
    let expr = ctxt.expression;
    if (ctxt.readerTable.endStream)
        expr = ctxt.readerTable.endStream(endStreamState(ctxt, expr));
    return (expr);
}

function error(ctxt, msg, point, oSrc) {
    if (!ctxt.readerTable.error)
        return (false);
    return (ctxt.readerTable.error(errorState(ctxt, msg, point, oSrc)));
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

function _defineProtectedProperty(obj, name, val) {
    Object.defineProperty(obj, name, {
        value: val,
        enumerable: true,
        writable: false,
        configurable: false
    })
}

// Reader state functions and prototypes

function statePrototypes(ctxt) {
    function fnThrow(r, msg) {
        throw ReaderError(ctxt.lastReadPoint, msg);
    }

    function fnPushReaderTable(r, rt) {
        ctxt.readTableStack.push(ctxt.readTable);
        return (ctxt.readTable = tr);
    }

    function fnPopReaderTable(r) {
        return (ctxt.readTable = ctxt.readTableStack.pop());
    }

    return {
        startReaderState: {
            typeName: 'State:StartReader',
            reader: ctxt.reader,
            throw: fnThrow,
            pushReaderTable: fnPushReaderTable,
        },
        endReaderState: {
            typeName: 'State:EndReader',
            reader: ctxt.reader,
            throw: fnThrow,
            popReaderTable: fnPopReaderTable,
        },
        startStreamState: {
            typeName: 'State:StartReader',
            reader: ctxt.reader,
            throw: fnThrow,
            pushReaderTable: fnPushReaderTable,
        },
        endStreamState: {
            typeName: 'State:EndReader',
            reader: ctxt.reader,
            throw: fnThrow,
            popReaderTable: fnPopReaderTable,
        },
        endLineState: {
            typeName: 'State:EndLine',
            reader: ctxt.reader,
            throw: fnThrow,
            pushReaderTable: fnPushReaderTable,
            popReaderTable: fnPopReaderTable,
            startExpression: _,
            endExpression: _,
        },
        errorState: {
            typeName: 'State:Error',
            reader: ctxt.reader,
        }
    }
}
// Reader table functions state object templates.

function startReaderState(ctxt) {
    return (Object.create(ctxt.state.startReaderState));
}

function endReaderState(ctxt) {
    return (Object.create(ctxt.state.endReaderState));
}

function startStreamState(ctxt, expr) {
    let state = Object.create(ctxt.state.startStreamState);
    state.rootExpression = expr;
    return (state);
}

function endStreamState(ctxt, expr) {
    let state = Object.create(ctxt.state.endStreamState);
    state.rootExpression = expr;
    return (state);
}

function endLineState(ctxt, tok) {
    let state = Object.create(ctxt.state.endLineState);
    state.token = tok;
    return (state);
}

function errorState(ctxt, msg, point, oAttach) {
    let state = Object.create(ctxt.state.errorState);
    state.message = msg;
    state.readPoint = point;
    state.attachment = oAttach;
    return (state);
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

// Exceptions
var EndOfStream = Yaga.Exception({
    name: 'yaga.Reader.EndOfStream',
    constructor(point) {
        this.point = point;
        return (point.format() + ' : End of stream detected');
    }
});

var ReaderError = Yaga.Exception({
    name: 'yaga.ReaderError',
    constructor(point, msg) {
        this.point = point;
        return (point.format() + ' : ' + msg);
    }
})
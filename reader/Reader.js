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
    constructor(r, s, f) {
        let ps = Reader.private(r);
        return {
            reader: r,
            sourceName: s,
            fnRead: () => f, // Need a function to return a function
            parentPoint: () => ReadPoint.default,
            tokBuf: () => Yaga.StringBuilder(),
            readerTable: () => ps.readerTable,
            state: () => statePrototypes(this),
            tabCount: () => {
                if (ps.options && ps.options.tabCount)
                    return (ps.options.tabCount);
            },
            exprStack: [],
            parentPoints: [],
            readerTableStack: [],
            tokStream: [],
        }
    },
});

function readFile(r, path) {
    let fs = require('fs');
    let fd = fs.openSync(path, 'r');
    let encoding, oPos = 0,
        buf = Buffer.alloc(8192);
    let ctxt = ReaderContext.create(r, fs.realpathSync(path), () => {
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
    startLine(ctxt);
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
    return (ctxt.curToken.action());
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

function Token(ctxt, chs, readPoint) {
    return {
        token: {
            typeName: 'ReaderToken',
            isaReaderToken: true,
            readPoint: readPoint,
            chars: chs,
        },
        action() {
            // Pattern matching goes here etc goes here
            commitToken(ctxt, this.token);
            return (true);
        }
    }
}

function EOLToken(ctxt) {
    let readPoint = ctxt.currentPoint;
    ctxt.line++;
    ctxt.column = 0;
    return {
        token: {
            typeName: 'ReaderToken:EOL',
            isaReaderToken: true,
            isEOL: true,
            readPoint: readPoint,
        },
        action() {
            endLine(ctxt, this.token);
            if (peekNextChar(ctxt) !== chEOS)
                startLine(ctxt);
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
        action() {
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
        push(tok) {
            this.tokens.push(tok);
        },
        readPoint: readPoint,
        startToken: startToken,
        endToken: endToken,
        tokens: [],
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

function startLine(ctxt) {
    if (ctxt.readerTable.startLine)
        ctxt.readerTable.startLine(startLineState(ctxt, ctxt.currentPoint));
}

function endLine(ctxt, tok) {
    if (ctxt.readerTable.endLine)
        ctxt.readerTable.endLine(endLineState(ctxt, tok));
}

function commitToken(ctxt, tok) {
    if (ctxt.readerTable.commitToken) {
        // The ReaderTable function must complete the commit
        ctxt.readerTable.commitToken(commitTokenState(ctxt, tok));
        return;
    }
    // Default is to just add the token
    addToken(ctxt, tok);
}

function error(ctxt, msg, point, oSrc) {
    if (!ctxt.readerTable.error)
        return (false);
    return (ctxt.readerTable.error(errorState(ctxt, msg, point, oSrc)));
}

// Internal expression related functions.

function addToken(ctxt, tok) {
    ctxt.expression.push(tok);
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
    function fnThrow(msg) {
        throw ReaderError(ctxt.lastReadPoint, msg);
    }

    function fnPushReaderTable(rt) {
        ctxt.readTableStack.push(ctxt.readTable);
        return (ctxt.readTable = tr);
    }

    function fnPopReaderTable() {
        return (ctxt.readTable = ctxt.readTableStack.pop());
    }

    function fnAddToken(tok) {
        addToken(ctxt, tok)
    }

    function fnAddChar(ch) {
        addChar(ctxt, ch);
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
        startLineState: {
            typeName: 'State:StartLine',
            reader: ctxt.reader,
            throw: fnThrow,
            pushReaderTable: fnPushReaderTable,
            popReaderTable: fnPopReaderTable,
            startExpression: _,
            endExpression: _,
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
        commitTokenState: {
            typeName: 'State:CommitToken',
            reader: ctxt.reader,
            throw: fnThrow,
            pushReaderTable: fnPushReaderTable,
            popReaderTable: fnPopReaderTable,
            addToken: fnAddToken,
        },
        commitCharState: {
            typeName: 'State:CommitChar',
            reader: ctxt.reader,
            throw: fnThrow,
            pushReaderTable: fnPushReaderTable,
            popReaderTable: fnPopReaderTable,
            addToken: fnAddToken,
            addChar: fnAddChar,
        },
        errorState: {
            typeName: 'State:Error',
            reader: ctxt.reader,
        },
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

function startLineState(ctxt, point) {
    let state = Object.create(ctxt.state.endLineState);
    state.readPoint = point;
    return (state);
}

function endLineState(ctxt, tok) {
    let state = Object.create(ctxt.state.endLineState);
    state.token = tok;
    return (state);
}

function commitTokenState(ctxt, tok) {
    let state = Object.create(ctxt.state.commitTokenState);
    state.token = tok;
    return (state);
}

function commitChar(ctxt, ch) {
    let state = Object.create(ctxt.state.commitTokenState);
    state.char = ch;
    return (state);
}

function errorState(ctxt, msg, point, oAttach) {
    let state = Object.create(ctxt.state.errorState);
    state.message = msg;
    state.readPoint = point;
    state.attachment = oAttach;
    return (state);
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
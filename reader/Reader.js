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
        curToken: _,
        curInput: _,
        inputStream: _,
        charBuf: _,

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
            charBuf: () => Yaga.StringBuilder(),
            readerTable: () => ps.readerTable,
            state: () => statePrototypes(this),
            tabCount: () => {
                if (ps.options && ps.options.tabCount)
                    return (ps.options.tabCount);
            },
            exprStack: [],
            parentPoints: [],
            readerTableStack: [],
            inputStream: [],
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
    ctxt.line = line !== undefined ? line : 1;
    ctxt.column = col !== undefined ? col : 0;
    pushReaderContext(ctxt.reader, ctxt);
    startLine(ctxt);
    try {
        while (moreText(ctxt));
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
    ps.contextStack.push(ps.context);
    ps.context = ctxt;
    startStream(ctxt);
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

function moreText(ctxt) {
    if (ctxt.inputStream.length === 0) nextInput(ctxt);
    return (ctxt.inputStream.shift().action());
}

function nextInput(ctxt) {
    // Skip any initial white space
    let ch, stream = ctxt.inputStream;
    do {
        ch = readChar(ctxt);
        if (Character.isEndOfLine(ch))
            stream.push(EOLInput(ctxt));
        else if (ch === chEOS) {
            // Don't want two end of lines if EOS occurs straight after a NL
            if (ctxt.column !== 0)
                stream.push(EOLInput(ctxt));
            stream.push(EOSInput(ctxt));
            return; // Can't go any further
        }
    } while (Character.isWhitespace(ch));

    let chs = ctxt.charBuf.clear();
    let readPoint = ctxt.currentPoint;
    do {
        chs.append(ch);
        ch = readChar(ctxt);
    } while (!Character.isWhitespace(ch) && ch !== chEOS);
    stream.push(TokenInput(ctxt, chs.toString(), readPoint));
    if (Character.isEndOfLine(ch))
        stream.push(EOLInput(ctxt));
    else if (ch === chEOS) {
        stream.push(EOLInput(ctxt));
        stream.push(EOSInput(ctxt));
    }
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

function TokenInput(ctxt, chs, readPoint, isMatched = false) {
    let iPeek, iInput = -1;
    return {
        typeName: 'TokenInput',
        readPoint: readPoint,
        fHandler: _,
        chars: chs,
        startPeek: () => iPeek = iInput,
        peekNext() {
            if (++iPeek >= this.chars.length)
                return (null);
            return (this.chars[iPeek]);
        },
        peekReadPoint() {
            return (iPeek === 0 ? this.readPoint : this.readPoint.increment(iPeek));
        },
        action() {
            // Try the ReaderTable patterns to split the token input.
            let match;
            if (!isMatched && (match = ctxt.readerTable.match(chs))) {
                let split = this.split(match.position, match.what.length);
                ctxt.inputStream = split.concat(ctxt.inputStream); // Add the split tokens to the head of the stream
                split[1].fHandler = match.fHandler;
                // Go back now and process the new token inputs from the stream, noting that pattern matching will be ignored
                // the next time through for inputs that have already been scanned.
                return (true);
            }
            if (this.fHandler) {
                // Up to the a ReaderTable pattern handler to process the token for this input.
                patternHandler(ctxt, this.fHandler, ctxt.curToken = Token(ctxt, this.readPoint, this.chars));
                return (true);
            }
            // Default processing required, so will need to commit each char, followed by the resultant token
            // if it has any content.
            if (ctxt.readerTable.commitChar) {
                ctxt.curInput = this;
                ctxt.curToken = Token(ctxt, this.readPoint);
                iInput = 0;
                commitChar(ctxt, this.chars[0], this.readPoint);
                for (let i = 1, len = this.chars.length; i < len; i++) {
                    iInput = i;
                    commitChar(ctxt, this.chars[i], this.readPoint.increment(i));
                }
                ctxt.curInput = _;
                if (ctxt.curToken.chars.length === 0)
                    return;
            } else
                ctxt.curToken = Token(ctxt, this.readPoint, this.chars);
            let tok = ctxt.curToken;
            ctxt.curToken = null;
            commitToken(ctxt, tok);
            return (true);
        },
        split(pos, len = this.chars.length - pos, match = [true, true, false]) {
            let a = [NullInput, null, NullInput];
            if (pos > 0)
                a[0] = TokenInput(ctxt, this.chs.substr(0, pos), this.readPoint, match[0]);
            a[1] = TokenInput(ctxt, this.chs.substr(pos, len), pos === 0 ? this.readPoint : this.readPoint.increment(pos), match[1]);
            if (pos + len >= this.chars.length)
                a[2] = TokenInput(ctxt, this.chs.substr(pos + len), this.readPoint.increment(pos + len), match[2]);
            return (a);
        }
    }
}

function EOLInput(ctxt) {
    let iPeek, readPoint = ctxt.currentPoint;
    ctxt.line++;
    ctxt.column = 0;
    return {
        typeName: 'EOLInput',
        readPoint: readPoint,
        startPeek: () => iPeek = 0,
        peekNext: () => iPeek++ === 0 ? '\n' : null,
        peekReadPoint: () => readPoint,
        action() {
            endLine(ctxt, this.readPoint);
            if (peekNextChar(ctxt) !== chEOS)
                startLine(ctxt);
            return (true);
        }
    }
}

function EOSInput(ctxt) {
    let readPoint = ctxt.currentPoint;
    return {
        typeName: 'EOSInput',
        readPoint: readPoint,
        startPeek: () => _,
        peekNext: () => chEOS,
        peekReadPoint: () => readPoint,
        action() {
            if (ctxt.exprStack.length > 0)
                throw ReaderError(ctxt.lastReadPoint, 'Missing end of expression');
            return (false);
        }
    }
}

var NullInput = {
    typeName: 'NullInput',
    startPeek: () => _,
    peekNext: () => null,
    peekReadPoint: () => ReadPoint.default,
    action: () => true
}

function Token(ctxt, readPoint = ctxt.currentPoint, chs = '') {
    return {
        typeName: 'ReaderToken',
        isaReaderToken: true,
        add(ch) {
            this.chars += ch;
        },
        nextReadPoint() {
            return (readPoint.increment(this.chars.length));
        },
        readPoint: readPoint,
        chars: chs
    }
}

function Expression(ctxt, startToken, endToken) {
    let readPoint = (startToken && startToken.readPoint) || ctxt.currentPoint;
    return {
        typeName: 'ReaderExpression',
        isaReaderToken: true,
        isaReaderExpression: true,
        add(tok) {
            this.tokens.push(tok);
        },
        readPoint: readPoint,
        get startToken() {
            return (startToken);
        },
        set startToken(tok) {
            startToken = tok;
            this.readPoint = tok.readPoint;
        },
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
    let expr = Expression(ctxt);
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

function endLine(ctxt, readPoint) {
    if (ctxt.readerTable.endLine)
        ctxt.readerTable.endLine(endLineState(ctxt, readPoint));
}

function commitExpression(ctxt, exprTok) {
    if (ctxt.readerTable.commitExpression) {
        // The ReaderTable function must complete the commit
        ctxt.readerTable.commitExpression(commitExpressionState(ctxt, exprTok));
        return;
    }
    // Default is to just add the expression token
    addToken(ctxt, exprTok);
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

function commitChar(ctxt, ch, readPoint) {
    if (ctxt.readerTable.commitChar) {
        // The ReaderTable function must complete the commit
        ctxt.readerTable.commitChar(commitCharState(ctxt, ch, readPoint));
        return;
    }
    // Default is to just add the token
    addChar(ctxt, ch);
}

function patternHandler(ctxt, f, tok) {
    f(patternState(ctxt, tok));
}

function error(ctxt, msg, point, oSrc) {
    if (!ctxt.readerTable.error)
        return (false);
    return (ctxt.readerTable.error(errorState(ctxt, msg, point, oSrc)));
}

// Internal expression related functions.

function addToken(ctxt, tok) {
    // Before adding the token, we must check if we have a partially built current token.
    // If so then we need to flush this token first as the ReaderTable has already
    // committed these characters. Will still give the ReaderTable a chance to throw the
    // operation away by calling commitToken.
    if (ctxt.curToken && ctxt.curToken.chars.length > 0) {
        commitToken(ctxt, ctxt.curToken);
        ctxt.curToken = Token(ctxt, tok.readPoint.nextReadPoint()); // Leave a fresh token for additional commitChars
    }
    ctxt.expression.add(tok);
}

function addChar(ctxt, ch) {
    if (!ctxt.curToken)
        throw ReaderError(ctxt.currentPoint, 'Invalid request to add a char to a token');
    ctxt.curToken.add(ch);
}

// Reader state functions and prototypes

function statePrototypes(ctxt) {
    function fThrow(msg) {
        throw ReaderError(ctxt.lastReadPoint, msg);
    }

    function fPushReaderTable(rt) {
        ctxt.readTableStack.push(ctxt.readTable);
        return (ctxt.readTable = tr);
    }

    function fPopReaderTable() {
        return (ctxt.readTable = ctxt.readTableStack.pop());
    }

    function fAddToken(tok) {
        if (typeof tok != 'object' || !tok.isaReaderToken)
            throw ReaderError(ctxt.currentPoint, 'Reader Token expected');
        addToken(ctxt, tok)
    }

    function fAddChar(ch) {
        if (typeof ch !== 'string' || ch.length !== 1)
            throw ReaderError(ctxt.currentPoint, 'Single character string expected');
        addChar(ctxt, ch);
    }

    function fExpression(startToken, endToken) {
        return (Expression(startToken, endToken));
    }

    function fStartExpression(exprTok, startToken, endToken) {
        ctxt.exprStack.push(ctxt.expression);
        ctxt.expression = exprTok;
        if (startToken) exprTok.startToken = startToken;
        if (endToken) exprTok.endToken = endToken;
        ctxt.parentPoints.push(ctxt.parentPoint);
        ctxt.parentPoint = exprTok.readPoint;
    }

    function fEndExpression(endToken) {
        if (ctxt.exprStack.length === 0)
            throw ReaderError(ctxt.currentPoint, 'No open expression');
        let exprTok = ctxt.expression;
        if (endToken) exprTok.endToken = endToken;
        commitExpression(ctxt, exprTok);
        ctxt.parentPoint = ctxt.parentPoints.pop();
    }

    function fPeeker() {
        function PeekerChar(ch, point) {
            return {
                typeName: 'Peeker:Char',
                char: ch,
                readPoint: point
            }
        }
        let ch, lastReadPoint, curInput = ctxt.curInput,
            iInputStream = -1;
        if (curInput)
            curInput.startPeek();
        return {
            typeName: 'Reader:Peeker',
            next() {
                if (curInput) {
                    if (ch = curInput.peekNext())
                        return (PeekerChar(ch, lastReadPoint = curInput.peekReadPoint()));
                    curInput = null;
                    return (PeekerChar(' ', lastReadPoint.increment(1)));
                }
                if (++iInputStream >= ctxt.inputStream.length)
                    nextInput(ctxt);
                (curInput = ctxt.inputStream[iInputStream]).startPeek();
                return (this.next());
            }
        };
    }

    return {
        startReaderState: {
            typeName: 'State:StartReader',
            reader: ctxt.reader,
            throw: fThrow,
            pushReaderTable: fPushReaderTable,
        },
        endReaderState: {
            typeName: 'State:EndReader',
            reader: ctxt.reader,
            throw: fThrow,
            popReaderTable: fPopReaderTable,
        },
        startStreamState: {
            typeName: 'State:StartReader',
            reader: ctxt.reader,
            throw: fThrow,
            pushReaderTable: fPushReaderTable,
        },
        endStreamState: {
            typeName: 'State:EndReader',
            reader: ctxt.reader,
            throw: fThrow,
            popReaderTable: fPopReaderTable,
        },
        startLineState: {
            typeName: 'State:StartLine',
            reader: ctxt.reader,
            throw: fThrow,
            pushReaderTable: fPushReaderTable,
            popReaderTable: fPopReaderTable,
            expression: fExpression,
            startExpression: fStartExpression,
            endExpression: fEndExpression,
            addToken: fAddToken,
            peeker: fPeeker,
        },
        endLineState: {
            typeName: 'State:EndLine',
            reader: ctxt.reader,
            throw: fThrow,
            pushReaderTable: fPushReaderTable,
            popReaderTable: fPopReaderTable,
            expression: fExpression,
            startExpression: fStartExpression,
            endExpression: fEndExpression,
            addToken: fAddToken,
            peeker: fPeeker,
        },
        commitExpressionState: {
            typeName: 'State:CommitExpression',
            reader: ctxt.reader,
            throw: fThrow,
            pushReaderTable: fPushReaderTable,
            popReaderTable: fPopReaderTable,
            expression: fExpression,
            startExpression: fStartExpression,
            endExpression: fEndExpression,
            addToken: fAddToken,
            peeker: fPeeker,
        },
        commitTokenState: {
            typeName: 'State:CommitToken',
            reader: ctxt.reader,
            throw: fThrow,
            pushReaderTable: fPushReaderTable,
            popReaderTable: fPopReaderTable,
            expression: fExpression,
            startExpression: fStartExpression,
            endExpression: fEndExpression,
            addToken: fAddToken,
            peeker: fPeeker,
        },
        commitCharState: {
            typeName: 'State:CommitChar',
            reader: ctxt.reader,
            throw: fThrow,
            pushReaderTable: fPushReaderTable,
            popReaderTable: fPopReaderTable,
            expression: fExpression,
            startExpression: fStartExpression,
            endExpression: fEndExpression,
            addToken: fAddToken,
            addChar: fAddChar,
            peeker: fPeeker,
        },
        patternState: {
            typeName: 'State:Pattern',
            reader: ctxt.reader,
            throw: fThrow,
            pushReaderTable: fPushReaderTable,
            popReaderTable: fPopReaderTable,
            expression: fExpression,
            startExpression: fStartExpression,
            endExpression: fEndExpression,
            addToken: fAddToken,
            peeker: fPeeker,
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

function endLineState(ctxt, point) {
    let state = Object.create(ctxt.state.endLineState);
    state.readPoint = point;
    return (state);
}

function commitExpressionState(ctxt, exprTok) {
    let state = Object.create(ctxt.state.commitExpressionState);
    state.expression = exprTok;
    return (state);
}

function commitTokenState(ctxt, tok) {
    let state = Object.create(ctxt.state.commitTokenState);
    state.token = tok;
    return (state);
}

function commitCharState(ctxt, ch, point) {
    let state = Object.create(ctxt.state.commitCharState);
    state.char = ch;
    state.readPoint = point;
    return (state);
}

function patternState(ctxt, tok) {
    let state = Object.create(ctxt.state.patternState);
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
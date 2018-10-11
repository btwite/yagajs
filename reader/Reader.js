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
        }
    },
    constructor(rt, options = {}) {
        return {
            private_: {
                readerTable: ReaderTable.check(rt),
                options,
                context: _,
                contextStack: []
            }
        }
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
        get currentPoint() {
            return (this.lastReadPoint = ReadPoint(this.sourceName, this.line, this.column, this.parentPoint));
        },
    },
    constructor(r, s, f) {
        let ps = Reader.private(r);
        // 'reader' & 'rtcb' must be initialised before call to 'statePrototypes'
        this.reader = r;
        this.rtcb = {};
        return {
            fnRead: f,
            readerTable: ps.readerTable,
            readerTableStack: [],
            state: statePrototypes(this),

            sourceName: s,
            line: 0,
            column: 0,
            tabCount: ps.options.tabCount ? ps.options.tabCount : 4,
            expression: _,
            exprStack: [],
            curToken: _,
            curInput: _,
            inputStream: [],
            charBuf: Yaga.StringBuilder(),

            lastReadPoint: _,
            parentPoint: ReadPoint.default,
            parentPoints: [],

            text: _,
            textPosition: 0,
            textLength: 0,
            eos: false,
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
    ps.context = ps.contextStack.pop();
    if (ps.contextStack.length == 0)
        endReader(ctxt);
    return (ctxt.expression);
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
            let readPoint = ctxt.currentPoint;
            if (ctxt.column !== 0)
                stream.push(EOLInput(ctxt));
            stream.push(EOSInput(ctxt, readPoint));
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
        let readPoint = ctxt.currentPoint;
        stream.push(EOLInput(ctxt));
        stream.push(EOSInput(ctxt, readPoint));
    }
}

function readChar(ctxt) {
    let ch = readNextChar(ctxt);
    switch (ch) {
        case '\r':
            if (peekNextChar(ctxt) !== '\n')
                return (ch);
            ctxt.column--; // Count /r/n as 1 character
            return (readNextChar(ctxt));
        case '\t':
            let tc = ctxt.tabCount;
            ctxt.column = Math.floor((ctxt.column - 1 + tc) / tc) * tc;
        default:
            return (ch);
    }
}

function readNextChar(ctxt) {
    var ch;
    if (ctxt.textPosition >= ctxt.textLength) {
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
    if (ctxt.textPosition >= ctxt.textLength) {
        if (ctxt.eos || (ctxt.text = ctxt.fnRead()) == null)
            return (chEOS);
        ctxt.textPosition = 0;
        if ((ctxt.textLength = ctxt.text.length) == 0)
            return (peekNextChar(ctxt));
        return (ctxt.text[0]);
    }
    return (ctxt.text[ctxt.textPosition]);
}

function TokenInput(ctxt, chs, readPoint, isMatched = false) {
    let iPeek, iCurInput = -1;
    return {
        typeName: 'TokenInput',
        readPoint: readPoint,
        fHandler: _,
        chars: chs,
        startPeek: () => iPeek = iCurInput,
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
                patternHandler(ctxt, this.fHandler, Token(ctxt, this.readPoint, this.chars));
                return (true);
            }
            // Default processing required, so will need to commit each char, followed by the resultant token
            // if it has any content.
            let tok;
            if (ctxt.readerTable.commitChar) {
                ctxt.curInput = this;
                ctxt.curToken = Token(ctxt, this.readPoint);
                iCurInput = commitChar(ctxt, this.chars[0], this.readPoint, 0);
                for (let len = this.chars.length; ++iCurInput < len;) {
                    iCurInput = commitChar(ctxt, this.chars[iCurInput], this.readPoint.increment(iCurInput), iCurInput);
                }
                ctxt.curInput = _;
                tok = ctxt.curToken;
                ctxt.curToken = null;
                if (tok.chars.length === 0)
                    return (true);
            } else
                tok = Token(ctxt, this.readPoint, this.chars);
            commitToken(ctxt, tok);
            return (true);
        },
        split(pos, len = this.chars.length - pos, match = [true, true, false]) {
            let a = [NullInput, null, NullInput];
            if (pos > 0)
                a[0] = TokenInput(ctxt, this.chars.substr(0, pos), this.readPoint, match[0]);
            a[1] = TokenInput(ctxt, this.chars.substr(pos, len), pos === 0 ? this.readPoint : this.readPoint.increment(pos), match[1]);
            if (pos + len < this.chars.length)
                a[2] = TokenInput(ctxt, this.chars.substr(pos + len), this.readPoint.increment(pos + len), match[2]);
            return (a);
        }
    }
}

function EOLInput(ctxt) {
    let iPeek,
        chNext = peekNextChar(ctxt),
        readPoint = ctxt.currentPoint,
        oInput = {
            typeName: 'EOLInput',
            readPoint: readPoint,
            startPeek: () => iPeek = 0,
            peekNext: () => iPeek++ === 0 ? '\n' : null,
            peekReadPoint: () => readPoint,
            action() {
                endLine(ctxt, this.readPoint);
                if (chNext !== chEOS)
                    startLine(ctxt);
                return (true);
            }
        };
    ctxt.line++;
    //    ctxt.column = chNext === chEOS ? 1 : 0;
    ctxt.column = 0;
    return (oInput);
}

function EOSInput(ctxt, readPoint = ctxt.currentPoint) {
    return {
        typeName: 'EOSInput',
        readPoint: readPoint,
        startPeek: () => _,
        peekNext: () => chEOS,
        peekReadPoint: () => readPoint,
        action() {
            endStream(ctxt);
            if (ctxt.exprStack.length > 0)
                throw ReaderError(readPoint, 'Missing end of expression');
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
        typeName: 'Reader.Token',
        isaToken: true,
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
        typeName: 'Reader.Expression',
        isaToken: true,
        isaExpression: true,
        add(tok) {
            this.tokens.push(tok);
        },
        nextReadPoint() {
            return (readPoint.increment(startToken ? startToken.chars.length : 1));
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
    if (ctxt.readerTable.endStream)
        ctxt.expression = ctxt.readerTable.endStream(endStreamState(ctxt, ctxt.expression));
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

function commitChar(ctxt, ch, readPoint, iCurInput) {
    if (ctxt.readerTable.commitChar) {
        // The ReaderTable function must complete the commit
        // The current input index can change if the commit splits the token
        ctxt.iCurInput = iCurInput;
        ctxt.readerTable.commitChar(commitCharState(ctxt, ch, readPoint));
        return (ctxt.iCurInput);
    }
    // Default is to just add the token
    addChar(ctxt, ch);
    return (iCurInput);
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
        let curToken = ctxt.curToken;
        ctxt.curToken = Token(ctxt, tok.nextReadPoint()); // Leave a fresh token for additional commitChars
        commitToken(ctxt, curToken);
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
        ctxt.readerTableStack.push(ctxt.readerTable);
        return (ctxt.readerTable = rt);
    }

    function fPopReaderTable() {
        if (ctxt.readerTableStack.length <= 0)
            throw ReaderError((ctxt.currentPoint, 'ReaderTable stack is empty'));
        return (ctxt.readerTable = ctxt.readerTableStack.pop());
    }

    function fAddToken(tok) {
        if (typeof tok != 'object' || !tok.isaToken)
            throw ReaderError(ctxt.currentPoint, 'Reader Token expected');
        addToken(ctxt, tok)
    }

    function fSplitToken() {
        // Split the current Token Input at the current point and treat as if it is
        // a complete new Input. This will force the reader table to be called on
        // the reaminder of the current Token input.
        if (!ctxt.curInput)
            throw ReaderError(ctxt.currentPoint, 'No active Token input to split');
        if (ctxt.iCurInput >= ctxt.curInput.chars.length - 1)
            return;
        let tok = TokenInput(ctxt,
            ctxt.curInput.chars.substr(ctxt.iCurInput + 1),
            this.readPoint.increment(ctxt.iCurInput + 1), false);
        ctxt.inputStream = [tok].concat(ctxt.inputStream); // Add the split token to the head of the stream
        ctxt.iCurInput = ctxt.curInput.chars.length; // Force the current Token Input action to end
    }

    function fAddChar(ch) {
        if (typeof ch !== 'string' || ch.length !== 1)
            throw ReaderError(ctxt.currentPoint, 'Single character string expected');
        addChar(ctxt, ch);
    }

    function fAddValue(v, readPoint = v.readPoint || ctxt.currentPoint) {
        // ReaderTable has converted a token or token sequence into a value object.
        // We wrap the object to look like a token
        let tok = Object.create(v);
        tok.isaToken = true;
        tok.add = () => {
            throw ReaderError(readPoint, 'Operation not supported');
        };
        tok.nextReadPoint = () => {
            throw ReaderError(readPoint, 'Operation not supported');
        };
        if (!tok.readPoint)
            tok.readPoint = readPoint;
        addToken(ctxt, tok);
    }

    function fExpression(startToken, endToken) {
        return (Expression(ctxt, startToken, endToken));
    }

    function fToken(chs, readPoint = ctxt.currentPoint) {
        return (Token(ctxt, readPoint, chs));
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
        ctxt.expression = ctxt.exprStack.pop();
        if (endToken) exprTok.endToken = endToken;
        commitExpression(ctxt, exprTok);
        ctxt.parentPoint = ctxt.parentPoints.pop();
    }

    function fPeeker() {
        function PeekerChar(ch, point) {
            return {
                typeName: 'Reader.Peeker.Char',
                char: ch,
                readPoint: point
            }
        }
        let ch, lastReadPoint, curInput = ctxt.curInput,
            iInputStream = -1;
        if (curInput)
            curInput.startPeek();
        return {
            typeName: 'Reader.Peeker',
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
            typeName: 'State.StartReader',
            reader: ctxt.reader,
            rtcb: ctxt.rtcb,
            throw: fThrow,
            pushReaderTable: fPushReaderTable,
        },
        endReaderState: {
            typeName: 'State.EndReader',
            reader: ctxt.reader,
            rtcb: ctxt.rtcb,
            throw: fThrow,
            popReaderTable: fPopReaderTable,
        },
        startStreamState: {
            typeName: 'State.StartReader',
            reader: ctxt.reader,
            rtcb: ctxt.rtcb,
            throw: fThrow,
            pushReaderTable: fPushReaderTable,
        },
        endStreamState: {
            typeName: 'State.EndReader',
            reader: ctxt.reader,
            rtcb: ctxt.rtcb,
            throw: fThrow,
            popReaderTable: fPopReaderTable,
        },
        startLineState: {
            typeName: 'State.StartLine',
            reader: ctxt.reader,
            rtcb: ctxt.rtcb,
            throw: fThrow,
            pushReaderTable: fPushReaderTable,
            popReaderTable: fPopReaderTable,
            newExpression: fExpression,
            newToken: fToken,
            startExpression: fStartExpression,
            endExpression: fEndExpression,
            addToken: fAddToken,
            addValue: fAddValue,
            peeker: fPeeker,
        },
        endLineState: {
            typeName: 'State.EndLine',
            reader: ctxt.reader,
            rtcb: ctxt.rtcb,
            throw: fThrow,
            pushReaderTable: fPushReaderTable,
            popReaderTable: fPopReaderTable,
            newExpression: fExpression,
            newToken: fToken,
            startExpression: fStartExpression,
            endExpression: fEndExpression,
            addToken: fAddToken,
            addValue: fAddValue,
            peeker: fPeeker,
        },
        commitExpressionState: {
            typeName: 'State.CommitExpression',
            reader: ctxt.reader,
            rtcb: ctxt.rtcb,
            throw: fThrow,
            pushReaderTable: fPushReaderTable,
            popReaderTable: fPopReaderTable,
            newExpression: fExpression,
            newToken: fToken,
            startExpression: fStartExpression,
            endExpression: fEndExpression,
            addToken: fAddToken,
            addValue: fAddValue,
            peeker: fPeeker,
        },
        commitTokenState: {
            typeName: 'State.CommitToken',
            reader: ctxt.reader,
            rtcb: ctxt.rtcb,
            throw: fThrow,
            pushReaderTable: fPushReaderTable,
            popReaderTable: fPopReaderTable,
            newExpression: fExpression,
            newToken: fToken,
            startExpression: fStartExpression,
            endExpression: fEndExpression,
            addToken: fAddToken,
            addValue: fAddValue,
            peeker: fPeeker,
        },
        commitCharState: {
            typeName: 'State.CommitChar',
            reader: ctxt.reader,
            rtcb: ctxt.rtcb,
            throw: fThrow,
            pushReaderTable: fPushReaderTable,
            popReaderTable: fPopReaderTable,
            newExpression: fExpression,
            newToken: fToken,
            startExpression: fStartExpression,
            endExpression: fEndExpression,
            addToken: fAddToken,
            splitToken: fSplitToken,
            addValue: fAddValue,
            addChar: fAddChar,
            peeker: fPeeker,
        },
        patternState: {
            typeName: 'State.Pattern',
            reader: ctxt.reader,
            rtcb: ctxt.rtcb,
            throw: fThrow,
            pushReaderTable: fPushReaderTable,
            popReaderTable: fPopReaderTable,
            newExpression: fExpression,
            newToken: fToken,
            startExpression: fStartExpression,
            endExpression: fEndExpression,
            addToken: fAddToken,
            addValue: fAddValue,
            peeker: fPeeker,
        },
        errorState: {
            typeName: 'State.Error',
            reader: ctxt.reader,
            rtcb: ctxt.rtcb,
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
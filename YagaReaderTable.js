/*
 *  Reader: @file
 *
 *  Generic reader object that can parse source and produce expressions based on the actions
 *  set in a readertable. Default action is to produce a sequence of tokens that are whitespace
 *  separated. Structure of the reader table as follows (Note that all values are functions):
 *      {
 *          startReader:    // Called before parse begins.
 *          endReader:      // Called at the end of input.
 *          numberLiteral:  // Called when a number literal is encountered (Whole, Decimal, Float format)
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
var _yagaReadTable;

module.exports = {
    new: _newReader,
    Point: {
        new: _newReadPoint,
    },
    defaultReadPoint: undefined,
    Initialise(y) {
        yaga = yaga ? yaga : y;
        _defReadPoint = _newReadPoint(undefined, '<None>');
        this.defaultReadPoint = _defReadPoint;
        Object.freeze(this);
    }
};

function _newReader(yi, optReadTable) {
    let reader = Object.create(_reader);
    _Private(reader).readTable = _initReadTable(optReadTable || _yagaReadTable);
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

_reader = scopes.parse({
    typeName: 'Reader',
    parseStream: _parseStream,
    parseFile: _parseFile,
    parseStrings: _parseStrings,
    parseString(s) {
        return (this.parseStrings([s])[0]);
    },
    parseToken: _parseToken,
    private_var__state: undefined,
    private_var__readTable: undefined,
});
Object.freeze(_reader);
_Private = scopes.getScopeFns(_reader).private;
scopes.lock(_reader);

function _parseFile(path) {
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
    _parse(state);
    fs.closeSync(fd);
    return (state.expressions);
}

function _parseStrings(arr) {
    this.sourceName = 'Strings';
    let iArr = 0;
    let state = _initReaderState(this, () => {
        if (iArr >= arr.length) return (null);
        this.lineNo = 1;
        return (arr[iArr++]);
    });
    return (_parse(state));
}

function _parseStream(stream) {
    throw yaga.errors.InternalException(`Streams are not currently supported`);
}

function _parseToken(tok) {
    if (!yaga.isaYagaType(tok) || !tok.isaToken) throw yaga.errors.YagaException(undefined, `Expecting a token. Found(${tok})`);
}

let _readTableTemplate = {
    startReader: _valTableFunction,
    endReader: _valTableFunction,
    numberLiteral: _valTableFunction,
    eol: _valTableFunction,
    tokenCreated: _valTableFunction,
    patterns: _valTablePatterns,
};

function _initReadTable(readTable) {
    if (typeof readTable !== 'object') throw yaga.erros.YagaException(undefined, 'Invalid reader table provided');
    // Validat that the table is correct.
    let table = Object.assign({}, readTable);
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


_yagaReadTable = {
    // '(' : _newExpression,
};

// Internal state of the reader.
_readerState = {
    typeName: 'ReaderState',
    reader: undefined,
    newPoint: _newPoint,
    readChar: _readChar,
    readNextChar: _readNextChar,
    peekNextChar: _peekNextChar,
    pushbackChar: _pushbackChar,
    lastParserPoint: undefined,
    expressions: undefined,
    errors: undefined,
    lvlExpr: undefined,
    lineNo: 0,
    column: 0,
    tabCount: 4,
    curChar: undefined,
    flEOS: false,
    parentPoints: undefined,
    parentPoint: undefined,
    readState: undefined,
    readTable: undefined,

    startReader: _startReader,
    endReader: _endReader,

    _fnRead: undefined,
    _iStr: 0,
    _strLength: 0,
    _str: undefined,
    _pushbackChar: undefined,
};

function _initReaderState(reader, fnRead) {
    let state = _Private(reader).state;
    if (state) throw yaga.errors.YagaException(undefined, 'Reader is already in a parsing state');

    _Private(reader).state = (state = Object.create(_readerState));
    state.lastParserPoint = _newReadPoint(undefined, reader.sourceName);
    state.expressions = [];
    state.lvlExpr = [];
    if (reader.yi._options.tabCount) state.tabCount = reader.yi._options.tabCount;
    state.parentPoints = [];
    state.parentPoint = _defReadPoint;
    state.flEOS = false;
    state._fnRead = fnRead;
    state.readState = Object.create(_readState);
    state.readTable = _Private(reader).readTable;
    state.reader = reader;
    return (state);
}

function _startReader() {
    if (!this.readTable.startReader) return;
    this.readTable.startReader(_newStartRead(this));
}

function _endReader() {

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
            return (this.curChar = ' '); // Give back white space
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
        if (this.flEOS) {
            if (fnEOS) return (fnEOS());
            throw yaga.errors.ParserException(this.lastParserPoint, "End of input detected", ENDOFINPUT);
        }
        if ((this._str = this._fnRead()) == null) {
            this.flEOS = true;
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
        if (this.flEOS || (this._str = this._fnRead()) == null) {
            this.flEOS = true;
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
        throw yaga.errors.InternalException(undefined, "Attempting mulitple parser pushbacks");
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


function _pushParentPoint(parser, point) {
    parser.parentPoints.push(parser.parentPoint);
    parser.parentPoint = point;
}

function _popParentPoint(parser) {
    parser.parentPoint = parser.parentPoints.pop();
}

function _newParentPoint(parser) {
    let point = parser.newPoint();
    _pushParentPoint(parser, point);
    return (point);
}


function _parse(state) {
    state.startReader();
    try {
        let expr = _nextExpression(state);
        for (; expr != null; expr = _nextExpression(state))
            state.expressions.push(expr);
    } catch (err) {
        _addError(state, `${err.name}: ${err.message}`, state.lastParserPoint, err);
    } finally {
        _Private(state.reader).state = undefined;
        state.endReader();
    }
    return (state.expressions);
}

function _nextExpression(parser) {
    // Skip any initial white space
    let ch, peek;
    while (_isWhitespace(ch = parser.readChar(() => {
            return ('');
        })));
    if (ch == '') return (null);

    switch (ch) {
        case '}':
        case ')':
            if (parser.lvlExpr.length == 0)
                throw yaga.errors.ParserException(parser.lastParserPoint, "Missing start of expression or block");
            if (parser.lvlExpr.pop() != ch)
                throw yaga.errors.ParserException(parser.lastParserPoint, `Mismatching brackets. Expecting '${ch}'`, BRACKETS);
            return (null); // End of expression detected.
        case '(':
            return (_parseExpression(parser));
        case '\'':
            return (_parseQuotedElement(parser));
        case '`':
            return (_parseQuasiQuotedElement(parser))
        case ',':
            return (_parseQuasiOverride(parser));
        case '"':
            return (_parseString(parser, '"'));
        case '/':
            peek = parser.peekNextChar();
            if (peek === '*' || peek === '/') {
                _parseComment(parser);
                return (_nextExpression(parser));
            }
            break;
        case '-':
            peek = parser.peekNextChar();
            if (_isDigit(parser, peek))
                return (_parseNumber(parser));
            break;
        case '\\':
            return (_parseEscape(parser));
        default:
            if (_isDigit(ch))
                return (_parseNumber(parser));
            break;
    }
    // The default is a Symbol.
    return (_parseSymbol(parser));
}

function _parseExpression(parser) {
    return (__parseExpressions(parser, ')', () => {
        throw yaga.errors.ParserException(parser.lastParserPoint, "Missing end of expression", ENDOFEXPRESSION)
    }));
}

function __parseExpressions(parser, bracket, fnErr) {
    let lvlExpr = parser.lvlExpr.length;
    parser.lvlExpr.push(bracket);
    let point = _newParentPoint(parser);
    let e, list = [];

    while ((e = _nextExpression(parser)) != null) {
        list.push(e);
    }
    if (lvlExpr != parser.lvlExpr.length) fnErr();
    let eList = list.length == 0 ? yaga.List.nil(point) : yaga.List.new(list, point);
    _popParentPoint(parser);
    return (eList);
}

function _parseQuasiQuotedElement(parser) {
    return (_nextExpression(parser).asQuasiQuoted());
}

function _parseQuasiOverride(parser) {
    let at = parser.peekNextChar();
    if (at === '@') {
        parser.readChar();
        return (_nextExpression(parser).asQuasiInjection());
    }
    return (_nextExpression(parser).asQuasiOverride());
}

function _parseQuotedElement(parser) {
    return (_nextExpression(parser).asQuoted());
}

function _parseSymbol(parser, tok) {
    if (!tok) tok = _readToken(parser);
    // Check for reserved tokens.
    let s = tok.toString();
    switch (s) {
        case 'undefined':
            return (yaga.Wrapper.new(undefined, parser.lastParserPoint));
        case 'null':
            return (yaga.Wrapper.new(null, parser.lastParserPoint));
        case '_':
            return (yaga.Symbol.none(parser.lastParserPoint));
    }
    return (yaga.Symbol.new(s, parser.lastParserPoint));
}

function _parseEscape(parser) {
    // If just a single backslash then treat as a token.
    if (!_isWhitespace(parser.peekNextChar())) parser.readChar();
    return (yaga.Symbol.new(_readToken(parser), parser.lastParserPoint));
}

function _parseNumber(parser) {
    let tok = _readToken(parser);
    // Analyse the token and determine which number type if any applies.
    let flDecimal = false,
        flExponent = false,
        flExpSign = true,
        flType = undefined;
    let i = 0,
        c = tok.atGet(i);
    if (c == '-')
        i++;

    // If we don't have a valid number then just answer a Symbol.
    // If this is actually an error then it will be picked up at bind.
    for (; i < tok.segmentCount(); i++) {
        if (flType)
            return (_parseSymbol(parser, tok));
        if (_isDigit(c = tok.atGet(i)))
            continue;
        switch (c) {
            case '.':
                if (flDecimal)
                    return (_parseSymbol(parser, tok));
                flDecimal = true;
                continue;
            case 'e':
            case 'E':
                if (flExponent)
                    return (_parseSymbol(parser, tok));
                flExponent = true;
                continue;
            case '+':
            case '-':
                if (!flExponent || flExpSign)
                    return (_parseSymbol(parser, tok));
                flExpSign = true;
                continue;
            default:
                if ('f'.includes(c)) {
                    flType = c;
                    continue;
                }
        }
        return (_parseSymbol(parser, tok));
    }
    // At the moment we only handle floats.
    let s = tok.toString();
    if (flType) s = s.substr(0, s.length - 1);
    if (flExponent) {
        return (yaga.Wrapper.new(parseFloat(s), parser.lastParserPoint));
    }
    if (flDecimal) {
        return (yaga.Wrapper.new(parseFloat(s), parser.lastParserPoint));
    }
    return (yaga.Wrapper.new(parseFloat(s), parser.lastParserPoint));
}

function _parseString(parser, delimiter) {
    const _filler = '                                                                                                 ';
    parser.newPoint();
    let curLine = parser.lineNo,
        curCol = parser.column,
        colEscape = 0,
        str = yaga.StringBuilder.new();
    /*
     *  Strings can span mulitple lines with all white space compressed to a single whitespace character.
     *  Injecting the escape character in front of required white space on the next line will prevent this.
     *  Example:
     *          "This is a string
     *           that spans mulitple lines
     *          \           with indentation on this line"
     */
    let ch;
    try {

        for (;;) {
            ch = parser.readChar();
            if (curLine != parser.lineNo) {
                if (colEscape > 0)
                    _addError(parser, "Invalid use of escape in String constant");
                // Have a new line so consume any whitespace up to first non white space character.
                // Note that we insert a single whitespace character unless an escape character has been
                // injected.
                while (_isWhitespace(ch)) ch = parser.readChar();
                if (ch == '\\' && _isWhitespace(parser.peekNextChar())) continue;
                str.append(' ');
            }
            if (parser.column > curCol + 1) {
                if (colEscape > 0) {
                    addError(parser, "Invalid use of escape in String constant");
                    colEscape = 0;
                }
                // Fill in tabbing locations with spaces.
                let nFill = parser.column - (curCol + 1);
                while (nFill > _filler.length) {
                    str.append(_filler);
                    nFill -= _filler.length;
                }
                str.append(_filler.substr(0, nFill));
            }
            curCol = parser.column;
            if (colEscape > 0) {
                oEscape = 0;
                if (_isWhitespace(ch))
                    addError("Invalid use of escape in String constant");
                switch (ch) {
                    case 'n':
                        str.append('\n');
                        break;
                    case 't':
                        str.append('\t');
                        break;
                    case 'b':
                        str.append('\b');
                        break;
                    case 'f':
                        str.append('\f');
                        break;
                    case 'r':
                        str.append('\r');
                        break;
                    default:
                        str.append(ch);
                        break;
                }
                continue;
            }
            if (ch == '\\') {
                colEscape = parser.column;
                continue;
            }
            if (ch == delimiter)
                break;
            str.append(ch);
        }
        return (yaga.Wrapper.new(str.toString(), parser.lastParserPoint));
    } catch (err) {
        if (err.isaParserException() && err.reason === ENDOFINPUT) {
            _addError(parser, "Missing end of STRING", undefined, err);
        }
        throw err; // Might as well re-throw exception as no end of stream.
    }
}

function _parseComment(parser) {
    parser.newPoint();
    //   Just throw comments away.
    //   Note that nested /* ... */ comments are supported
    try {
        let ch = parser.readChar();
        if (ch === '/') {
            // Consume until end of line.
            let curLineNo = parser.lineNo;
            while (curLineNo == parser.lineNo) parser.readChar(() => {
                curLineNo = 0;
                return ('');
            });
            parser.pushbackChar();
            return;
        }
        // Possible multiline comment so need to look for '*/' end comment sequence and
        // lookout got nested comments
        let nestLevel = 1;
        for (;;) {
            ch = parser.readChar();
            let peek = parser.peekNextChar();
            if (ch === '/') {
                if (peek === '*') {
                    parser.readChar();
                    nestLevel++;
                }
            } else if (ch === '*' && peek === '/') {
                parser.readChar();
                if (--nestLevel == 0) return;
            }
        }
    } catch (err) {
        if (err.isaParserException && err.isaParserException() && err.reason === ENDOFINPUT) {
            _addError(parser, "Missing end of COMMENT", undefined, err);
        }
        throw err; // Might as well re-throw exception as no end of stream.
    }
}

function _readToken(parser) {
    parser.newPoint();
    let tok = yaga.StringBuilder.new();
    tok.append(parser.curChar);
    let ch;
    while (ch = _readTokenChar(parser))
        tok.append(ch);
    return (tok);
}

function _readTokenChar(parser) {
    let ch;
    if (!_isWhitespace(ch = parser.readChar()) && !'(){}'.includes(ch))
        return (ch);
    parser.pushbackChar();
    return (undefined);
}

function _isDigit(ch) {
    // Will need to be extended to handle ucs-2 extended digits
    return ('0123456789'.includes(ch));
}

function _isWhitespace(ch) {
    // Will need to be extended to handle ucs-2 extended whitespace
    return (ch === ' ');
}

function _addError(state, msg, e, attach) {
    state.parser.yi.addError(e, msg, attach);
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
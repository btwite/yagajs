/*
 *  Parser: @file
 *
 *  Parser for simple s-expression like syntax.
 */
"use strict";

const ENDOFINPUT = 'ENDOFINPUT';
const ENDOFEXPRESSION = 'ENDOFEXPRESSION';

var yaga, _parser, _parserPoint, _defParserPoint;
module.exports = {
    new: _newParser,
    Point: {
        new: _newParserPoint,
    },
    defaultParserPoint: _defParserPoint,
    Initialise: (y) => {
        yaga = yaga ? yaga : y;
        _defParserPoint = _newParserPoint(undefined, '<None>');
    }
};
Object.freeze(module.exports);

function _newParser(yi) {
    let parser = Object.create(_parser);
    parser.yi = yi;
    return (parser);
}

function _newParserPoint(parent, srcName, line, col) {
    let point = Object.create(_parserPoint);
    point.parent = parent;
    point.sourceName = srcName;
    if (line) point.line = line;
    if (col) point.column = col;
    return (point);
}


_parser = {
    typeName: 'Parser',
    parseFile: _parseFile,
    parseStrings: _parseStrings,
    newPoint: _newPoint,
    sourceName: undefined,
    yi: undefined,
    _readChar: _readChar,
    _readNextChar: undefined,
    _peekNextChar: undefined,
    _pushbackChar: undefined,
    _lastParserPoint: undefined,
    _expressions: undefined,
    _errors: undefined,
    _lvlExpr: undefined,
    _lineNo: 0,
    _column: 0,
    _tabCount: 4,
    _curChar: undefined,
    _flEOS: false,
    _errors: undefined,
    _parentPoints: undefined,
    _parentPoint: undefined,
}

function _parseFile(path) {
    let fs = require('fs');
    let fd;
    try {
        fd = fs.openSync(path, 'r');
    } catch (err) {
        throw yaga.errors.ParserException(undefined, `Failed to open yaga file. Rsn(${err.message})`);
    }
    this.sourceName = path;
    let oPos = 0,
        buf = Buffer.alloc(8192),
        encoding = undefined;
    _initParser(this, () => {
        let nBytes = fs.readSync(fd, buf, 0, buf.length, oPos);
        if (!encoding) {
            this._line = 1;
            // Require a way of checking the encoding. For example package 'detect-character-encoding'
            encoding = 'ascii';
        }
        oPos += nBytes;
        return (nBytes == 0 ? null : buf.toString(encoding));
    });
    _parse(this);
    fs.closeSync(fd);
    return (this._expressions);
}

function _parseStrings(arr) {
    this.sourceName = 'Strings';
    let iArr = 0;
    _initParser(this, () => {
        if (iArr >= arr.length) return (null);
        this._line++;
        return (arr[iArr++]);
    });
    return (_parse(this));
}

function _readChar() {
    let ch = this._readNextChar();
    switch (ch) {
        case '\r':
            let peek = this._peekNextChar();
            if (peek != '\n') {
                return (ch);
            }
            ch = this._readNextChar();
        case '\n':
            this._lineNo++;
            this.column = 0;
            return (this._readChar());
        case '\t':
            let tc = this._tabCount;
            this._column = (this._column + tc) / tc * tc + 1;
            return (this._readChar());
        default:
            return (ch);
    }
}

function _newPoint(parent, line, col) {
    if (parent === undefined) parent = this._parentPoint;
    if (line === undefined) line = this._lineNo;
    if (col === undefined) col = this.column;
    this._lastParserPoint = _newParserPoint(parent, this.sourceName, line, col);
    return (this._lastParserPoint)
}

_parserPoint = {
    typeName: 'ParserPoint',
    isaParserPoint: true,
    sourceName: undefined,
    line: 0,
    column: 0,
    parent: undefined,
    format() {
        return (`${this.sourceName}[${this.line},${this.column}]`);
    }
}

function _pushParentPoint(parser, point) {
    parser._parentPoints.push(parser._parentPoint);
    parser._parentPoint = point;
}

function _popParentPoint(parser) {
    parser._parentPoint = parser._parentPoints.pop();
}

function _newParentPoint(parser) {
    let point = parser._newPoint();
    _pushParentPoint(point);
    return (point);
}

function _initParser(parser, fnRead) {
    parser._lastParserPoint = _newParserPoint(undefined, parser.sourceName);
    parser._expressions = [];
    parser._errors = [];
    parser._lvlExpr = [];
    if (parser.yi._options.tabCount) parser._tabCount = parser.yi._options.tabCount;
    parser._errors = [];
    parser._exprs = [];
    parser._parentPoints = [];
    parser._parentPoint = _defParserPoint;

    let iStr = 0,
        strLength = 0,
        str = undefined,
        pushbackChar = undefined;
    parser._readNextChar = function () {
        let ch;
        if (pushbackChar) {
            let ch = pushbackChar;
            pushbackChar = undefined;
        } else if (iStr >= strLength) {
            if (this._flEOS) {
                throw yaga.errors.ParserException(this._lastParserPoint, "End of input detected", ENDOFINPUT);
            }
            if ((str = fnRead()) == null) {
                this._flEOS = true;
                ch = ' '; // Just return a space now and throw on next call
            } else {
                if ((strLength = str.length) == 0) return (this.readNextChar());
                iStr = 1;
                ch = str[0];
            }
        } else {
            ch = str[iStr++]
        }
        this.column++;
        return (this._curChar = ch);
    };
    parser._peekNextChar = function () {
        if (pushbackChar) return (pushbackChar);
        if (iStr >= strLength) {
            if (this._flEOS || (str = fnRead()) == null) {
                this._flEOS = true;
                return (' ');
            }
            iStr = 0;
            if ((strLength = str.length) == 0) return (this.peekNextChar());
            return (str[0]);
        }
        return (str[iStr]);
    };
    parser._pushbackChar = function () {
        if (pushbackChar) {
            throw yaga.errors.InternalException(undefined, "Attempting mulitple parser pushbacks");
        }
        this.column--;
        pushbackChar = this._curChar;
    };
}

function _parse(parser) {
    try {
        let expr = _nextExpression(parser);
        for (; expr != null; expr = _nextExpression(parser))
            parser._expressions.push(expr);
    } catch (err) {
        //  throw err;
        _addError(parser, `${err.name}: ${err.message}`, parser._lastParserPoint);
    }
    return (parser._expressions);
}

function _nextExpression(parser) {
    // Skip any initial white space
    let ch, peek;
    while (_isWhitespace(ch = parser._readChar())) {}

    switch (ch) {
        case ')':
            if (parser._lvlExpr.length == 0)
                throw new yaga.errors.ParserException(parser._lastParserPoint, "Missing start of expression");
            parser._lvlExpr.pop();
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
            return (_parseString(parse, '"'));
        case '/':
            peek = parser._peekNextChar();
            if (peek === '*' || peek === '/') {
                _parseComment(parser);
                return (_nextExpression(parser));
            }
            break;
        case '-':
        case '+':
            peek = parser._peekNextChar();
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

function _parseEscape(parser) {
    // If just a single backslash then treat as a token.
    if (!_isWhitespace(parser._peekNextChar())) parser._readChar();
    return (_parseSymbol(parser));
}

function _parseExpression(_parser) {
    let lvlExpr = parser._lvlExpr.length;
    parser._lvlExpr.push(parser);
    let point = _newParentPoint(parser);
    let e, list = [];

    while ((e = _nextExpression(parser)) != null) {
        list.push(e);
    }
    if (lvlExpr != parser._lvlExpr.length) {
        throw new ParserException(parser._lastParserPoint, "Missing end of expression", ENDOFEXPRESSION);
    }
    let eList = list.length == 0 ? yaga.List.nil(point) : yaga.List.new(list, point);
    _popParentPoint();
    return (eList);
}

function _parseQuasiQuotedElement(parser) {
    let e = _nextExpression(parser);
    if (typeof e === 'object' && e.isaListOrAtom)
        return (e.asQuasiQuoted());
    return (e);
}

function _parseQuasiOverride(parser) {
    let at = parser._peekNextChar();
    if (at === '@') parser._readChar();
    let e = _nextExpression(parser);
    if (typeof e === 'object' && e.isaListOrAtom)
        return (e.asQuasiOverride(at === '@'));
    return (e);
}

function _parseQuotedElement(parser) {
    let e = _nextExpression(parser);
    if (typeof e === 'object' && e.isaListOrAtom)
        return (e.asQuoted());
    return (e);
}

function _parseSymbol(parser, tok) {
    if (!tok) tok = _readToken(parser);
    return (yaga.Symbol.new(tok, parser._lastParserPoint));
}

function _parseNumber(pasrer) {
    let tok = _readToken(parser);
    // Analyse the token and determine which number type if any applies.
    let flDecimal = false,
        flExponent = false,
        flExpSign = true,
        flType = undefined;
    let i = 0,
        c = tok.atGet(i);
    if (c == '+' || c == '-')
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
        return (parseFloat(s));
    }
    if (flDecimal) {
        return (parseFloat(s));
    }
    return (parseFloat(s));
}

function _parseString(parser, delimiter) {
    const _filler = '                                                                                                 ';
    parser.newPoint();
    let curLine = parser._lineNo,
        curCol = parser._column,
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
            ch = parser._readChar();
            if (curLine != parser._lineNo) {
                if (colEscape > 0)
                    _addError(parser, "Invalid use of escape in String constant");
                // Have a new line so consume any whitespace up to first non white space character.
                // Note that we insert a single whitespace character unless an escape character has been
                // injected.
                while (_isWhitespace(ch)) ch = parser._readChar();
                if (ch == '\\' && _isWhitespace(parser._peekNextChar())) continue;
                str.append(' ');
            }
            if (parser._column > curCol + 1) {
                if (colEscape > 0) {
                    addError(parser, "Invalid use of escape in String constant");
                    colEscape = 0;
                }
                // Fill in tabbing locations with spaces.
                let nFill = parser._column - (curCol + 1);
                while (nFill > _filler.length) {
                    str.append(_filler);
                    nFill -= _filler.length;
                }
                str.append(_filler.substr(0, nFill));
            }
            curCol = parser._column;
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
                colEscape = parser._column;
                continue;
            }
            if (ch == delimiter)
                break;
            str.append(ch);
        }
        return (str.toString());
    } catch (err) {
        if (err.isaParserException() && err.reason === ENDOFINPUT) {
            _addError(parser, "Missing end of STRING");
        }
        throw err; // Might as well re-throw exception as no end of stream.
    }
}

function _parseComment(parser) {
    parser.newPoint();
    /*
     *   Just throw comments away.
     */
    try {
        let ch = parser._readChar();
        if (ch === '/') {
            // Consume until end of line.
            let curLineNo = parser._lineNo;
            while (!parser._flEOS && curLineNo == parser._lineNo) {
                ch = parser._readChar()
            }
            parser._pushbackChar();
            return;
        }
        // Possible multiline comment so need to look for '*/' end comment sequence
        for (;;) {
            ch = parser._readChar();
            if (ch === '*' && parser._peekNextChar() === '/') {
                parser._readChar();
                return;
            }
        }
    } catch (err) {
        if (err.isaParserException && err.isaParserException() && err.reason === ENDOFINPUT) {
            _addError(parser, "Missing end of COMMENT");
        }
        throw err; // Might as well re-throw exception as no end of stream.
    }
}

function _readToken(parser) {
    parser.newPoint();
    let tok = yaga.StringBuilder.new();
    tok.append(parser._curChar);
    let ch;
    while (ch = _readTokenChar(parser))
        tok.append(ch);
    return (tok);
}

function _readTokenChar(parser) {
    let ch;
    if (!_isWhitespace(ch = parser._readNextChar()) && ch != ')' && ch != '(')
        return (ch);
    parser._pushbackChar();
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

function _addError(parser, msg, e) {
    let err;
    if (!e) {
        err = yaga.errors.Error(msg, parser._lastParserPoint);
    } else if (e.isaParserPoint) {
        err = yaga.errors.Error(msg, e);
    } else {
        err = yaga.errors.Error(e, msg);
    }
    parser._errors.push(err)
}
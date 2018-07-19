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
    _parentPoints: undefined,
    _parentPoint: undefined,
}

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
    _initParser(this, () => {
        let nBytes = fs.readSync(fd, buf, 0, buf.length, oPos);
        if (!encoding) {
            this._lineNo = 1;
            // Require a way of checking the encoding. For example package 'detect-character-encoding'
            encoding = 'ascii';
        }
        oPos += nBytes;
        return (nBytes == 0 ? null : buf.toString(encoding, 0, nBytes));
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

function _readChar(fnEOS) {
    let ch = this._readNextChar(fnEOS);
    switch (ch) {
        case '\r':
            let peek = this._peekNextChar();
            if (peek != '\n') {
                return (ch);
            }
            this._readNextChar(fnEOS);
        case '\n':
            this._lineNo++;
            this._column = 0;
            return (this._curChar = ' '); // Give back white space
        case '\t':
            let tc = this._tabCount;
            this._column = (this._column + tc) / tc * tc + 1;
            return (this._readChar(fnEOS));
        default:
            return (ch);
    }
}

function _newPoint(parent, line, col) {
    if (parent === undefined) parent = this._parentPoint;
    if (line === undefined) line = this._lineNo;
    if (col === undefined) col = this._column;
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
    let point = parser.newPoint();
    _pushParentPoint(parser, point);
    return (point);
}

function _initParser(parser, fnRead) {
    parser._lastParserPoint = _newParserPoint(undefined, parser.sourceName);
    parser._expressions = [];
    parser._lvlExpr = [];
    if (parser.yi._options.tabCount) parser._tabCount = parser.yi._options.tabCount;
    parser._parentPoints = [];
    parser._parentPoint = _defParserPoint;

    let iStr = 0,
        strLength = 0,
        str = undefined,
        pushbackChar = undefined;
    parser._readNextChar = function (fnEOS) {
        let ch;
        if (pushbackChar) {
            ch = pushbackChar;
            pushbackChar = undefined;
        } else if (iStr >= strLength) {
            if (this._flEOS) {
                if (fnEOS) return (fnEOS());
                throw yaga.errors.ParserException(this._lastParserPoint, "End of input detected", ENDOFINPUT);
            }
            if ((str = fnRead()) == null) {
                this._flEOS = true;
                ch = ' '; // Just return whitespace now and throw on next call
            } else {
                if ((strLength = str.length) == 0) return (this.readNextChar());
                iStr = 1;
                ch = str[0];
            }
        } else {
            ch = str[iStr++]
        }
        this._column++;
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
        this._column--;
        pushbackChar = this._curChar;
        this._curChar = ' ';
    };
}

function _parse(parser) {
    try {
        let expr = _nextExpression(parser);
        for (; expr != null; expr = _nextExpression(parser))
            parser._expressions.push(expr);
    } catch (err) {
        _addError(parser, `${err.name}: ${err.message}`, parser._lastParserPoint, err);
    }
    return (parser._expressions);
}

function _nextExpression(parser) {
    // Skip any initial white space
    let ch, peek;
    while (_isWhitespace(ch = parser._readChar(() => {
            return ('');
        })));
    if (ch == '') return (null);

    switch (ch) {
        case ')':
            if (parser._lvlExpr.length == 0)
                throw yaga.errors.ParserException(parser._lastParserPoint, "Missing start of expression");
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
            return (_parseString(parser, '"'));
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

function _parseExpression(parser) {
    let lvlExpr = parser._lvlExpr.length;
    parser._lvlExpr.push(parser);
    let point = _newParentPoint(parser);
    let e, list = [];

    while ((e = _nextExpression(parser)) != null) {
        list.push(e);
    }
    if (lvlExpr != parser._lvlExpr.length) {
        throw ParserException(parser._lastParserPoint, "Missing end of expression", ENDOFEXPRESSION);
    }
    let eList = list.length == 0 ? yaga.List.nil(point) : yaga.List.new(list, point);
    _popParentPoint(parser);
    return (eList);
}

function _parseQuasiQuotedElement(parser) {
    let e = _nextExpression(parser);
    if (typeof e === 'object' && e.isaYagaType)
        return (e.asQuasiQuoted());
    return (e);
}

function _parseQuasiOverride(parser) {
    let at = parser._peekNextChar();
    if (at === '@') parser._readChar();
    let e = _nextExpression(parser);
    if (e.isaYagaType) {
        if (at === '@') return (e.asQuasiOverride());
        else return (e.asQuasiInjection());
    }
    return (e);
}

function _parseQuotedElement(parser) {
    let e = _nextExpression(parser);
    if (e.isaYagaType)
        return (e.asQuoted());
    return (e);
}

function _parseSymbol(parser, tok) {
    if (!tok) tok = _readToken(parser);
    // Check for reserved tokens.
    let s = tok.toString();
    switch (s) {
        case 'undefined':
            return (yaga.Wrapper.new(undefined, parser._lastParserPoint));
        case 'null':
            return (yaga.Wrapper.new(null, parser._lastParserPoint));
        case '_':
            return (yaga.Symbol.none(parser._lastParserPoint));
    }
    return (yaga.Symbol.new(s, parser._lastParserPoint));
}

function _parseEscape(parser) {
    // If just a single backslash then treat as a token.
    if (!_isWhitespace(parser._peekNextChar())) parser._readChar();
    return (yaga.Symbol.new(_readToken(parser), parser._lastParserPoint));
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
        let ch = parser._readChar();
        if (ch === '/') {
            // Consume until end of line.
            let curLineNo = parser._lineNo;
            while (curLineNo == parser._lineNo) parser._readChar(() => {
                curLineNo = 0;
                return ('');
            });
            parser._pushbackChar();
            return;
        }
        // Possible multiline comment so need to look for '*/' end comment sequence and
        // lookout got nested comments
        let nestLevel = 1;
        for (;;) {
            ch = parser._readChar();
            let peek = parser._peekNextChar();
            if (ch === '/') {
                if (peek === '*') {
                    parser._readChar();
                    nestLevel++;
                }
            } else if (ch === '*' && peek === '/') {
                parser._readChar();
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
    tok.append(parser._curChar);
    let ch;
    while (ch = _readTokenChar(parser))
        tok.append(ch);
    return (tok);
}

function _readTokenChar(parser) {
    let ch;
    if (!_isWhitespace(ch = parser._readChar()) && ch != ')' && ch != '(')
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

function _addError(parser, msg, e, attach) {
    parser.yi.addError(e, msg, attach);
}
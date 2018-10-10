/*
 *  YagaReader: @file
 *
 *  Yaga ReaderTable implementation.
 */
"use strict";

let _ = undefined;

var Yaga = require('../Yaga');
var Mach;

module.exports = Object.freeze({
    YagaReaderTable: Yaga.Reader.ReaderTable({
        startReader: state => _,
        endReader: state => _,
        startStream,
        endStream,
        startLine: state => _,
        endLine: state => _,
        commitExpression,
        commitToken,
        commitChar,
        error: state => false, // Indicates that error is to be handled by the Reader.
        patterns: {
            '(': startExpression,
            ')': endExpression,
            'null': nullValue,
            'undefined': undefinedValue,
            '_': noneValue,
            '\\': escapeToken,
            '"': stringValue,
            '\'': quote,
            '`': quasiQuote,
            ',': quasiOverride,
            ',@': quasiInjection,
            '//': singleLineComment,
            '/*': multiLineComment,
            '/^(?:(?:\\+|-)?\\d+(?:.\\d+)?(?:[Ee](?:\\+|-)?\\d+)?)(?![a-zA-Z0-9])/': numberValue,
        },
    }),
    Initialise: x => Mach = x,
});

function startStream(state) {
    state.rtcb.quoteStack = [];
    return (Mach.List.Expression(state.rootExpression.readPoint))
}

function endStream(state) {
    return (state.rootExpression);
}

function commitExpression(state) {
    let expr = state.expression;
    state.addToken(expr.fQuote(expr));
}

function commitToken(state) {
    state.addToken(popQuoteStack(state)(Mach.Symbol.Token(state.token.chars, state.token.readPoint)));
}

function commitChar(state) {
    state.addChar(state.char);
}

function startExpression(state) {
    let expr = Mach.List.Expression(state.token.readPoint);
    expr.fQuote = popQuoteStack(state);
    state.startExpression(expr);
}

function endExpression(state) {
    state.endExpression(state.token);
}

function nullValue(state) {
    state.addValue(Mach.Wrapper.null, state.token.readPoint);
}

function undefinedValue(state) {
    state.addValue(Mach.Wrapper.undefined, state.token.readPoint);
}

function noneValue(state) {
    state.addValue(Mach.Symbol.none, state.token.readPoint);
}

function numberValue(state) {
    state.addValue(Mach.Wrapper(Number.parseFloat(state.token.chars), state.token.readPoint));
}

var EscapeTable = Yaga.Reader.ReaderTable({
    commitToken: state => {
        commitToken(state);
        state.popReaderTable();
    }
});

function escapeToken(state) {
    // If we have a valid escapeToken then just swallow the lead character token
    // and push a readertable to just commit the next token.
    state.pushReaderTable(EscapeTable);
}

escapeToken.validateMatch = match => {
    return (match.index === 0 && match.input.length > match[0].length)
}

function quote(state) {
    state.rtcb.quoteStack.push(tok => tok.asQuoted());
}

function quasiQuote(state) {
    state.rtcb.quoteStack.push(tok => tok.asQuasiQuoted());
}

function quasiOverride(state) {
    state.rtcb.quoteStack.push(tok => tok.asQuasiOverride());
}

function quasiInjection(state) {
    state.rtcb.quoteStack.push(tok => tok.asQuasiInjection());
}

function popQuoteStack(state) {
    if (state.rtcb.quoteStack.length === 0)
        return (tok => tok);
    return (state.rtcb.quoteStack.pop());
}

// Multi line string processing

var MultiLineStringTable = Yaga.Reader.ReaderTable({
    endStream: state => state.throw('Missing end of String'),
    commitChar: state => parseString(state),
});

function stringValue(state) {
    state.rtcb.string = {};
    let str = state.rtcb.string;
    str.readPoint = state.token.readPoint;
    str.lastLine = str.readPoint.line;
    str.lastCol = str.column;
    str.colEscape = 0;
    str.sb = Yaga.StringBuilder();
    state.pushReaderTable(MultiLineStringTable);
}

function parseString(state, delimiter = '"') {
    const filler = '                                                                                                 ';
    /*
     *  Strings can span mulitple lines with all white space compressed to a single whitespace character.
     *  Injecting the escape character in front of required white space on the next line will prevent this.
     *  Example:
     *          "This is a string
     *           that spans mulitple lines
     *          \           with indentation on this line"
     */
    let str = state.rtcb.string;
    let ch = state.char,
        curLine = state.readPoint.line,
        curCol = state.readPoint.column;
    if (curLine != str.lastLine) {
        if (str.colEscape > 0)
            state.throm("Invalid use of escape in String constant", state.readPoint);
        // Have a new line so consume any whitespace up to first non white space character.
        // Note that we insert a single whitespace character unless an escape character has been
        // injected.
        if (Yaga.Character.isWhitespace(ch))
            return;
        if (ch == '\\') {
            str.lastLine = curLine;
            str.lastCol = curCol;
            return;
        }
        str.lastLine = curLine;
        str.sb.append(' ');
    }

    if (curCol > str.lastCol + 1) {
        if (str.colEscape > 0) {
            state.throw("Invalid use of escape in String constant", state.readPoint);
            str.colEscape = 0;
        }
        // Fill in tabbing locations with spaces.
        let nFill = curCol - (str.lastCol + 1);
        while (nFill > filler.length) {
            str.sb.append(filler);
            nFill -= filler.length;
        }
        str.sb.append(filler.substr(0, nFill));
    }

    str.lastCol = curCol;
    if (str.colEscape > 0) {
        oEscape = 0;
        if (Yaga.Character.isWhitespace(ch))
            state.throw("Invalid use of escape in String constant", state.readPoint);
        switch (ch) {
            case 'n':
                str.sb.append('\n');
                break;
            case 't':
                str.sb.append('\t');
                break;
            case 'b':
                str.sb.append('\b');
                break;
            case 'f':
                str.sb.append('\f');
                break;
            case 'r':
                str.sb.append('\r');
                break;
            default:
                str.sb.append(ch);
                break;
        }
        return;
    }
    if (ch == '\\') {
        str.colEscape = curCol;
        return;
    }
    if (ch != delimiter) {
        str.sb.append(ch);
        return;
    }
    // Finished building the string so we can add our String value token
    state.popReaderTable();
    state.addValue(Mach.Wrapper(str.sb.toString(), str.readPoint));
    state.splitToken();
}

// Comment Handling
var SingleLineCommentTable = Yaga.Reader.ReaderTable({
    endLine: state => state.popReaderTable(),
    commitChar: state => _, // Just swallow every character
});

function singleLineComment(state) {
    state.pushReaderTable(SingleLineCommentTable);
}

var MultiLineCommentTable = Yaga.Reader.ReaderTable({
    endStream: state => state.throw('Missing end of comment'),
    commitChar: state => _, // Just swallow every character
    patterns: {
        '/*': state => state.rtcb.commentLevel++,
        '*/': state => {
            if (--state.rtcb.commentLevel <= 0)
                state.popReaderTable();
        }
    }
});

function multiLineComment(state) {
    state.rtcb.commentLevel = 0;
    state.pushReaderTable(MultiLineCommentTable);
}
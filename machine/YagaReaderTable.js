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
            '\'': quote,
            '`': quasiQuote,
            ',': quasiOverride,
            ',@': quasiInjection,
            '//': singleLineComment,
            '/*': multiLineComment,
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
    state.addToken(popQuoteStack(state)(state.token));
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
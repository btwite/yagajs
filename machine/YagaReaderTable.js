/*
 *  YagaReader: @file
 *
 *  Yaga ReaderTable implementation.
 */
"use strict";

let _ = undefined;

var Yaga = require('../Yaga');

module.exports = Object.freeze({
    YagaReaderTable: Yaga.Reader.ReaderTable({
        startReader: state => _,
        endReader: state => _,
        startStream: state => state.rootExpression,
        endStream: state => state.rootExpression,
        startLine: state => _,
        endLine: state => _,
        commitToken: state => state.addToken(state.token),
        commitChar: state => state.addChar(state.char),
        error: state => false, // Indicates that error is to be handled by the Reader.
        patterns: {
            '(': startExpression,
            ')': endExpression,
        },
    }),
});

function startExpression(state) {
    state.startExpression(state.newExpression(state.token));
}

function endExpression(state) {
    state.endExpression(state.token);
}
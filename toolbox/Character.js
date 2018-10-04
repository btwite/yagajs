/*
 *  Character: @file
 *
 *  Generic character services.
 */
"use strict";

module.exports = Object.freeze({
    isSpecial,
    isAlpha,
    isAlphaNumeric,
    isDigit,
    isNumeric,
    isControl,
    isOperator,
    isWhitespace,
    isEndOfLine,
    LastUCS2Char: '\ufffd',
    EndOfStream: '\uffff',
});

const Alphas = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const Digits = '0123456789';
const AlphaNumerics = Alphas + Digits;
const EndLine = '\n\r\u2028\u2029';
const Bells = '\b';
const Spacing = '\f\t\v';
const Spaces = ' \u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff';
const Controls = EndLine + Bells + Spacing;
const Operators = '~!@#$%^&*()_+-={}|[]\\:";\'<>?,./';
const Whitespace = ' ' + EndLine + Spacing + Spaces;
const NonSpecial = AlphaNumerics + Whitespace + Operators + Bells;


// Will need to be extend the following functions properly handle ucs-2 extended characters

function isSpecial(ch) {
    return (ch !== '' && !NonSpecial.includes(ch));
}

function isAlpha(ch) {
    return (ch !== '' && Alphas.includes(ch));
}

function isAlphaNumeric(ch) {
    return (ch !== '' && AlphaNumerics.includes(ch));
}

function isDigit(ch) {
    return (ch !== '' && Digits.includes(ch));
}

function isNumeric(ch) {
    return (ch !== '' && isDigit(ch));
}

function isControl(ch) {
    return (ch !== '' && Controls.includes(ch));
}

function isOperator(ch) {
    return (ch !== '' && Operators.includes(ch));
}

function isWhitespace(ch) {
    return (ch !== '' && Whitespace.includes(ch));
}

function isEndOfLine(ch) {
    return (ch !== '' && EndLine.includes(ch));
}
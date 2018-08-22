/*
 *  ReadPoint: @file
 *
 *  A defined point of interest within an input source that is being processed by the Reader.
 */
"use strict";

var Yaga = require('../Yaga');
var Pack; // Reader package interfaces

let defaultReadPoint = undefined; // FIX this later.

module.exports = ReadPoint;
ReadPoint.default = defaultReadPoint;
ReadPoint.Initialise = Initialise;
ReadPoint.Yaga = Yaga;
Object.freeze(ReadPoint);

function Initialise(pack) {
    Pack = Pack || pack;
}

function ReadPoint(parent, srcName, line, col) {
    let point = Object.create(_readPoint);
    if (parent) point.parent = parent;
    point.sourceName = srcName;
    if (line) point.line = line;
    if (col) point.column = col;
    return (point);
}

var ReadPoint = {
    typeName: 'ReadPoint',
    isaReadPoint: true,
    sourceName: undefined,
    line: 0,
    column: 0,
    parent: undefined,
    increment: Yaga.thisArg(increment),
    format() {
        return (`${this.sourceName}[${this.line},${this.column}]`);
    }
}

function increment(rp, nCols) {
    let prot = Object.getPrototypeOf(rp);
    if (prot.hasOwnProperty('isaReadPoint'))
        prot = rp;
    let rp1 = Object.create(prot);
    rp1.column = rp.column + nCols;
    return (rp1);
}
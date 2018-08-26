/*
 *  ReadPoint: @file
 *
 *  A defined point of interest within an input source that is being processed by the Reader.
 */
"use strict";

var Yaga = require('../Yaga');
var DefaultReadPoint;

module.exports = {
    ReadPoint: Yaga.Influence({
        name: 'ReadPoint',
        prototype: {
            sourceName: '<unknown>',
            line: 0,
            column: 0,
            parent: undefined,
            increment(nCols) {
                let o = this.copy();
                o.column += nCols;
                return (o);
            },
            format() {
                return (`${this.sourceName}[${this.line},${this.column}]`);
            }
        },
        constructor(srcName, line, col, parent) {
            if (parent) this.parent = parent;
            this.sourceName = srcName;
            if (line) this.line = line;
            if (col) this.column = col;
        },
        static: {
            get default() {
                if (!DefaultReadPoint) DefaultReadPoint = this.influence.create('<None>');
                return (DefaultReadPoint);
            }
        },
    }).create
};
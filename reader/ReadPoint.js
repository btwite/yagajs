/*
 *  ReadPoint: @file
 *
 *  A defined point of interest within an input source that is being processed by the Reader.
 */
"use strict";

var Yaga = require('../Yaga');
var DefaultReadPoint;

module.exports = Object.freeze({
    ReadPoint: Yaga.Influence({
        name: 'ReadPoint',
        prototype: {
            increment(nCols) {
                let o = this.copy();
                o.column += nCols;
                return (o);
            },
            format() {
                return (`${this.sourceName}[${this.line},${this.column}]`);
            }
        },
        constructor(sourceName, line = 0, column = 0, parent) {
            return {
                sourceName,
                parent,
                line,
                column
            }
        },
        static: {
            get default() {
                if (!DefaultReadPoint) {
                    DefaultReadPoint = this.influence.create('<None>');
                    DefaultReadPoint.isDefault = true;
                }
                return (DefaultReadPoint);
            }
        },
    }).create
});
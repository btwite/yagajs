/**
 * Common : @file
 * 
 * Abstract influence that contains the common elements for all Machine types
 */
"use strict";

let _ = undefined;

var Yaga = require('../Yaga');
var Mach;

var Common = Yaga.Influence.abstract({
    name: 'yaga.Common',
    prototype: {
        isaMachineType: true,
        value() {
            return (`Type(${this.typeName})`);
        },
        nativeValue() {
            return (this.value());
        },
        read() {
            throw Mach.Error.YagaException(this, `'${this.value()}' cannot be read`);
        },
        bind() {
            throw Mach.Error.InternalException(`'${this.typeName}' has no 'bind' method`);
        },
        lazyEvaluate() {
            return (this);
        },
        evaluate() {
            throw Mach.Error.InternalException(`'${this.typeName}' has no 'evaluate' method`);
        },
        call() {
            throw Mach.Error.YagaException(this, `'${this.value()}' cannot be called`);
        },
        asString() {
            return (this.value());
        }
    }
});

module.exports = Object.freeze({
    Common: Common.create,
    Initialise: x => Mach = x,
});
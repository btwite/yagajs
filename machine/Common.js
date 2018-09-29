/**
 * Common : @file
 * 
 * Abstract influence that contains the common elements for all Machine types
 */
"use strict";

let _ = undefined;

var Yaga = require('../Yaga');
var exps;

var Common = Yaga.Influence.abstract({
    name: 'yaga.Common',
    prototype: {
        isaMachineType: true,
        value() {
            return (`Type(${this.typeName})`);
        },
        nativeValue(mi) {
            return (this.value());
        },
        parse() {
            throw exps.Error.YagaException(this, `'${this.value()}' cannot be parsed`);
        },
        bind(mi) {
            throw exps.Error.InternalException(`'${this.typeName}' has no 'bind' method`);
        },
        lazyEvaluate(mi) {
            return (this);
        },
        evaluate(mi) {
            throw exps.Error.InternalException(`'${this.typeName}' has no 'evaluate' method`);
        },
        call(mi) {
            throw exps.Error.YagaException(this, `'${this.value()}' cannot be called`);
        },
        asString() {
            return (this.value());
        }
    }
});

module.exports = Object.freeze({
    Common: Common.create,
    Initialise: x => exps = x,
});
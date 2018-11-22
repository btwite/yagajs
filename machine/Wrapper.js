/**
 * Wrapper : @file
 * 
 * Simple wrapper object to contain JavaScript types that can not handle property requests.
 */

'use strict';

let _ = undefined;

var Yaga = require('../core');
var Common = require('./Common').Common;
var Mach, Null, Undefined;

var Wrapper = Yaga.Influence({
    name: 'yaga.machine.Wrapper',
    composition: [{
        prototype: {
            asQuoted: returnThis,
            asQuasiQuoted: returnThis,
            asQuasiOverride: returnThis,
            asQuasiInjection: returnThis,
            value() {
                return (this._value);
            },
            nativeValue() {
                return (this._value);
            },
            asString() {
                return (String(this._value));
            },
            bind: returnThis,
            evaluate: returnThis,
            print(printer) {
                if (this.referenceList) this.referenceList.print(printer);
                else printer.printElement(String(this._value));
            }
        },
        constructor(val, optPoint) {
            let ty = typeof val;
            Object.defineProperty(this, 'typeName', {
                value: ty,
                writable: true,
                configurable: true,
                enumerable: true
            });
            if (ty === 'string')
                this.isaString = true;
            this._value = val;
            this.readPoint = optPoint || Yaga.Reader.ReadPoint.default;
        },
        static: {
            wrap,
            get null() {
                return (Null);
            },
            get undefined() {
                return (Undefined);
            }
        }
    }, Common],
    createExit(val) {
        if (typeof val === 'function')
            return (Mach.Function.jsNativeFunction(val));
        if (Mach.isaMachineType(val))
            return (val);
    },
    harmonizers: '.most.'
});

module.exports = Object.freeze({
    Wrapper: Wrapper.create,
    Initialise: x => {
        Mach = x;
        (Null = Wrapper.create(null)).assign({
            typeName: 'null'
        });
        Undefined = Wrapper.create(undefined);
    },
});

function wrap(es) {
    let arr = [];
    for (let i = 0; i < es.length; i++) es[i] = Wrapper.create(arr[i]);
    return (es);
}

function returnThis() {
    return (this);
}
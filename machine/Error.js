/**
 * Error : @file
 * 
 * Yaga Error and exceptions
 */

'use strict';

let _ = undefined;

var Yaga = require('../Yaga');
var Mach;

var YagaException = Yaga.Exception({
    name: 'yaga.machine.YagaException',
    constructor(e, msg, optErrors) {
        if (typeof e === 'string' && !msg) {
            msg = e;
            e = undefined;
        }
        setErrorDetails(this, e);
        if (optErrors) this.errors = optErrors;
        return (msg);
    }
});

var ReadDictionaryException = Yaga.Exception({
    name: 'yaga.machine.ReadDictionaryException',
    prototype: YagaException,
    constructor(mach, msg, exprs, errors) {
        ReadDictionaryException.super(this, _, msg, errors);
        this.expressions = exprs;
        this.machine = mach;
        return (msg);
    }
});

var InternalException = Yaga.Exception({
    name: 'yaga.machine.InternalException',
    prototype: YagaException,
    constructor(msg) {
        setErrorDetails(this, _);
        return (msg);
    }
});

var ReaderException = Yaga.Exception({
    name: 'yaga.machine.ReaderException',
    prototype: YagaException,
    constructor(src, msg, rsn) {
        setErrorDetails(this, src);
        this.reason = rsn | 'READER';
        return (msg);
    }
});

var DictionaryException = Yaga.Exception({
    name: 'yaga.machine.DictionaryException',
    prototype: YagaException,
    constructor(e, msg) {
        setErrorDetails(this, e);
        return (msg);
    }
});

var BindException = Yaga.Exception({
    name: 'yaga.machine.BindException',
    prototype: YagaException,
    constructor(e, msg) {
        setErrorDetails(this, e);
        return (msg);
    }
});

var Error = Yaga.Influence({
    name: 'yaga.machine.Error',
    constructor(e, msg, attach) {
        let point;
        if (e && e.isaReadPoint) {
            point = e;
            e = Mach.List.nil();
        } else {
            point = Mach.getReadPoint(e);
            if (!Mach.isaMachineType(e)) e = Mach.Wrapper(e, point);
        }
        return {
            element: e,
            readPoint: point,
            message: msg,
            attachment: attach,
            formattedMessage() {
                return (`${point.format()}: ${e.typeName} - ${msg}`)
            }
        }
    },
    static: {
        YagaException,
        ReadDictionaryException,
        InternalException,
        ReaderException,
        DictionaryException,
        BindException,
    }
});

module.exports = Object.freeze({
    Error: Error.create,
    Initialise: x => Mach = x,
});

function setErrorDetails(exc, src) {
    if (!src) {
        exc.readPoint = Yaga.Reader.ReadPoint.default;
        exc.element = Mach.List.nil();
    } else if (src.isaReadPoint) {
        exc.readPoint = src;
        exc.element = Mach.List.nil();
    } else {
        exc.readPoint = Mach.getReadPoint(src);
        exc.element = src;
    }
}
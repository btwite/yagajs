/**
 * Error : @file
 * 
 * Yaga Error and exceptions
 */

'use strict';

var Yaga = require('../Yaga');
var Mach;

var Error = Yaga.Influence({
    name: 'yaga.machine.Error',
    constructor(e, msg, attach) {
        let point;
        if (e && e.isaReadPoint) {
            point = e;
            e = Mach.List.nil();
        } else {
            point = Mach.getReadPoint(e);
            if (!Mach.isaMachineType(e)) e = Mach.Wrapper.new(e, point);
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

var YagaException = Yaga.Exception({
    name: 'yaga.machine.YagaException',
    constructor(e, msg, optErrors) {
        if (typeof e === 'string' && !msg) {
            msg = e;
            e = undefined;
        }
        setErrorDetails(this, e, msg);
        if (optErrors) this.errors = optErrors;
        return (msg);
    }
});

var InternalException = Yaga.Exception({
    name: 'yaga.machine.InternalException',
    prototype: YagaException,
    constructor(msg) {
        setErrorDetails(this, undefined, msg);
        return (msg);
    }
});

var ReaderException = Yaga.Exception({
    name: 'yaga.machine.ReaderException',
    prototype: YagaException,
    constructor(src, msg, rsn) {
        setErrorDetails(this, src, msg);
        this.reason = rsn | 'READER';
        return (msg);
    }
});

var DictionaryException = Yaga.Exception({
    name: 'yaga.machine.DictionaryException',
    prototype: YagaException,
    constructor(e, msg) {
        setErrorDetails(this, e, msg);
        return (msg);
    }
});

var BindException = Yaga.Exception({
    name: 'yaga.machine.BindException',
    prototype: YagaException,
    constructor(e, msg) {
        setErrorDetails(this, e, msg);
        return (msg);
    }
});

function setErrorDetails(exc, src, msg) {
    if (!src) {
        exc.readPoint = Yaga.ReadPoint.default;
        exc.element = Mach.List.nil();
    } else if (src.isaReadPoint) {
        exc.readPoint = src;
        exc.element = Mach.List.nil();
    } else {
        exc.readPoint = Mach.getReadPoint(src);
        exc.element = src;
    }
}
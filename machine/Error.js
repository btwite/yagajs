/**
 * Error : @file
 * 
 * Yaga Error and exceptions
 */

'use strict';

var Yaga = require('../Yaga');
var exps;

var Error = Yaga.Influence({
    name: 'yaga.Error',
    constructor(e, msg, attach) {
        let point;
        if (e && e.isaReadPoint) {
            point = e;
            e = exps.List.nil();
        } else {
            point = exps.Tools.getReadPoint(e);
            if (!exps.Tools.isaMachineType(e)) e = exps.Wrapper.new(e, point);
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
    Initialise: x => exps = x,
});

var YagaException = Yaga.Exception({
    name: 'yaga.YagaException',
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
    name: 'yaga.InternalException',
    prototype: YagaException,
    constructor(msg) {
        setErrorDetails(this, undefined, msg);
        return (msg);
    }
});

var ReaderException = Yaga.Exception({
    name: 'yaga.ReaderException',
    prototype: YagaException,
    constructor(src, msg, rsn) {
        setErrorDetails(this, src, msg);
        this.reason = rsn | 'READER';
        return (msg);
    }
});

var DictionaryException = Yaga.Exception({
    name: 'yaga.DictionaryException',
    prototype: YagaException,
    constructor(e, msg) {
        setErrorDetails(this, e, msg);
        return (msg);
    }
});

var BindException = Yaga.Exception({
    name: 'yaga.BindException',
    prototype: YagaException,
    constructor(e, msg) {
        setErrorDetails(this, e, msg);
        return (msg);
    }
});

function setErrorDetails(exc, src, msg) {
    if (!src) {
        exc.readPoint = Yaga.ReadPoint.default;
        exc.element = exps.List.nil();
    } else if (src.isaReadPoint) {
        exc.readPoint = src;
        exc.element = exps.List.nil();
    } else {
        exc.readPoint = exps.Tools.getReadPoint(src);
        exc.element = src;
    }
}
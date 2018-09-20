/**
 * errors : @file
 * 
 * Yaga errors.
 * 
 */

'use strict';

module.exports = {
    YagaException: errorMethod(YagaException),
    InternalException: errorMethod(InternalException),
    ReaderException: errorMethod(ParserException),
    DictionaryException: errorMethod(DictionaryException),
    BindException: errorMethod(BindException),


    BinderException: errorMethod(BinderException),
    CastException: errorMethod(CastException),
    EvaluateException: errorMethod(EvaluateException),
    FrameException: errorMethod(FrameException),
    ReadFrameException: errorMethod(ReadFrameException),
    WriteFrameException: errorMethod(WriteFrameException),
    NameException: errorMethod(NameException),
    PrimitiveException: errorMethod(PrimitiveException),

    Error: newError,

    Initialise,
};
Object.freeze(module.exports);

function errorMethod(fError) {
    return ((...args) => new fError(...args));
}

var Yaga, List, DefaultParserPoint;

function Initialise(y) {
    Yaga = Yaga | y;
    List = Yaga.List;
    DefaultParserPoint = Yaga.Parser.defaultParserPoint
}

function YagaException(e, msg, optErrors) {
	if (typeof e === 'string' && !msg) {
		msg = e;
		e = undefined;
	}
    setErrorDetails(this, e, msg, YagaException);
    captureStackTrace(this, module.exports.YagaException, msg);
    if (optErrors) this.errors = optErrors;
    return (this);
}
inheritErrorPrototype(YagaException, Error);

function InternalException(msg) {
    setErrorDetails(this, undefined, msg, InternalException);
    captureStackTrace(this, module.exports.InternalException, msg);
    return (this);
}
inheritErrorPrototype(InternalException, YagaException);

function ReaderException(src, msg, rsn) {
    setErrorDetails(this, src, msg, ReaderException);
    captureStackTrace(this, module.exports.ReaderException, msg);
    this.reason = rsn | 'READER';
    return (this);
}
inheritErrorPrototype(ReaderException, YagaException);

function DictionaryException(e, msg) {
    setErrorDetails(this, e, msg, DictionaryException);
    captureStackTrace(this, module.exports.DictionaryException, msg);
    return (this);
}
inheritErrorPrototype(DictionaryException, YagaException);

function BindException(e, msg) {
    setErrorDetails(this, e, msg, BindException);
    captureStackTrace(this, module.exports.BindException, msg);
    return (this);
}
inheritErrorPrototype(BindException, YagaException);



function BinderException(ctxt, msg) {
    setErrorDetails(this, ctxt.element(), msg, BinderException);
    captureStackTrace(this, module.exports.BinderException, msg);
    this.context = () => ctxt;
    return (this);
}
inheritErrorPrototype(BinderException, YagaException);

function CastException(e, prot) {
    let msg = `${e.typeName} cannot be cast to ${prot.typeName}`;
    setErrorDetails(this, e, msg, CastException);
    captureStackTrace(this, module.exports.CastException, msg);
    this.prot = () => prot;
    return (this);
}
inheritErrorPrototype(CastException, YagaException);

/*
 *	EvaluateException(type, e, msg)
 *	EvaluateException(type, msg)
 */
function EvaluateException(evaluateType, e, msg) {
    if (arguments.length == 2) {
        msg = e;
        e = Lists.nil();
    }
    setErrorDetails(this, e, msg, EvaluateException);
    captureStackTrace(this, module.exports.EvaluateException, msg);
    this.evaluateType = () => evaluateType;
    return (this);
}
inheritErrorPrototype(EvaluateException, YagaException);

function FrameException(v, msg) {
    setErrorDetails(this, v, msg, FrameException);
    captureStackTrace(this, module.exports.FrameException, msg);
    this.variable = () => v;
    return (this);
}
inheritErrorPrototype(FrameException, YagaException);

function ReadFrameException(v, msg) {
    setErrorDetails(this, v, msg, ReadFrameException);
    captureStackTrace(this, module.exports.ReadFrameException, msg);
    this.variable = () => v;
    return (this);
}
inheritErrorPrototype(ReadFrameException, FrameException);

function WriteFrameException(v, val, msg) {
    setErrorDetails(this, v, msg, WriteFrameException);
    captureStackTrace(this, module.exports.WriteFrameException, msg);
    this.variable = () => v;
    this.value = () => val;
    return (this);
}
inheritErrorPrototype(WriteFrameException, FrameException);

function NameException(e, msg) {
    setErrorDetails(this, e, msg, NameException);
    captureStackTrace(this, module.exports.NameException, msg);
    return (this);
}
inheritErrorPrototype(NameException, YagaException);

function PrimitiveException(e, msg) {
    setErrorDetails(this, e, msg, PrimitiveException);
    captureStackTrace(this, module.exports.PrimitiveException, msg);
    this.evaluateType = () => _evaluateTypes.PRIMITIVE;
    return (this);
}
inheritErrorPrototype(PrimitiveException, EvaluateException);


function newError(e, msg, attach) {
    let point;
    if (e && e.isaParserPoint) {
        point = e;
        e = List.nil();
    } else {
        point = Yaga.getParserPoint(e);
        if (!Yaga.isaYagaType(e)) e = Yaga.Wrapper.new(e, point);
    }
    return {
        element: e,
        parserPoint: point,
        message: msg,
        attachment: attach,
        formattedMessage() {
            return (`${point.format()}: ${e.typeName} - ${msg}`)
        }
    }
}

function setErrorDetails(exc, src, msg, fError) {
    exc.message = msg;
    exc[`isa${fError.name}`] = true;
    if (!src) {
        exc.parserPoint = DefaultParserPoint;
        exc.element = Yaga.List.nil();
    } else if (src.isaParserPoint) {
        exc.parserPoint = src;
        exc.element = Yaga.List.nil();
    } else {
        exc.parserPoint = Yaga.getParserPoint(src);
        exc.element = src;
    }
}

function captureStackTrace(exc, fError, msg) {
    if (typeof Error.captureStackTrace === 'function') {
        Error.captureStackTrace(exc, fError);
    } else {
        exc.stack = (new Error(msg)).stack;
    }
}

function inheritErrorPrototype(fError, fProt) {
    fError.prototype = Object.create(fProt.prototype);
    fError.prototype.constructor = fError;
    fError.prototype.name = 'yaga.' + fError.name;
}
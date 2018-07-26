/**
 * errors : @file
 * 
 * Yaga errors.
 * 
 */

'use strict';

var yaga;

module.exports = {
    YagaException: _errorMethod(YagaException),
    InternalException: _errorMethod(InternalException),
    ParserException: _errorMethod(ParserException),
    DictionaryException: _errorMethod(DictionaryException),
    BindException: _errorMethod(BindException),


    BinderException: _errorMethod(BinderException),
    CastException: _errorMethod(CastException),
    EvaluateException: _errorMethod(EvaluateException),
    FrameException: _errorMethod(FrameException),
    ReadFrameException: _errorMethod(ReadFrameException),
    WriteFrameException: _errorMethod(WriteFrameException),
    NameException: _errorMethod(NameException),
    PrimitiveException: _errorMethod(PrimitiveException),
    RisticValidationException: _errorMethod(RisticValidationException),

    Error: _newError,

    Initialise: _init
};
Object.freeze(module.exports);

function _errorMethod(fnError) {
    return ((...args) => new fnError(...args));
}

let List, _defaultParserPoint;

function _init(y) {
    if (List) return;
    yaga = y;
    List = yaga.List;
    _defaultParserPoint = yaga.Parser.defaultParserPoint
}

function YagaException(e, msg, optErrors) {
    _setErrorDetails(this, e, msg, YagaException);
    _captureStackTrace(this, module.exports.YagaException, msg);
    if (optErrors) this.errors = optErrors;
    return (this);
}
_inheritErrorPrototype(YagaException, Error);

function InternalException(msg) {
    _setErrorDetails(this, undefined, msg, InternalException);
    _captureStackTrace(this, module.exports.InternalException, msg);
    return (this);
}
_inheritErrorPrototype(InternalException, YagaException);

function ParserException(src, msg, rsn) {
    _setErrorDetails(this, src, msg, ParserException);
    _captureStackTrace(this, module.exports.ParserException, msg);
    this.reason = rsn ? rsn : 'PARSER';
    return (this);
}
_inheritErrorPrototype(ParserException, YagaException);

function DictionaryException(e, msg) {
    _setErrorDetails(this, e, msg, DictionaryException);
    _captureStackTrace(this, module.exports.DictionaryException, msg);
    return (this);
}
_inheritErrorPrototype(DictionaryException, YagaException);

function BindException(e, msg) {
    _setErrorDetails(this, e, msg, BindException);
    _captureStackTrace(this, module.exports.BindException, msg);
    return (this);
}
_inheritErrorPrototype(BindException, YagaException);



function BinderException(ctxt, msg) {
    _setErrorDetails(this, ctxt.element(), msg, BinderException);
    _captureStackTrace(this, module.exports.BinderException, msg);
    this.context = () => ctxt;
    return (this);
}
_inheritErrorPrototype(BinderException, YagaException);

function CastException(e, prot) {
    let msg = `${e.typeName} cannot be cast to ${prot.typeName}`;
    _setErrorDetails(this, e, msg, CastException);
    _captureStackTrace(this, module.exports.CastException, msg);
    this.prot = () => prot;
    return (this);
}
_inheritErrorPrototype(CastException, YagaException);

/*
 *	EvaluateException(type, e, msg)
 *	EvaluateException(type, msg)
 */
function EvaluateException(evaluateType, e, msg) {
    if (arguments.length == 2) {
        msg = e;
        e = Lists.nil();
    }
    _setErrorDetails(this, e, msg, EvaluateException);
    _captureStackTrace(this, module.exports.EvaluateException, msg);
    this.evaluateType = () => evaluateType;
    return (this);
}
_inheritErrorPrototype(EvaluateException, YagaException);

function FrameException(v, msg) {
    _setErrorDetails(this, v, msg, FrameException);
    _captureStackTrace(this, module.exports.FrameException, msg);
    this.variable = () => v;
    return (this);
}
_inheritErrorPrototype(FrameException, YagaException);

function ReadFrameException(v, msg) {
    _setErrorDetails(this, v, msg, ReadFrameException);
    _captureStackTrace(this, module.exports.ReadFrameException, msg);
    this.variable = () => v;
    return (this);
}
_inheritErrorPrototype(ReadFrameException, FrameException);

function WriteFrameException(v, val, msg) {
    _setErrorDetails(this, v, msg, WriteFrameException);
    _captureStackTrace(this, module.exports.WriteFrameException, msg);
    this.variable = () => v;
    this.value = () => val;
    return (this);
}
_inheritErrorPrototype(WriteFrameException, FrameException);

function NameException(e, msg) {
    _setErrorDetails(this, e, msg, NameException);
    _captureStackTrace(this, module.exports.NameException, msg);
    return (this);
}
_inheritErrorPrototype(NameException, YagaException);

function PrimitiveException(e, msg) {
    _setErrorDetails(this, e, msg, PrimitiveException);
    _captureStackTrace(this, module.exports.PrimitiveException, msg);
    this.evaluateType = () => _evaluateTypes.PRIMITIVE;
    return (this);
}
_inheritErrorPrototype(PrimitiveException, EvaluateException);

/*
 *  RisticValidationException(Ristic, Error[])
 *	RisticValidationException(Ristic, msg)
 *	RisticValidationException(source, Elements, Error[])
 *	RisticValidationException(source, Elements, msg)
 *	RisticValidationException(source, element[], Error[])
 *	RisticValidationException(Source, element[], msg)
 */
function RisticValidationException() {
    let _msg = 'Ristic validation has failed';
    let _ristic, _source, _errors, _elements;
    if (arguments.length == 2) {
        _ristic = _source = arguments[0];
        _errors = arguments[1];
        _elements = _ristic.elements();
    } else {
        _source = arguments[0];
        _elements = arguments[1];
        if (Array.isArray(_elements)) {
            _elements = Elements.make(_elements, _source);
        }
        _errors = arguments[2];
    }
    if (typeof _errors === 'string') {
        _errors = [_newError(_source, _errors)];
    }
    _setErrorDetails(this, _source, _msg, RisticValidationException);
    _captureStackTrace(this, module.exports.RisticValidationException, _msg);
    this.ristic = () => _ristic;
    this.element = function () {
        if (_ristic) return (this._ristic);
        return (_source);
    };
    this.elements = () => _elements;
    this.errors = () => _errors;
    this.setRistic = (r) => _ristic = r;
    return (this);
}
_inheritErrorPrototype(RisticValidationException, YagaException);

function _newError(e, msg, attach) {
    let point;
    if (e && e.isaParserPoint) {
        point = e;
        e = List.nil();
    } else {
        point = yaga.getParserPoint(e);
        if (!yaga.isaYagaType(e)) e = yaga.Wrapper.new(e, point);
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

function _setErrorDetails(that, src, msg, fnError) {
    that.message = msg;
    that[`isa${fnError.name}`] = true;
    if (!src) {
        that.parserPoint = _defaultParserPoint;
        that.element = yaga.List.nil();
    } else if (src.isaParserPoint) {
        that.parserPoint = src;
        that.element = yaga.List.nil();
    } else {
        that.parserPoint = yaga.getParserPoint(src);
        that.element = src;
    }
}

function _captureStackTrace(that, fnError, msg) {
    if (typeof Error.captureStackTrace === 'function') {
        Error.captureStackTrace(that, fnError);
    } else {
        that.stack = (new Error(msg)).stack;
    }
}

function _inheritErrorPrototype(fnError, fnProt) {
    fnError.prototype = Object.create(fnProt.prototype);
    fnError.prototype.constructor = fnError;
    fnError.prototype.name = 'yaga.' + fnError.name;
}
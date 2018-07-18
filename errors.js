/**
 * errors : @file
 * 
 * Yaga errors.
 * 
 */

'use strict';

var yaga;

let _evaluateTypes = {
    EXPRESSION: 'EXPRESSION',
    RISTIC: 'RISTIC',
    PIPELINE: 'PIPELINE',
    PRIMITIVE: 'PRIMITIVE',
    CONTEXT: 'CONTEXT',
    EVALUATOR: 'EVALUATOR',
    INDEX: 'INDEX',
    PARSE: 'PARSE'
};

module.exports = {
    YagaException: _errorMethod(YagaException),
    isaYagaException: _isAnException(YagaException),
    InternalException: _errorMethod(InternalException),
    isaInternalException: _isAnException(InternalException),
    ParserException: _errorMethod(ParserException),
    isaParserException: _isAnException(ParserException),


    BinderException: _errorMethod(BinderException),
    BindException: _errorMethod(BindException),
    CastException: _errorMethod(CastException),
    EvaluateException: _errorMethod(EvaluateException),
    FrameException: _errorMethod(FrameException),
    ReadFrameException: _errorMethod(ReadFrameException),
    WriteFrameException: _errorMethod(WriteFrameException),
    NameException: _errorMethod(NameException),
    PrimitiveException: _errorMethod(PrimitiveException),
    RisticValidationException: _errorMethod(RisticValidationException),

    isBinderException: _isAnException(BinderException),
    isBindException: _isAnException(BindException),
    isCastException: _isAnException(CastException),
    isEvaluateException: _isAnException(EvaluateException),
    isFrameException: _isAnException(FrameException),
    isReadFrameException: _isAnException(ReadFrameException),
    isWriteFrameException: _isAnException(WriteFrameException),
    isNameException: _isAnException(NameException),
    isPrimitiveException: _isAnException(PrimitiveException),
    isRisticValidationException: _isAnException(RisticValidationException),

    Error: _newError,

    evaluateTypes: _evaluateTypes,

    Initialise: _init
};
Object.freeze(module.exports);

function _errorMethod(fnError) {
    return ((...args) => new fnError(...args));
}

function _isAnException(FnException) {
    return ((excp) => excp instanceof FnException);
}

let List, _defaultParserPoint;

function _init(y) {
    if (List) return;
    yaga = y;
    List = yaga.List;
    _defaultParserPoint = yaga.Parser.defaultParserPoint
}

function YagaException(e, msg) {
    _setErrorDetails(this, e, msg);
    _captureStackTrace(this, module.exports.YagaException, msg);
    return (this);
}
_inheritErrorPrototype(YagaException, Error);

function InternalException(msg) {
    _setErrorDetails(this, undefined, msg);
    _captureStackTrace(this, module.exports.InternalException, msg);
    return (this);
}
_inheritErrorPrototype(InternalException, EvaluateException);

function ParserException(src, msg, rsn) {
    _setErrorDetails(this, src, msg);
    _captureStackTrace(this, module.exports.ParserException, msg);
    this.reason = rsn ? rsn : 'PARSER';
    return (this);
}
_inheritErrorPrototype(ParserException, YagaException);



function BinderException(ctxt, msg) {
    _setErrorDetails(this, ctxt.element(), msg);
    _captureStackTrace(this, module.exports.BinderException, msg);
    this.context = () => ctxt;
    return (this);
}
_inheritErrorPrototype(BinderException, YagaException);

function BindException(ctxt) {
    let _msg = 'Bind Exception';
    _setErrorDetails(this, ctxt.element(), _msg);
    _captureStackTrace(this, module.exports.BinderException, _msg);
    this.context = () => ctxt;
    return (this);
}
_inheritErrorPrototype(BinderException, YagaException);

function CastException(e, prot) {
    let msg = `${e.typeName} cannot be cast to ${prot.typeName}`;
    _setErrorDetails(this, e, msg);
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
    _setErrorDetails(this, e, msg);
    _captureStackTrace(this, module.exports.EvaluateException, msg);
    this.evaluateType = () => evaluateType;
    return (this);
}
_inheritErrorPrototype(EvaluateException, YagaException);

function FrameException(v, msg) {
    _setErrorDetails(this, v, msg);
    _captureStackTrace(this, module.exports.FrameException, msg);
    this.variable = () => v;
    return (this);
}
_inheritErrorPrototype(FrameException, YagaException);

function ReadFrameException(v, msg) {
    _setErrorDetails(this, v, msg);
    _captureStackTrace(this, module.exports.ReadFrameException, msg);
    this.variable = () => v;
    return (this);
}
_inheritErrorPrototype(ReadFrameException, FrameException);

function WriteFrameException(v, val, msg) {
    _setErrorDetails(this, v, msg);
    _captureStackTrace(this, module.exports.WriteFrameException, msg);
    this.variable = () => v;
    this.value = () => val;
    return (this);
}
_inheritErrorPrototype(WriteFrameException, FrameException);

function NameException(e, msg) {
    _setErrorDetails(this, e, msg);
    _captureStackTrace(this, module.exports.NameException, msg);
    return (this);
}
_inheritErrorPrototype(NameException, YagaException);

function PrimitiveException(e, msg) {
    _setErrorDetails(this, e, msg);
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
    _setErrorDetails(this, _source, _msg);
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

/*
 *   _newError(msg)
 *   _newError(element, msg)
 *   _newError(msg, point)
 */
function _newError() {
    let msg, e, point;
    if (arguments.length == 1) {
        e = List.nil();
        msg = arguments[0];
        point = e.parserPoint;
    } else {
        if (typeof arguments[0] === 'string') {
            e = List.nil();
            msg = arguments[0];
            point = arguments[1];
        } else {
            e = arguments[0];
            msg = arguments[1];
            point = e.parserPoint;
        }
    }
    return {
        element: e,
        message: msg,
        formattedMessage: () => `${point.format()} - ${msg}`
    }
}

function _setErrorDetails(that, src, msg) {
    that.message = msg;
    if (!src) {
        that.parserPoint = _defaultParserPoint;
        that.element = yaga.List.nil();
    } else if (src.isParserPoint) {
        that.parserPoint = src;
        that.element = yaga.List.nil();
    } else {
        that.parserPoint = src.parserPoint;
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
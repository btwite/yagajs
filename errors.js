/**
 * errors : @file
 * 
 * Yaga errors.
 * 
 */

let lists; // Need to attach the Lists object here.
let Elements; // Need to attach the Elements object here.

function YagaException(element, msg) {
    _setErrorDetails(this, element, msg);
    _captureStackTrace(this, module.exports.YagaException, msg);
    return (this);
}
_inheritErrorPrototype(YagaException, Error);

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

function NamespaceException(e, msg) {
    _setErrorDetails(this, e, msg);
    _captureStackTrace(this, module.exports.NamespaceException, msg);
    return (this);
}
_inheritErrorPrototype(NamespaceException, YagaException);

let _parserTypes = {
    ENDOFSTREAM: 'ENDOFSTREAM',
    STARTOFEXPRESSION: 'STARTOFEXPRESSION',
    IO: 'IO',
    ENDOFEXPRESSION: 'ENDOFEXPRESSION',
    BRACKETS: 'BRACKETS'
}

function ParserException(parserType, msg) {
    _setErrorDetails(this, Lists.nil(), msg);
    _captureStackTrace(this, module.exports.ParserException, msg);
    this.parserType = () => parserType;
    return (this);
}
_inheritErrorPrototype(ParserException, YagaException);

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
    let _msg, _e, _point;
    if (arguments.length == 1) {
        _e = Lists.nil();
        _msg = arguments[0];
        _point = e.parserPoint();
    } else {
        if (typeof arguments[0] === 'string') {
            _e = Lists.nil();
            _msg = arguments[0];
            _point = arguments[1];
        } else {
            _e = arguments[0];
            _msg = arguments[1];
            _point = e.parserPoint();
        }
    }
    return {
        element: () => _e,
        message: () => _msg,
        formattedMessage: () => `${_point.format()} - ${_msg}`
    }
}

function _setErrorDetails(that, element, msg) {
    that.message = msg;
    that.element = () => element;
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

module.exports = {
    YagaException: _errorMethod(YagaException),
    BinderException: _errorMethod(BinderException),
    BindException: _errorMethod(BindException),
    CastException: _errorMethod(CastException),
    EvaluateException: _errorMethod(EvaluateException),
    FrameException: _errorMethod(FrameException),
    ReadFrameException: _errorMethod(ReadFrameException),
    WriteFrameException: _errorMethod(WriteFrameException),
    NameException: _errorMethod(NameException),
    NamespaceException: _errorMethod(NamespaceException),
    ParserException: _errorMethod(ParserException),
    PrimitiveException: _errorMethod(PrimitiveException),
    RisticValidationException: _errorMethod(RisticValidationException),

    isaYagaException: _isAnException(YagaException),
    isaBinderException: _isAnException(BinderException),
    isaBindException: _isAnException(BindException),
    isaCastException: _isAnException(CastException),
    isanEvaluateException: _isAnException(EvaluateException),
    isaFrameException: _isAnException(FrameException),
    isaReadFrameException: _isAnException(ReadFrameException),
    isaWriteFrameException: _isAnException(WriteFrameException),
    isaNameException: _isAnException(NameException),
    isaNamespaceException: _isAnException(NamespaceException),
    isaParserException: _isAnException(ParserException),
    isaPrimitiveException: _isAnException(PrimitiveException),
    isaRisticValidationException: _isAnException(RisticValidationException),

    Error: _newError,

    evaluateTypes: _evaluateTypes,
    parserTypes: _parserTypes,
};
Object.freeze(module.exports);

function _errorMethod(fnError) {
    return ((...args) => new fnError(...args));
}

function _isAnException(FnException) {
    return ((excp) => excp instanceof FnException);
}
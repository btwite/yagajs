/**
 * errors : @file
 * 
 * Yaga errors.
 * 
 */

function YagaError(element, msg) {
    _setErrorDetails(this, element, msg);
    _captureStackTrace(this, module.exports.YagaError);
    return (this);
}
_inheritErrorPrototype(YagaError, Error);

function BinderError(ctxt, msg) {
    _setErrorDetails(this, ctxt.element(), msg);
    _captureStackTrace(this, module.exports.BinderError);
    this.context = () => ctxt;
    return (this);
}
_inheritErrorPrototype(BinderError, YagaError);

function CastError(e, prot) {
    _setErrorDetails(this, e, `${e.typeName} cannot be cast to ${prot.typeName}`);
    _captureStackTrace(this, module.exports.CastError);
    this.prot = () => prot;
    return (this);
}
_inheritErrorPrototype(BinderError, YagaError);

let _evaluateType = {
    EXPRESSION: 'EXPRESSION',
    RISTIC: 'RISTIC',
    PIPELINE: 'PIPELINE',
    PRIMITIVE: 'PRIMITIVE',
    CONTEXT: 'CONTEXT',
    EVALUATOR: 'EVALUATOR',
    INDEX: 'INDEX',
    PARSE: 'PARSE'
};

function _setErrorDetails(that, element, msg) {
    that.message = msg;
    that.element = function () {
        return (element);
    }
}

function _captureStackTrace(that, fnError) {
    if (typeof Error.captureStackTrace === 'function') {
        Error.captureStackTrace(that, fnError);
    }
}

function _inheritErrorPrototype(fnError, fnProt) {
    fnError.prototype = Object.create(fnProt.prototype);
    fnError.prototype.constructor = fnError;
    fnError.prototype.name = 'yaga.' + fnError.name;
}

module.exports = {
    YagaError: _errorMethod(YagaError),
    BinderError: _errorMethod(BinderError),
    BindError: _errorMethod(BindError),
    CastError: _errorMethod(CastError),
    EvaluateError: _errorMethod(EvaluateError),
    FrameError: _errorMethod(FrameError),
    NameError: _errorMethod(NameError),
    NamespaceError: _errorMethod(NamespaceError),
    ParserError: _errorMethod(ParserError),
    PrimitiveError: _errorMethod(PrimitiveError),
    RisticValidationError: _errorMethod(RisticValidationError),

    evaluateType: _evaluateType,
};
Object.freeze(module.exports);

function _errorMethod(fnError) {
    return ((...args) => new fnError(...args));
}
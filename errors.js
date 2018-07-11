/**
 * errors : @file
 * 
 * Yaga errors.
 * 
 */

function _captureStackTrace(that, fnError) {
    if (typeof Error.captureStackTrace === 'function') {
        Error.captureStackTrace(that, fnError);
    }
}

function _inheritErrorPrototype(fnError, fnProt) {
    fnError.prototype = Object.create(fnProt.prototype);
    fnError.prototype.constructor = fnError;
    fnError.prototype.name = fnError.name;
}

function YagaError(element, msg) {
    this.message = msg;
    this.e = element;
    _captureStackTrace(this, YagaError);
}
_inheritErrorPrototype(YagaError, Error);

let err = new YagaError(100, 'Yaga error');

module.exports = {

};

Object.freeze(module.exports);
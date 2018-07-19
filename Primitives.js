/**
 * Primitives : @file
 * 
 * Yaga JavaScript primitive services.
 */

'use strict';

var yaga;

module.exports = {
    jsPrimLoader: _jsPrimLoader,
    jsDefine: _jsDefine,
    jsFunction: _jsFunction,
    jsMacro: _jsMacro,
    Initialise: (y) => yaga = yaga ? yaga : y,
};
Object.freeze(module.exports);

function _jsPrimLoader(yi, list) {
    if (arr.length == 2) return (this[arr[1].value]);
    return (require(arr[1].value)[arr[2].value]);
}

function _jsDefine(yi, args) {
    yi.dictionary.define(args[0], args[1]);
}

function _jsFunction(yi, list) {

}

function _jsMacro(yi, list) {

}
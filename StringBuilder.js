/**
 * StringBuilder : @file
 * 
 * Construct a string by collecting the parts into an array.
 * The final result is answered by joinging the parts.
 */

'use strict';

module.exports = {
    new: _newStringBuilder,
};
Object.freeze(module.exports);

let yc = require('./yagacore');

function _newStringBuilder() {
    let _strings = [];
    return (Object.freeze({
        typeName: 'StringBuilder',
        append(o) {
            _strings.push(String(o));
            return (this);
        },
        toString() {
            return (_strings.join(''));
        }
    }));
}
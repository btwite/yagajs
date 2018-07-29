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

function _newStringBuilder() {
    let _strings = [];
    return (Object.freeze({
        typeName: 'StringBuilder',
        append(o) {
            _strings.push(String(o));
            return (this);
        },
        clear() {
            _strings = [];
            return (this);
        },
        atGet(idx) {
            return (_strings[idx]);
        },
        length() {
            return (this.toString().length);
        },
        segmentCount() {
            return (_strings.length);
        },
        toString() {
            return (_strings.join(''));
        },
        substr(iStart, len) {
            if (iStart + len > _strings.length) len = _strings.length - iStart;
            if (len === 0) return ('');
            return (_strings.slice(iStart, iStart + len).join(''));
        },
        splice(...args) {
            return (_strings.splice(...args));
        }
    }));
}
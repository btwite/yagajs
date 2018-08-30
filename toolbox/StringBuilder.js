/**
 * StringBuilder : @file
 * 
 * Construct a string by collecting the parts into an array.
 * The final result is answered by joinging the parts.
 */

'use strict';

module.exports = Object.freeze({
    StringBuilder
});

function StringBuilder() {
    let str, aStrings = [];
    return (Object.freeze({
        typeName: 'StringBuilder',
        append(o) {
            aStrings.push(String(o));
            str = undefined;
            return (this);
        },
        pop() {
            str = undefined;
            return (aStrings.pop());
        },
        clear() {
            aStrings = [];
            str = undefined;
            return (this);
        },
        atGet(idx) {
            return (this.toString()[idx]);
        },
        length() {
            return (this.toString().length);
        },
        segmentCount() {
            return (aStrings.length);
        },
        toString() {
            return (str || (str = aStrings.join('')));
        },
        substr(...args) {
            return (this.toString().substr(...args));
        },
        substring(...args) {
            return (this.toString().substring(...args));
        },
        splice(...args) {
            return (this.toString().splice(...args));
        }
    }));
}
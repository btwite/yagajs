/*
 *  Exception: @file
 *
 *  Construct a new exception given a exception descriptor of the form:
 *      {
 *          name: '<NameOfException>',
 *          constructor: <function>,        // Optional. Returns the message and sets other exception data.
 *          prototype: <ExceptionFunction>  // Optional. Defaults to Error
 *      }
 * 
 *  Notes:
 *      1. Descriptor can just be the name string if no constructor or prototype.
 *      2. If no constructor, then first arg is assumed to be message and additional args are saved as 'data' array.
 */
"use strict";

module.exports = Object.freeze({
    Exception
});

function Exception(oDesc) {
    let name, constructor, prot, ty = typeof oDesc;
    if (ty === 'string') {
        name = oDesc;
        prot = Error;
        constructor = defaultConstructor;
    } else if (ty === 'object') {
        checkType(oDesc, 'name', 'string');
        checkType(oDesc, 'constructor', ['undefined', 'function']);
        checkType(oDesc, 'prototype', ['undefined', 'function']);
        name = oDesc.name;
        prot = oDesc.prototype || Error;
        constructor = oDesc.constructor || defaultConstructor;
    } else
        throw new Error('Object descriptor expected for Exception');

    if (!(Object.is(prot, Error) || (prot instanceof Error) || prot.exceptionConstructor))
        throw new Error('Exception prototype must inherit from Error');
    return (createException(name, prot, constructor));
}

function createException(n, prot, c) {
    let shortName, idx = (shortName = n).lastIndexOf('.');
    if (idx >= 0) shortName = shortName.substr(idx + 1);
    let fExc = function (...args) {
        if (!this.hasOwnProperty('isanException')) {
            this[`isa${shortName}`] = true;
            this.isanException = true;
            if (typeof Error.captureStackTrace === 'function')
                Error.captureStackTrace(this, factory);
            else
                this.stack = (new Error(this.message)).stack;
        }
        let msg = c.call(this, ...args);
        if (!msg) msg = n; // Just answer the full name if there is no message
        return (this.message = msg);
    }
    prot = prot.exceptionConstructor || prot;
    fExc.prototype = Object.create(prot.prototype);
    fExc.prototype.constructor = fExc;
    fExc.prototype.name = n;

    // We are going to return a factory function rather than the constructor
    // The constructor is stored as a property of our factory function.
    var factory = (...args) => new fExc(...args);
    factory.exceptionConstructor = fExc;
    factory.super = (exc, ...args) => {
        return (Object.getPrototypeOf(fExc.prototype).constructor.call(exc, ...args));
    }
    return (factory);
}

// Can also call 'super' via Exception and pass the factory or constructor object.
Exception.super = (prot, exc, ...args) => {
    prot = prot.exceptionConstructor || prot;
    return (Object.getPrototypeOf(prot.prototype).constructor.call(exc, ...args));
}

function defaultConstructor(...args) {
    let msg = args.shift();
    if (args.length > 0)
        this.data = args;
    return (msg ? String(msg) : undefined);
}

function checkType(oDesc, prop, ty) {
    let pty = typeof oDesc[prop];
    if (Array.isArray(ty)) {
        for (let i = 0; i < ty.length; i++) {
            if (pty === ty[i])
                return;
        }
    } else if (pty === ty)
        return;
    throw new Error(`Exception descriptor property '${prop}: ${oDesc[prop]}' is invalid`);
}
/*
 *  Replicate: @file
 *
 *  Object replication services for POJOs. Will also detect Influence instances
 */
"use strict";

var exps;

module.exports = Object.freeze({
    copy,
    reverseCopy,
    clone,
    copyObject,
    cloneObject,
    Initialise: x => exps = x
});

function copy(o) {
    if (Array.isArray(o))
        return ([].concat(o));
    else if (typeof o !== 'object')
        return (o);
    if (o.isanInfluenceInstance)
        return (o.copy());
    return (exps.Scopes.copy(o, copyObject(o)));
}

function reverseCopy(a) {
    if (Array.isArray(a))
        return ([].concat(a).reverse());
    return (copy(o));
}

function clone(o, cloneMap) {
    if (!cloneMap)
        cloneMap = new Map();
    if (Array.isArray(o))
        return (cloneArray(o, cloneMap));
    else if (typeof o !== 'object')
        return (o);
    if (o.isanInfluenceInstance)
        return (o.clone(cloneMap));
    return (exps.Scopes.clone(o, cloneObject(o, cloneMap), cloneMap));
}

function copyObject(o) {
    let o1 = Object.create(Object.getPrototypeOf(o));
    Object.defineProperties(o1, Object.getOwnPropertyDescriptors(o));
    return (o1);
}

function cloneObject(o, cloneMap, o1) {
    if (cloneMap.has(o))
        return (cloneMap.get(o));
    if (!o1)
        o1 = Object.create(Object.getPrototypeOf(o));
    cloneMap.set(o, o1);
    let descs = Object.getOwnPropertyDescriptors(o);
    Object.getOwnPropertyNames(descs).forEach(prop => cloneDescriptor(descs[prop], cloneMap));
    Object.getOwnPropertySymbols(descs).forEach(sym => cloneDescriptor(descs[sym], cloneMap));
    Object.defineProperties(o1, descs);
    return (o1);
}

function cloneDescriptor(desc, cloneMap) {
    if (desc.value)
        desc.value = clone(desc.value, cloneMap);
    return (desc);
}

function cloneArray(ai, cloneMap) {
    let ao = [];
    ai.forEach(v => ao.push(clone(v, cloneMap)));
    return (ao);
}
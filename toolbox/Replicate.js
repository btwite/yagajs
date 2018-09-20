/*
 *  Replicate: @file
 *
 *  Object replication services for POJOs. Will also detect Influence instances
 */
"use strict";

var mods;

module.exports = Object.freeze({
    copy,
    clone,
    Initialise: m => mods = m
});

function copy(o) {
    if (Array.isArray(o))
        return ([].concat(o));
    else if (typeof o !== 'object')
        return (o);
    if (o.isanInfluenceInstance)
        return (o.copy());
    return (mods.Scopes.copy(o, copyObject(o)));
}

function clone(o, cloneMap) {
    if (Array.isArray(o))
        return (cloneArray(o));
    else if (typeof o !== 'object')
        return (o);
    if (o.isanInfluenceInstance)
        return (o.clone());
    if (!cloneMap) cloneMap = new Map();
    return (mods.Scopes.clone(o, cloneObject(o, cloneMap), cloneMap));
}

function copyObject(o) {
    let o1 = Object.create(Object.getPrototypeOf(o));
    Object.defineProperties(o1, Object.getOwnPropertyDescriptors(o));
    return (o1);
}

function cloneObject(o, cloneMap) {
    if (cloneMap.has(o))
        return (cloneMap.get(o));
    let o1 = Object.create(Object.getPrototypeOf(o));
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
/*
 *  Scopes: @file
 *
 *  Object scope extension related services for POJOs.
 * 
 *  Warning: Influence instances have their own private and protected scope support. This does not
 *           stop the use of this facility but it is not visible or managed by Influence.
 */
"use strict";

const SymPublic = Symbol.for('Public');
const Scopes = new WeakMap(); // Map of scope objects to associated public objects

var exps;

module.exports = Object.freeze({
    public: o => o[SymPublic] || o,
    createPrivateScope,
    copy,
    clone,
    Initialise: x => exps = x,
});


function createPrivateScope(prot) {
    if (prot !== undefined && prot !== null && (typeof prot !== 'object' || Array.isArray(prot)))
        throw new Error('Invalid prototype for private scope accessor');
    let id = 'Scopes.private:' + exps.Utilities.uuidv4();
    return oPublic => {
        let oScopes = Scopes.get(oPublic = oPublic[SymPublic] || oPublic);
        if (!oScopes) {
            Scopes.set(oPublic, oScopes = {
                [SymPublic]: oPublic,
            });
        }
        let oScope = oScopes[id];
        if (oScope)
            return (oScope);
        oScope = oScopes[id] = prot === undefined ? {} : Object.create(prot);
        oScope[SymPublic] = oPublic;
        return (oScope);
    };
}

// Internal support for replication of non Influence objects.

function copy(oSrc, oTgt) {
    return (copyClone(oSrc, oTgt, o => exps.Replicate.copy(o)));
}

function clone(oSrc, oTgt, cloneMap) {
    return (copyClone(oSrc, oTgt, o => exps.Replicate.clone(o, cloneMap)));
}

function copyClone(oSrc, oTgt, fCopy) {
    let scopes = Scopes.get(oSrc);
    if (scopes) {
        let newScopes = {
            [SymPublic]: oTgt,
        };
        Object.keys(scopes).forEach(sScope => (newScopes[sScope] = fCopy(scopes[sScope]))[SymPublic] = oTgt);
        Scopes.set(oTgt, newScopes)
    }
    return (oTgt);
}
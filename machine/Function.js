/**
 * Function : @file
 * 
 * The Yaga function types.
 * 
 * Note that all functions will receive the complete list rather than just the arguments.
 * The first argument is at position 1. Hence a list of length 1 has no arguments.
 */

'use strict';

let _ = undefined;

var Yaga = require('../Yaga');
var Common = require('./Common').Common;
var Mach;

var jsFunction = Yaga.Influence({
    name: 'yaga.machine.jsFunction',
    composition: [{
        prototype: {
            isaFunction: true,
            isaMacro: false,
            isajsFunction: true,
            isajsMacro: false,
            isaClosure: true,
            jsPrim: '.jsPrim',
            asQuoted: returnThis,
            asQuasiQuoted: returnThis,
            asQuasiOverride: returnThis,
            asQuasiInjection: returnThis,
            bind: returnThis,
            evaluate: returnThis,
            call(ymc, args, readPoint) {
                // Call is repsonsible for evaluating arguments. Allows for lazy evaluation via an argument declaration.
                // Not going to implement arguments at this level. Will allow a jsFunction to be wrapped as a
                // a Yaga function. Will need a separate Yaga call type to accept arguments as is.
                // Note that js macros come through here, but always pass a list which will not be evaluated.
                if (!args.elements) args = evaluateArgs(ymc, args, readPoint);
                if (args.hasNone) return (jsPartialFunction(this, args, readPoint));
                if (this.isaNativeFunction) {
                    // Need to unwrap the arguments to make the call
                    let arr = [];
                    args.elements.forEach(e => arr.push(e.nativeValue(ymc)));
                    return (Mach.Wrapper(this.jfn.apply(ymc, arr), args.readPoint));
                }
                return (Mach.Wrapper(this.jfn(ymc, args), args.readPoint));
            },
            print(printer) {
                printer.printLead('(').printElement(this.jsPrim);
                this.jsNames.forEach(n => printer.printElement(n.asString()));
                printer.printTrail(')');
            }
        },
        constructor(jfn, jNames, readPoint) {
            this.jfn = jfn;
            this.jsNames = jNames;
            this.readPoint = readPoint || Yaga.Reader.ReadPoint.default;
        }
    }, Common],
});

var Function = Yaga.Influence({
    name: 'yaga.machine.Function',
    composition: [{
        prototype: {
            isaFunction: true,
            isaMacro: false,
            isajsFunction: false,
            isajsMacro: false,
            isaNativeFunction: false,
            isaClosure: true,
            asQuoted: returnThis,
            asQuasiQuoted: returnThis,
            asQuasiOverride: returnThis,
            asQuasiInjection: returnThis,
            thisArg_: {
                nativeValue: nativeWrap,
                bind: bindFunction,
            },
            evaluate: returnThis,
            call(ymc, args) {
                // Call is repsonsible for evaluating arguments. Allows for lazy evaluation via an argument declaration.
                // Send evaluate request throught to the arguments.
            },
            print(printer) {
                if (this.leadSyntax) printer.printLead(this.leadSyntax);
                printer.printElement(this.value());
            }
        },
        constructor(parms, expr, readPoint) {
            this.parms = parms;
            this.expression = expr;
            this.readPoint = readPoint;
        },
        static: {
            jsFunction: jsFunction.create,
            jsNativeFunction,
            Macro,
            jsMacro
        }
    }, Common],
    harmonizers: '.most.'
});

module.exports = Object.freeze({
    Function: Function.create,
    Initialise: x => Mach = x,
});

function Macro(parms, expr, readPoint) {
    return (Function.create(parms, expr, readPoint).assign({
        typeName: 'yaga.machine.Macro',
        isaMacro: true,
    }));
}

function jsNativeFunction(jfn) {
    // Native function object is a special from of Wrapper to allow native functions to
    // be called with yaga. 'value' method will return the actual function.
    let f = function () {
        return (this.jfn);
    };
    return (jsFunction.create(jfn).assign({
        jsPrim: jfn.name,
        isaNativeFunction: true,
        nativeValue: f,
        value: f,
    }));
}

function jsMacro(jfn, jNames, readPoint) {
    return (jsFunction.create(jfn, jNames, readPoint).assign({
        typeName: 'yaga.machine.jsMacro',
        isaMacro: true,
        isajsMacro: true,
    }));
}

function nativeWrap(fn, ymc) {
    return ((...args) => {
        let arr = [];
        args.forEach(a => arr.push(Mach.Wrapper(a)));
        return (fn.call(ymc, arr).nativeValue(fn));
    });
}

function bindFunction(fn, ymc) {
    let cl = bindClosure(ymc, fn, 'Function');
    let binder = ymc.binder;
    binder.pushClosure(fn);
    bindParameters(ymc, cl);
    cl.expression = cl.expression.bind(ymc);
    binder.popClosure();
    return (cl);
}

function bindClosure(ymc, oClosure, ty) {
    let binder = ymc.binder;
    return (oClosure.extend({
        typeName: `Bound${ty}`,
        [`isaBound${ty}`]: true,
        isaBoundClosure: true,
        parentClosure: binder.curDesc.fnType,
        idx: binder.curIdx,
        variables: [],
        bind: returnThis,
        evaluate(ymc) {

        },
        call: {
            // Call is repsonsible for evaluating arguments. Allows for lazy evaluation via an argument declaration.
            // Send evaluate request throught to the arguments.

        },
        addVariable(v) {
            addToVarMap(v, binder.curDesc.varMap);
            v.idxClosure = this.idx;
            v.idx = this.variables.length;
            this.variables.push(parm);
        }
    }));
}

function bindParameters(ymc, fn) {
    // Parameters are inserted at the head of the bound functions variable list which
    // also means that the resolved arguments are moved to the instantiated function's
    // scope space.
    fn.parms.forEach(parm => fn.addVariable(parm));
    // Can now bind the default values as we have access to all the parameter definitions
    fn.parms.forEach(parm => {
        if (parm.defaultValue) parm.defaultValue = parm.defaultValue.bind(ymc);
    });
    return (parms);
}

function addToVarMap(v, varMap) {
    let sName = v.asString();
    if (varMap[sName]) {
        throw Mach.Error.BindException(parm, `'${sName}' is already declared`);
    }
    varMap[sName] = v;
}

var Block = Yaga.Influence({
    name: 'yaga.machine.Block',
    composition: [{
        prototype: {
            thisArg_: {
                bind: bindBlock,
            },
            evaluate(ymc) {

            },
            call(ymc, args) {
                // Call is repsonsible for evaluating arguments. Allows for lazy evaluation via an argument declaration.
                // Send evaluate request throught to the arguments.

            },
            print(printer) {
                if (this.leadSyntax) printer.printLead(this.leadSyntax);
                printer.printElement(this.value());
            }
        },
        constructor(stmtList, point) {
            this.expression = stmtList;
            this.readPoint = point;
        }
    }, Function]
});

function bindBlock(blk, ymc) {
    let fn = bindClosure(ymc, blk, 'Block');
    fn.assignParameters = assignParameters;
    let binder = ymc.binder;
    binder.pushClosure(blk);
    let stmts = [];
    fn.expression.elements.forEach(stmt => stmts.push(stmt.bind(ymc)));
    fn.expression = yaga.List(stmts, fn.expression.readPoint);
    binder.popClosure();
    return (fn);
}

function assignParameters(ymc, fn, parms) {
    fn.parms = parms;
    bindParameters(ymc, fn);
}

function jsPartialFunction(jsfn, args) {
    return (jsfn.extend({
        isaPartialFunction: true,
        partialArgs: args,
        nativeValue: Yaga.thisArg(nativeWrap),
        call(ymc, args, optPoint) {
            if (args.length === 0) return (this);
            if (!args.elements) args = evaluateArgs(ymc, args);
            args = mergeArgs(this.partialArgs, args, optPoint);
            return (returnRelated(this).call(ymc, args, optPoint));
        },
    }));
}

function mergeArgs(partArgs, args, optPoint) {
    let e, arr = partArgs.elements.slice(0),
        es = args.elements,
        iArgs = 0,
        newMap = [];
    partArgs.hasNone.forEach(idx => {
        if (iArgs >= es.length || (e = es[iArgs++]).isNone) newMap.push(idx);
        else arr[idx] = e;
    });
    for (; iArgs < es.length; iArgs++) {
        if ((e = es[iArgs]).isNone) newMap.push(iArgs);
        arr.push(e);
    }
    let list = Mach.List(arr, optPoint ? optPoint : arr[0].readPoint);
    if (newMap.length > 0) list.hasNone = newMap;
    return (list);
}

function evaluateArgs(ymc, es, optPoint) {
    if (es.length === 0) return (Mach.List.nil());
    let noneMap = [],
        arr = [];
    for (let i = 0; i < es.length; i++) {
        let e = es[i].evaluate(ymc);
        if (e.isInsertable) arr = arr.concat(e.elements);
        else if (e.isNone) {
            noneMap.push(i);
            arr.push(e);
        } else arr.push(e);
    };
    let list = Mach.List(arr, optPoint ? optPoint : arr[0].readPoint);
    if (noneMap.length > 0) list.hasNone = noneMap;
    return (list);
}

function returnRelated(fn) {
    return (Object.getPrototypeOf(fn));
}

function returnThis() {
    return (this);
}
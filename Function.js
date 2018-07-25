/**
 * Function : @file
 * 
 * The Yaga function types.
 * 
 * Note that all functions will receive the complete list rather than just the arguments.
 * The first argument is at position 1. Hence a list of length 1 has no arguments.
 */

'use strict';

var yaga, _function, _block, _jsFunction;

module.exports = {
    new: _newFunction,
    jsNew: _jsNewFunction,
    Macro: {
        new: _newMacro,
        jsNew: _jsNewMacro,
    },
    Block: {
        new: _newBlock,
    },
    Initialise: y => yaga = yaga ? yaga : y,
    PostInitialise: () => yaga.newType(_function),
};
Object.freeze(module.exports);

function _newFunction(parms, expr, point) {
    let func = Object.create(_function);
    func.parms = parms;
    func.expression = expr;
    if (point) func.parserPoint = point;
    return (func);
}

function _newMacro(parms, expr, point) {
    let mac = _newFunction(parms, statements, point);
    mac.typeName = 'Macro';
    mac.isaMacro = true;
    return (mac);
}

function _newBlock(stmtList, point) {
    let blk = Object.create(_block);
    blk.expression = stmtList;
    if (point) func.parserPoint = point;
    return (func);
}

function _jsNewFunction(list, jfn, point) {
    let func = Object.create(_jsFunction);
    func._list = list;
    func.jfn = jfn;
    if (point) func.parserPoint = point;
    return (func);
}

function _jsNewMacro(list, jfn, point) {
    let mac = _jsNewFunction(list, jfn, point);
    mac.typeName = 'jsMacro';
    mac.isaMacro = true;
    mac.isajsMacro = true;
    return (mac);
}

_function = {
    typeName: 'Function',
    parserPoint: undefined,
    asQuoted: _returnThis,
    asQuasiQuoted: _returnThis,
    asQuasiOverride: _returnThis,
    asQuasiInjection: _returnThis,
    isaFunction: true,
    isaClosure: true,
    parms: undefined,
    expression: undefined,

    bind: _bindFunction,
    evaluate(yi) {
        return (this);
    },
    call(yi, args) {
        // Call is repsonsible for evaluating arguments. Allows for lazy evaluation via an argument declaration.
        // Send evaluate request throught to the arguments.
    },
    print(printer) {
        if (this.leadSyntax) printer.printLead(this.leadSyntax);
        printer.printElement(this.value());
    }
}

function _bindFunction(yi) {
    let fn = _bindClosure(yi, this, 'Function');
    let binder = yi.binder;
    binder.pushClosure(this);
    _bindParameters(yi, fn);
    fn.expression = fn.expression.bind(yi);
    binder.popClosure();
    return (fn);
}

function _bindClosure(yi, oClosure, ty) {
    let binder = yi.binder;
    return (Object.assign(Object.create(oClosure), {
        typeName: `Bound${ty}`,
        [`isaBound${ty}`]: true,
        isaBoundClosure: true,
        parentClosure: binder.curDesc.fnType,
        idx: binder.curIdx,
        variables: [],
        bind: _returnThis,
        evaluate(yi) {

        },
        call: {
            // Call is repsonsible for evaluating arguments. Allows for lazy evaluation via an argument declaration.
            // Send evaluate request throught to the arguments.

        },
        addVariable(v) {
            _addToVarMap(v, binder.curDesc.varMap);
            v.idxClosure = this.idx;
            v.idx = this.variables.length;
            this.variables.push(parm);
        }
    }));
}

function _bindParameters(yi, fn) {
    // Parameters are inserted at the head of the bound functions variable list which
    // also means that the resolved arguments are moved to the instantiated function's
    // scope space.
    fn.parms.forEach(parm => fn.addVariable(parm));
    // Can now bind the default values as we have access to all the parameter definitions
    fn.parms.forEach(parm => {
        if (parm.defaultValue) parm.defaultValue = parm.defaultValue.bind(yi);
    });
    return (parms);
}

function _addToVarMap(v, varMap) {
    let sName = v.asString();
    if (varMap[sName]) {
        throw yaga.errors.BindException(parm, `'${sName}' is already declared`);
    }
    varMap[sName] = v;
}

_block = Object.assign(Object.create(_function), {
    typeName: 'Block',
    isaBlock: true,

    bind: _bindBlock,
    evaluate(yi) {

    },
    call(yi, args) {
        // Call is repsonsible for evaluating arguments. Allows for lazy evaluation via an argument declaration.
        // Send evaluate request throught to the arguments.

    },
    print(printer) {
        if (this.leadSyntax) printer.printLead(this.leadSyntax);
        printer.printElement(this.value());
    }
});

function _bindBlock(yi) {
    let fn = _bindClosure(yi, this, 'Block');
    fn.assignParameters = _assignParameters;
    let binder = yi.binder;
    binder.pushClosure(this);
    let stmts = [];
    fn.expression.elements.forEach(stmt => stmts.push(stmt.bind(yi)));
    fn.expression = yaga.List.new(stmts, fn.expression.parserPoint);
    binder.popClosure();
    return (fn);
}

function _assignParameters(yi, fn, parms) {
    fn.parms = parms;
    _bindParameters(yi, fn);
}

_jsFunction = Object.assign(Object.create(_function), {
    typeName: 'jsFunction',
    isajsFunction: true,
    jfn: undefined,
    _list: undefined,

    bind: _returnThis,
    evaluate: _returnThis,
    call(yi, args, optPoint) {
        // Call is repsonsible for evaluating arguments. Allows for lazy evaluation via an argument declaration.
        // Not going to implement arguments at this level. Will allow a jsFunction to be wrapped as a
        // a Yaga function. Will need a separate Yaga call type to accept arguments as is.
        // Note that js macros come through here, but always pass a list which will not be evaluated.
        if (!args.elements) args = _evaluateArgs(yi, args, optPoint);
        if (args.hasNone) return (_newjsPartialFunction(this, args, optPoint));
        return (yaga.Wrapper.new(this.jfn(yi, args), args.parserPoint));
    },
    print(printer) {
        this._list.print(printer);
    }
});

function _newjsPartialFunction(jsfn, args) {
    let fn = Object.create(jsfn);
    fn.isaPartialFunction = true;
    fn.partialArgs = args;
    fn.call = function (yi, args, optPoint) {
        if (!args.elements) args = _evaluateArgs(yi, args);
        args = _mergeArgs(this.partialArgs, args, optPoint);
        return (Object.getPrototypeOf(this).call(yi, args, optPoint));
    };
    return (fn);
}

function _mergeArgs(partArgs, args, optPoint) {
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
    let list = yaga.List.new(arr, optPoint ? optPoint : arr[0].parserPoint);
    if (newMap.length > 0) list.hasNone = newMap;
    return (list);
}

function _evaluateArgs(yi, es, optPoint) {
    if (es.length === 0) return (yaga.List.nil());
    let noneMap = [],
        arr = [];
    for (let i = 0; i < es.length; i++) {
        let e = es[i].evaluate(yi);
        if (e.isInsertable) arr = arr.concat(e.elements);
        else if (e.isNone) {
            noneMap.push(i);
            arr.push(e);
        } else arr.push(e);
    };
    let list = yaga.List.new(arr, optPoint ? optPoint : arr[0].parserPoint);
    if (noneMap.length > 0) list.hasNone = noneMap;
    return (list);
}

function _returnThis() {
    return (this);
}
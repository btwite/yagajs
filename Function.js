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
    call(yi, args) {
        // Call is repsonsible for evaluating arguments. Allows for lazy evaluation via an argument declaration.
        // Not going to implement arguments at this level. Will allow a jsFunction to ne associated as the implementation
        // of a Yaga function. Will need a separate call type to accept aruments as is.
        if (Array.isArray(args)) args = yaga.List.new(_evaluateArray(yi, args));
        return (yaga.Wrapper.new(this.jfn(yi, args), args.parserPoint));
    },
    print(printer) {
        this._list.print(printer);
    }
});

function _evaluateArray(yi, es) {
    let arr = [];
    es.forEach(e => {
        e = e.evaluate(yi);
        if (e.isInsertable) arr = arr.concat(e.elements);
        else arr.push(e);
    });
    return (arr);
}

function _returnThis() {
    return (this);
}
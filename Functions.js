/**
 * Functions : @file
 * 
 * The Yaga function types.
 * Parameters Object:
 *  namedParameters:
 *      [ symbol | [symbol, expression] ],
 *  variableParameters: symbol,
 *  bindings:                   
 *      [ [idx value] ]       Use for creating partial functions
 */

'use strict';

var yaga, _function, _jsFunction;

module.exports = {
    Function: {
        new: _newFunction,
        jsNew: _jsNewFunction,
    },
    Macro: {
        new: _newMacro,
        jsNew: _jsNewMacro,
    },
    Initialise: (y) => yaga = yaga ? yaga : y,
};
Object.freeze(module.exports);

function _newFunction(parms, statements, point) {
    let func = Object.create(_function);
    func.parms = parms;
    func.statements = statements;
    func.value = func;
    if (point) func.parserPoint = point;
    return (func);
}

function _newMacro(parms, statements, point) {
    let mac = _newFunction(parms, statements, point);
    mac.typeName = 'Macro';
    mac.isaMacro = true;
    return (mac);
}

function _jsNewFunction(list, jfn, point) {
    let func = Object.create(_jsFunction);
    func._list = list;
    func.jfn = jfn;
    func.value = func;
    if (point) func.parserPoint = point;
    return (func);
}

function _jsNewMacro(list, jfn, point) {
    let mac = _jsNewFunction(list, jfn, point);
    mac.typeName = 'jsMacro';
    mac.isaMacro = true;
    return (mac);
}

_function = {
    typeName: 'Function',
    isaYagaType: true,
    parserPoint: undefined,
    asQuoted: _returnThis,
    asQuasiQuoted: _returnThis,
    asQuasiOverride: _returnThis,
    asQuasiInjection: _returnThis,
    isaFunction: true,
    parms: undefined,
    statements: undefined,
    value: undefined,

    bind(yi) {
        /* Add code here */
    },
    evaluate(yi) {
        return (this);
    },
    call(yi, args) {

    },
    print(printer) {
        if (this.leadSyntax) printer.printLead(this.leadSyntax);
        printer.printElement(this.value);
    }
}

_jsFunction = Object.assign(Object.create(_function), {
    typeName: 'jsFunction',
    jfn: undefined,
    _list: undefined,

    bind(yi) {
        /* Add code here */
    },
    evaluate(yi) {
        return (this);
    },
    call(yi, args) {

    },
    print(printer) {
        if (this.leadSyntax) printer.printLead(this.leadSyntax);
        printer.printElement(this.value);
    }
});

function _returnThis() {
    return (this);
}
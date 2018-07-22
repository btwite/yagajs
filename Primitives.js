/**
 * Primitives : @file
 * 
 * Yaga JavaScript primitive services.
 */

'use strict';

var yaga;

module.exports = {
    jsPrimLoader: _jsPrimLoader,
    jsDefine: _jsDefine,
    jsFunction: _jsFunction,
    jsMacro: _jsMacro,
    jsParms: _jsParms,
    jsLet: _jsLet,
    jsAdd: _jsAdd,
    jsDictName: _jsDictName,
    jsDictDependsOn: _jsDictDependsOn,
    Initialise: (y) => yaga = yaga ? yaga : y,
};
Object.freeze(module.exports);

function _jsPrimLoader(yi, list) {
    let r, arr = list.elements;
    let sReq = 'yaga';
    let fn = arr.length == 3 ? (r = this)[arr[2].value] : (r = require(sReq = arr[2].value))[arr[3].value];
    if (typeof fn !== 'function') _throw(list, `Function '${sReq}.${arr[arr.length-1].value}' could not be found`);
    fn = fn.bind(r);
    if (arr[1].value == 'macro')
        return (yaga.Function.Macro.jsNew(list, fn));
    return (yaga.Function.jsNew(list, fn))
}

function _jsDefine(yi, list) {
    let arr = list.elements;
    let val = arr[2];
    //    console.log(arr[1].value);
    if (yaga.isaYagaType(val)) val = val.bind(yi);
    yi.dictionary.define(arr[1], val);
    if (yaga.isaYagaType(val)) val = val.asQuoted(); // Must quote as being a macro the value will be rebound.
    return (yaga.Symbol.bind(arr[1], val));
}

function _jsLet(yi, list) {
    let arr = list.elements;
    let arr1 = [yaga.Symbol.List];
    for (let i = 1; i < arr.length; i++) {
        let sym = e,
            initValue = undefined,
            e = arr[i];
        if (yaga.isaYagaType(e) && e.isaList) {
            if (e.elements.length != 2) _throw(e, 'Only variable name and initial value required');
            sym = e.elements[0];
            initValue = e.elements[1];
        }
        if (!yaga.isaYagaType(sym) || !sym.isaSymbol) _throw(list, `'${sym}' is an invalid variable name`);
        let v = yaga.newVariable(sym);
        arr1.push(yaga.List.new([yaga.Symbol.opAssign, v, initValue]), v.parserPoint);
    }
    if (arr1.length == 2) arr1 = arr1[1]; // Only need a single assignment
    return (yaga.List.new(arr1, list.parserPoint, list));
}

function _jsAdd(yi, list) {
    let val, arr = list.elements;
    if (arr.length < 2) _throw(e, 'Addition requires 2 or more arguments');
    if (typeof (val = arr[0]) !== 'string' && typeof val !== 'number') throw (list, `'${val}' invalid for addition`);
    for (let i = 1; i < arr.length; i++) {
        let e = arr[i];
        if (typeof e !== 'string' && typeof e !== 'number') throw (list, `'${e}' invalid for addition`);
        val += e;
    }
    return (val);
}

function _jsDictName(yi, list) {
    let arr = list.elements;
    if (arr.length != 2 || !yaga.isaYagaType(arr[1]) || !arr[1].isaSymbol) _throw(e, 'Invalid name for a Dictionary');
    yi.setDictName(arr[1].value);
}

function _jsDictDependsOn(yi, list) {
    let name, mod, arr = list.elements;
    if (arr.length < 2 || arr.length > 3) _throw(e, 'Invalid dependency for a Dictionary');
    name = arr[arr.length - 1];
    if (arr.length == 3) mod = arr[2];
    if (typeof name !== 'string') {
        if (!yaga.isaYagaType(name) || !name.isaSymbol) _throw(e, 'Invalid dictionary name');
        name = name.value;
    }
    if (mod !== undefined && typeof mod !== 'string') {
        if (!yaga.isaYagaType(name) || !name.isaSymbol) _throw(e, 'Invalid dictionary module name');
        mod = mod.value;
    }
    yi.setDictDependsOn(name, mod);
}

function _jsFunction(yi, list) {
    return (__jsFuncType(yi, list, yaga.Function));
}

function _jsMacro(yi, list) {
    return (__jsFuncType(yi, list, yaga.Function.Macro));
}

function __jsFuncType(yi, list, fnType) {
    let arr = list.elements;
    if (arr.length != 3) _throw(list, 'Parameter list and body expression required');
    let parms = arr[1];
    if (!parms.isaYagaType) _throw(list, 'Missing parameter list');
    if (!parms.isaList) _throw(e, `'${parms.typeName}' is invalid as a parameter list`);
    return (fnType.new(__jsParms(yi, parms, (msg, e) => _throw(e ? e : arr[1], msg)), arr[2], list.parserPoint));
}

function _jsParms(yi, list) {
    let parms = __jsParms(yi, list.elements.slice[1], (msg, e) => _throw(e ? e : list, msg));
    yaga.assignParameters(parms);
    return (undefined);
}

function __jsParms(yi, args, fnErr) {
    // Parse the parameters specification.
    let prev, parms = [];
    args.forEach((arg) => {
        if (!yaga.isaYagaType(arg)) fnErr(`'${arg}' is an invalid parameter`);
        let v = __getParm(yi, arg, undefined, fnErr);
        if (prev && prev.isaVariableParameter) {
            fnErr(`Additional parameters found after variable parameter declaration`);
        }
        parms.push(prev = v);
    });
    return (parms);
}

function __getParm(yi, name, defValue, fnErr) {
    if (!yaga.isaYagaType(name)) fnErr(`'${name}' is an invalid parameter name`);
    if (name.isaList) {
        let arr = name.elements;
        if (arr.length != 2) fnErr(`Invalid defaulting parameter declaration`, list);
        return (__getParm(yi, arr[0]), arr[1], fnErr);
    }
    if (!name.isaSymbol) fnErr(`Symbol expected. Found '${arg.typeName}'`, arg);
    if (name.value.indexof('...') == 0) {
        if (name.value.length == 3) fnErr(`'...' is an invalid parameter name`, name);
        if (defValue !== undefined) fnErr(`Variable parameter cannot have a default value`, arg);
        name = yaga.Symbol.new(name.value.splice(3), name.parserPoint);
        return (yaga.Symbol.VariableParameter.new(name));
    }
    return (yaga.Symbol.Parameter.new(name, defValue));
}

function _throw(e, msg) {
    throw yaga.errors.YagaException(e, msg)
}
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
    jsCall: _jsCall,
    jsAdd: _jsAdd,
    jsMul: _jsMul,
    jsDictName: _jsDictName,
    jsDictDependsOn: _jsDictDependsOn,
    jsDefop: _jsDefop,
    jsList: _jsList,
    Initialise: (y) => yaga = yaga ? yaga : y,
};
Object.freeze(module.exports);

function _jsPrimLoader(yi, list) {
    let r, arr = list.elements;
    let sReq = 'yaga';
    let fn = arr.length == 3 ? (r = this)[arr[2].name] : (r = require(sReq = arr[2].asStri))[arr[3].name];
    if (typeof fn !== 'function') _throw(list, `Function '${sReq}.${arr[arr.length-1].name}' could not be found`);
    fn = fn.bind(r);
    if (arr[1].name == 'macro')
        return (yaga.Function.Macro.jsNew(list, fn));
    return (yaga.Function.jsNew(list, fn))
}

function _jsDefine(yi, list) {
    let arr = list.elements;
    let val = arr[2];
    //    console.log(arr[1].name);
    val = val.bind(yi).evaluate(yi);
    yi.dictionary.define(arr[1].asString(), val);
    return (yaga.Symbol.bind(arr[1], val.asQuoted())); // Must quote as being a macro the value will be rebound.
}

function _jsLet(yi, list) {
    let arr = list.elements;
    let arr1 = [yaga.Symbol.List];
    for (let i = 1; i < arr.length; i++) {
        let sym = e,
            initValue = undefined,
            e = arr[i];
        if (e.isaList) {
            if (e.elements.length != 2) _throw(e, 'Only variable name and initial value required');
            sym = e.elements[0];
            initValue = e.elements[1];
        }
        if (!sym.isaSymbol) _throw(list, `'${sym}' is an invalid variable name`);
        let v = yaga.newVariable(sym);
        arr1.push(yaga.List.new([yaga.Symbol.opAssign, v, initValue]), v.parserPoint);
    }
    if (arr1.length == 2) arr1 = arr1[1]; // Only need a single assignment
    return (yaga.List.new(arr1, list.parserPoint, list));
}

function _jsAdd(yi, list) {
    return (__jsListOp(yi, list, (v1, v2) => v1 + v2))
}

function _jsMul(yi, list) {
    return (__jsListOp(yi, list, (v1, v2) => v1 * v2))
}

function _jsCall(yi, list) {
    let es = list.elements;
    return (es[0].call(yi, es.slice(1), list.parserPoint));
}

function __jsListOp(yi, list, fnOp) {
    let arr = list.elements;
    if (arr.length < 2) _throw(list, 'Addition requires 2 or more arguments');
    let val = fnOp(arr[0].value(), arr[1].value());
    for (let i = 2; i < arr.length; i++) val = fnOp(val, arr[i].value());
    return (yaga.Wrapper.new(val, list.parserPoint));
}

function _jsList(yi, list) {
    return (list);
}

function _jsDictName(yi, list) {
    let arr = list.elements;
    if (arr.length < 2) _throw(e, 'Dictionary name required');
    yi.setDictName(arr[1].asString());
}

function _jsDictDependsOn(yi, list) {
    let name, mod, arr = list.elements;
    if (arr.length < 2 || arr.length > 3) _throw(e, 'Invalid dependency for a Dictionary');
    name = arr[arr.length - 1];
    if (arr.length == 3) {
        mod = arr[2];
        if (!mod.isaString && !mod.isaSymbol) _throw(name, 'Invalid dictionary module name');
        mod = mod.asString();
    }
    if (!name.isaString && !name.isaSymbol) _throw(name, 'Invalid dictionary name');
    yi.setDictDependsOn(name.asString(), mod);
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
        let v = __getParm(yi, arg, undefined, fnErr);
        if (prev && prev.isaVariableParameter) {
            fnErr(`Additional parameters found after variable parameter declaration`);
        }
        parms.push(prev = v);
    });
    return (parms);
}

function __getParm(yi, name, defValue, fnErr) {
    if (name.isaList) {
        let arr = name.elements;
        if (arr.length != 2) fnErr(`Invalid defaulting parameter declaration`, list);
        return (__getParm(yi, arr[0]), arr[1], fnErr);
    }
    if (!name.isaSymbol) fnErr(`Symbol expected. Found '${arg.typeName}'`, arg);
    if (name.name.indexof('...') == 0) {
        if (name.namelength == 3) fnErr(`'...' is an invalid parameter name`, name);
        if (defValue !== undefined) fnErr(`Variable parameter cannot have a default value`, arg);
        name = yaga.Symbol.new(name.name.slice(3), name.parserPoint);
        return (yaga.Symbol.VariableParameter.new(name));
    }
    return (yaga.Symbol.Parameter.new(name, defValue));
}

function _jsDefop(yi, list) {
    let arr = list.elements;
    if (arr.length < 3) _throw(arr[0], 'Invalid operator definition');
    let op = arr[1];
    if (!(op.isaString || op.isaSymbol)) _throw(op, 'Operator must be a string or symbol');
    let o = {};
    arr.slice(2).forEach(e => __jsDefop(yi, op.asString(), o, e.bind(yi).evaluate(yi)));
    let sOp = op.asString();
    if (o.list) {
        sOp = o.list.op;
        let x = yi.dictionary.findString(yi.getOperatorName(o.list.sfx));
        if (!x) {
            let wrap = yaga.Wrapper.new({
                endlist: {
                    type: 'endlist',
                    precedence: o.list.precedence,
                    direction: 'none',
                    function: undefined,
                    op: o.list.sfx,
                }
            }, arr[2].parserPoint);
            wrap.referenceList = list;
            yi.registerOperator(o.list.sfx, wrap);
        } else if (!x.isaWrapper && typeof (x = x.value()) !== 'object' && !x.endlist) _throw(op, 'List suffix is already defined');
    }
    let wrap = yaga.Wrapper.new(o, arr[2].parserPoint);
    wrap.referenceList = list;
    yi.registerOperator(sOp, wrap);
    return (undefined);
}

function __jsDefop(yi, sOp, o, spec) {
    let arr = spec.elements;
    if (arr.length != 4) _throw(spec, 'Operator spec must be (type precedence direction function');
    let type = arr[0].asString();
    if (!' prefix postfix binary list '.includes(type)) _throw(spec, "Operator type values are 'prefix', 'postfix', 'binary' and list");
    let prec = arr[1].value();
    if (typeof prec !== 'number') _throw(spec, "Operator precedence must be a number");
    let dir = arr[2].asString();
    if (!' none leftToRight rightToLeft '.includes(dir)) _throw(spec, "Operator direction values are 'none', 'leftToRight' and 'rightToLeft'");
    let fnDef = arr[3].asString();
    if (!yi.dictionary.findString(fnDef)) _throw(spec, "Operator function not found in the dictionary");

    let oSpec = {
        type: type,
        precedence: prec,
        direction: dir,
        function: fnDef,
        op: sOp,
    };
    if (type === 'list') {
        if (Object.keys(o).length > 0) _throw(spec, "List operators can only have single specification");
        // Have a list type so need to split up the operator to determine the end list sequence
        // and the number of elements the list can hold.
        // Form is <pfx> (<_>* | <...> | <_>+<...>) <sfx>
        let i, j;
        if ((i = sOp.indexOf('_')) < 0) {
            if ((i = sOp.indexOf('...')) < 0) _throw(spec, "List operator requires '_' or '...' specification");
            if (i + 3 === sOp.length) _throw(spec, "Missing list operator suffix");
            oSpec.op = sOp.substring(0, i);
            oSpec.sfx = sOp.substring(i + 3);
        } else {
            if (i === 0) _throw(spec, "Missing list operator prefix");
            for (j = i; i < sOp.length && sOp[i] === '_'; i++);
            if (i >= sOp.length) _throw(spec, "Missing list operator suffix");
            oSpec.op = sOp.substring(0, j);
            oSpec.minElements = i - j;
            if ((j = sOp.indexOf('...', i)) === i) {
                if (j + 3 === sOp.length) _throw(spec, "Missing list operator suffix");
                oSpec.sfx = sOp.substring(j + 3);
            } else {
                if (i === sOp.length) _throw(spec, "Missing list operator suffix");
                oSpec.sfx = sOp.substring(i);
                oSpec.maxElements = oSpec.minElements;
            }
            if (oSpec.direction !== 'none') _throw(spec, "Lists must have a direction of 'none'");
        }
    }
    o[type] = oSpec;
}

function _throw(e, msg) {
    throw yaga.errors.YagaException(e, msg)
}
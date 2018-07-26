/**
 * Primitives : @file
 * 
 * Yaga JavaScript primitive services.
 */

'use strict';

var yaga;

module.exports = {
    jsExprBind: _jsExprBind,
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

    // Attempted to implement quotes as operators but absolutely need to be there at parse time
    // Just comment out definitions for now as we may find a use for them later.
    //    jsQuote: _jsQuote,
    //    jsQuasiQuote: _jsQuasiQuote,
    //    jsQuasiOverride: _jsQuasiOverride,
    //    jsQuasiInjection: _jsQuasiInjection,
};
Object.freeze(module.exports);

let _bindMap = new WeakMap();

function _jsExprBind(yi, list) {
    // Handles the js expression extensions such as "_->[_]". This has been implemented in
    // JS until we have further yaga functionality implemented.
    // Note that we anwser a partial native function object to handle call variants
    let es = list.elements;
    if (es.length != 2) _throw(list, 'Two arguments required');
    let fn;
    if (es[1].isaSymbol) {
        // _->method variant
        let s = es[1].name;
        fn = yaga.Function.jsNewNative((that) => {
            return (_resolveBinding(that, that[s]));
        });
        fn = fn.call(yi, [yaga.Symbol.none()]);
    } else {
        // Has to be _->[_] variant
        if (!es[1].isaList) _throw(list, 'Invalid syntax structure')
        fn = yaga.Function.jsNewNative((that, f) => {
            return (_resolveBinding(that, f));
        });
        fn = fn.call(yi, [yaga.Symbol.none(), yaga.Symbol.none()]);
    }
    return (fn);
}

function _resolveBinding(that, fn) {
    let map = _bindMap.get(that);
    let bf = map && map.get(fn);
    if (!bf) {
        bf = fn.bind(that);
        if (!map) _bindMap.set(that, (map = new WeakMap()));
        map.set(fn, bf);
    }
    return (bf)
}

function _jsPrimLoader(yi, list) {
    let r, es = list.elements;
    let sReq = 'yaga';
    let fn = es.length == 2 ? (r = this)[es[1].name] : (r = require(sReq = es[1].name))[es[2].name];
    if (typeof fn !== 'function') _throw(list, `Function '${sReq}.${es[es.length-1].name}' could not be found`);
    fn = fn.bind(r);
    if (es[0].name === 'macro')
        return (yaga.Function.Macro.jsNew(es.slice(1), fn));
    return (yaga.Function.jsNew(es.slice(1), fn))
}

function _jsDefine(yi, list) {
    let es = list.elements;
    if (es.length != 2) _throw(list, `'define' requires a name and a value`);
    let val = es[1];
    //    console.log(es[0].name);
    val = val.bind(yi).evaluate(yi);
    yi.dictionary.define(es[0].asString(), val);
    return (yaga.Symbol.bind(es[0], val.asQuoted())); // Must quote as being a macro the value will be rebound.
}

function _jsLet(yi, list) {
    let es = list.elements;
    let arr = [yaga.Symbol.List];
    for (let i = 0; i < es.length; i++) {
        let sym = e,
            initValue = undefined,
            e = es[i];
        if (e.isaList) {
            if (e.elements.length != 2) _throw(e, 'Only variable name and initial value required');
            sym = e.elements[0];
            initValue = e.elements[1];
        }
        if (!sym.isaSymbol) _throw(list, `'${sym}' is an invalid variable name`);
        let v = yaga.newVariable(sym);
        arr.push(yaga.List.new([yaga.Symbol.opAssign, v, initValue]), v.parserPoint);
    }
    if (arr.length == 2) arr = arr[1]; // Only need a single assignment
    return (yaga.List.new(arr, list.parserPoint, list));
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
    let es = list.elements;
    if (es.length < 2) _throw(list, 'Two or more arguments required');
    let val = fnOp(es[0].value(), es[1].value());
    for (let i = 2; i < es.length; i++) val = fnOp(val, es[i].value());
    return (yaga.Wrapper.new(val, list.parserPoint));
}

function _jsList(yi, list) {
    return (list);
}

function _jsDictName(yi, list) {
    let es = list.elements;
    if (es.length < 1) _throw(e, 'Dictionary name required');
    yi.setDictName(es[0].asString());
}

function _jsDictDependsOn(yi, list) {
    let name, mod, es = list.elements;
    if (es.length < 1 || es.length > 2) _throw(e, 'Invalid dependency for a Dictionary');
    name = es[es.length - 1];
    if (es.length == 2) {
        mod = es[1];
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
    let es = list.elements;
    if (es.length != 2) _throw(list, 'Parameter list and body expression required');
    let parms = es[0];
    if (!parms.isaList) _throw(e, `'${parms.typeName}' is invalid as a parameter list`);
    return (fnType.new(__jsParms(yi, parms, (msg, e) => _throw(e ? e : es[0], msg)), es[1], list.parserPoint));
}

// Quote primitives may not be useful but will just leave for the moment.
function _jsQuote(yi, list) {
    return __jsQuote(yi, list, 'Quote', e => e.asQuoted());
}

function _jsQuasiQuote(yi, list) {
    return __jsQuote(yi, list, 'QuasiQuote', e => e.asQuasiQuoted());
}

function _jsQuasiOverride(yi, list) {
    return __jsQuote(yi, list, 'QuasiOverride', e => e.asQuasiOverride());
}

function _jsQuasiInjection(yi, list) {
    return __jsQuote(yi, list, 'QuasiInjection', e => e.asQuasiInjection());
}

function __jsQuote(yi, list, type, fn) {
    let es = list.elements;
    if (es.length != 1) _throw(list, `${type} requires one argument`);
    return (fn(es[0]));
}

function _jsParms(yi, list) {
    let parms = __jsParms(yi, list.elements, (msg, e) => _throw(e ? e : list, msg));
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
        let es = name.elements;
        if (es.length != 2) fnErr(`Invalid defaulting parameter declaration`, list);
        return (__getParm(yi, es[0]), es[1], fnErr);
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
    let es = list.elements;
    if (es.length < 2) _throw(es[0], 'Invalid operator definition');
    let op = es[0];
    if (op.isaList) {
        // Assume we have an expression that we need to bind to get the result
        // For example (.quote ') to define the quote operator
        op = op.bind(yi);
    }
    if (!(op.isaString || op.isaSymbol)) _throw(op, 'Operator must be a string or symbol');
    let o = {};
    es.slice(1).forEach(e => __jsDefop(yi, op.asString(), o, e.bind(yi).evaluate(yi)));
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
            }, es[1].parserPoint);
            wrap.referenceList = list;
            yi.registerOperator(o.list.sfx, wrap);
        } else if (!x.isaWrapper && typeof (x = x.value()) !== 'object' && !x.endlist) _throw(op, 'List suffix is already defined');
    }
    let wrap = yaga.Wrapper.new(o, es[1].parserPoint);
    wrap.referenceList = list;
    yi.registerOperator(sOp, wrap);
    return (undefined);
}

function __jsDefop(yi, sOp, o, spec) {
    let es = spec.elements;
    if (es.length != 4) _throw(spec, 'Operator spec must be (type precedence direction function');
    let type = es[0].asString();
    if (!' prefix postfix binary list connector '.includes(type)) _throw(spec, "Operator types are 'prefix', 'postfix', 'binary', 'connector' and 'list'");
    let prec = es[1].value();
    if (typeof prec !== 'number') _throw(spec, "Operator precedence must be a number");
    let dir = es[2].asString();
    if (!' none leftToRight rightToLeft '.includes(dir)) _throw(spec, "Operator direction values are 'none', 'leftToRight' and 'rightToLeft'");
    let fnDef = es[3].asString();
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
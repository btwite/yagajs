/**
 * Primitives : @file
 * 
 * Yaga JavaScript primitive services.
 */

'use strict';

let _ = undefined;

var Mach;

module.exports = Object.freeze({
    jsExprBind,
    jsPrimLoader,
    jsDefine,
    jsFunction,
    jsMacro,
    jsParms,
    jsLet,
    jsCall,
    jsAdd,
    jsMul,
    jsDictName,
    jsDictDependsOn,
    jsDefop,
    jsList,
    Initialise: x => Mach = x,

    // Attempted to implement quotes as operators but absolutely need to be there at parse time
    // Just comment out definitions for now as we may find a use for them later.
    //    jsQuote,
    //    jsQuasiQuote,
    //    jsQuasiOverride,
    //    jsQuasiInjection,
});

let BindMap = new WeakMap();

function jsExprBind(ymc, list) {
    // Handles the js expression extensions such as "_->[_]". This has been implemented in
    // JS until we have further yaga functionality implemented.
    // Note that we anwser a partial native function object to handle call variants
    let es = list.elements;
    if (es.length != 2) _throw(list, 'Two arguments required');
    let fn;
    if (es[1].isaSymbol) {
        // _->method variant
        let s = es[1].name;
        fn = Mach.Function.jsNativeFunction(that => {
            return (resolveBinding(that, that[s]));
        });
        fn = fn.call(ymc, [Mach.Symbol.none()]);
    } else {
        // Has to be _->[_] variant
        if (!es[1].isaList) _throw(list, 'Invalid syntax structure')
        fn = Mach.Function.jsNativeFunction((that, f) => {
            return (resolveBinding(that, f));
        });
        fn = fn.call(ymc, [Mach.Symbol.none(), Mach.Symbol.none()]);
    }
    return (fn);
}

function resolveBinding(that, fn) {
    let map = BindMap.get(that);
    let bf = map && map.get(fn);
    if (!bf) {
        bf = fn.bind(that);
        if (!map) BindMap.set(that, (map = new WeakMap()));
        map.set(fn, bf);
    }
    return (bf)
}

function jsPrimLoader(ymc, list) {
    let r, es = list.elements;
    let sReq = 'yaga';
    let fn = es.length == 2 ? (r = this)[es[1].name] : (r = require(sReq = es[1].name))[es[2].name];
    if (typeof fn !== 'function') _throw(list, `Function '${sReq}.${es[es.length-1].name}' could not be found`);
    fn = fn.bind(r);
    if (es[0].name === 'macro')
        return (Mach.Function.jsMacro(fn, es.slice(1), es[0].readPoint));
    return (Mach.Function.jsFunction(fn, es.slice(1), es[0].readPoint))
}

function jsDefine(ymc, list) {
    let es = list.elements;
    if (es.length != 2) _throw(es.length > 0 ? es[0] : list, `'define' requires a name and a value`);
    let val = es[1];
    //    console.log(es[0].name);
    val = val.bind(ymc).evaluate(ymc);
    ymc.gd.define(es[0].asString(), val);
    return (Mach.Symbol.bind(es[0], val.asQuoted())); // Must quote as being a macro the value will be rebound.
}

function jsLet(ymc, list) {
    let es = list.elements;
    let arr = [Mach.Symbol.symList];
    for (let i = 0; i < es.length; i++) {
        let sym = e,
            initValue = _,
            e = es[i];
        if (e.isaList) {
            if (e.elements.length != 2) _throw(e, 'Only variable name and initial value required');
            sym = e.elements[0];
            initValue = e.elements[1];
        }
        if (!sym.isaSymbol) _throw(list, `'${sym}' is an invalid variable name`);
        let v = Mach.Symbol.Variable(sym);
        arr.push(Mach.List([Mach.Symbol.symAssign, v, initValue]), v.readPoint);
    }
    if (arr.length == 2) arr = arr[1]; // Only need a single assignment
    return (Mach.List(arr, list.readPoint, list));
}

function jsAdd(ymc, list) {
    return (_jsListOp(ymc, list, (v1, v2) => v1 + v2))
}

function jsMul(ymc, list) {
    return (_jsListOp(ymc, list, (v1, v2) => v1 * v2))
}

function jsCall(ymc, list) {
    let es = list.elements;
    return (es[0].call(ymc, es.slice(1), list.readPoint));
}

function _jsListOp(ymc, list, fnOp) {
    let es = list.elements;
    if (es.length < 2) _throw(list, 'Two or more arguments required');
    let val = fnOp(es[0].value(), es[1].value());
    for (let i = 2; i < es.length; i++) val = fnOp(val, es[i].value());
    return (Mach.Wrapper(val, list.readPoint));
}

function jsList(ymc, list) {
    return (list);
}

function jsDictName(ymc, list) {
    let es = list.elements;
    if (es.length < 1) _throw(e, 'Dictionary name required');
    ymc.setDictName(es[0].asString());
}

function jsDictDependsOn(ymc, list) {
    let name, paths = [],
        es = list.elements;
    if (es.length < 2) _throw(e, 'Missing Dictionary dependency paths');
    name = es[0];
    if (!name.isaString && !name.isaSymbol) _throw(name, 'Invalid dictionary name');
    for (let i = 1; i < es.length; i++) {
        let path = es[i];
        if (!path.isaString) _throw(path, 'Invalid dictionary path');
        paths.push(path.asString());
    }
    ymc.setDictDependsOn(name.asString(), paths);
}

function jsFunction(ymc, list) {
    return (_jsFuncType(ymc, list, Mach.Function));
}

function jsMacro(ymc, list) {
    return (_jsFuncType(ymc, list, Mach.Function.Macro));
}

function _jsFuncType(ymc, list, fnType) {
    let es = list.elements;
    if (es.length != 2) _throw(list, 'Parameter list and body expression required');
    let parms = es[0];
    if (!parms.isaList) _throw(e, `'${parms.typeName}' is invalid as a parameter list`);
    return (fnType(_jsParms(ymc, parms, (msg, e) => _throw(e ? e : es[0], msg)), es[1], list.readPoint));
}

// Quote primitives may not be useful but will just leave for the moment.
function jsQuote(ymc, list) {
    return _jsQuote(ymc, list, 'Quote', e => e.asQuoted());
}

function jsQuasiQuote(ymc, list) {
    return _jsQuote(ymc, list, 'QuasiQuote', e => e.asQuasiQuoted());
}

function jsQuasiOverride(ymc, list) {
    return _jsQuote(ymc, list, 'QuasiOverride', e => e.asQuasiOverride());
}

function jsQuasiInjection(ymc, list) {
    return _jsQuote(ymc, list, 'QuasiInjection', e => e.asQuasiInjection());
}

function _jsQuote(ymc, list, type, fn) {
    let es = list.elements;
    if (es.length != 1) _throw(list, `${type} requires one argument`);
    return (fn(es[0]));
}

function jsParms(ymc, list) {
    let parms = _jsParms(ymc, list.elements, (msg, e) => _throw(e ? e : list, msg));
    Mach.assignParameters(ymc, parms);
    return (undefined);
}

function _jsParms(ymc, args, fnErr) {
    // Parse the parameters specification.
    let prev, parms = [];
    args.forEach((arg) => {
        let v = _getParm(ymc, arg, undefined, fnErr);
        if (prev && prev.isaVariableParameter) {
            fnErr(`Additional parameters found after variable parameter declaration`);
        }
        parms.push(prev = v);
    });
    return (parms);
}

function _getParm(ymc, name, defValue, fnErr) {
    if (name.isaList) {
        let es = name.elements;
        if (es.length != 2) fnErr(`Invalid defaulting parameter declaration`, list);
        return (_getParm(ymc, es[0]), es[1], fnErr);
    }
    if (!name.isaSymbol) fnErr(`Symbol expected. Found '${arg.typeName}'`, arg);
    if (name.name.indexof('...') == 0) {
        if (name.namelength == 3) fnErr(`'...' is an invalid parameter name`, name);
        if (defValue !== undefined) fnErr(`Variable parameter cannot have a default value`, arg);
        name = Mach.Symbol(name.name.slice(3), name.readPoint);
        return (Mach.Symbol.VariableParameter(name));
    }
    return (Mach.Symbol.Parameter(name, defValue));
}

function jsDefop(ymc, list) {
    let es = list.elements;
    if (es.length < 2) _throw(es[0], 'Invalid operator definition');
    let op = es[0];
    if (op.isaList) {
        // Assume we have an expression that we need to bind to get the result
        // For example (.quote ') to define the quote operator
        op = op.bind(ymc);
    }
    if (!(op.isaString || op.isaSymbol)) _throw(op, 'Operator must be a string or symbol');
    let o = {};
    es.slice(1).forEach(e => _jsDefop(ymc, op.asString(), o, e.bind(ymc).evaluate(ymc)));
    let sOp = op.asString();
    if (o.list) {
        sOp = o.list.op;
        let x = ymc.gd.find(ymc.getOperatorName(o.list.sfx));
        if (!x) {
            let wrap = Mach.Wrapper({
                endlist: {
                    type: 'endlist',
                    precedence: o.list.precedence,
                    direction: 'none',
                    function: _,
                    op: o.list.sfx,
                }
            }, es[1].readPoint);
            wrap.referenceList = list;
            ymc.registerOperator(o.list.sfx, wrap);
        } else if (!x.isaWrapper && typeof (x = x.value()) !== 'object' && !x.endlist) _throw(op, 'List suffix is already defined');
    }
    let wrap = Mach.Wrapper(o, es[1].readPoint);
    wrap.referenceList = list;
    ymc.registerOperator(sOp, wrap);
    return (_);
}

function _jsDefop(ymc, sOp, o, spec) {
    let es = spec.elements;
    if (es.length != 4) _throw(spec, 'Operator spec must be (type precedence direction function');
    let type = es[0].asString();
    if (!' prefix postfix binary list connector '.includes(type)) _throw(spec, "Operator types are 'prefix', 'postfix', 'binary', 'connector' and 'list'");
    let prec = es[1].value();
    if (typeof prec !== 'number') _throw(spec, "Operator precedence must be a number");
    let dir = es[2].asString();
    if (!' none leftToRight rightToLeft '.includes(dir)) _throw(spec, "Operator direction values are 'none', 'leftToRight' and 'rightToLeft'");
    let fnDef = es[3].asString();
    if (!ymc.gd.find(fnDef)) _throw(spec, "Operator function not found in the dictionary");

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
    throw Mach.Error.YagaException(e, msg)
}
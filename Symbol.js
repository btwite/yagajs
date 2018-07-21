/**
 * Symbol : @file
 * 
 * Yaga symbol objects.
 */

'use strict';

var yaga;

module.exports = {
    new: _newSymbol,
    Variable: {
        new: _newVariable,
    },
    Parameter: {
        new: _newParameter,
    },
    VariableParameter: {
        new: _newVarParm,
    },
    bind: _bindSymbol,
    none: _none,
    List: undefined,
    opAssign: undefined,
    Initialise: (y) => {
        yaga = yaga ? yaga : y;
    },
    PostInitialise() {
        _symbol.parserPoint = yaga.Parser.defaultParserPoint;
        this.List = _newSymbol('List');
        this.opAssign = _newSymbol('=');
    },
};
Object.freeze(module.exports);

function _newSymbol(symName, optPoint) {
    if (typeof symName !== 'string') symName = symName.toString(); // Handle StringBuilder case.
    let sym = Object.create(_symbol);
    sym.value = symName;
    sym.reference = sym;
    if (optPoint)
        sym.parserPoint = optPoint;
    return (sym);
}

function _newParameter(sym, defaultValue) {
    let parm = Object.assign(Object.create(sym), {
        typeName: 'Parameter',
        isaParameter: true,
        idxClosure: undefined,
        idx: undefined,
        bind: _returnThis,
        evaluate(yi) {
            return (yi.context.argLists[this.idxClosure][this.idx]);
        },
        write(yi, val) {
            throw yaga.errors.YagaException(this, `Parameter '${this.value}' is read-only`);
        }
    });
    if (defaultValue !== undefined) parm.defaultValue = defaultValue;
    return (parm);
}

function _newVarParm(sym) {
    let parm = _newParameter(sym);
    parm.typeName = 'VariableParameter';
    parm.isaVariableParameter: true;
    parm.evaluate = function (yi) {
        // needs to be changed
        return (yi.context.argLists[this.idxClosure][this.idx]);
    };
    return (parm);
}

function _newVariable(boundFnType, sym) {
    let v = Object.assign(Object.create(sym), {
        typeName: 'Variable',
        isaVariable: true,
        idxClosure: undefined,
        idx: undefined,
        bind: _returnThis,
        evaluate(yi) {
            return (yi.context.curClosure[this.value]);
        },
        write(yi, val) {
            return (yi.context.closures[this.idxClosure][this.value] = val);
        }
    });
    boundFnType.addVariable(v);
    return (v);
}

function _newReference(v) {
    let r = Object.create(v);
    r.typeName = 'Reference';
    r.parserPoint = sym.parserPoint;
    return (r);
}

function _none(optPoint) {
    let none = _newsymbol('_', optPoint);
    none.typeName = 'None';
    none.isNone = true;
    return (none);
}

function _bindSymbol(sym, val) {
    if (!val || !val.isaYagaType) val = yaga.Wrapper.new(val, sym.parserPoint);
    return (Object.assign(Object.create(val), {
        _symbol: sym,
        bind: _returnThis,
        evaluate: _returnThis,
        print(printer) {
            return (this._symbol.print(printer));
        }
    }));
}

var _symbol = {
    typeName: 'Symbol',
    value: '<Unknown>',
    isaYagaType: true,
    parserPoint: undefined,
    reference: undefined,
    asQuoted: _asQuoted,
    asQuasiQuoted: _asQuasiQuoted,
    asQuasiOverride: _asQuasiOverride,
    asQuasiInjection: _asQuasiInjection,
    isaSymbol: true,
    isQuoted: false,
    isQuasiOverride: false,
    isQuasiInjection: false,
    leadSyntax: undefined,
    bind(yi) {
        // Check if the Symbol is in the closures
        let v = yi.binder.curDesc.varMap[this.value];
        if (v) return (_newReference(v))
        // Now try the Dictionaries.
        let expr = yi.dictionary.find(this);
        if (expr) return (_bindSymbol(this, expr));
        throw yaga.errors.BindException(this, `'${this.value}' is not declared or defined`);
    },
    evaluate(yi) {
        return (this);
    },
    write(yi, val) {
        throw yaga.errors.YagaException(this, 'Can only write to variables');
    }
    print(printer) {
        if (this.leadSyntax) printer.printLead(this.leadSyntax);
        printer.printElement(this.value);
    }
};

function _asQuoted() {
    let sym = Object.create(this);
    sym.typeName = 'QuotedSymbol';
    sym.isQuoted = true;
    sym.leadSyntax = '\'';
    sym.bind = function (yi) {
        return (Object.getPrototypeOf(sym));
    };
    sym.evaluate = function (yi) {
        return (this);
    }
    return (sym);
}

function _asQuasiQuoted() {
    let sym = this.asQuoted();
    sym.leadSyntax = '`';
    sym.evaluate = function (yi) {
        return (this);
    }
    return (sym);
}

// May change bind so that parent list is passed to handle quasi overrides rather than the parent having
// to check every element.
function _asQuasiOverride() {
    let sym = Object.create(this);
    sym.typeName = 'QuasiOverrideSymbol';
    sym.isQuasiOverride = true;
    sym.leadSyntax = ',';
    sym.bind = function (yi) {
        return (Object.getPrototypeOf(this).bind(yi))
    };
    sym.evaluate = function (yi) {
        return (this);
    }
    return (sym);
}

function _asQuasiInjection() {
    let sym = this.asQuasiOverride();
    sym.typeName = 'QuasiInjectionSymbol';
    sym.isQuasiInjection = true;
    sym.leadSyntax = ',@';
    sym.bind = function (yi) {
        return (Object.getPrototypeOf(this).bind(yi))
    };
    return (sym);
}

function _returnThis() {
    return (this);
}
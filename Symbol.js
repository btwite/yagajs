/**
 * Symbol : @file
 * 
 * Yaga symbol objects.
 */

'use strict';

const Operators = '`~!@#$%^&*_-+=|\:;"\'<,>.?/';
var yaga, _symbol;

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
    Initialise: y => yaga = yaga ? yaga : y,
    PostInitialise() {
        yaga.newType(_symbol);
        _symbol.parserPoint = yaga.Parser.defaultParserPoint;
        this.List = _newSymbol('List');
        this.opAssign = _newSymbol('=');
        Object.freeze(this);
    },
};

function _newSymbol(symName, optPoint) {
    if (typeof symName !== 'string') symName = symName.toString(); // Handle StringBuilder case.
    let sym = Object.create(_symbol);
    sym.name = symName;
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
            throw yaga.errors.YagaException(this, `Parameter '${this.name}' is read-only`);
        }
    });
    if (defaultValue !== undefined) parm.defaultValue = defaultValue;
    return (parm);
}

function _newVarParm(sym) {
    let parm = _newParameter(sym);
    parm.typeName = 'VariableParameter';
    parm.isaVariableParameter = true;
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
            return (yi.context.curClosure[this.name]);
        },
        write(yi, val) {
            return (yi.context.closures[this.idxClosure][this.name] = val);
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
    return (Object.assign(Object.create(val), {
        _symbol: sym,
        bind: _returnThis,
        evaluate(yi) {
            return (Object.getPrototypeOf(this).evaluate(yi))
        },
        print(printer) {
            return (this._symbol.print(printer));
        }
    }));
}

_symbol = {
    typeName: 'Symbol',
    value() {
        return (`Symbol(${this.name})`);
    },
    name: undefined,
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
        let varMap = yi.binder.curDesc.varMap;
        let v = varMap && varMap[this.name];
        if (v) return (_newReference(v))
        // Now try the Dictionaries.
        let expr = yi.dictionary.find(this);
        if (expr !== undefined) return (_bindSymbol(this, expr));
        // Failed, try pulling the symbol token apart and look for operators that we can split the token
        // up by.
        throw yaga.errors.BindException(this, `'${this.name}' is not declared or defined`);
    },
    evaluate(yi) {
        return (this.bind(yi).evaluate(yi));
    },
    write(yi, val) {
        throw yaga.errors.YagaException(this, 'Can only write to variables');
    },
    asString() {
        return (this.name)
    },
    print(printer) {
        if (this.leadSyntax) printer.printLead(this.leadSyntax);
        printer.printElement(this.name);
    }
};

function _splitToken(yi, s, point) {
    // Try and split the token up by know operators. Operator reduction is from the end to the front
    // shifting the front up on each failed pass.
    for (let i = 0, iFromt = 0; i < s.length; i++) {
        if (Operators.includes(s[i]) {
                // Determine the end of this operator character sequence
                for (let j = i + 1; j < s.length && Operators.includes(s[j]); j++);
                let opSeq = s.substr(i, j - i);
                for (j = 0; j < opSeq.length; j++) {
                    let op = _findOperator(yi, opSeq);
                    if (!op) continue;

                }
            }
        }
    }

    function _asQuoted() {
        let sym = Object.create(this);
        sym.typeName = 'QuotedSymbol';
        sym.isQuoted = true;
        sym.leadSyntax = '\'';
        sym.bind = _returnThis;
        sym.evaluate = _returnPrototype;
        return (sym);
    }

    function _asQuasiQuoted() {
        let sym = this.asQuoted();
        sym.leadSyntax = '`';
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
            let sym = Object.getPrototypeOf(this);
            return (_newBoundQuasiOverride(sym, sym.bind(yi)));
        };
        sym.evaluate = function (yi) {
            throw new yaga.errors.YagaException(this, "Misplaced quasi override");
        }
        return (sym);
    }

    function _newBoundQuasiOverride(sym, val) {
        let bind = _bindSymbol(sym, val);
        bind.isQuasiOverride = true;
        return (bind);
    }

    function _asQuasiInjection() {
        let sym = this.asQuasiOverride();
        sym.typeName = 'QuasiInjectionSymbol';
        sym.isQuasiInjection = true;
        sym.leadSyntax = ',@';
        sym.bind = function (yi) {
            let sym = Object.getPrototypeOf(this);
            return (_newBoundQuasiInjection(sym, sym.bind(yi)));
        };
        sym.evaluate = function (yi) {
            throw new yaga.errors.YagaException(this, "Misplaced quasi override");
        }
        return (sym);
    }

    function _newBoundQuasiInjection(sym, val) {
        let bind = _newBoundQuasiOverride(sym, val);
        bind.isQuasiInjection = true;
        bind.evaluate = function (yi) {
            let e = Object.getPrototypeOf(this).evaluate(yi);
            if (e.isaList) e = yaga.List.newInsertable(e.elements, e.parserPoint);
            return (e)
        };
        return (bind);
    }

    function _returnThis() {
        return (this);
    }

    function _returnPrototype() {
        return (Object.getPrototypeOf(this));
    }
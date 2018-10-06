/**
 * Symbol : @file
 * 
 * Yaga symbol objects.
 */

'use strict';

let _ = undefined;

var Yaga = require('../Yaga');
var Common = require('./Common').Common;
var Mach, SymList, SymAssign;

let Symbol = Yaga.Influence({
    name: 'yaga.machine.Symbol',
    composition: [{
        prototype: {
            thisArg_: {
                asQuoted,
                asQuasiQuoted,
                asQuasiOverride,
                asQuasiInjection,
            },
            isBindable(ymc) {
                // Check if the Symbol is in the closures
                let varMap = ymc.binder.curDesc.varMap;
                let v = varMap && varMap[this.name];
                if (v) return (v)
                // Now try the Dictionaries.
                return (ymc.gd.find(this));
            },
            bind(ymc) {
                let binding = this.isBindable(ymc);
                if (!binding) return (UnboundSymbol.create(this));
                if (binding.isDeclared) return (Reference.create(v));
                return (_bindSymbol(this, binding));
            },
            evaluate(ymc) {
                return (this.bind(ymc).evaluate(ymc));
            },
            write(ymc, val) {
                throw yaga.errors.YagaException(this, 'Can only write to variables');
            },
            asString() {
                return (this.name)
            },
            print(printer) {
                if (this.leadSyntax) printer.printLead(this.leadSyntax);
                printer.printElement(this.name);
            },
            value() {
                return (`Symbol(${this.name})`);
            },
            isQuoted: false,
            isQuasiQuoted: false,
            isQuasiOverride: false,
            isQuasiInjection: false,
            leadSyntax: _,
            trailSyntax: _,
        },
        constructor(symName, readPoint) {
            if (typeof symName !== 'string')
                symName = symName.toString(); // Handle StringBuilder case.
            this.name = symName;
            this.reference = this;
            this.readPoint = readPoint || Yaga.Reader.ReadPoint.default;
        },
        static: {
            get Token() {
                return (Token.create);
            },
            Variable,
            Parameter,
            VariableParameter,
            Operator,
            bind: bindSymbol,
            none,
            get symList() {
                return (SymList);
            },
            get symAssign() {
                return (SymAssign);
            }
        }
    }, Common],
    harmonizers: '.most.'
});

module.exports = {
    Symbol: Symbol.create,
    Initialise: x => Mach = x,
    PostInitialise() {
        SymList = Symbol.create('List');
        SymAssign = Symbol.create('=');
        Object.freeze(this);
    },
};

function _newOperator(symName, specs, optPoint) {
    let sym = _newSymbol(symName, optPoint);
    sym = _newUnboundSymbol(sym);
    sym.isanOperator = true;
    sym.specs = specs;
    sym._unboundMessage = function () {
        return (`Incorrect placement of operator '${sym.name}'`);
    };
    return (sym);
}

function _newParameter(sym, defaultValue) {
    let parm = Object.assign(Object.create(sym), {
        typeName: 'Parameter',
        isaParameter: true,
        isDeclared: true,
        idxClosure: undefined,
        idx: undefined,
        isBindable: () => true,
        bind: _returnThis,
        evaluate(ymc) {
            return (ymc.context.argLists[this.idxClosure][this.idx]);
        },
        write(ymc, val) {
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
    parm.evaluate = function (ymc) {
        // needs to be changed
        return (ymc.context.argLists[this.idxClosure][this.idx]);
    };
    return (parm);
}

function _newVariable(boundFnType, sym) {
    let v = Object.assign(Object.create(sym), {
        typeName: 'Variable',
        isaVariable: true,
        isDeclared: true,
        idxClosure: undefined,
        idx: undefined,
        isBindable: () => true,
        bind: _returnThis,
        evaluate(ymc) {
            return (ymc.context.curClosure[this.name]);
        },
        write(ymc, val) {
            return (ymc.context.closures[this.idxClosure][this.name] = val);
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
    let none = _newSymbol('_', optPoint);
    none.typeName = 'None';
    none.isNone = true;
    none.isBindable = () => true;
    none.bind = _returnThis;
    none.evaluate = _returnThis;
    return (none);
}

function _bindSymbol(sym, val) {
    return (Object.assign(Object.create(val), {
        _symbol: sym,
        bind: _returnThis,
        evaluate(ymc) {
            return (Object.getPrototypeOf(this).evaluate(ymc))
        },
        print(printer) {
            return (this._symbol.print(printer));
        }
    }));
}

function _newUnboundSymbol(sym) {
    sym = Object.create(sym);
    sym.typeName = 'UnboundSymbol';
    sym.isUnbound = true;
    sym.bind = _returnThis;

    sym._unboundMessage = function () {
        return (`'${sym.name}' is not declared or defined`);
    };
    sym.evaluate = function (ymc) {
        throw yaga.errors.YagaException(this, this._unboundMessage());
    };
    sym.raiseError = function (ymc) {
        ymc.addError(this, this._unboundMessage());
        return (this);
    };
    return (sym)
}

function _asQuoted() {
    let sym = Object.create(this);
    sym.typeName = 'QuotedSymbol';
    sym.isQuoted = true;
    sym.leadSyntax = '\'';
    sym.isBindable = () => false;
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
    sym.bind = function (ymc) {
        let sym = Object.getPrototypeOf(this);
        return (_newBoundQuasiOverride(sym, sym.bind(ymc)));
    };
    sym.evaluate = function (ymc) {
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
    sym.bind = function (ymc) {
        let sym = Object.getPrototypeOf(this);
        return (_newBoundQuasiInjection(sym, sym.bind(ymc)));
    };
    sym.evaluate = function (ymc) {
        throw new yaga.errors.YagaException(this, "Misplaced quasi override");
    }
    return (sym);
}

function _newBoundQuasiInjection(sym, val) {
    let bind = _newBoundQuasiOverride(sym, val);
    bind.isQuasiInjection = true;
    bind.evaluate = function (ymc) {
        let e = Object.getPrototypeOf(this).evaluate(ymc);
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
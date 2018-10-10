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
                if (!binding) return (UnboundSymbol(this));
                if (binding.isDeclared) return (Reference(v));
                return (bindSymbol(this, binding));
            },
            evaluate(ymc) {
                return (this.bind(ymc).evaluate(ymc));
            },
            write(ymc, val) {
                throw Mach.Error.YagaException(this, 'Can only write to variables');
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

var Token = Yaga.Influence({
    name: 'yaga.machine.Token',
    composition: [{
        abstract: {
            isaSymbol: true,
            add(ch) {
                this.name += ch;
            },
            nextReadPoint() {
                return (readPoint.increment(this.name.length));
            },
        },
    }, Symbol],
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

function Operator(symName, specs, readPoint) {
    let sym = Symbol.create(symName, readPoint);
    sym = UnboundSymbol(sym);
    sym.isanOperator = true;
    sym.specs = specs;
    sym.unboundMessage = function () {
        return (`Incorrect placement of operator '${sym.name}'`);
    };
    return (sym);
}

function Parameter(sym, defaultValue) {
    return (sym.extend({
        typeName: 'yaga.machine.Parameter',
        isaParameter: true,
        isDeclared: true,
        idxClosure: undefined,
        idx: undefined,
        defaultValue,
        isBindable: () => true,
        bind: returnThis,
        evaluate(ymc) {
            return (ymc.context.argLists[this.idxClosure][this.idx]);
        },
        write(ymc, val) {
            throw Mach.Error.YagaException(this, `Parameter '${this.name}' is read-only`);
        }
    }));
}

function VariableParameter(sym) {
    let parm = Parameter(sym);
    parm.typeName = 'yaga.machine.VariableParameter';
    parm.isaVariableParameter = true;
    parm.evaluate = function (ymc) {
        // needs to be changed
        return (ymc.context.argLists[this.idxClosure][this.idx]);
    };
    return (parm);
}

function Variable(boundFnType, sym) {
    let v = sym.extend({
        typeName: 'yaga.machine.Variable',
        isaVariable: true,
        isDeclared: true,
        idxClosure: undefined,
        idx: undefined,
        isBindable: () => true,
        bind: returnThis,
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

function Reference(v) {
    let r = Object.create(v);
    r.typeName = 'yaga.machine.Reference';
    r.readPoint = sym.readPoint;
    return (r);
}

function none(readPoint) {
    return (Symbol.create('_', readPoint).assign({
        typeName: 'yaga.machine.None',
        isNone: true,
        isBindable: () => true,
        bind: returnThis,
        evaluate: returnThis,
    }));
}

function bindSymbol(sym, val) {
    return (Yaga.assign({
        symbol: sym,
        bind: returnThis,
        evaluate(ymc) {
            return (returnRelated(this).evaluate(ymc))
        },
        print(printer) {
            return (this.symbol.print(printer));
        }
    }, Object.create(val)));
}

function UnboundSymbol(sym) {
    return (sym.extend({
        typeName: 'yaga.machine.UnboundSymbol',
        isUnbound: true,
        bind: returnThis,
        unboundMessage() {
            return (`'${sym.name}' is not declared or defined`);
        },
        evaluate(ymc) {
            throw Mach.Error.YagaException(this, this.unboundMessage());
        },
        raiseError(ymc) {
            ymc.addError(this, this.unboundMessage());
            return (this);
        }
    }));
}

function asQuoted(sym, leadSeq = '\'') {
    return (sym.extend({
        typeName: 'yaga.machine.QuotedSymbol',
        isQuoted: true,
        leadSyntax: leadSeq,
        isBindable: () => false,
        bind: returnThis,
        evaluate: Yaga.thisArg(returnRelated),
    }));
}

function asQuasiQuoted(sym) {
    return (sym.asQuoted('`'));
}

// May change bind so that parent list is passed to handle quasi overrides rather than the parent having
// to check every element.
function asQuasiOverride(sym) {
    return (sym.extend({
        typeName: 'yaga.machine.QuasiOverrideSymbol',
        isQuasiOverride: true,
        leadSyntax: ',',
        bind(ymc) {
            return (BoundQuasiOverride(sym, sym.bind(ymc)));
        },
        evaluate(ymc) {
            throw Mach.Error.YagaException(sym, "Misplaced quasi override");
        }
    }));
}

function BoundQuasiOverride(sym, val) {
    return (Yaga.assign({
        isQuasiOverride: true
    }, bindSymbol(sym, val)));
}

function asQuasiInjection(sym) {
    return (Yaga.assign({
        typeName: 'yaga.machine.QuasiInjectionSymbol',
        isQuasiInjection: true,
        leadSyntax: ',@',
        bind(ymc) {
            return (BoundQuasiInjection(sym, sym.bind(ymc)));
        },
        evaluate(ymc) {
            throw new Mach.Error.YagaException(this, "Misplaced quasi override");
        },
    }, asQuasiOverride(sym)));
}

function BoundQuasiInjection(sym, val) {
    return (Yaga.assign({
        isQuasiInjection: true,
        evaluate(ymc) {
            let e = returnRelated(this).evaluate(ymc);
            if (e.isaList) e = yaga.List.newInsertable(e.elements, e.readPoint);
            return (e)
        },
    }, BoundQuasiOverride(sym, val)));
}

function returnThis() {
    return (this);
}

function returnRelated(sym) {
    return (Object.getPrototypeOf(sym));
}
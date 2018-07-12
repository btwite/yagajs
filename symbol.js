/**
 * symbol : @file
 * 
 * Yaga symbol objects.
 * 
 */

let _symbols = new Map();
let _enumReserved = {
    UNKNOWN: 0,
    TRUE: 1,
    FALSE: 2,
    NONE: 3
}
let _reserved = {
    "true": _enumReserved.TRUE,
    "false": _enumReserved.FALSE,
    "unknown": _enumReserved.UNKNOWN,
    "_#": _enumReserved.NONE
}

function _symbolToElement(sym) {
    // Handle escaped reserved symbols first
    if (sym.charAt(0) == '#') {
        String s = sym.substring(1);
        if (_reserved.get(s) != null)
            sym = s;
        return (new AtomSymbol(Symbolspace.getSymbol(sym)));
    }

    // Try for a reserved Symbol
    Reserved type = _reserved.get(sym);
    if (type == null)
        return (new AtomSymbol(Symbolspace.getSymbol(sym)));

    switch (type) {
        default:
            case TRUE:
            return (AtomTrivalent.TRUE);
        case FALSE:
                return (AtomTrivalent.FALSE);
        case UNKNOWN:
                return (AtomTrivalent.UNKNOWN);
        case NONE:
                return (AtomNone.VALUE);
    }
}

static public void printReserved(StringBuilder sb, Reserved sym) {
    for (Entry < String, Reserved > e: _reserved.entrySet()) {
        if (e.getValue() != sym)
            continue;
        sb.append('#').append(e.getKey());
        return;
    }
}

static public void xprintReserved(StringBuilder sb, Reserved sym, String type) {
    for (Entry < String, Reserved > e: _reserved.entrySet()) {
        if (e.getValue() != sym)
            continue;
        sb.append("[").append(type).append("]#").append(e.getKey());
        return;
    }
}

static public void printSymbol(StringBuilder sb, String sym) {
    sb.append(asPrintSymbol(sym));
}

static public void xprintSymbol(StringBuilder sb, String sym) {
    if (_reserved.containsKey(sym))
        sb.append("[#]");
    sb.append('#').append(sym);
}

static public String asPrintSymbol(String sym) {
    String lead = "#";
    if (_reserved.containsKey(sym))
        lead += '#';
    return (lead + sym);
}


function _getSymbol(symName) {
    let _sym = _symbols.get(symName);
    if (!_sym) _symbols.set(symName, (_sym = _symbol(symName)));
    return (_sym);
}

let _symbol = {
    typeName: 'Symbol',
    _sym: '<Unknown>',
    asjString() {
        return (this._sym);
    },
    asPrintSymbol() {
        return (_asPrintSymbol(this._sym));
    }
}

function _newSymbol(sName) {
    let = Object.create(_symbol);
    o._sym = sName;
    return (o);
}


module.exports = {
    get: _getSymbol,
    new: _newSymbol,

    LOCAL: _getSymbol("local"),
    BIND: _getSymbol("bind"),
    NAMES: _getSymbol("names"),
    UNBOUND: _getSymbol("unbound"),
    ARGS: _getSymbol("args"),
    VARGS: _getSymbol("vargs"),
    NPARMS: _getSymbol("nparms"),
    PROD: _getSymbol("prod"),
    DATA: _getSymbol("data"),

    Reserved: _enumReserved,
};
Object.freeze(module.exports);
/*
 *  ReaderTable: @file
 *
 *  Reader table object that defines the reader input handlers.
 *  Structure of the reader table template is as follows (Note that all values are functions or undefined in some cases):
 *      {
 *          startReader:	// Called before read begins.
 *          endReader:      // Called at the end of input.
 *          startStream:	// Called when about to read from a new stream. Reader supports mutiple levels of sub-streams
 *          endStream:	  // Called when reader has reached the end of a stream.
 *          startLine:	  // Called when reader starts a new line.
 *          endLine:        // Called when reader has reached the end of a line.
 *          commitExpression: // Called when the reader is about to add a sub-expression to the current expression
 *          commitToken:    // Called when the reader is about to add a token to the current expression
 *          commitChar: 	// Called when the reader is about to add a character to the current token
 *          patterns: {
 *              '<...>':    // Character pattern. Longest sequence matched first.
 *              '/<regexpr>/': { // Javascript regular expression. Processed after fixed pattern
 *					level: <number>, // Invocation level. Lower numbers higher precedence. > 0
 *					handler: optFunction 
 *			  },
 *			  ...
 *          },
 *      }
 *      Notes:
 *          1. Commit handlers responsible for adding or ignoring respective element.
 *          2. Reader will take default action if no respective handler. All non-whitespace preserved.
 *          3. If no handlers, then result will be a single expression with whitespace separated tokens.
 *          4. If no productive handlers, then a single empty expression will result.
 *          5. Char patterns matched from longest to shortest starting at current position in token.
 *          6. Alphanumeric patterns cannot have a prefix or postfix alphanumeric.
 *          7. Alphanumeric pattern with non-alphanumeric tail treated as non-alphanumeric. Prefix rule still applies
 *		  8. Regexprs processed after char patterns if no char pattern match.
 *		  9. Regexprs processed in lowest to highest level order. Random within level.
 *		 10. Regexpr process stops on first successful match.
 *         11. Char patterns take precedence over regexpr patterns.
 *		 12. Patterns with no handler function will be processed as per Reader defaults.
 *		 13. Regexpr can be just assigned an optFunction. Lowest precedence assumed.
 */
"use strict";

function thisArg (f) {
	return function (...args) {
		return f(this, ...args);
	};
}

var Yaga, Character;

module.exports = {
    new: newReaderTable,
    Initialise,
};

function Initialise(y) {
	Yaga = Yaga | y;
	Character = Yaga.Character;
}


function newReaderTable(rtTemplate) {
    // May actually have a ReaderTable so just answer it.
    if (typeof rtTemplate === 'object' && rtTemplate.isaReaderTable)
        return (rtTemplate);
    let rt = Object.create(ReaderTable);
    rt.patterns = {};
    return (rt.addTemplate(rtTemplate));
}

var ReaderTable = {
    typeName: 'ReaderTable',
    isaReaderTable: true,
    patternMatcher: PatternMatcher, // Default pattern matcher that always fails
    copy: thisArg(copy),
    addTemplate: thisArg(addTemplate),
    addHandler: thisArg(addHandler),
    addPattern: thisArg(addPattern),
    addPatterns: thisArg(addPatterns),
    removeTemplate: thisArg(removeTemplate),
    removeHandler: thisArg(removeHandler),
    removePatterns: thisArg(removePatterns),
    removePattern: thisArg(removePattern),
    match(...args) {
    	return (this.patternMatcher.match(...args));
    }
};
Object.freeze(ReaderTable);

function copy(rt) {
	let rt1 = Object.assign(Object.create(ReaderTable), rt);
	if (rt1.patterns)
		Object.assign((rt1.patterns = {}), rt.patterns);
	return (rt1);
}

function addTemplate(rt, template) {
    if (typeof template !== 'object') 
		throw Yaga.errors.YagaException('Invalid reader table template');
    Object.keys(template).forEach(key => {
        if (!ReadTableUpdaters[key]) 
			throw Yaga.errors.YagaException(`Invalid reader table entry '${key}'`);
        ReadTableUpdaters[key](rt, key, template[key]);
    });
    return (rt);
}

function addHandler(rt, name, fHandler) {
	if (ReadTableUpdaters[name] !== updateHandler)
		throw Yaga.errors.YagaException(`Invalid reader table entry '${name}'`);
	updateHandler(rt, name, fHandler);
	return (rt);
}

function addPattern(rt, chars, val) {
	updatePattern(rt, chars, val);
    buildPatternMatcher(rt);
	return (rt);
}

function addPatterns(rt, patterns) {
	updatePatterns(rt, 'patterns', patterns);
	return (rt);
}

function removeTemplate(rt, template) {
    if (typeof template !== 'object') 
		throw Yaga.errors.YagaException('Invalid reader table template');
    Object.keys(template).forEach(key => {
        if (!ReadTableUpdaters[key]) 
			throw Yaga.errors.YagaException(`Invalid reader table entry '${key}'`);
		if (ReadTableUpdaters[key] === updateHandler)
			delete rt[key];
		else
			rt.removePatterns(rt[key]);
    });
    return (rt);
}

function removeHandler(rt, name) {
    if (ReadTableUpdaters[name] !== updateHandler)
		throw Yaga.errors.YagaException(`Invalid reader table entry '${name}'`);
	delete rt[name];
	return (rt);
}

function removePatterns(rt, patterns) {
    if (typeof patterns !== 'object') 
		throw Yaga.errors.YagaException(`Patterns object required.`);
    Object.keys(patterns).forEach(pat => {
        delete rt.patterns[pat];
    });
    buildPatternMatcher(rt);
}

function removePattern(rt, chars) {
	delete rt.patterns[chars];
    buildPatternMatcher(rt);
    return (rt);
}


var ReadTableUpdaters = {
    startReader: updateHandler,
    endReader: updateHandler,
    startStream: updateHandler,
    endStream: updateHandler,
    startLine: updateHandler,
    endLine: updateHandler,
    commitExpression: updateHandler,
    commitToken: updateHandler,
    commitChar: updateHandler,
    patterns: updatePatterns,
};

function updateHandler(rt, name, val) {
	// Only patterns can have an optional handler function
    if (typeof val !== 'function') 
		throw Yaga.errors.YagaException(`Function required for Reader table entry '${name}'`);
    rt[name] = val;
}

function updatePatterns(rt, name, patterns) {
    if (typeof patterns !== 'object') 
		throw Yaga.errors.YagaException(`Object required for reader table entry '${name}'`);
    Object.keys(patterns).forEach(pat => {
        updatePattern(rt, pat, patterns[pat]);
    });
    buildPatternMatcher(rt);
}

function updatePattern(rt, pat, val) {
    if (pat === '')
        throw Yaga.errors.YagaException(`Empty string pattern is invalid`);
    if (pat.length > 2 && pat[0] === '/' && pat[pat.length - 1] === '/')
    	updateRegexprPattern(rt, pat, val);
    else
    	updateCharPattern(rt, pat, val);
}

function updateCharPattern(rt, pat, val) {
    if (typeof val !== 'function' && val !== undefined)
        throw Yaga.errors.YagaException(`Pattern '${pat}' handler must be a function or undefined. Found(${val})`);
    rt.patterns[pat] = val;
}

function updateRegexprPattern(rt, pat, val) {
    if (typeof val !== 'function' && val !== undefined) {
    	if (typeof val !== 'object')
        	throw Yaga.errors.YagaException(`Expecting an object value for pattern '${pat}'. Found(${val})`);
        if (!val.hasOwnProperty('level') || typeof val.level !== 'number' || va.level <= 0)
        	throw Yaga.errors.YagaException(`Missing or invalid precedence 'level' property for pattern '${pat}'`);
        if (val.hasOwnProperty('handler') && typeof val.handler !== 'function' && val.handler !== undefined)
        	throw Yaga.errors.YagaException(`Pattern '${pat}' handler must be a function or undefined. Found(${val})`);
    }
    rt.patterns[pat] = val;
}

var PatternMatcher = {
	typeName: 'PatternMatcher',
	match: thisArg(match),
};

function match(pm, s, fConfirmMatch) {
	var result;
	if (pm.mainExpr) {
		result = pm.mainExpr.exec(s);
		if (result && (fConfirmMatch | () => true)(result[0]))
			return [result.index, result[0], pm.patterns[result[0]]];
	}
	// Failed the main expression, so now try the explicit regexprs
	if (!pm.regexprs) return (null);
    // With no block type closure will use loops to handle the arrays.
    for (let i = 0; i < pm.regexprs.length; i++) {
    	let list = pm.regexprs[i];
    	for (let j = 0; j < list.length; j++) {
    		result = list[j][0].exec(s);
    		if (result)
    			return [result.index, result[0], list[j][1]];
    	}
    }
    // Nothing matches.
    return (null);
}

function buildPatternMatcher(rt) {
	let pm = Object.create(PatternMatcher),
		alphanums = [],
		operators = [],
		regexprs = [];
	Object.keys(rt.patterns).forEach(pat => {
		if (pat.length > 2 && pat[0] === '/' && pat[pat.length - 1] === '/')
			return (orderRegexpr(regexprs, pat.substr(0, pat.length - 2), rt.patterns[pat]));
		if (Character.isAlphanumeric(pat[pat.length - 1])) // Require trailing alphanum check
			return (sizePattern(alphanums, pat));
		sizePattern(operators, pat);
	});
	buildCharPatternExpr(pm, alphanums, operators);
	buildRegexprs(pm, regexprs);
	pm.patterns = rt.patterns; // Take a copy to access char pattern functions
	rt.patternMatcher = pm;
}

function sizePattern(list, pat) {
	// Arrange char patterns in order of size
	let l = pat.length - 1;
	if (!list[l]) list[l] = [];
	list[l].push(pat);
}

function orderRegexpr(list, pat, spec) {
	// Arrange regexprs in level order. If no level provided then store in slot 0.
	let fHandler = spec, lvl = 0;
	if (typeof spec === 'object') {
		lvl = spec.level; // Will be greater than 0
		fHandler = spec.handler;
	}
	if (!list[lvl]) list[lvl] = [];
	list[lvl].push([pat, fHandler]);
}

function buildRegexprs(pm, regexprs) {
	pm.regexprs = undefined;
	if (regexprs.length === 0)
		return;
	pm.regexprs = [];
	// Slot 0 are the least significant expressions
	for (let i = 1; i < regexprs.length; i++) {
		if (!regexprs[i]) continue;
		pm.regexprs.push(buildLevelExprs(regexprs[i]));
	}
	if (regexprs[0])
		pm.regexprs.push(buildLevelExprs(regexpr[0]));
}

function buildLevelExprs(list) {
	let aExprs = [];
	// Note that the handler function is kept with explicit regular expressions.
	list.forEach(pair => aExprs.push([new RegExp(pair[0]), pair[1]]));
	return (aExprs);
}
 
function buildCharPatternExpr(pm, alphanums, operators) {
	pm.mainExpr = undefined;
	let lenAlpha = alphanums.length,
		lenOps = operators.length;
	if (lenAlpha + lenOps === 0)
		return;
	let sb = Yaga.StringBuilder.new();
	sb.append('^(?:');
	if (lenAlpha > 0) {
		appendPatterns(sb, '(?:', alphanums, ')(?![a-zA-Z0-9]');
		sb.append('|');
	}
	if (lenOps > 0)
		appendPatterns(sb, '(?:', operators, ')');
	else if (lenAlpha > 0)
		sb.pop(); // No operators, so can pop the '|'
	sb.append(')');
	
	// Note that all patterns are combined into one regexpr so will need to 
	// access patterns object to pickup the handler function when a match occurs.
	pm.mainExpr = new RegExp(sb.toString());
}

function appendPatterns(sb, pfx, patterns, sfx) {
	sb.append(pfx);
	patterns.forEach(aPats => {
	if (!aPats || aPats.length === 0) return;
	aPats.forEach(pat => {
		appendPattern(sb, pat);
		sb.append('|');
	});
	sb.pop(); // Pop the last '|'
	sb.append(sfx);
}

const ReControls = '\\^$*+?:.()=!|{}[]/';
function appendPattern(sb, pat) {
	// Will need to escape any character that has meaning in the regular expression
	for (let i = 0; i < pat.length; i++) {
		let ch = pat[i];
		if (ReControls.includes(ch)) {
			if (ch === '\\') {
				sb.append('\\\\');
				continue;
			}
			sb.append('\\');
		}
		sb.append(ch);
	}
}

/*
 *  ReaderTable: @file
 *
 *  ReaderTable object that defines the reader input handlers.
 *  Structure of the ReaderTable template is as follows (Note that all values are functions or undefined in some cases):
 *      {
 *          startReader:	// Called before read begins.
 *          endReader:      // Called at the end of input.
 *          startStream:	// Called when about to read from a new stream. Reader supports mutiple levels of sub-streams
 *          endStream:	  	// Called when reader has reached the end of a stream.
 *          startLine:	  	// Called when reader starts a new line.
 *          endLine:        // Called when reader has reached the end of a line.
 *          commitExpression: // Called when the reader is about to add a sub-expression to the current expression
 *          commitToken:    // Called when the reader is about to add a token to the current expression
 *          commitChar: 	// Called when the reader is about to add a character to the current token
 * 			error:			// Called when an error or exception has occurred.
 *          patterns: {
 *              '<...>':    // Character pattern. Longest sequence matched first.
 *              '/<regexpr>/': { // Javascript regular expression. Processed after fixed pattern
 *								level: <number>, // Invocation level. Lower numbers higher precedence. > 0
 *								handler: optFunction 
 *								},
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
 *		    8. Regexprs processed after char patterns if no char pattern match.
 *		    9. Regexprs processed in lowest to highest level order. Random within level.
 *			   Level number can also be passed as a property of the function. Ex. fn.level = 0;
 *		   10. Regexpr process stops on first successful match.
 *         11. Char patterns take precedence over regexpr patterns.
 *		   12. Patterns with no handler function will be processed as per Reader defaults.
 *		   13. Regexpr can be just assigned an optFunction. Lowest precedence assumed.
 *		   14. Pattern match answers 'null' if there is no match and the following object on success:
 *					{
 *						position: <Index into source string>,
 *						what: <Matching segment of source string>,
 *						fHandler: <ReaderTable handler to call>
 *					}
 *		   15. Pattern handler function can also have a 'validateMatch' function property that is passed the
 *			   results of a successful match. Must answer 'true' if match is to proceed. Care must be taken
 *			   using this facility as a longer match that is then invalidated will also invalidate a shorter
 *			   match. If this can occur then regexpr matches should be employed with precedence levels
 *			   specified.
 */
"use strict";

var Yaga = require('../core');
var Character = Yaga.Character;

var PatternMatcher = {
	typeName: 'PatternMatcher',
	regexprs: {}, // Allow the PatterMatcher prototype to act as an empty pattern matcher
	match: Yaga.thisArg(match),
};

var ReaderTable = Yaga.Influence({
	name: 'ReaderTable',
	prototype: {
		match(...args) {
			return (ReaderTable.private(this).patternMatcher.match(...args));
		},
		thisArg_: {
			addTemplate,
			addHandler,
			addPattern,
			addPatterns,
			removeTemplate,
			removeHandler,
			removePatterns,
			removePattern,
		},
		private_: {
			patternMatcher: PatternMatcher, // Default. Pattern matcher prototype will always fail
		}
	},
	constructor(rtDesc) {
		if (rtDesc && (typeof rtDesc !== 'object' || rtDesc.isaReaderTable))
			throw new Error('Invalid ReaderTable descriptor');
		this.patterns = {};
		this.addTemplate(rtDesc || {});
	},
	static: {
		check(rtDesc) {
			// May actually have a ReaderTable so just answer it.
			if (typeof rtDesc === 'object' && rtDesc.isaReaderTable)
				return (rtDesc);
			return (ReaderTable.create(rtDesc))
		}
	}
});

module.exports = Object.freeze({
	ReaderTable: ReaderTable.create
});

function addTemplate(rt, template) {
	if (typeof template !== 'object')
		throw new Error('Invalid ReaderTable template');
	Object.keys(template).forEach(key => {
		if (!ReadTableUpdaters[key])
			throw new Error(`Invalid ReaderTable entry '${key}'`);
		ReadTableUpdaters[key](rt, key, template[key]);
	});
	return (rt);
}

function addHandler(rt, name, fHandler) {
	if (ReadTableUpdaters[name] !== updateHandler)
		throw new Error(`Invalid ReaderTable entry '${name}'`);
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
		throw new Error('Invalid ReaderTable template');
	Object.keys(template).forEach(key => {
		if (!ReadTableUpdaters[key])
			throw new Error(`Invalid ReaderTable entry '${key}'`);
		if (ReadTableUpdaters[key] === updateHandler)
			delete rt[key];
		else
			rt.removePatterns(rt[key]);
	});
	return (rt);
}

function removeHandler(rt, name) {
	if (ReadTableUpdaters[name] !== updateHandler)
		throw new Error(`Invalid ReaderTable entry '${name}'`);
	delete rt[name];
	return (rt);
}

function removePatterns(rt, patterns) {
	if (typeof patterns !== 'object')
		throw new Error(`Patterns object required.`);
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
	error: updateHandler,
	patterns: updatePatterns,
};

function updateHandler(rt, name, val) {
	// Only patterns can have an optional handler function
	if (typeof val !== 'function')
		throw new Error(`Function required for ReaderTable entry '${name}'`);
	rt[name] = val;
}

function updatePatterns(rt, name, patterns) {
	if (typeof patterns !== 'object')
		throw new Error(`Object required for ReaderTable entry '${name}'`);
	Object.keys(patterns).forEach(pat => {
		updatePattern(rt, pat, patterns[pat]);
	});
	buildPatternMatcher(rt);
}

function updatePattern(rt, pat, val) {
	if (pat === '')
		throw new Error(`Empty string pattern is invalid`);
	if (pat.length > 2 && pat[0] === '/' && pat[pat.length - 1] === '/')
		updateRegexprPattern(rt, pat, val);
	else
		updateCharPattern(rt, pat, val);
}

function updateCharPattern(rt, pat, val) {
	if (typeof val !== 'function' && val !== undefined)
		throw new Error(`Pattern '${pat}' handler must be a function or undefined. Found(${val})`);
	rt.patterns[pat] = val;
}

function updateRegexprPattern(rt, pat, val) {
	if (typeof val !== 'function' && val !== undefined) {
		if (typeof val !== 'object')
			throw new Error(`Expecting an object value for pattern '${pat}'. Found(${val})`);
		if (!val.hasOwnProperty('level') || typeof val.level !== 'number' || val.level <= 0)
			throw new Error(`Missing or invalid precedence 'level' property for pattern '${pat}'`);
		if (val.hasOwnProperty('handler') && typeof val.handler !== 'function' && val.handler !== undefined)
			throw new Error(`Pattern '${pat}' handler must be a function or undefined. Found(${val})`);
	}
	rt.patterns[pat] = val;
}

function match(pm, s) {
	// There are two phases to the match process. In the first we attempt to
	// match against the begin matching patterns. This includes simple patterns as well
	// as any regular expressions that are explicitly defined as begin matchers. This phase
	// continues through the string until a match occurs or end of string is reached. Note
	// that if the first character is an alphanumeric and no match occurs then all following
	// alphanumerics are skipped. 
	// In the second phase we run the 'any' matchers across the whole string. In this case
	// it is upto the caller to handle potential splitting of alphanumeric sequences.
	// At completion of the two phases the best match is returned, which will be the longest
	// match closest to the start of the string.
	return (bestMatch(beginMatchers(pm, s), anyMatchers(pm, s)));
}

function beginMatchers(pm, s, offset = 0) {
	let match = runRegexpr(pm.mainExpr, s, offset, m => pm.patterns[m[0]]);
	if (match = bestMatch(match, tryRegexprPatterns(pm.regexprs.beginMatch, s, offset)))
		return (match);
	if (s.length <= 1)
		return (null);
	// Skip alphanumerics if we just tried an alphanumeric.
	let i = 1;
	if (Character.isAlphaNumeric(s[0])) {
		for (; i < s.length && Character.isAlphaNumeric(s[i]); i++);
		if (i >= s.length)
			return (null);
	}
	// Need to go round again and try the next substring.
	return (beginMatchers(pm, s.substr(i), offset + i))
}

function anyMatchers(pm, s) {
	return (tryRegexprPatterns(pm.regexprs.anyMatch, s));
}

function tryRegexprPatterns(regexprs, s, offset = 0) {
	if (!regexprs)
		return (null);
	// Answer the best match at the highest significance level
	for (let i = 0; i < regexprs.length; i++) {
		let match = null,
			list = regexprs[i];
		for (let j = 0; j < list.length; j++)
			match = bestMatch(match, runRegexpr(list[j][0], s, offset, () => list[j][1]));
		if (match)
			return (match);
	}
	return (null);
}

function runRegexpr(r, s, offset, fHandler) {
	if (!r)
		return (null);
	let result = r.exec(s);
	if (result) {
		let f = fHandler(result);
		if (f && f.validateMatch && !f.validateMatch(result))
			return (null);
		return ({
			position: result.index + offset,
			what: result[0],
			fHandler: f
		});
	}
	return (null);
}

function bestMatch(match1, match2) {
	if (!match1 || !match2)
		return (match1 || match2);
	if (match1.position === match2.position)
		return (match2.what.length > match1.what.length ? match2 : match1);
	return (match2.position < match1.position ? match2 : match1);
}

function buildPatternMatcher(rt) {
	let pm = Object.create(PatternMatcher),
		alphanums = [],
		operators = [],
		regexprs = {
			beginMatch: [],
			anyMatch: []
		};
	Object.keys(rt.patterns).forEach(pat => {
		if (pat.length > 2 && pat[0] === '/' && pat[pat.length - 1] === '/')
			return (orderRegexpr(regexprs, pat.substr(1, pat.length - 2), rt.patterns[pat]));
		if (Character.isAlphaNumeric(pat[pat.length - 1])) // Require trailing alphanum check
			return (sizePattern(alphanums, pat));
		sizePattern(operators, pat);
	});
	buildCharPatternExpr(pm, alphanums, operators);
	buildRegexprs(pm, regexprs);
	pm.patterns = rt.patterns; // Take a copy to access char pattern functions
	ReaderTable.private(rt).patternMatcher = pm;
}

function sizePattern(list, pat) {
	// Arrange char patterns in order of size
	let l = pat.length - 1;
	if (!list[l]) list[l] = [];
	list[l].push(pat);
}

function orderRegexpr(regexprs, pat, spec) {
	// Arrange regexprs in level order. If no level provided then store in slot 0.
	// Regexprs are split into two lists. Those that match at beginning of string only and
	// that match anywhere in string. Beginning expressions must start with a '^'.
	let list = pat[0] === '^' ? regexprs.beginMatch : regexprs.anyMatch;
	let fHandler = spec,
		lvl = 0;
	if (typeof spec === 'object') {
		lvl = spec.level; // Will be greater than 0
		fHandler = spec.handler;
	} else if (fHandler.hasOwnProperty('level'))
		lvl = fHandler.level;
	if (!list[lvl]) list[lvl] = [];
	list[lvl].push([pat, fHandler]);
}

function buildRegexprs(pm, regexprs) {
	pm.regexprs = {};
	pm.regexprs.beginMatch = _buildRegexprs(pm, regexprs.beginMatch);
	pm.regexprs.anyMatch = _buildRegexprs(pm, regexprs.anyMatch);
}

function _buildRegexprs(pm, list) {
	if (list.length === 0)
		return (null);
	let newList = [];
	// Slot 0 are the least significant expressions
	for (let i = 1; i < list.length; i++) {
		if (!list[i]) continue;
		newList.push(buildLevelExprs(list[i]));
	}
	if (list[0])
		newList.push(buildLevelExprs(list[0]));
	return (newList);
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
	let sb = Yaga.StringBuilder();
	sb.append('^(?:');
	if (lenAlpha > 0) {
		appendPatterns(sb, '(?:', alphanums, ')(?![a-zA-Z0-9])');
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
	for (let i = patterns.length; --i >= 0;) {
		let aPats = patterns[i];
		if (!aPats || aPats.length === 0) continue;
		aPats.forEach(pat => {
			appendPattern(sb, pat);
			sb.append('|');
		});
	}
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
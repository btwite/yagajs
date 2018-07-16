/*
 * AtomComment: @file
 *
 *  Single or multi-line comment atom.
 */

"use strict";

var yc, _prot;
module.exports = {
	new: _newAtomComment,
	EmptyComment: undefined,
	Initialise: _init,
};

function _newAtomComment(lines, point) {
	let o = Object.create(_prot);
	o.setLines(lines);
	o.setParserPoint(point);
	return (o);
}

function _init(y) {
	if (yc) return;
	yc = y;
	let _emptyComment;
	_prot = Object.assign(Object.create(yc.AtomicList.prototype), {
		typeName: 'AtomComment',
		setLines(lines) {
			this._lines = lines;
			return (this);
		},
		getLines() {
			return (_lines);
		},
		zeroValue() {
			return (_emptyComment);
		},

		// String printing needs a lot more work to handle special characters.
		print(sb) {
			let _lines = this._lines;
			sb.append(`/" ${_lines[0]}`);
			for (let i = 1; i < _lines.length; i++) {
				sb.append(`\n${_lines[i]}`);
			}
			sb.append(' "/');
		},

		isComment: () => true,
		add(ctxt, e) {
			return (e.rAdd(ctxt, this));
		},
		sub(ctxt, e) {
			return (e.rSub(ctxt, this));
		},
		mul(ctxt, e) {
			return (e.rMul(ctxt, this));
		},
		div(ctxt, e) {
			return (e.rDiv(ctxt, this));
		},
		rem(ctxt, e) {
			return (e.rRem(ctxt, this));
		}
	});
	module.exports.EmptyComment = _emptyComment = _newAtomComment([]);
}
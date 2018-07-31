/*
 *  ReaderTable: @file
 *
 *  Reader table object that defines the reader input handlers.
 *  Structure of the reader table template is as follows (Note that all values are functions or undefined in some cases):
 *      {
 *          startReader:    // Called before read begins.
 *          endReader:      // Called at the end of input.
 *          eol:            // Called when end of line is reached.
 *          eos:            // Called when end of stream is reached.
 *          commitToken:    // Called when a token is about to be committed to the current expression
 *          patterns: {
 *              '<...>':    // One or more characters. Longest sequence matched first.
 *                          // If there is no pattern then will force a to be created and possible token split.
 *              '':         // No pattern, matches every character. Last function to be called. Must be a function
 *          }
 *          
 *      }
 */
"use strict";

var yaga, _readerTable;

module.exports = {
    new: _newReaderTable,
    Initialise: (y) => yaga = yaga ? yaga : y,
};

function _newReaderTable(readTableTemplate) {
    // May actually have a ReaderTable so just answer it.
    if (typeof readTableTemplate === 'object' && readTableTemplate.isaReaderTable)
        return (readTableTemplate);
    let table = Object.create(_readerTable);
    return (table.addTemplate(readTableTemplate));
}

_readerTable = {
    typeName: 'ReaderTable',
    isaReaderTable: true,
    addTemplate: _addTemplate,
    addHandler: _addHandler,
    addPattern: _addPattern,
    removeTemplate: _removeTemplate,
    removeHandler: _removeHandler,
    removePattern: _removePattern,
};
Object.freeze(_readerTable);

function _addTemplate(template) {
    if (typeof template !== 'object') throw yaga.errors.YagaException(undefined, 'Invalid reader table template');
    Object.keys(template).forEach(key => {
        if (!_updateFns[key]) throw yaga.errors.YagaException(undefined, `Invalid reader table entry '${key}'`);
        _updateFns[key](this, key, template[key]);
    });
    _updateMaxPatternLength(this.patterns);
    return (this);
}

function _addHandler(name, optFunction) {

}

function _addPattern(chars, optFunction) {

}

function _removeTemplate(template) {

}

function _removeHandler(name) {

}

function _removePattern(chars) {

}


let _updateFns = {
    startReader: _updateItem,
    endReader: _updateItem,
    eol: _updateItem,
    eos: _updateItem,
    commitToken: _updateItem,
    patterns: _updatePatterns,
};

function _updateItem(readTable, name, val) {
    if (typeof val !== 'function') throw yaga.erros.YagaException(undefined, `Function required for Reader table entry '${name}'`);
    readTable[name] = val;
}

function _updatePatterns(readTable, name, patterns) {
    if (typeof patterns !== 'object') throw yaga.errors.YagaException(undefined, `Object required for reader table '${name}'`);
    Object.keys(patterns).forEach(pat => {
        _updatePattern(readTable, name, pat, patterns[pat]);
    });
}

function _updatePattern(readTable, name, pat, val) {
    if (typeof val !== 'function' && val !== undefined)
        throw yaga.errors.YagaException(undefined, `Pattern '${pat}' must be a function or undefined. Found '${val}' in '${name}'`);
    if (pat === '' && typeof val !== 'function')
        throw yaga.errors.YagaException(undefined, `Function required for empty string pattern in '${name}'`);
    let patterns = readTable.patterns;
    if (!patterns) patterns = readTable.patterns = {};
    patterns[pat] = val;
}

function _updateMaxPatternLength(patterns) {
    if (!patterns) return;
    let maxlen = -1;
    Object.keys(patterns).forEach(pat => {
        pat = patterns[pat];
        maxlen = maxlen < pat.length ? pat.length : maxlen
    });
    patterns.maxPatternLength = maxlen;
}
/*
 *  YagaReader: @file
 *
 *  Yaga ReaderTable implementation.
 */
"use strict";

var yaga, _yagaTable;

module.exports = {
    readerTable: _yagaReaderTable,
    Initialise: (y) => yaga = yaga ? yaga : y,
};

function _yagaReaderTable() {
    if (_yagaTable) return (_yagaTable);
    _yagaTable = yaga.ReaderTable.new({

    });
    return (_yagaTable);
}
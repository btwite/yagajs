/*
 *  yagaPlugin: @file
 *
 *  Implements javascript language extensions as a babel plugin transforming custom parser extensions
 *  implemented in 'yagaParser_<ver>'.
 */
"use strict";

let Babel = require('@babel/core');
let YagaToolboxPath = 'd:/repos/yaga/toolbox/Utilities';
let t = Babel.types;
let __yagaUtilities__ = t.identifier('__yagaUtilities__');
let __yagaBindFn__ = t.identifier('__yagaBindFn__');

let YagaVisitor = {
    MemberExpression(path) {
        if (!path.node._yagaBindExpression)
            return;
        addYagaBindDeclaration(this);
        if (path.node.computed) {
            path.replaceWith(t.callExpression(__yagaBindFn__, [path.node.object, path.node.property]));
        } else {
            path.replaceWith(t.callExpression(__yagaBindFn__, [path.node.object, t.stringLiteral(path.node.property.name)]));
        }
    }
}

module.exports = function () {
    return ({
        visitor: {
            Program: {
                enter(path) {
                    // Need to start a sub-traverse with a state object that contains
                    // the program node and a flag indicating if we have generated the
                    // Yaga utilities require.
                    path.traverse(YagaVisitor, {
                        progNode: path.node,
                        flRequire: false,
                        flYagaBind: false,
                    });
                },
                exit(path) {
                    // Already traversed what we are interested in, so stop any further
                    // traversal.
                    path.stop();
                }
            },
        }
    });
};

// var __yagaBindFn__ = __yagaUtilities__.bind;
function addYagaBindDeclaration(state) {
    if (state.flYagaBind)
        return;
    addYagaRequireDeclaration(state);
    let node = t.variableDeclaration('var', [
        t.variableDeclarator(__yagaBindFn__, t.memberExpression(__yagaUtilities__, t.identifier('bind')))
    ]);
    state.progNode.body.splice(1, 0, node);
    // Insert into body after Yaga Utilities require.
    state.flYagaBind = true;
}

// var __yagaUtilities__ = require(<yagaToolboxPath>);
function addYagaRequireDeclaration(state) {
    if (state.flRequire)
        return;
    let node = t.variableDeclaration('var', [
        t.variableDeclarator(__yagaUtilities__, t.callExpression(t.identifier('require'), [t.stringLiteral(YagaToolboxPath)]))
    ]);
    // Insert at head of body.
    state.progNode.body.unshift(node);
    state.flRequire = true;
};

function log(...args) {
    console.log(...args);
}
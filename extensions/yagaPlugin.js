/*
 *  yagaPlugin: @file
 *
 *  Implements javascript language extensions as a babel plugin transforming custom parser extensions
 *  implemented in 'yagaParser_<ver>'.
 */
"use strict";

let Babel = require('@babel/core');
let t = Babel.types;
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

// function __yagaBindFn(o, tgt) ....
function addYagaBindDeclaration(state) {
    if (state.flYagaBind)
        return;

    let __yagaBindMap__ = t.identifier('_yagaBindMap__');
    // const __yagaBindMap__ = Symbol.for('__yagaBindMap__');
    let node = t.variableDeclaration('const', [
        t.variableDeclarator(__yagaBindMap__,
            t.callExpression(t.memberExpression(t.identifier('Symbol'), t.identifier('for')), [t.stringLiteral('__yagaBindMap__')]))
    ]);
    // Insert at head of body.
    state.progNode.body.unshift(node);

    let oParm = t.identifier('o');
    let tgtParm = t.identifier('tgt');
    let bfVar = t.identifier('bf');
    let mapVar = t.identifier('map');
    let body = t.blockStatement([
        // if (typeof tgt === 'string')
        //     tgt = o[tgt];
        t.ifStatement(t.binaryExpression('===', t.unaryExpression('typeof', tgtParm), t.stringLiteral('string')),
            t.expressionStatement(t.assignmentExpression('=', tgtParm, t.memberExpression(oParm, tgtParm, true)))),

        // if (typeof tgt !== 'function')
        //     throw new Error('Target of bind must be a function');
        t.ifStatement(t.binaryExpression('!==', t.unaryExpression('typeof', tgtParm), t.stringLiteral('function')),
            t.throwStatement(t.newExpression(t.identifier('Error'), [t.stringLiteral('Target of bind must be a function')]))),

        // let bf, map = tgt[__yagaBindMap__] || (tgt[__yagaBindMap__] = new WeakMap());
        t.variableDeclaration('let', [
            t.variableDeclarator(bfVar),
            t.variableDeclarator(mapVar,
                t.logicalExpression('||',
                    t.memberExpression(tgtParm, __yagaBindMap__, true),
                    t.assignmentExpression('=', t.memberExpression(tgtParm, __yagaBindMap__, true),
                        t.newExpression(t.identifier('WeakMap'), []))))
        ]),

        // return (map.get(o) || (map.set(o, (bf = tgt.bind(o))), bf));
        t.returnStatement(t.logicalExpression('||',
            t.callExpression(t.memberExpression(mapVar, t.identifier('get')), [oParm]),
            t.sequenceExpression([
                t.callExpression(t.memberExpression(mapVar, t.identifier('set')), [oParm,
                    t.assignmentExpression('=', bfVar, t.callExpression(t.memberExpression(tgtParm, t.identifier('bind')), [oParm]))
                ]),
                bfVar
            ])
        ))
    ]);

    node = t.functionDeclaration(__yagaBindFn__, [oParm, tgtParm], body);
    // Insert into body after Yaga Utilities require.
    state.progNode.body.splice(1, 0, node);

    state.flYagaBind = true;
}

function log(...args) {
    console.log(...args);
}
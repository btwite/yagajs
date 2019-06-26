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
let __yagaGetPrivateSpaceFn__ = t.identifier('__yagaGetPrivateSpace__');
let __yagaObjLiteralFn__ = t.identifier('__yagaObjLiteral__');

let YagaVisitor = {
    MemberExpression(path) {
        if (path.node._yagaBindExpression)
            addYagaBindExpression(this, path);
        else if (path.node._yagaPrivateSpaceOnly)
            addYagaPrivatePropertySpaceObject(this, path);
        else if (path.node._yagaPrivateProperty)
            addYagaPrivatePropertyAccessor(this, path);
    },
    ObjectExpression(path) {
        if (path.node._yagaHasPrivateProperties)
            parseObjectPrivateProperties(this, path);
    }
}

function addYagaBindExpression(state, path) {
    addYagaBindDeclaration(state);
    if (path.node.computed) {
        path.replaceWith(t.callExpression(__yagaBindFn__, [path.node.object, path.node.property]));
    } else {
        path.replaceWith(t.callExpression(__yagaBindFn__, [path.node.object, t.stringLiteral(path.node.property.name)]));
    }
}

function parseObjectPrivateProperties(state, path) {
    // Filter the ObjectExpression properties into two arrays.
    let publicProps = path.node.properties.filter(prop => !prop._yagaPrivateProperty);
    let nodePrivateProps = t.objectExpression(path.node.properties.filter(prop => {
        if (prop._yagaPrivateProperty) {
            // Look out for 'PrivateName' nodes as we only need the 'id' now
            if (prop.key.type === 'PrivateName')
                prop.key = prop.key.id;
            return (true);
        }
        return (false);
    }));
    path.node.properties = publicProps;
    path.node._yagaHasPrivateProperties = false;
    path.replaceWith(t.callExpression(__yagaObjLiteralFn__, [path.node, nodePrivateProps]));
}

function addYagaPrivatePropertyAccessor(state, path) {
    addYagaPrivateDeclaration(state);
    path.node.object = t.callExpression(__yagaGetPrivateSpaceFn__, [path.node.object]);
    if (path.node.property.type === 'PrivateName')
        path.node.property = path.node.property.id;
}

function addYagaPrivatePropertySpaceObject(state, path) {
    addYagaPrivateDeclaration(state);
    path.replaceWith(t.callExpression(__yagaGetPrivateSpaceFn__, [path.node.object]));
}

module.exports = function() {
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

function addYagaPrivateDeclaration(state) {
    if (state.flYagaPrivateSpace)
        return;

    // const __yagaPrivateSpace__ = new WeakMap();
    let __yagaPrivateSpace__ = t.identifier('__yagaPrivateSpace__');
    let node = t.variableDeclaration('const', [
        t.variableDeclarator(__yagaPrivateSpace__, t.newExpression(t.identifier('WeakMap'), []))
    ]);
    // Insert at head of body.
    state.progNode.body.unshift(node);

    /*
    function __yagaObjLiteral__(o, oPrivate) {
        __yagaPrivateSpace__.set(o, oPrivate);
        return (o);
    }
    */
    let oParm = t.identifier('o');
    let oPrivateParm = t.identifier('oPrivate');
    let body = t.blockStatement([
        t.expressionStatement(t.callExpression(t.memberExpression(__yagaPrivateSpace__, t.identifier('set')),
            [oParm, oPrivateParm])),
        t.returnStatement(oParm)
    ]);

    let __yagaObjLiteral__ = t.identifier('__yagaObjLiteral__');
    node = t.functionDeclaration(__yagaObjLiteral__, [oParm, oPrivateParm], body);
    // Insert into body after __yagaPrivateSpace__.
    state.progNode.body.splice(1, 0, node);

    /*
    function __yagaGetPrivateSpace__(o) {
        let oPrivate = __yagaPrivateSpace__.get(o);
        if (!oPrivate)
            oPrivate = __yagaPrivateSpace__.set(o, {});
        return (oPrivate);
    }
    */
    let oPrivate = t.identifier('oPrivate');
    body = t.blockStatement([
        t.variableDeclaration('let', [
            t.variableDeclarator(oPrivate,
                t.callExpression(t.memberExpression(__yagaPrivateSpace__, t.identifier('get')),
                    [oParm]))
        ]),

        t.ifStatement(t.unaryExpression('!', oPrivate),
            t.expressionStatement(t.assignmentExpression('=', oPrivate,
                t.callExpression(t.memberExpression(__yagaPrivateSpace__, t.identifier('set')),
                    [oParm, t.objectExpression([])])
            ))),

        t.returnStatement(oPrivate)
    ]);

    let __yagaGetPrivateSpace__ = t.identifier('__yagaGetPrivateSpace__');
    node = t.functionDeclaration(__yagaGetPrivateSpace__, [oParm], body);
    // Insert into body after __yagaObjLiteral__.
    state.progNode.body.splice(2, 0, node);

    state.flYagaPrivateSpace = true;
}

// function __yagaBindFn(o, tgt) ....
function addYagaBindDeclaration(state) {
    if (state.flYagaBind)
        return;

    let __yagaBindMap__ = t.identifier('__yagaBindMap__');
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
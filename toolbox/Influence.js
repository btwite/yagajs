/*
 *  Influence: @file
 *
 *  Influence is an object composer that in its simplest form describes a prototype and 
 *  a one or more constructors for creating an instance. Simple influences can then be
 *  composed into a composite Influence that itself is a single prototype and set of constructors.
 *  A composition is an array (ordered form highest to lowest significance) of Influences.
 *  An influence may be in descriptor form which will firstly transformed into an influence
 *  object.
 * 
 *  Descriptors:
 * 		Prototype form:
 * 		{
 * 			register: '<name>',		// Defines the name of the Influence and records in global registry
 * 			name: '<name>',			// Defines the name of the Influence without recording.
 * 			prototype: {			// Prototype properties for this influence
 * 				...
 * 				thisArg_: {			// Bounded prototype functions require 'this' argument not 'this' property.
 * 				},
 * 				private_: {			// Private properties of the prototype. Can also contain 'thisArg_'
 * 				}
 * 			},
 * 			constructor: { <property inialisation object> } | fInitialiser | // fn gets access to instance via 'this'.
 * 							[ fInit, <init object> ],
 * 			constructors: {
 * 				default: <As for 'constructor'>,	// Must be defined
 * 				<name>: <As for 'constructor'>,
 * 				...
 * 			}
 * 		}
 * 		Composition form:
 * 		{
 * 			register: | name:,		// As for Prototype form
 * 			composition: [			// List of composable influences ordered from highest significant to lowest
 * 				<descriptor> | influence object | influence function | <registry name>,
 * 				...
 * 			],
 * 			harmonizers: {			// Set of property names to be harmonized across composables.
 * 				<propname>: fHarmonizer,	// Anwsers value for property to be placed into prototype
 * 				...
 * 			}
 * 			constructor: | constructors,	// As for Prototype form
 * 		}
 * 
 *  Notes:
 * 		1. Both 'register' and 'name' are optional. Influence treated as anonymous. Mutually exclusive
 * 		2. Both 'contructor' and 'constructors are optional, and mutually exclusive.
 * 		3. Private properties cannot be harmonized. Remain accessible to original prototype functions.
 * 		4. Harmonizers are passed influence object and can access composable prototype public properties to
 * 		   form harmonized property value. A composable is referencable by name or index position in composition
 * 		   list.
 * 		5. Default harmonizer will take the property value of the most significant influence.
 * 		6. Composition constructors can also be harmonized by creating a harmonizer of the form 'constructor_..._',
 *         where '...' is optional explicit name of constructor.
 * 		7. A harmonizer function value will need to use .call, .apply or .bind to forward requests to composable prototype functions
 * 		8. Influence(oDesc) will answer the influence object to the caller. This will provide full access to the influence
 * 		   including the private scope. Only the influence function is registered (also contained in the influence object) and should
 * 		   only be provided as the public interface of the influence. An influence function contains the explicit constructor functions
 * 		   as properties.
 * 		9. A constructor harmonizer and a like defined explicit constructor are mutually exclusive.
 */
"use strict";

var Yaga = require('../Yaga');

module.exports = influence;
influence.lookup = lookupRegistry;
Object.freeze(influence);

const Registry = new Map(); // Registry of well known Influences
const InfCreators = new WeakMap(); // Map of Influence creators to Influence objects
const Scopes = new WeakMap(); // Map of private scope objects to public influence instances

var ScopeID = 0; // Scope ID allocate to each private scope

function influence(oDesc) {
	if (typeof oDesc !== 'object' || (!oDesc.hasOwnProperty('prototype') && !oDesc.hasOwnProperty('composition')))
		throw new Error(`Invalid influence descriptor '${oDesc}'`);
	let oInf = {
		typeName: 'Influence',
		isanInfluence: true,
		prototype: {},
	};
	if (oDesc.prototype) prototypeInfluence(oInf, oDesc);
	else compositionInfluence(oInf, oDesc);
	Object.freeze(oInf.prototype);
	Object.freeze(oInf);
	return (oInf);
}

function prototypeInfluence(oInf, oDesc) {
	if (typeof oDesc.prototype !== 'object')
		throw new Error(`Invalid influence prototype descriptor '${oDesc.prototype}'`);
	processName(oInf, oDesc);
	Object.keys(oDesc.prototype).forEach(prop => {
		switch (prop) {
			case 'thisArg_':
				copyThisArgProps(oInf.prototype, oDesc.prototype[prop]);
				break;
			case 'private_':
				copyPrivateProps(oInf, oDesc.prototype[prop]);
				break;
			default:
				copyProperty(oInf.prototype, prop, oDesc.prototype);
				break;
		}
	});
	makeConstructors(oInf, oDesc);
}

function makeConstructors(oInf, oDesc) {
	if (oDesc.constructor && oDesc.constructors)
		throw new error("Influence descriptor has both a 'constructor' and 'constructors' property");
	if (oDesc.constructors) {
		if (!oDesc.constructors.default)
			throw new error("Influence descriptor must have a 'default' constructor ");
		oInf.constructors = {};
		Object.keys(oDesc.constructors).forEach(prop => {
			let constructor = makeConstructor(oInf, oDesc.constructors[prop]);
			if (prop === 'default') oInf.defaultConstructor = constructor;
			else oInf.constructors[prop] = constructor;
		});
	} else if (oDesc.hasOwnProperty('constructor'))
		oInf.defaultConstructor = makeConstructor(oInf, oDesc.constructor);
	else
		oInf.defaultConstructor = () => undefined;
	Object.freeze(oInf.constructors);
	// Now need to build the creator functions that will answer an instance of the influence
	// Named creator functions are attached the the default creator
	makeCreators(oInf);
	InfCreators.set(oInf.create, oInf);
	Object.freeze(oInf.create);
}

function makeConstructor(oInf, conForm) {
	let ty = typeof conForm;
	if (ty === 'object') {
		return function () {
			Object.assign(this, conForm);
		};
	} else if (ty === 'function') {
		return (conForm);
	} else if (Array.isArray(conForm)) {
		if (conForm.length !== 2 || typeof conForm[0] !== 'function' || typeof conForm[1] !== 'object')
			throw new error(`Invalid influence constructor array form '${conForm}'`);
		return function (...args) {
			Object.assign(this, conForm);
			return (conForm.call(this, ...args));
		};
	}
	throw new error(`Invalid influence constructor form '${conForm}'`);
}

function makeCreators(oInf) {
	// The public creator 'create' holds the named creators as properties.
	oInf.create = makeCreator(oInf, oInf.defaultConstructor);
	if (!oInf.constructors) return;
	Object.keys(oInf.constructors).forEach(prop => {
		oInf.create[prop] = makeCreator(oInf, oInf.constructors[prop]);
	});
}

function makeCreator(oInf, fConstructor) {
	return (...args) => {
		let o = Object.create(oInf.prototype);
		let res = fConstructor.call(o, ...args);
		return (res === undefined ? o : res);
	};
}

function processName(oInf, oDesc) {
	if (oDesc.register && oDesc.name)
		throw new error(`Influence descriptor contains both 'register' and 'name' properties`);
	oInf.name = oDesc.register || oDesc.name || '<anonymous>';
	oInf.prototype.typeName = oInf.name;
	if (oDesc.register)
		Registry.set(oInf.name, oInf);
}

function copyPrivateProps(oInf, oSrc) {
	if (typeof oSrc !== 'object')
		throw new error(`Influence 'private_' property must be an object`);
	oInf.privatePrototype = {};
	allocatePrivateAccessFunction(oInf);
	Object.keys(oSrc).forEach(prop => {
		switch (prop) {
			case 'thisArg_':
				copyThisArgProps(oInf.privatePrototype, oSrc[prop]);
				break;
			default:
				copyProperty(oInf.privatePrototype, prop, oSrc);
				break;
		}
	});
	Object.freeze(oInf.privatePrototype);
}

function allocatePrivateAccessFunction(oInf) {
	let scopeID = 'sid' + ++ScopeID;
	oInf.scopeID = scopeID;
	oInf.private = oPublic => {
		let oScopes = Scopes.get(oPublic);
		if (!oScopes) Scopes.set(oPublic, (oScopes = {}));
		let oScope = oScopes[scopeID];
		if (!oScope) oScopes[scopeID] = oScope = Object.create(oInf.privatePrototype);
		return (oScope);
	};
}

function copyThisArgProps(oTgt, oSrc) {
	if (typeof oSrc !== 'object')
		throw new error(`Influence 'thisarg_' property must be an object`);
	Object.keys(oSrc).forEach(prop => {
		let sDesc = Object.getOwnPropertyDescriptor(oSrc, prop);
		if (typeof sDesc.value === 'function')
			sDesc.value = Yaga.thisArg(sDesc.value);
		Object.defineProperty(oTgt, prop, sDesc);
	});
}

function copyProperty(oTgt, tProp, oSrc, sProp = tProp) {
	Object.defineProperty(oTgt, tProp, Object.getOwnPropertyDescriptor(oSrc, sProp));
}

function lookupRegistry(name) {
	if (name.includes(':')) {
		let i = name.indexof(':');
		require(name.substr(0, i));
		name = name.substr(i + 1);
	}
	return (Registry.get(name));
}
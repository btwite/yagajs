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
 * 			prototype: {			// Prototype properties for this influence instances
 * 				...
 * 				thisArg_: {			// Bounded prototype functions require 'this' argument not 'this' property.
 * 				},
 * 				private_: {			// Private properties of the prototype. Can also contain 'thisArg_'.
 * 				},
 * 				protected_: {		// Protected properties of the prototype. Can also contain 'thisArg_'.
 * 				}
 * 			},
 * 			constructor: { <property inialisation object> } | fInitialiser | // fn gets access to instance via 'this'.
 * 							[ fInit, <init object> ],
 * 			static: {				// Static properties for the Infleunce
 * 				...
 * 				thisArg_: {			// Bounded prototype functions require 'this' argument not 'this' property.
 * 				},
 * 				protected_: {		// Protected static properties of the Influence. Can also contain 'thisArg_'.
 * 				},
 * 			}
 * 		}
 * 		Composition form:
 * 		{
 * 			register: | name:,		// As for Prototype form
 * 			composition: [			// List of composable influences ordered from highest significant to lowest
 * 				<descriptor> | influence object | influence function | <registry name>,
 * 				...
 * 			],
 * 			harmonizers: {
 * 				default: {
 * 					prototype: 'none' | 'least' | 'most',	// Default is 'most'
 * 					static: 'none' | 'least' | 'most',		// Default is 'none'
 * 					constructor: 'none' | 'least' | 'most',	// Default is 'none'
 * 				},
 * 				prototype: {		// Harmonizers for prototype properties. Can also contain 'thisArg_'.
 * 					...
 * 					protected_: {	// Harmonizers for protected properties. Can also contain 'thisArg_'.
 * 					},
 * 				},
 * 				static: {			// Harmonizers for static influence properties. Can also contain 'thisArg_'.
 * 					...
 * 					protected_: {	// Harmonizers for protected properties. Can also contain 'thisArg_'.
 * 					},
 * 				},
 * 				constructor:,		// Influence constructor harmonizer
 * 			},
 * 		}
 * 
 *  Notes:
 * 		1. Both 'register' and 'name' are optional. Influence treated as anonymous. Mutually exclusive
 * 		2. Private properties cannot be harmonized. Remain accessible to original prototype functions.
 * 		3. The 'harmonization' property can be replaced with 'harmonizers' if Influence defaults apply.
 * 		4. Harmonizers are functions that are bound to the influence object and can access 
 * 		   composable prototype public properties to form a harmonized property value. A composable is 
 * 		   referencable by name or index position in composition list. Influence provides a short hand to
 * 		   map to a specific Influence occurrence or a ordered sequence of occurences with the one
 * 		   argument list.
 * 		5. A harmonizer function value will need to use .call, .apply or .bind to forward requests to composable prototype functions
 * 		6. Influence(oDesc) will answer the influence object to the caller. This will provide full access to the influence
 * 		   including the private scope. Only the influence 'create' function is registered and should only be provided as the 
 * 		   public interface of the influence. The influence 'create' function contains references to the public static properties.
 *		7. The Influence 'create' function will invoke the constructor bound to the new instance. The constructor can return an alternate
 *		   object. The instance object will be assumed if the constructor returns undefined.
 * 	    8. A constructor initialisation object can have a 'private_' sub-object to init the private scope.
 * 	    9. A constructor initialisation object can have a 'protected_' sub-object to init the protected scope.
 * 	   10. A constructor initialisation object will be applied via a deep copy to the new instance.
 * 	   11. Static functions are bound to an Influence static object. The static object includes an 'influence' property back link
 *		   to the Influence object.
 *	   12. Protected static properties are located in the static object, but cannot be directly referenced from the 'create' function object.
 */
"use strict";

var Yaga = require('../Yaga');

module.exports = newInfluence;
newInfluence.lookup = lookupRegistry;
Object.freeze(newInfluence);

const Registry = new Map(); // Registry of well known Influences
const InfCreators = new WeakMap(); // Map of Influence creators to Influence objects
const PrivateScopes = new WeakMap(); // Map of private scope objects to public influence instances
const ProtectedScopes = new WeakMap(); // Map of protected scope objects to public influence instances
const SymPublic = Symbol.for('PUBLIC');
const SymProtected = Symbol.for('PROTECTED');
const SymPrivate = Symbol.for('PRIVATE');

var ScopeID = 0; // Scope ID allocate to each private scope

function newInfluence(oDesc) {
	if (typeof oDesc !== 'object' || (!oDesc.hasOwnProperty('prototype') && !oDesc.hasOwnProperty('composition')))
		throw new Error(`Invalid influence descriptor '${oDesc}'`);
	let oInf = {
		typeName: 'Influence',
		isanInfluence: true,
		prototype: {
			copy: Yaga.thisArg(copy),
		},
	};
	if (oDesc.prototype) prototypeInfluence(oInf, oDesc);
	else compositionInfluence(oInf, oDesc);
	Object.seal(oInf.prototype);
	Object.freeze(oInf.create);
	Object.freeze(oInf);
	return (oInf);
}

function prototypeInfluence(oInf, oDesc) {
	if (typeof oDesc.prototype !== 'object')
		throw new Error(`Invalid influence prototype descriptor '${oDesc.prototype}'`);
	oInf.isaPrototype = true;
	oInf.isaComposition = false;
	processName(oInf, oDesc);
	Object.keys(oDesc.prototype).forEach(prop => {
		switch (prop) {
			case 'thisArg_':
				copyThisArgProps(oInf.prototype, oDesc.prototype[prop]);
				break;
			case 'private_':
				copyPrivatePrototypeProps(oInf, oDesc.prototype[prop]);
				break;
			case 'protected_':
				copyProtectedPrototypeProps(oInf, oDesc.prototype[prop]);
				break;
			default:
				copyProperty(oInf.prototype, prop, oDesc.prototype);
				break;
		}
	});
	makeCreator(oInf, makeConstructor(oInf, oDesc));
	makeStatics(oInf, oDesc);
}

function makeStatics(oInf, oDesc) {
	if (!oDesc.static) return;
	if (typeof oDesc.static !== 'object')
		throw new error("Influence 'static' property must be an object");
	oInf.static = {
		influence: oInf
	};
	Object.keys(oDesc.static).forEach(prop => {
		switch (prop) {
			case 'thisArg_':
				copyThisArgProps(oInf.static, oDesc.static[prop]);
				Object.keys(oDesc.static.thisArg_).forEach(p => staticToCreator(oInf, p));
				break;
			case 'protected_':
				makeProtectedStatics(oInf, oDesc.static.protected_);
				break;
			default:
				copyProperty(oInf.static, prop, oDesc.static);
				staticToCreator(oInf, prop);
				break;
		}
	});
	Object.seal(oInf.static);
}

function staticToCreator(oInf, prop) {
	let desc = Object.getOwnPropertyDescriptor(oInf.static, prop);
	if (typeof desc.value === 'function') {
		oInf.create[prop] = desc.value.bind(oInf.static);
	} else if (desc.get || desc.set) {
		let getter = desc.get,
			setter = desc.set;
		if (desc.get) desc.get = () => getter.call(oInf.static);
		if (desc.set) desc.set = (v) => setter.call(oInf.static, v);
		defineProperty(oInf.create, prop, desc);
	} else {
		desc.get = () => oInf.static[prop];
		if (desc.writable)
			desc.set = (v) => oInf.static[prop] = v;
		delete desc.value;
		delete desc.writable;
		defineProperty(oInf.create, prop, desc);
	}
}

function makeProtectedStatics(oInf, oProt) {
	if (typeof oProt !== 'object')
		throw new error("Influence 'protected_' property must be an object");
	Object.keys(oProt).forEach(prop => {
		switch (prop) {
			case 'thisArg_':
				copyThisArgProps(oInf.static, oProt[prop]);
				break;
			default:
				copyProperty(oInf.static, prop, oProt);
				break;
		}
	});
}

function makeCreator(oInf, fConstructor) {
	oInf.create = (...args) => {
		let o = Object.create(oInf.prototype);
		let res = fConstructor.call(o, ...args);
		return (res === undefined ? o : res);
	};
}

function makeConstructor(oInf, oDesc) {
	if (!oDesc.hasOwnProperty('constructor'))
		return (oInf.constructor = () => undefined);

	let conForm = oDesc.constructor,
		ty = typeof conForm;
	if (ty === 'object') {
		let oInit = makePrivateProtectedInitialiser(oInf, conForm);
		return function () {
			copyInitialisers(oInf, this, oInit);
		};
	} else if (ty === 'function') {
		return (oInf.constructor = conForm);
	} else if (Array.isArray(conForm)) {
		if (conForm.length !== 2 || typeof conForm[0] !== 'function' || typeof conForm[1] !== 'object')
			throw new error(`Invalid influence constructor array form '${conForm}'`);
		let oInit = makePrivateProtectedInitialiser(oInf, conForm[1]);
		return (oInf.constructor = function (...args) {
			copyInitialisers(oInf, this, oInit);
			return (conForm[0].call(this, ...args));
		});
	}
	throw new error(`Invalid influence constructor form '${conForm}'`);
}

function makePrivateProtectedInitialiser(oInf, oInit) {
	if (!oInit.private_ && !oInit.protected_) return (oInit);
	oInit = Object.assign({}, oInit);
	if (oInit.private_) {
		let oPrivate = oInit.private_;
		if (typeof oPrivate !== 'object')
			throw new Error("Constructor private initialiser must be an object");
		allocatePrivateAccessScope(oInf);
		delete oInit.private_;
		oInit[SymPrivate] = oPrivate;
	}
	if (oInit.protected_) {
		let oProtected = oInit.protected_;
		if (typeof oProtected !== 'object')
			throw new Error("Constructor protected initialiser must be an object");
		allocateProtectedAccessScope(oInf);
		delete oInit.protected_;
		oInit[SymProtected] = oProtected;
	}
	return (oInit);
}

function processName(oInf, oDesc) {
	if (oDesc.register && oDesc.name)
		throw new error(`Influence descriptor contains both 'register' and 'name' properties`);
	oInf.name = oDesc.register || oDesc.name || '<anonymous>';
	oInf.prototype.typeName = oInf.name;
	oInf.prototype['isa' + oInf.name] = true;
	if (oDesc.register)
		Registry.set(oInf.name, oInf);
}

function copyPrivatePrototypeProps(oInf, oSrc) {
	if (typeof oSrc !== 'object')
		throw new error(`Influence 'private_' property must be an object`);
	allocatePrivateAccessScope(oInf);
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

function copyProtectedPrototypeProps(oInf, oSrc) {
	if (typeof oSrc !== 'object')
		throw new error(`Influence 'protected_' property must be an object`);
	allocateProtectedAccessScope(oInf);
	Object.keys(oSrc).forEach(prop => {
		switch (prop) {
			case 'thisArg_':
				copyThisArgProps(oInf.protectedPrototype, oSrc[prop]);
				break;
			default:
				copyProperty(oInf.protectedPrototype, prop, oSrc);
				break;
		}
	});
	Object.freeze(oInf.protectedPrototype);
}

function allocatePrivateAccessScope(oInf) {
	if (oInf.privatePrototype) return;
	let scopeID = 'sid' + ++ScopeID;
	oInf.scopeID = scopeID;
	oInf.private = oPublic => {
		oPublic = oPublic[SymPublic] || oPublic;
		let oScopes = PrivateScopes.get(oPublic);
		if (!oScopes) {
			(oScopes = {})[SymPublic] = oPublic;
			PrivateScopes.set(oPublic, oScopes);
		}
		let oScope = oScopes[scopeID];
		if (!oScope) oScopes[scopeID] = oScope = Object.create(oInf.privatePrototype);
		return (oScope);
	};
	oInf.privatePrototype = {};
	allocatePublicAccessScope(oInf);
}

function allocateProtectedAccessScope(oInf) {
	if (oInf.protectedPrototype) return;
	oInf.protected = oPublic => {
		oPublic = oPublic[SymPublic] || oPublic;
		let oScope = ProtectedScopes.get(oPublic);
		if (oScope) {
			(oScope = Object.create(oInf.protectedPrototype))[SymPublic] = oPublic;
			ProtectedScopes.set(oPublic, oScope);
		}
		return (oScope);
	};
	oInf.protectedPrototype = {};
	allocatePublicAccessScope(oInf);
}

function allocatePublicAccessScope(oInf) {
	if (oInf.public) return;
	oInf.public = o => o[SymPublic] || o;
}

function copyThisArgProps(oTgt, oSrc) {
	if (typeof oSrc !== 'object')
		throw new error(`Influence 'thisarg_' property must be an object`);
	Object.keys(oSrc).forEach(prop => {
		let sDesc = Object.getOwnPropertyDescriptor(oSrc, prop);
		if (typeof sDesc.value === 'function')
			sDesc.value = Yaga.thisArg(sDesc.value);
		defineProperty(oTgt, prop, sDesc);
	});
}

function copyProperty(oTgt, tProp, oSrc, sProp = tProp) {
	defineProperty(oTgt, tProp, Object.getOwnPropertyDescriptor(oSrc, sProp));
}

function defineProperty(oTgt, prop, desc) {
	if (typeof desc.value === 'function')
		desc.writable = false;
	desc.configurable = false;
	Object.defineProperty(oTgt, prop, desc);
}

function copyInitialisers(oInf, oTgt, oInit) {
	if (oInit[SymPrivate])
		copyInitialiser(oInf.private(oTgt), oInit[SymPrivate]);
	copyInitialiser(oTgt, oInit);
}

function copyInitialiser(oTgt, oInit) {
	Object.keys(oInit).forEach(prop => {
		let val = oInit[prop];
		if (typeof val === 'object')
			val = Array.isArray(val) ? copyArrayInitialiser(val) : copyInitialiser({}, val);
		oTgt[prop] = val;
	});
	return (oTgt);
}

function copyArrayInitialiser(ia) {
	let oa = [];
	ia.forEach(v => {
		if (Array.isArray(v))
			v = copyArrayInitialiser(v);
		else if (typeof v === 'object')
			v = copyInitialiser({}, v);
		oa.push(v);
	});
	return (oa);
}

function lookupRegistry(name) {
	if (name.includes(':')) {
		let i = name.indexof(':');
		require(name.substr(0, i));
		name = name.substr(i + 1);
	}
	return (Registry.get(name));
}

function copy(oInst) {
	let o = Object.create(Object.getPrototypeOf(oInst));
	return (Object.assign(o, oInst));
}
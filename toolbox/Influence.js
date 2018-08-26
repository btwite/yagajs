/*
 *  Influence: @file
 *
 *  Influence is an object composer that in its simplest form describes a prototype  
 *  a constructor for creating an instance and static properties. Simple influences can then be
 *  composed into a composite Influence that itself is a single prototype, constructor and statics.
 *  A composition is an array (ordered form highest to lowest significance) of Influences.
 *  An influence may be in descriptor form which will be firstly transformed into an influence
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
 * 				defaults: {
 * 					prototype: <See below>,			// Default is '.most.'
 * 					static: <See below>,			// Default is '.none.'
 * 					constructor: <See below>,		// Default is '.none.'
 * 				},
 * 				prototype: {		// Harmonizers for prototype properties. Can also contain 'thisArg_'.
 * 					<property>: <idx> | <name> | '.none.' | '.least.' | '.most.' | ['.least.'] | 
 * 								['.most.'] | [(<idx> | <name>) ...] | fHarmonizer
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
 * 		4. Harmonizers can be one of the following forms:
 * 				1. <idx> - Take property from the composable at the given index position.
 * 				2. <name> - Take property from the composable of the given name.
 * 				3. '.none.' - Don't harmonize, will override a harmonizing default.
 * 							  WARNING: Influence will not have this property.
 * 				4. '.least.' - Take property from least significant composable.
 * 				5. '.most.' - Take property from most significant composable.
 * 				6. ['.least.'] - Call matching property function for each composable in least significant order
 * 				7. [['.least.]] - Array of property values in least significant order. Implemented as getter.
 * 				8. ['.most.'] - Call matching property function for each composable in most significant order
 * 				9. [['.most.]] - Array of property values in most significant order. Implemented as getter.
 * 			   10. [ ... ] - List of 2 or more ordered <idx>|<name> of composables to call matching property function
 * 			   11. [[ ... ]] - Property values of ordered <idx>|<name> composables. Implemented as getter.
 * 			   12. fHarmonizer - User function that returns a property descriptor that represents the harmonization of the 
 * 				   named property. 'fHarmonizer' is called during the construcion of the composition influence and is 
 * 				   bound to an object that contains helper functions for assisting the construction of the harmonized property.
 * 						getComposable(<idx>|<name>) : Answer the composable access object by index or name.
 * 						getProperty(<idx>|<name>, sProp) : Answer a property descriptor for a given composable
 * 						getProperties(sProp, '.least.'|'.most.') : Answer all matching properties in '.least.' or '.most.'
 * 															   	   significant order. Optional, defaults to '.least.'.
 * 						makeCallable([composable fns ...]) : Answer a function that calls list of fns in order with the same
 * 															 argument list and returns result of last function called.
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

module.exports = Object.freeze({
	Influence
});
Influence.lookup = lookupRegistry;
Object.freeze(Influence);

const Registry = new Map(); // Registry of well known Influences
const InfCreators = new WeakMap(); // Map of Influence creators to Influence objects
const Scopes = new WeakMap(); // Map of scope objects to public influence instances
const SymPublic = Symbol.for('PUBLIC');
const SymProtected = Symbol.for('PROTECTED');
const SymPrivate = Symbol.for('PRIVATE');
const Most = '.most.';
const Least = '.least.';
const None = '.none.';
const Anonymous = '<anonymous>';

const HarmonizerDefaults = {
	prototype: Most,
	static: None,
	constructor: None
};

var ScopeID = 0; // Scope ID allocate to each private scope

function Influence(oDesc) {
	if (typeof oDesc !== 'object' || (!oDesc.hasOwnProperty('prototype') && !oDesc.hasOwnProperty('composition')))
		throw new Error(`Invalid influence descriptor '${oDesc}'`);
	let oInf = {
		typeName: 'Influence',
		isanInfluence: true,
		prototype: {
			copy: Yaga.thisArg(copy),
		},
	};
	if (oDesc.hasOwnProperty('prototype'))
		prototypeInfluence(oInf, oDesc);
	else if (oDesc.hasOwnProperty('composition'))
		compositionInfluence(oInf, oDesc);
	else
		throw new Error("Influence descriptor missing 'prototype' or 'composition' property");
	delete oInf.temp; // Only need 'temp' while we are constructing the composition
	Object.seal(oInf.prototype);
	Object.freeze(oInf.create);
	Object.freeze(oInf);
	InfCreators.set(oInf.create, oInf);
	return (oInf);
}

function compositionInfluence(oInf, oDesc) {
	if (typeof oDesc.composition !== 'object')
		throw new Error(`Invalid influence composition descriptor '${oDesc.composition}'`);
	oInf.isaPrototype = false;
	oInf.isaComposition = true;
	processName(oInf, oDesc);
	processComposition(oInf, oDesc);
	processProperties(oDesc.harmonizers, {
		prototype: () => harmonize(oInf, 'prototype', oDesc.harmonizers.prototype),
		static: () => harmonize(oInf, 'staticObject', oDesc.harmonizers.static),
		constructor: () => harmonizeConstructor(oInf, oDesc.harmonizers.constructor),
		_other_: () => {}
	});
	let harmDefaults = Object.assign({}, HarmonizerDefaults); // Fill the gaps
	harmDefaults = Object.assign(harmDefaults, oDesc.harmonizers.defaults || {});
	applyHarmonizeProtoypeDefault(oInf, harmDefaults.prototype);
	applyHarmonizeStaticDefault(oInf, harmDefaults.static);
	applyHarmonizeConstructorDefault(oInf, harmDefaults.constructor);

	makeCreator(oInf, makeConstructor(oInf, oDesc)); //???????
}

function harmonize(oInf, tProp, oDesc) {
	if (oDesc === undefined) return;
	if (typeof oDesc !== 'object')
		throw new Error(`Invalid influence composition harmonizer '${oDesc}'`);
	processProperties(oDesc, {
		thisArg_: () => harmonize(oInf, tProp, copyThisArgProps({}, oDesc.thisArg_)),
		protected_: () => harmonizeProtected(oInf, tProp, oDesc.protected_),
		_other_: prop => harmonizeProperty(oInf, tProp, oDesc, prop)
	});
}

function harmonizeProtected(oInf, tProp, oDesc) {
	tProp = 'protected' + tProp[0].toUpperCase() + tProp.substr(1);
	tProp === 'protectedStaticObject' ? allocateProtectedStaticScope(oInf) : allocateProtectedScope(oInf);
	harmonize(oInf, tProp, oDesc);
}

function harmonizeConstructor(oInf, oDesc) {
	_harmonizeProperty(oInf, oDesc, 'constructor',
		(inf, prop) => Object.getOwnPropertyDescriptor(inf, prop));
}

function harmonizeProperty(oInf, iProp, oDesc, prop) {
	oInf[iProp][prop]
	_harmonizeProperty(oInf, oDesc, prop,
		(inf, prop) => inf[iProp] && Object.getOwnPropertyDescriptor(inf[iProp], prop));
}

function _harmonizeProperty(oInf, oDesc, prop, fInfProp) {
	let desc, inf, vHarm = oDesc[prop],
		infs = oInf.temp.influences;
	switch (typeof vHarm) {
		case 'number':
			if (vHarm < 0 || vHarm >= infs.length)
				throw new Error(`Composable index '${vHarm}' is out of range`);
			if (!(desc = fInfProp(infs[vHarm], prop)))
				throw new Error(`Indexed composable property '${prop}' not found`);
			return (desc);
		case 'string':
			switch (vHarm) {
				case Least:
					desc = fInfProp(infs[infs.length - 1], prop);
					break;
				case Most:
					desc = fInfProp(infs[0], prop);
					break;
				case None:
					desc = {
						value: undefined,
					};
					break;
				default:
					if (!(inf = oInf.keyedComposables[vHarm]))
						throw new Error(`Composable named '${vHarm}' not found`);
					desc = fInfProp(inf, prop);
					break;
			}
			if (!desc)
				throw new Error(`Named composable property '${prop}' not found`);
			return (desc);
		case 'object':
			if (!Array.isArray(vHarm))
				throw new Error(`Invalid harmonizer '${vHarm}'`);
			if (vHarm.length === 1) {
				if (typeof vHarm[0] === 'string' && (vHarm[0] === Least || vHarm[0] === Most)) {

				} else if (Array.isArray(vHarm[0]) && vHarm[0].length === 1 &&
					(vHarm[0][0] === Least || vHarm[0][0] === Most)) {

				} else
					throw new Error(`Invalid harmonizer '${vHarm}'`);
			}
			break;
		case 'function':
			break;
		default:
			throw new Error(`Invalid harmonizer '${vHarm}'`);
	}
}

//  * 					<property>: <idx> | <name> | '.none.' | '.least.' | '.most.' | ['.least.'] | 
// * 								['.most.'] | [(<idx> | <name>) ...] | fHarmonizer

function processComposition(oInf, oDesc) {
	if (!Array.isArray(oInf.composition))
		throw new Error(`Invalid influence composition descriptor '${oDesc.composition}'`);
	oInf.temp = {};
	oInf.temp.influences = [];
	oInf.temp.keyedComposables = {};
	oInf.composables = [];
	oInf.composition.forEach(comp => {
		let inf;
		oInf.composables.push(comp);
		switch (typeof comp) {
			case 'object':
				comp = inf = comp.isanInfluence ? comp : Influence(o);
				break;
			case 'function':
				inf = InfCreators.get(comp);
				break;
			case 'string':
				if ((inf = lookupRegistry(comp)) === undefined)
					throw new Error(`Influence composable '${comp}' not found`);
				break;
			default:
				throw new Error(`Influence composition contains the invalid element '${comp}'`);
		}
		oInf.composables.push(comp);
		oInf.temp.influences.push(inf);
		if (inf.name !== Anonymous)
			oInf.keyedComposables[inf.name] = inf;
	});
	// Prepare a composite objects that contain all composable property names to process.
	['prototype', 'protectedPrototype', 'staticObject', 'protectedStaticObject'].forEach(s => {
		mergeChildPropertyNames(oInf, s)
	});
	Object.freeze(oInf.composables);
}

function mergeChildPropertyNames(oInf, sParent) {
	if (!inf[sParent]) return;
	let oTgt = {};
	oInf.temp[sParent] = oTgt;
	oInf.temp.influences.forEach(inf => {
		Object.keys(inf[sParent]).forEach(prop => oTgt[prop] = true);
	});
}


function prototypeInfluence(oInf, oDesc) {
	if (typeof oDesc.prototype !== 'object')
		throw new Error(`Invalid influence prototype descriptor '${oDesc.prototype}'`);
	oInf.isaPrototype = true;
	oInf.isaComposition = false;
	processName(oInf, oDesc);
	processProperties(oDesc.prototype, {
		thisArg_: () => copyThisArgProps(oInf.prototype, oDesc.prototype.thisArg_),
		private_: () => copyPrivatePrototypeProps(oInf, oDesc.prototype.private_),
		protected_: () => copyProtectedPrototypeProps(oInf, oDesc.prototype.protected_),
		_other_: prop => copyProperty(oInf.prototype, prop, oDesc.prototype)
	});
	makeCreator(oInf, makeConstructor(oInf, oDesc));
	makeStatics(oInf, oDesc);
}

function makeStatics(oInf, oDesc) {
	if (!oDesc.static) return;
	if (typeof oDesc.static !== 'object')
		throw new error("Influence 'static' property must be an object");
	oInf.staticObject = {
		influence: oInf
	};
	processProperties(oDesc.static, {
		thisArg_: () => copyThisArgProps(oInf.staticObject, oDesc.static[prop]),
		protected_: () => copyProtectedStaticProps(oInf, oDesc.static.protected_),
		_other_: prop => copyProperty(oInf.staticObject, prop, oDesc.static),
	});
	Object.seal(oInf.staticObject);
	copyStaticPropsToCreator(oInf);
}

function copyStaticPropsToCreator(oInf) {
	Object.keys(oInf.staticObject).forEach(prop => {
		let desc = Object.getOwnPropertyDescriptor(oInf.staticObject, prop);
		if (typeof desc.value === 'function') {
			oInf.create[prop] = desc.value.bind(oInf.staticObject);
		} else if (desc.get || desc.set) {
			let getter = desc.get,
				setter = desc.set;
			if (desc.get) desc.get = () => getter.call(oInf.staticObject);
			if (desc.set) desc.set = (v) => setter.call(oInf.staticObject, v);
			defineProperty(oInf.create, prop, desc);
		} else {
			desc.get = () => oInf.staticObject[prop];
			if (desc.writable)
				desc.set = (v) => oInf.staticObject[prop] = v;
			delete desc.value;
			delete desc.writable;
			defineProperty(oInf.create, prop, desc);
		}
	});
}

function copyProtectedStaticProps(oInf, oSrc) {
	if (typeof oSrc !== 'object')
		throw new error(`Influence static 'protected_' property must be an object`);
	allocateProtectedStaticScope(oInf);
	processProperties(oSrc, {
		thisArg_: () => copyThisArgProps(oInf.protectedStaticObject, oSrc[prop]),
		_other_: prop => copyProperty(oInf.protectedStaticObject, prop, oSrc)
	});
	Object.seal(oInf.protectedStaticObject);
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
		allocatePrivateScope(oInf);
		delete oInit.private_;
		oInit[SymPrivate] = oPrivate;
	}
	if (oInit.protected_) {
		let oProtected = oInit.protected_;
		if (typeof oProtected !== 'object')
			throw new Error("Constructor protected initialiser must be an object");
		allocateProtectedScope(oInf);
		delete oInit.protected_;
		oInit[SymProtected] = oProtected;
	}
	return (oInit);
}

function processName(oInf, oDesc) {
	if (oDesc.register && oDesc.name)
		throw new error(`Influence descriptor contains both 'register' and 'name' properties`);
	oInf.name = oDesc.register || oDesc.name || Anonymous;
	oInf.prototype.typeName = oInf.name;
	oInf.prototype['isa' + oInf.name] = true;
	if (oDesc.register)
		Registry.set(oInf.name, oInf);
}

function copyPrivatePrototypeProps(oInf, oSrc) {
	if (typeof oSrc !== 'object')
		throw new error(`Influence 'private_' property must be an object`);
	allocatePrivateScope(oInf);
	processProperties(oSrc, {
		thisArg_: () => copyThisArgProps(oInf.privatePrototype, oSrc[prop]),
		_other_: prop => copyProperty(oInf.privatePrototype, prop, oSrc)
	});
	Object.seal(oInf.privatePrototype);
}

function copyProtectedPrototypeProps(oInf, oSrc) {
	if (typeof oSrc !== 'object')
		throw new error(`Influence 'protected_' property must be an object`);
	allocateProtectedScope(oInf);
	processProperties(oSrc, {
		thisArg_: () => copyThisArgProps(oInf.protectedPrototype, oSrc[prop]),
		_other_: prop => copyProperty(oInf.protectedPrototype, prop, oSrc)
	});
	Object.seal(oInf.protectedPrototype);
}

function processProperties(o, oDesc) {
	if (typeof o !== 'object')
		throw new error(`Object expected found '${o}'`);
	Object.keys(o).forEach(prop => {
		if (oDesc.hasOwnProperty(prop))
			return (oDesc[prop](prop));
		return (oDesc._other_(prop));
	});
}

function allocatePrivateScope(oInf) {
	if (oInf.private) return;
	oInf.private = allocateScope(oInf, 'private', 'privatePrototype');
	oInf.privatePrototype = {};
	allocatePublicScope(oInf);
}

function allocateProtectedScope(oInf) {
	if (oInf.protected) return;
	oInf.protected = allocateScope(oInf, 'protected', 'protectedPrototype');
	oInf.protectedPrototype = {};
	allocatePublicScope(oInf);
}

function allocateProtectedStaticScope(oInf) {
	if (oInf.protectedStatic) return;
	oInf.protectedStatic = allocateScope(oInf, 'protectedStatic', 'protectedStaticObject');
	oInf.protectedStaticObject = {
		influence: oInf
	};
	oInf.static = o => o[SymPublic] || o;
}

function allocateScope(oInf, sScope, sProt) {
	if (!oInf.scopeID) oInf.scopeID = ++ScopeID;
	let id = sScope + ':sid' + oInf.scopeID;
	return oPublic => {
		oPublic = oPublic[SymPublic] || oPublic;
		let oScopes = Scopes.get(oPublic);
		if (!oScopes) Scopes.set(oPublic, (oScopes = {}));
		let oScope = oScopes[id];
		if (!oScope)(oScopes[id] = oScope = Object.create(oInf[sProt]))[SymPublic] = oPublic;
		return (oScope);
	};
}

function allocatePublicScope(oInf) {
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
	return (oTgt);
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
	if (oInit[SymProtected])
		copyInitialiser(oInf.protected(oTgt), oInit[SymProtected]);
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
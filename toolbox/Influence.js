/*
 *  Influence: @file
 *
 *  Influence is an object composer that in its simplest form describes a prototype and
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
 * 				private_: {			// Private static properties of the Influence. Can also contain 'thisArg_'.
 * 				},
 * 				protected_: {		// Protected static properties of the Influence. Can also contain 'thisArg_'.
 * 				},
 * 			}
 * 		}
 * 		Composition form:
 * 		{
 * 			register: | name:,		// As for Prototype form
 * 			composition: [			// List of composable influences ordered from highest significant to lowest
 * 				<descriptor> | <influence object> | <influence function> | <registry name>,
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
 * 		3. An influence can have a static and prototype specification, each with a public, private and 
 * 		   protected scope. The private scope is local to the defining influence, where as the protected
 * 		   scope is essentially a private shadow scope of the public scope. Both protected and public
 * 		   properties can be merged and harmonized in an influence composition. Local scopes are never
 * 		   merged or harmonize but are created as required as separate scopes in any composite influence
 * 		   when referenced by other public or protected functions.
 * 				Example: Influence 'foo' has a private property 'bar', whilst the influence 'foo1' also
 * 						 has a private 'bar'. When combined into a composite influence the originating 'foo' 
 * 						 and 'foo1' functions will continue to reference a separate instance of the 'bar' 
 * 						 property.
 * 		4. Harmonizers can be one of the following forms:
 * 				1. <idx> - Take property from the composable at the given index position.
 * 				2. <name> - Take property from the composable of the given name.
 * 				3. '.none.' - Don't harmonize, will override a harmonizing default.
 * 							  WARNING: The influence will not have this property.
 * 				4. '.least.' - Take property from least significant composable.
 * 				5. '.most.' - Take property from most significant composable.
 * 				6. ['.least.'] - Call matching property function for each composable in least significant order
 * 				7. ['.most.'] - Call matching property function for each composable in most significant order
 * 			    8. [ ... ] - List of 2 or more ordered <idx>|<name> of composables to call matching property function
 * 			    9. fHarmonizer - User function that returns a property descriptor that represents the harmonization of the 
 * 				   named property. Can also return a value for anything other than an object with a 'value', 'get' or 'set'.
 * 				   'fHarmonizer' is called during the construction of the composition influence and is 
 * 				   bound to an object that contains helper functions for assisting the construction of the harmonized property.
 * 						hasProperty(<idx>|<name>, sProp) : Will answer a property descriptor for a given composable or undefined.
 * 						getProperty(<idx>|<name>, sProp) : Answer a property descriptor for a given composable
 * 						getProperties(sProp, '.least.'|'.most.', ty) : Answer all matching properties in '.least.' or '.most.'
 * 															   	       significant order. Optional, defaults to '.least.'. Can
 * 																	   also nominate expected type such as 'function'.
 * 						selectProperties(sProp, [<idx>|<name>], ty) :  Answer an array with the matching properties from the selected
 * 																	   composables.
 * 						makeCallable([composable fns ...]) : Answer a function descriptor that calls list of fns or descriptors in order with the same
 * 															 argument list and returns result of last function called.
 * 		5. A harmonizer function value will need to use .call, .apply or .bind to forward requests to composable prototype functions
 * 		6. Influence(oDesc) will answer the influence object to the caller. This will provide full access to the influence
 * 		   including the scope functions. Only the influence 'create' function is registered and should only be provided as the 
 * 		   public interface of the influence. The influence 'create' function object contains the public static properties.
 *		7. The Influence 'create' function will invoke the constructor bound to the new instance. The constructor can return an alternate
 *		   object. The instance object will be assumed if the constructor returns undefined.
 * 	    8. A constructor initialisation object can have a 'private_' sub-object to init the private scope.
 * 	    9. A constructor initialisation object can have a 'protected_' sub-object to init the protected scope.
 * 	   10. A constructor initialisation object will be applied via a deep copy (clone) to the new instance.
 * 	   11. Static functions are bound to an Influence static object. The static object includes an 'influence' property back link
 *		   to the Influence object.
 *	   12. Protected static properties are located in the static object, but cannot be directly referenced from the 'create' function object.
 *	   13. Standard properties :
 *				1. 'copy' and 'clone' will create a shallow or deep descriptor level copy of an influence instance. Located in public prototype.
 *				2. 'bindThis' will answer a bound function for an influence instance. Ex. foo.bindThis('fbar')
 *				   The same bound function will be answered for a given instance/function combination. Located in the public, private and
 *				   protected prototypes. Not supported in the static scope.
 *				3. 'assign' will create a shallow value level copy of an influence instance. Located in public prototype.
 *	   14. A constructor initalisation object can contain a 'do_' public, private or protected sub-object that defineds initialisation functions
 *		   that are invoked during instance creation to set individual property values. The arguments are passed and 'this' is not set.
 *		   The returned value is assigned to the property. This facility can remove the need for a constructor function where the setting of
 *		   initial property values requires runtime processing.
 *
 * 	Future Enhancements:
 * 		1. Influence.inheritsFrom(<inf instance>, <inf object> | <inf function> | <registry name>) - Checks whether the object is an
 * 		   instance of the influence identified by Influence, create factory function or registery name.
 * 		2. Influence.isInfluencedBy(<as above>) - Checks whether the object is an instance of an influence and that the identified influence
 * 		   is inherited from or is a composable of a composition. Note will recursively examine composables that are also compositions.
 */
"use strict";

var _ = undefined;
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
const SymRoot = Symbol.for('ROOT');
const SymBindMap = Symbol.for('BindMap');
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
	};
	oInf.prototype = defineConstant({}, 'copy', Yaga.thisArg(copy), false);
	defineConstant(oInf.prototype, 'clone', Yaga.thisArg(clone), false);
	defineConstant(oInf.prototype, 'assign', Yaga.thisArg(assign), false);
	defineConstant(oInf.prototype, 'bindThis', Yaga.thisArg(bindThis), false);
	if (oDesc.hasOwnProperty('prototype'))
		prototypeInfluence(oInf, oDesc);
	else if (oDesc.hasOwnProperty('composition'))
		compositionInfluence(oInf, oDesc);
	else
		throw new Error("Influence descriptor missing 'prototype' or 'composition' property");
	Object.seal(oInf.prototype);
	Object.freeze(oInf.create);
	Object.freeze(oInf);
	InfCreators.set(oInf.create, oInf);
	if (oInf.static && oInf.static.isScoped)
		Scopes.set(oInf.static.object, {
			[SymRoot]: oInf.static
		});
	return (oInf);
}

function compositionInfluence(oInf, oDesc) {
	if (typeof oDesc.composition !== 'object')
		throw new Error(`Invalid influence composition descriptor '${oDesc.composition}'`);
	oInf.isaPrototype = false;
	oInf.isaComposition = true;
	processName(oInf, oDesc);
	processComposition(oInf, oDesc);
	Yaga.dispatchPropertyHandlers(oDesc.harmonizers, {
		prototype: () => harmonize(oInf, _, 'prototype', oDesc.harmonizers.prototype),
		static: () => {
			allocStaticSegment(oInf);
			harmonize(oInf, 'static', 'object', oDesc.harmonizers.static);
		},
		constructor: () => harmonizeConstructor(oInf, oDesc.harmonizers.constructor)
	});
	let harmDefaults = Object.assign({}, HarmonizerDefaults); // Fill the gaps
	harmDefaults = Object.assign(harmDefaults, oDesc.harmonizers.defaults || {});
	applyDefaultHarmonizer(oInf, 'prototype', harmDefaults.prototype);
	applyDefaultStaticHarmonizer(oInf, 'object', harmDefaults.static);
	makeCreator(oInf, applyDefaultConstructorHarmonizer(oInf, harmDefaults.constructor));
	if (oInf.static) {
		oInf.temp.influences.forEach(inf => {
			if (inf.static && inf.static.isScoped)
				oInf.static.isScoped = true;
		});
		Object.seal(oInf.static.object);
		copyStaticPropsToCreator(oInf);
	}
	oInf.temp.influences.forEach(inf => {
		if (inf.isScoped) oInf.isScoped = true;
	});
	delete oInf.temp; // Only need 'temp' while we are constructing the composition
}

function allocStaticSegment(oInf) {
	if (!oInf.static) {
		oInf.static = {};
		oInf.static.object = defineConstant({}, 'influence', oInf, false);
	}
}

function getSegment(oTgt, sSeg) {
	return (sSeg ? oTgt[sSeg] : oTgt)
}

function applyDefaultHarmonizer(oInf, tProp, vHarm) {
	let oTgt = oInf[tProp];
	if (!oInf.temp[tProp] || !oTgt || vHarm === None)
		return;
	_applyDefaultHarmonizer(oInf, _, oTgt, oInf.temp, tProp, vHarm);
}

function applyDefaultStaticHarmonizer(oInf, tProp, vHarm) {
	if (!oInf.temp.static[tProp] || vHarm === None)
		return;
	allocStaticSegment(oInf);
	let oTgt = oInf.static[tProp];
	if (!oTgt)
		return;
	_applyDefaultHarmonizer(oInf, 'static', oTgt, oInf.temp.static, tProp, vHarm);
}

function _applyDefaultHarmonizer(oInf, sSeg, oTgt, oTemp, tProp, vHarm) {
	Object.keys(oTemp[tProp]).forEach(prop => {
		if (oTgt.hasOwnProperty(prop)) return;
		let desc = _harmonizeProperty(oInf, vHarm, prop, getInternalHarmonizers(oInf, (inf, prop) => {
			let oSeg = getSegment(inf, sSeg);
			return (oSeg && oSeg[tProp] && Object.getOwnPropertyDescriptor(oSeg[tProp], prop))
		}));
		defineProperty(oTgt, prop, desc);
	});
}

function applyDefaultConstructorHarmonizer(oInf, vHarm) {
	if (!oInf.hasOwnProperty('constructor')) {
		if (vHarm === None)
			oInf.constructor = () => undefined;
		else
			defineProperty(oInf, 'constructor', _harmonizeConstructor(oInf, vHarm));
	}
	return (oInf.constructor);
}

function harmonize(oInf, sSeg, tProp, oDesc) {
	let harmonizers = getInternalHarmonizers(oInf, (inf, prop) => {
		let oSeg = getSegment(inf, sSeg);
		return (oSeg && oSeg[tProp] && Object.getOwnPropertyDescriptor(oSeg[tProp], prop));
	});
	_harmonize(oInf, sSeg, tProp, oDesc, harmonizers);
}

function _harmonize(oInf, sSeg, tProp, oDesc, harmonizers) {
	if (oDesc === undefined) return;
	if (typeof oDesc !== 'object')
		throw new Error(`Invalid influence composition harmonizer '${oDesc}'`);
	Yaga.dispatchPropertyHandlers(oDesc, {
		thisArg_: () => _harmonize(oInf, sSeg, tProp, copyThisArgProps({}, oDesc.thisArg_), harmonizers),
		protected_: () => harmonizeProtected(oInf, sSeg, oDesc.protected_),
		_other_: prop => harmonizeProperty(oInf, sSeg, tProp, oDesc, prop, harmonizers)
	});
}

function harmonizeProtected(oInf, sSeg, oDesc) {
	sSeg ? allocateProtectedStaticScope(oInf) : allocateProtectedScope(oInf);
	harmonize(oInf, sSeg, 'protectedPrototype', oDesc);
}

function harmonizeConstructor(oInf, oDesc) {
	defineProperty(oInf, 'constructor', _harmonizeConstructor(oInf, oDesc.constructor));
}

function _harmonizeConstructor(oInf, vHarm) {
	_harmonizeProperty(oInf, vHarm, 'constructor',
		getInternalHarmonizers(oInf, (inf, prop) => Object.getOwnPropertyDescriptor(inf, prop)));
}

function harmonizeProperty(oInf, sSeg, tProp, oDesc, prop, harmonizers) {
	let oSeg = getSegment(oInf, sSeg);
	defineProperty(oSeg[tProp], prop, _harmonizeProperty(oInf, oDesc[prop], prop, harmonizers));
}

function _harmonizeProperty(oInf, vHarm, prop, harmonizers) {
	let err = () => {
		throw new Error(`Invalid harmonizer '${vHarm}'`)
	};
	return ({
		number: harmonizers.indexedProperty,
		string: (...args) => {
			return ({
				[Least]: harmonizers.leastProperty,
				[Most]: harmonizers.mostProperty,
				[None]: harmonizers.noneProperty,
			}[vHarm] || harmonizers.namedProperty)(...args);
		},
		object: (...args) => {
			if (!Array.isArray(vHarm))
				throw new Error(`Invalid harmonizer '${vHarm}'`);
			if (vHarm.length === 1) {
				return ({
					[Least]: harmonizers.leastAllFunctions,
					[Most]: harmonizers.mostAllFunctions,
				}[vHarm[0]] || err)(...args);
			}
			return (harmonizers.selectedFunctions(...args));
		},
		function: harmonizers.func
	}[typeof vHarm] || err)(prop, vHarm);
}

function processComposition(oInf, oDesc) {
	if (!Array.isArray(oDesc.composition))
		throw new Error(`Invalid influence composition descriptor '${oDesc.composition}'`);
	oInf.temp = {};
	oInf.temp.static = {};
	oInf.temp.influences = [];
	oInf.temp.keyedInfluences = {};
	oInf.composables = [];
	oDesc.composition.forEach(comp => {
		let inf = resolveInfluenceReference(comp, () => {
			return (comp = Influence(comp));
		});
		if (!inf)
			throw new Error(`Influence '${comp}' not found`);
		oInf.composables.push(comp);
		oInf.temp.influences.push(inf);
		if (inf.name !== Anonymous)
			oInf.temp.keyedInfluences[inf.name] = inf;
	});
	// Prepare a composite objects that contain all composable property names to process.
	mergeChildPropertyNames(oInf, inf => inf.prototype, o => oInf.temp.prototype = o);
	mergeChildPropertyNames(oInf, inf => inf.protectedPrototype, o => oInf.temp.protectedPrototype = o);
	let getStatic = (inf, sScope) => inf.static && inf.static[sScope];
	let assignStatic = (sScope, o) => {
		if (!oInf.temp.static)
			oInf.temp.static = {};
		oInf.temp.static[sScope] = o
	}
	mergeChildPropertyNames(oInf, inf => getStatic(inf, 'prototype'), o => assignStatic('prototype', o));
	mergeChildPropertyNames(oInf, inf => getStatic(inf, 'protectedPrototype'), o => assignStatic('protectedPrototype', o));
	if (oInf.temp.static)
		(oInf.static = {}).object = defineConstant({}, 'influence', oInf, false);
	Object.freeze(oInf.composables);
}

function mergeChildPropertyNames(oInf, fGet, fAssign) {
	let oTgt = {},
		count = 0;
	oInf.temp.influences.forEach(inf => {
		let oSrc = fGet(inf);
		if (!oSrc) return;
		Object.keys(oSrc).forEach(prop => {
			count++;
			oTgt[prop] = true;
		});
	});
	if (count > 0)
		fAssign(oTgt);
}

function resolveInfluenceReference(rInf, fDescriptor) {
	switch (typeof rInf) {
		case 'object':
			return (rInf.isanInfluence ? rInf : (fDescriptor ? fDescriptor(rInf) : Influence(rInf)));
		case 'function':
			return (InfCreators.get(rInf))
		case 'string':
			return (lookupRegistry(rInf));
		default:
			throw new Error(`Influence reference is invalid '${rInf}'`);
	}
}


function prototypeInfluence(oInf, oDesc) {
	if (typeof oDesc.prototype !== 'object')
		throw new Error(`Invalid influence prototype descriptor '${oDesc.prototype}'`);
	oInf.isaPrototype = true;
	oInf.isaComposition = false;
	processName(oInf, oDesc);
	Yaga.dispatchPropertyHandlers(oDesc.prototype, {
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
	oInf.static = {};
	oInf.static.object = defineConstant({}, 'influence', oInf, false);
	Yaga.dispatchPropertyHandlers(oDesc.static, {
		thisArg_: () => copyThisArgProps(oInf.static.object, oDesc.static[prop]),
		private_: () => copyPrivateStaticProps(oInf, oDesc.static.private_),
		protected_: () => copyProtectedStaticProps(oInf, oDesc.static.protected_),
		_other_: prop => copyProperty(oInf.static.object, prop, oDesc.static),
	});
	Object.seal(oInf.static.object);
	copyStaticPropsToCreator(oInf);
}

function copyStaticPropsToCreator(oInf) {
	let oStatic = oInf.static.object;
	Object.keys(oStatic).forEach(prop => {
		let desc = Object.getOwnPropertyDescriptor(oStatic, prop);
		if (typeof desc.value === 'function') {
			oInf.create[prop] = desc.value.bind(oStatic);
		} else if (desc.get || desc.set) {
			let getter = desc.get,
				setter = desc.set;
			if (desc.get) desc.get = () => getter.call(oStatic);
			if (desc.set) desc.set = (v) => setter.call(oStatic, v);
			defineProperty(oInf.create, prop, desc);
		} else {
			desc.get = () => oStatic[prop];
			if (desc.writable)
				desc.set = (v) => oStatic[prop] = v;
			delete desc.value;
			delete desc.writable;
			defineProperty(oInf.create, prop, desc);
		}
	});
}

function copyPrivateStaticProps(oInf, oSrc) {
	if (typeof oSrc !== 'object')
		throw new error(`Influence static 'private_' property must be an object`);
	allocatePrivateStaticScope(oInf);
	Yaga.dispatchPropertyHandlers(oSrc, {
		thisArg_: () => copyThisArgProps(oInf.static.privatePrototype, oSrc[prop]),
		_other_: prop => copyProperty(oInf.static.privatePrototype, prop, oSrc)
	});
	Object.seal(oInf.static.privatePrototype);
}

function copyProtectedStaticProps(oInf, oSrc) {
	if (typeof oSrc !== 'object')
		throw new error(`Influence static 'protected_' property must be an object`);
	allocateProtectedStaticScope(oInf);
	Yaga.dispatchPropertyHandlers(oSrc, {
		thisArg_: () => copyThisArgProps(oInf.static.protectedPrototype, oSrc[prop]),
		_other_: prop => copyProperty(oInf.static.protectedPrototype, prop, oSrc)
	});
	Object.seal(oInf.static.protectedPrototype);
}

function makeCreator(oInf, fConstructor) {
	oInf.create = (...args) => {
		let o = Object.create(oInf.prototype);
		if (oInf.isScoped)
			Scopes.set(o, {
				[SymRoot]: oInf
			});
		let res = fConstructor.call(o, ...args);
		return (res !== undefined ? res : o);
	};
}

function makeConstructor(oInf, oDesc) {
	if (!oDesc.hasOwnProperty('constructor'))
		return (oInf.constructor = () => undefined);

	let conForm = oDesc.constructor,
		ty = typeof conForm;
	if (ty === 'object') {
		makePrivateProtectedInitialiser(oInf, conForm);
		return function () {
			copyInitialisers(oInf, this);
		};
	} else if (ty === 'function') {
		return (oInf.constructor = conForm);
	} else if (Array.isArray(conForm)) {
		if (conForm.length !== 2 || typeof conForm[0] !== 'function' || typeof conForm[1] !== 'object')
			throw new error(`Invalid influence constructor array form '${conForm}'`);
		makePrivateProtectedInitialiser(oInf, conForm[1]);
		return (oInf.constructor = function (...args) {
			copyInitialisers(oInf, this);
			return (conForm[0].call(this, ...args));
		});
	}
	throw new error(`Invalid influence constructor form '${conForm}'`);
}

function makePrivateProtectedInitialiser(oInf, oInit) {
	if (!oInit.private_ && !oInit.protected_) return (oInf.oInitialiser = oInit);
	oInf.publicInitialiser = _clone(oInit, {});
	if (oInit.do_) {
		oInf.publicDo = oInit.do_;
		delete oInf.publicInitialiser.do_;
	}
	if (oInit.private_) {
		if (typeof oInit.private_ !== 'object')
			throw new Error("Constructor private initialiser must be an object");
		allocatePrivateScope(oInf);
		oInf.privateInitialiser = oInf.publicInitialiser.private_;
		delete oInf.publicInitialiser.private_;
		if (oInf.privateInitialiser.do_) {
			oInf.privateDo = oInf.privateInitialiser.do_;
			delete oInf.privateInitialiser.do_;
		}
	}
	if (oInit.protected_) {
		if (typeof oInit.protected_ !== 'object')
			throw new Error("Constructor protected initialiser must be an object");
		allocateProtectedScope(oInf);
		oInf.protectedInitialiser = oInf.publicInitialiser.protected_;
		delete oInf.publicInitialiser.protected_;
		if (oInf.protectedInitialiser.do_) {
			oInf.protectedDo = oInf.protectedInitialiser.do_;
			delete oInf.protectedInitialiser.do_;
		}
	}
}

function processName(oInf, oDesc) {
	if (oDesc.register && oDesc.name)
		throw new error(`Influence descriptor contains both 'register' and 'name' properties`);
	oInf.name = oDesc.register || oDesc.name || Anonymous;
	defineConstant(oInf.prototype, 'typeName', oInf.name, false);
	defineConstant(oInf.prototype, 'isa' + oInf.name, true, false);
	if (oDesc.register)
		Registry.set(oInf.name, oInf);
}

function copyPrivatePrototypeProps(oInf, oSrc) {
	if (typeof oSrc !== 'object')
		throw new error(`Influence 'private_' property must be an object`);
	allocatePrivateScope(oInf);
	Yaga.dispatchPropertyHandlers(oSrc, {
		thisArg_: () => copyThisArgProps(oInf.privatePrototype, oSrc[prop]),
		_other_: prop => copyProperty(oInf.privatePrototype, prop, oSrc)
	});
	Object.seal(oInf.privatePrototype);
}

function copyProtectedPrototypeProps(oInf, oSrc) {
	if (typeof oSrc !== 'object')
		throw new error(`Influence 'protected_' property must be an object`);
	allocateProtectedScope(oInf);
	Yaga.dispatchPropertyHandlers(oSrc, {
		thisArg_: () => copyThisArgProps(oInf.protectedPrototype, oSrc[prop]),
		_other_: prop => copyProperty(oInf.protectedPrototype, prop, oSrc)
	});
	Object.seal(oInf.protectedPrototype);
}

function allocatePrivateScope(oInf) {
	_allocatePrivateScope(oInf, _, defineConstant({}, 'bindThis', Yaga.thisArg(bindThis), false));
}

function allocateProtectedScope(oInf) {
	_allocateProtectedScope(oInf, _, defineConstant({}, 'bindThis', Yaga.thisArg(bindThis), false));
}

function allocatePrivateStaticScope(oInf) {
	_allocatePrivateScope(oInf, 'static', defineConstant({}, 'influence', oInf, false));
}

function allocateProtectedStaticScope(oInf) {
	_allocateProtectedScope(oInf, 'static', defineConstant({}, 'influence', oInf, false));
}

function _allocatePrivateScope(oInf, sTgt, oInit) {
	let oTgt = (sTgt && oInf[sTgt]) || oInf;
	if (oTgt.private) return;
	oTgt.isScoped = true;
	if (!oInf.scopeID) oInf.scopeID = ++ScopeID;
	let id = (sTgt || 'inf') + '.private:sid:' + oInf.scopeID;
	oTgt.private = scopeFunction(oTgt, id, () => oTgt.privatePrototype);
	oTgt.privatePrototype = oInit;
}

function _allocateProtectedScope(oInf, sTgt, oInit) {
	let oTgt = (sTgt && oInf[sTgt]) || oInf;
	if (oTgt.protected) return;
	oTgt.isScoped = true;
	let id = (sTgt || 'inf') + '.protected';
	oTgt.protected = scopeFunction(oTgt, id, oScopes => oScopes[SymRoot].protectedPrototype);
	oTgt.protectedPrototype = oInit;
}

function scopeFunction(oTgt, id, fProt) {
	oTgt.public = o => o[SymPublic] || o;
	return oPublic => {
		let oScopes = Scopes.get(oPublic = oPublic[SymPublic] || oPublic);
		let oScope = oScopes[id];
		if (oScope)
			return (oScope);
		oScope = oScopes[id] = Object.create(fProt(oScopes));
		oScope[SymPublic] = oPublic;
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
		defineProperty(oTgt, prop, sDesc);
	});
	return (oTgt);
}

function copyProperty(oTgt, tProp, oSrc, sProp = tProp) {
	defineProperty(oTgt, tProp, Object.getOwnPropertyDescriptor(oSrc, sProp));
}

function defineConstant(oTgt, prop, val, flEnum = true) {
	Object.defineProperty(oTgt, prop, {
		value: val,
		configurable: false,
		writable: false,
		enumerable: flEnum
	});
	return (oTgt);
}

function defineProperty(oTgt, prop, desc, flEnum = true) {
	if (typeof desc.value === 'function')
		desc.writable = false;
	desc.configurable = false;
	desc.enumerable = flEnum;
	Object.defineProperty(oTgt, prop, desc);
	return (oTgt);
}

function copyInitialisers(oInf, oTgt) {
	if (oInf.privateInitialiser) {
		let o = oInf.private(oTgt);
		_clone(oInf.privateInitialiser, o);
		if (oInf.privateDo)
			runDoInitialisers(oInf.privateDo, o)
	}
	if (oInf.protectedInitialiser) {
		let o = oInf.protected(oTgt);
		_clone(oInf.protectedInitialiser, o);
		if (oInf.protectedDo)
			runDoInitialisers(oInf.protectedDo, o)
	}
	_clone(oInf.publicInitialiser, oTgt);
	if (oInf.publicDo)
		runDoInitialisers(oInf.publicDo, oTgt)
}

function runDoInitialisers(odo, oTgt) {
	Object.keys(odo).forEach(prop => {
		let f = odo[prop];
		oTgt[prop] = typeof f === 'function' ? f() : f;
	});
}

function lookupRegistry(name) {
	if (name.includes(':')) {
		let i = name.indexof(':');
		require(name.substr(0, i));
		name = name.substr(i + 1);
	}
	return (Registry.get(name));
}

// Standard prototype services

function bindThis(oInst, sProp) {
	// Bind the instance object to a function member of the instance and record the relationship
	// to anwser the same bound function in the future.
	if (typeof oInst[sProp] !== 'function')
		throw new Error(`Property '${sProp}' is not a function`);
	let f = oInst[sProp];
	let map = f[SymBindMap];
	if (!map) {
		f[SymBindMap] = map = new WeakMap();
		map.set(oInst, (bf = f.bind(oInst)));
		return (bf);
	}
	let bf = map.get(oInst);
	if (!bf) map.set(oInst, (bf = f.bind(oInst)));
	return (bf);
}

function copy(oInst) {
	return (_copyClone(oInst, o => _copy(o)))
}

function clone(oInst) {
	return (_copyClone(oInst, o => _clone(o)))
}

function assign(oInst) {
	return (_copyClone(oInst, o => _assign(o)))
}

function _copyClone(oInst, fCopy) {
	// Produce a copy of the public object and scope objects
	let oPublic = fCopy(oInst);
	let scopes = Scopes.get(oInst);
	if (scopes) {
		let newScopes = {};
		Object.keys(scopes).forEach(sScope => (newScopes[sScope] = fCopy(scopes[sScope]))[SymPublic] = oPublic);
		Scopes.set(oPublic, newScopes)
	}
	return (oPublic);
}

function _copy(oSrc, oTgt) {
	if (!oTgt)
		oTgt = Object.create(Object.getPrototypeOf(oSrc));
	Object.defineProperties(oTgt, Object.getOwnPropertyDescriptors(oSrc));
	return (oTgt);
}

function _clone(oSrc, oTgt) {
	if (!oTgt)
		oTgt = Object.create(Object.getPrototypeOf(oSrc));
	let descs = Object.getOwnPropertyDescriptors(oSrc);
	Object.getOwnPropertyNames(descs).forEach(prop => _cloneDescriptor(descs[prop]));
	Object.getOwnPropertySymbols(descs).forEach(sym => _cloneDescriptor(descs[sym]));
	Object.defineProperties(oTgt, descs);
	return (oTgt);
}

function _assign(oSrc, oTgt) {
	if (!oTgt)
		oTgt = Object.create(Object.getPrototypeOf(oSrc));
	Object.assign(oTgt, oSrc);
	return (oTgt);
}

function _cloneDescriptor(desc) {
	if (desc.value)
		desc.value = _cloneValue(desc.value);
	return (desc);
}

function _cloneValue(v) {
	if (v) {
		if (Array.isArray(v))
			v = _cloneArray(v);
		else if (typeof v === 'object')
			v = _clone(v);
	}
	return (v);
}

function _cloneArray(ai) {
	let ao = [];
	ai.forEach(v => ao.push(_cloneValue(v)));
	return (ao);
}


// Harmonizer support

function getInternalHarmonizers(oInf, fPropDesc) {
	// Prepare the helper functions for the harmonizers
	let infs = oInf.temp.influences;
	let keyInfs = oInf.temp.keyedInfluences;
	let helpers = {
		hasProperty(idInf, sProp) {
			let desc, ty = typeof idInf;
			switch (ty) {
				case 'number':
					if (idInf < 0 || idInf >= infs.length)
						throw new Error(`Composable index '${idInf}' is out of range`);
					desc = fPropDesc(infs[idInf], sProp);
					break;
				case 'string':
					if (!keyInfs[idInf])
						throw new Error(`Composable name '${idInf}' is missing`);
					desc = fPropDesc(keyInfs[idInf], sProp);
					break;
				case 'object':
					if (idInf.isanInfluence) { // Internal harmonizers only
						desc = fPropDesc(idInf, sProp);
						break;
					}
				default:
					throw new Error(`Invalid composable identifier '${idInf}'`);
			}
			// Only enumerable properties can be returned.
			return (desc.enumerable ? desc : undefined);
		},
		getProperty(idInf, sProp) {
			let desc = this.hasProperty(idInf, sProp);
			if (!desc) {
				let name = typeof idInf === 'number' ? infs[idInf].name : (keyInfs[idInf] && keyInfs[idInf].name) || Anonymous;
				throw new Error(`Composable property '${name}.${sProp}' not found`);
			}
			return (desc);
		},
		getProperties(sProp, sOrder, ty) {
			if (sOrder === Least) {
				let i = infs.length;
				return (getProps(sProp, () => --i >= 0 ? infs[i] : undefined, ty));
			} else if (sOrder === Most) {
				let i = -1;
				return (getProps(sProp, () => ++i < infs.length ? infs[i] : undefined, ty));
			}
			new Error(`Order '${sOrder}' is invalid`);
		},
		selectedProperties(sProp, aids, ty) {
			if (!Array.isArray(aids))
				throw new Error(`Composable list is not an array`);
			let a = [];
			aids.forEach(idInf => {
				let desc = this.getProperty(idInf, sProp);
				if (ty && typeof desc.value !== ty) {
					let name = typeof idInf === 'number' ? infs[idInf].name : (keyInfs[idInf] && keyInfs[idInf].name) || Anonymous;
					throw new Error(`Composable property '${name}.${sProp}' is not a '${ty}'`);
				}
				a.push(desc);
			});
			return (a);
		},
		makeCallable(aFns) {
			if (!Array.isArray(aFns)) aFns = [aFns];
			let fns = [];
			aFns.forEach(f => {
				if (typeof f !== 'function') {
					if (typeof f !== 'object' || typeof f.value !== 'function')
						throw new Error(`Function expected. Found '${f}'`);
					f = f.value;
				}
				fns.push(f);
			});
			if (fns.length === 0)
				return () => undefined;
			if (fns.length === 1)
				return (fns[0]);
			return {
				value(...args) {
					let result;
					fns.forEach(f => result = f(...args));
					return (result);
				}
			}
		}
	}

	function getProps(sProp, fNext, ty) {
		let inf, a = [];
		while (inf = fNext()) {
			let desc = fPropDesc(inf, sProp);
			if (!desc || !desc.enumerable) continue;
			if (ty && typeof desc.value !== ty)
				throw new Error(`Composable property '${inf.name}.${sProp}' is not a '${ty}'`);
			a.push(desc);
		}
		return (a);
	}

	function indexedProperty(sProp, idx) {
		return (this.getProperty(idx, sProp));
	}

	function leastProperty(sProp) {
		let desc;
		infs.forEach(inf => {
			let d = this.hasProperty(inf, sProp);
			if (d) desc = d;
		})
		if (!desc)
			throw new Error(`Composable property '${sProp}' not found`);
		return (desc);
	}

	function mostProperty(sProp) {
		for (let i = 0; i < infs.length; i++) {
			let d = this.hasProperty(infs[i], sProp);
			if (d) return (d);
		}
		throw new Error(`Composable property '${sProp}' not found`);
	}

	function noneProperty(sProp) {
		return {
			value: undefined
		}
	}

	function namedProperty(sProp, name) {
		return (this.getProperty(name, sProp));
	}

	function leastAllFunctions(sProp) {
		return (this.makeCallable(this.getProperties(sProp, Least, 'function')));
	}

	function mostAllFunctions(sProp) {
		return (this.makeCallable(this.getProperties(sProp, Most, 'function')));
	}

	function selectedFunctions(sProp, aidInf) {
		return (this.makeCallable(this.selectedProperties(sProp, aidInf, 'function')));
	}

	function func(sProp, f) {
		let desc = f.call(this, sProp);
		if (typeof desc !== 'object' || (!desc.value && !(desc.get || desc.set)))
			desc = {
				value: desc
			};
		return (desc);
	}

	return {
		indexedProperty: indexedProperty.bind(helpers),
		leastProperty: leastProperty.bind(helpers),
		mostProperty: mostProperty.bind(helpers),
		noneProperty: noneProperty.bind(helpers),
		namedProperty: namedProperty.bind(helpers),
		leastAllFunctions: leastAllFunctions.bind(helpers),
		mostAllFunctions: mostAllFunctions.bind(helpers),
		selectedFunctions: selectedFunctions.bind(helpers),
		func: func.bind(helpers)
	};
}
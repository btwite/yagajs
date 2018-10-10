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
 * 			abstract: <as above>,	// Abstract prototype and static specification. No constructor
 * 			constructor: <fInitialiser> | <oInitialiser>,
 * 			createExit: <function>	// Pre-empt construction after examining constructor arguments.
 * 			static: {				// Static properties for the Influence
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
 * 			harmonizers: <GroupHarmonizers> | {
 * 				defaults: {
 * 					prototype: <Harmonizers>,		// Default is '.most.'
 * 					static: <Harmonizers>,			// Default is '.none.'
 * 					constructor: <Harmonizers>,		// Default is '.none.'
 * 				},
 * 				prototype: <GroupHarmonizers> | {	// Harmonizers for prototype properties. Can also contain 'thisArg_'.
 * 					<property>: 
 * 					...
 * 					protected_: {					// Harmonizers for protected properties. Can also contain 'thisArg_'.
 * 					},
 * 				},
 * 				static: <GroupHarmonizers> | {		// Harmonizers for static influence properties. Can also contain 'thisArg_'.
 * 					...
 * 					protected_: {					// Harmonizers for protected properties. Can also contain 'thisArg_'.
 * 					},
 * 				},
 * 				constructor: <Harmonizers>,			// Influence constructor harmonizer
 * 			},
 * 		}
 * 
 * 	Harmonizer Specs:
 * 		Harmonizers : <idx> | <name> | <Inf Object> | <Inf Creator> | '.none.' | '.least.' | '.most.' | 
 * 						['.least.'] | ['.most.'] | [(<idx> | <name>) ...] | fHarmonizer
 * 		GroupHarmonizers : <idx> | <name> | <Inf Creator> | '.none.' | '.least.' | '.most.' | 
 * 							['.least.'] | ['.most.'] | [(<idx> | <name>) ...] | fHarmonizer
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
 * 				3. <Inf Object> - An influence object.
 * 				4. <Inf Creator> - An exported influence create function if the influence object is not
 * 								   available.
 * 				5. '.none.' - Don't harmonize, will override a harmonizing default.
 * 							  WARNING: The influence will not have this property.
 * 				6. '.least.' - Take property from least significant composable.
 * 				7. '.most.' - Take property from most significant composable.
 * 				8. ['.least.'] - Call matching property function for each composable in least significant order
 * 				9. ['.most.'] - Call matching property function for each composable in most significant order
 * 			   10. [ ... ] - List of 2 or more ordered <idx>|<name> of composables to call matching property function
 * 			   11. fHarmonizer - User function that returns a property descriptor that represents the harmonization of the 
 * 				   named property. Can also return a value for anything other than an object with a 'value', 'get' or 'set'.
 * 				   'fHarmonizer' is called during the construction of the composition influence and is 
 * 				   bound to an object that contains helper functions for assisting the construction of the harmonized property.
 * 						hasProperty(<idx>|<name>|<inf>|<create>, sProp) : Will answer a property descriptor for a given composable or undefined.
 * 						getProperty(<idx>|<name>|<inf>|<create>, sProp) : Answer a property descriptor for a given composable
 * 						getProperties(sProp, '.least.'|'.most.', ty) : Answer all matching properties in '.least.' or '.most.'
 * 															   	       significant order. Optional, defaults to '.least.'. Can
 * 																	   also nominate expected type such as 'function'.
 * 						selectProperties(sProp, [<idx>|<name>|<inf>|<create>], ty) :  Answer an array with the matching properties from the selected
 * 																	   				  composables.
 * 						makeCallable([composable fns ...]) : Answer a function descriptor that calls list of fns or descriptors in order with the same
 * 															 argument list and returns result of last function called.
 * 		5. A harmonizer function value will need to use .call, .apply or .bind to forward requests to composable prototype functions
 * 		6. Influence(oDesc) will answer the influence object to the caller. This will provide full access to the influence
 * 		   including the scope functions. Only the influence 'create' function is registered and should only be provided as the 
 * 		   public interface of the influence. The influence 'create' function object contains the public static properties.
 *		7. The Influence 'create' function will invoke the constructor bound to the new instance. The 'create' function will always answer
 *		   an instance of the influence. Static functions are required for alternate objects to be returned.
 * 	    8. A constructor initialisation object can have the following structural properties:
 * 				'private_': object to init the private scope.
 * 				'protected_': object to init the protected scope.
 * 				'thisArg_': object containing function properties that take a this argument. Can also appear in 'private_', 'protected_' & 'freeze_'.
 * 				'freeze_': object containing initialisations to be frozen. Can also appear in 'private_' & 'protected_'.
 * 	    9. A constructor initialisation object will be applied via a deep copy (clone) to the new instance.
 * 	   10. A constructor initialisation function can directly update the instance object via 'this' and/or return a constructor descriptor
 * 		   object. The constructor descriptor values will be shallow copied to the properties. The descriptor can also contain the
 * 		   following structural properties:
 * 				'private_': Updates the private space properties.
 * 				'protected_': Updates the protected space properties.
 * 				'thisArg_': Sets function properties that take a this argument. Can also appear in 'private_', 'protected_' & 'freeze_'.
 * 				'freeze_': Freezes properties. Can also appear in 'private_' & 'protected_'.
 * 				'do_': Any function value is assumed to be an initialiser for the property and will be invoked passing the instance object 
 * 					   as an argument. Can also appear in 'private_', 'protected_', 'freeze_'.
 * 		   Constructor arguments and other local variables can be bound from the constructor closure.
 * 	   11. Static functions are bound to an Influence static object. The static object includes an 'influence' property back link
 *		   to the Influence object.
 *	   12. Protected static properties are located in the static object, but cannot be directly referenced from the 'create' function object.
 *	   12. Standard properties :
 *				1. 'copy' and 'clone' will create a shallow or deep descriptor level copy of an influence instance. Located in public prototype.
 *				2. 'bindThis' will answer a bound function for an influence instance. Ex. foo.bindThis('fbar')
 *				   The same bound function will be answered for a given instance/function combination. Located in the public, private and
 *				   protected prototypes. Not supported in the static scope.
 *				3. 'assign' allows the properties of an object to be copied into the influence instance. 
 *				   A descriptor level copy is performed allowing the frozen prototype properties to be overriden
 *				   in the instance. Located in public prototype.
 *				4. 'extend' creates a POJO that extends the influence instance and optionally assigns an object template
 *				   to the extension. The template is assigned at a descriptor level. Located in the public prototype.
 *	   13. 'createExit' can examine the constructor arguments and answer a pre-defined object before construction begins.
 *			An 'undefined' will allow construction to continue.
 *	   14. <GroupHarmonizers> is a shorthand default that can be applied to a complete group. Excludes the use of <InfObject>.
 *		   'defaults' section should be used if there is a mixture of individual property harmonizers and a common default
 *         for other properties in the group.
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
var Exps, Mods;

module.exports = Object.freeze({
	Influence,
	Initialise: (x, m) => {
		Exps = x;
		Mods = m;
	}
});
Influence.lookup = lookupRegistry;
Object.freeze(Influence);

const Registry = new Map(); // Registry of well known Influences
const InfCreators = new WeakMap(); // Map of Influence creators to Influence objects
const Scopes = new WeakMap(); // Map of scope objects to public influence instances
const SymPublic = Symbol.for('Public');
const SymValidIDs = Symbol.for('ValidScopeIDS')
const SymRoot = Symbol.for('Root');
const SymBindMap = Symbol.for('BindMap');
const Most = '.most.';
const Least = '.least.';
const None = '.none.';
const Anonymous = '<anonymous>';
const FreezeProp = true;

const FreezeExclusions = {
	private: true,
	protected: true
}

const HarmonizerDefaults = {
	prototype: Most,
	constructor: Most,
	static: None,
};

function Influence(oDesc) {
	if (typeof oDesc !== 'object')
		throw new Error(`Invalid influence descriptor '${oDesc}'`);
	if (oDesc.hasOwnProperty('abstract'))
		return (abstractInfluence(oDesc));

	let oInf = {
		typeName: 'Influence',
		isanInfluence: true,
		compositeMembership: [],
	};
	if (oDesc.createExit) {
		if (typeof oDesc.createExit !== 'function')
			throw new Error("Influence descriptor 'createExit' property must be a function");
		oInf.createExit = oDesc.createExit;
	}
	oInf.prototype = defineConstant({}, 'copy', Yaga.thisArg(copy), false);
	defineConstant(oInf.prototype, 'clone', Yaga.thisArg(clone), false);
	defineConstant(oInf.prototype, 'assign', Yaga.thisArg(assign), false);
	defineConstant(oInf.prototype, 'extend', Yaga.thisArg(extend), false);
	defineConstant(oInf.prototype, 'bindThis', Yaga.thisArg(bindThis), false);
	defineConstant(oInf.prototype, 'isanInfluenceInstance', true, true);
	if (oDesc.hasOwnProperty('prototype'))
		prototypeInfluence(oInf, oDesc);
	else if (oDesc.hasOwnProperty('composition'))
		compositionInfluence(oInf, oDesc);
	else if (oDesc.hasOwnProperty('constructor'))
		prototypeInfluence(oInf, oDesc);
	else
		throw new Error("Influence descriptor missing 'prototype', 'composition' or 'constructor' property");
	return (finaliseInfluence(oInf));
}

function abstractInfluence(oDesc) {
	if (typeof oDesc !== 'object')
		throw new Error(`Invalid influence descriptor '${oDesc}'`);
	if (oDesc.hasOwnProperty('prototype'))
		throw new Error("Influence descriptor has both a 'prototype' and 'abstract' property");
	let oInf = {
		typeName: 'Influence',
		isanInfluence: true,
		isAbstract: true,
		compositeMembership: [],
	};
	oInf.prototype = {};
	prototypeInfluence(oInf, oDesc);
	return (finaliseInfluence(oInf));
}

function finaliseInfluence(oInf) {
	Object.freeze(oInf.prototype);
	Object.freeze(oInf.create);
	freezeProperties(oInf);
	InfCreators.set(oInf.create, oInf);
	if (!oInf.private) oInf.private = getDefaultPrivateFn(oInf);
	if (!oInf.protected) oInf.protected = getDefaultProtectedFn(oInf);
	oInf.public = o => o[SymPublic] || o;
	if (oInf.static) {
		oInf.static.public = oInf.public;
		if (!oInf.static.private) oInf.static.private = getDefaultStaticPrivateFn(oInf);
		if (!oInf.static.protected) oInf.static.protected = getDefaultStaticProtectedFn(oInf);
		if (oInf.static.isScoped)
			newScopesObject(oInf.static.object, oInf.static);
		freezeProperties(oInf.static);
	}
	return (oInf);
}

function getDefaultPrivateFn(oInf) {
	return oPublic => {
		lateAllocatePrivateScope(oInf, oPublic); // Will replace oInf.private
		return (oInf.private(oPublic));
	}
}

function getDefaultProtectedFn(oInf) {
	return oPublic => {
		let inf = lateAllocateProtectedScope(oInf, oPublic); // Will replace oInf.protected
		return (inf.protected(oPublic));
	}
}

function getDefaultStaticPrivateFn(oInf) {
	return oPublic => {
		lateAllocateStaticPrivateScope(oInf, oPublic); // Will replace oInf.static.private
		return (oInf.static.private(oPublic));
	}
}

function getDefaultStaticProtectedFn(oInf) {
	return oPublic => {
		let inf = lateAllocateStaticProtectedScope(oInf, oPublic); // Will replace oInf.static.protected
		return (inf.static.protected(oPublic));
	}
}

function compositionInfluence(oInf, oDesc) {
	if (typeof oDesc.composition !== 'object')
		throw new Error(`Invalid influence composition descriptor '${oDesc.composition}'`);
	oInf.isaPrototype = false;
	oInf.isaComposition = true;
	processName(oInf, oDesc);
	processComposition(oInf, oDesc);
	let harmonizers = oDesc.harmonizers;
	if (isaGroupHarmonizer(harmonizers)) {
		// Apply the same default across all harmonized segments.
		harmonizers = {
			defaults: {
				prototype: harmonizers,
				static: harmonizers,
				constructor: harmonizers
			}
		};
	} else if (typeof harmonizers === 'object') {
		harmonizers = Object.assign({}, harmonizers);
		if (!harmonizers.default)
			harmonizers.default = {};
		Yaga.dispatchPropertyHandlers(harmonizers, {
			prototype: () => {
				if (isaGroupHarmonizer(harmonizers.prototype))
					harmonizers.defaults.prototype = harmonizers.prototype;
				else
					harmonize(oInf, _, 'prototype', harmonizers.prototype)
			},
			static: () => {
				if (isaGroupHarmonizer(harmonizers.static))
					harmonizers.defaults.static = harmonizers.static;
				else {
					allocStaticSegment(oInf);
					harmonize(oInf, 'static', 'object', harmonizers.static);
				}
			},
			constructor: () => {
				// No requirement for group level harmonization
				harmonizeConstructor(oInf, harmonizers.constructor)
			}
		});
	} else
		harmonizers = {};

	let harmDefaults = Object.assign({}, HarmonizerDefaults); // Fill the gaps
	harmDefaults = Object.assign(harmDefaults, harmonizers.defaults || {});
	applyDefaultHarmonizer(oInf, 'prototype', harmDefaults.prototype);
	applyDefaultHarmonizer(oInf, 'protectedPrototype', harmDefaults.prototype);
	applyDefaultStaticHarmonizer(oInf, 'object', harmDefaults.static);
	applyDefaultStaticHarmonizer(oInf, 'protectedPrototype', harmDefaults.static);
	makeCreator(oInf, applyDefaultConstructorHarmonizer(oInf, harmDefaults.constructor));
	if (oInf.static) {
		for (let i = 0; i < oInf.temp.influences.length; i++) {
			let inf = oInf.temp.influences[i];
			if (inf.static && inf.static.isScoped) {
				oInf.static.isScoped = true;
				getScopeID(oInf.static);
				break;
			}
		}
		Object.seal(oInf.static.object);
		copyStaticPropsToCreator(oInf);
	}
	getCompositeInvolvedComposables(oInf).forEach(inf => {
		propagateScope(oInf, inf);
		propagateScope(oInf.static, inf.static);
		inf.compositeMembership.push(oInf.create); // Just save the creator in composite membership list.
	});
	delete oInf.temp; // Only need 'temp' while we are constructing the composition
}

function isaGroupHarmonizer(harmonizer) {
	return (harmonizer !== undefined && (typeof harmonizer !== 'object' || Array.isArray(harmonizer)));
}

function propagateScope(toTgt, frTgt) {
	if (!frTgt || !toTgt)
		return;
	if (frTgt.isScoped) {
		if (!toTgt.isScoped) {
			toTgt.isScoped = true;
			getScopeID(toTgt);
		}
		// Add scope id of composable as a valid accessor
		toTgt.validScopeIDs[frTgt.scopeID] = true;
	}
}

function getCompositeInvolvedComposables(oInf) {
	let list = [].concat(oInf.temp.influences);
	list.forEach(inf => getInvolvedComposables(inf, list));
	return (list);
}

function getInvolvedComposables(oInf, list) {
	if (!oInf.isaComposition)
		return (list);
	oInf.composables.forEach(comp => {
		let inf = resolveInfluenceReference(comp);
		if (list.includes(inf))
			return;
		list.push(inf);
		getInvolvedComposables(inf, list);
	});
	return (list);
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
	defineProperty(oInf, 'constructor', _harmonizeConstructor(oInf, oDesc));
}

function _harmonizeConstructor(oInf, vHarm) {
	return (_harmonizeProperty(oInf, vHarm, 'constructor',
		getInternalHarmonizers(oInf, (inf, prop) => Object.getOwnPropertyDescriptor(inf, prop))));
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
			} [vHarm] || harmonizers.influenceProperty)(...args);
		},
		object: (...args) => {
			if (!Array.isArray(vHarm))
				return (harmonizers.influenceProperty(...args));
			if (vHarm.length === 1) {
				return ({
					[Least]: harmonizers.leastAllFunctions,
					[Most]: harmonizers.mostAllFunctions,
				} [vHarm[0]] || err)(...args);
			}
			return (harmonizers.selectedFunctions(...args));
		},
		function: (...args) => {
			if (InfCreators.get(vHarm))
				return (harmonizers.influenceProperty(...args));
			return (harmonizers.func(...args));
		},
	} [typeof vHarm] || err)(prop, vHarm);
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
	mergeChildPropertyNames(oInf, inf => getStatic(inf, 'object'), o => assignStatic('object', o));
	mergeChildPropertyNames(oInf, inf => getStatic(inf, 'protectedPrototype'), o => assignStatic('protectedPrototype', o));
	if (oInf.temp.static) {
		if (oInf.temp.static.object)
			(oInf.static = {}).object = defineConstant({}, 'influence', oInf, false);
		if (oInf.temp.static.protectedPrototype)
			allocateProtectedStaticScope(oInf);
	}
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
	oInf.isaPrototype = true;
	oInf.isaComposition = false;
	processName(oInf, oDesc);
	let pDesc = oDesc.prototype || oDesc.abstract;
	if (pDesc) {
		if (typeof pDesc !== 'object')
			throw new Error(`Invalid influence prototype or abstract descriptor '${pDesc}'`);
		Yaga.dispatchPropertyHandlers(pDesc, {
			thisArg_: () => copyThisArgProps(oInf.prototype, pDesc.thisArg_),
			private_: () => copyPrivatePrototypeProps(oInf, pDesc.private_),
			protected_: () => copyProtectedPrototypeProps(oInf, pDesc.protected_),
			_other_: prop => copyProperty(oInf.prototype, prop, pDesc)
		});
	}
	makeCreator(oInf, makeConstructor(oInf, oDesc));
	makeStatics(oInf, oDesc);
}

function makeStatics(oInf, oDesc) {
	if (!oDesc.static) return;
	if (typeof oDesc.static !== 'object')
		throw new Error("Influence 'static' property must be an object");
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
	oInf.create.influenceName = oInf.name; // Allow exported interface to expose the name of the influence
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
		throw new Error(`Influence static 'private_' property must be an object`);
	allocatePrivateStaticScope(oInf);
	Yaga.dispatchPropertyHandlers(oSrc, {
		thisArg_: () => copyThisArgProps(oInf.static.privatePrototype, oSrc[prop]),
		_other_: prop => copyProperty(oInf.static.privatePrototype, prop, oSrc)
	});
	Object.seal(oInf.static.privatePrototype);
}

function copyProtectedStaticProps(oInf, oSrc) {
	if (typeof oSrc !== 'object')
		throw new Error(`Influence static 'protected_' property must be an object`);
	allocateProtectedStaticScope(oInf);
	Yaga.dispatchPropertyHandlers(oSrc, {
		thisArg_: () => copyThisArgProps(oInf.static.protectedPrototype, oSrc[prop]),
		_other_: prop => copyProperty(oInf.static.protectedPrototype, prop, oSrc)
	});
	Object.seal(oInf.static.protectedPrototype);
}

function newScopesObject(oTgt, oRoot) {
	let oScopes;
	Scopes.set(oTgt, oScopes = {
		[SymRoot]: oRoot,
		[SymValidIDs]: oRoot.validScopeIDs,
	});
	return (oScopes);
}

function makeCreator(oInf, fConstructor) {
	oInf.create = oInf.isAbstract ?
		() => {
			throw new Error('Influence is abstract');
		} :
		(...args) => {
			let o;
			if (oInf.createExit && (o = oInf.createExit(...args)) !== undefined)
				return (o);
			o = Object.create(oInf.prototype);
			if (oInf.isScoped) newScopesObject(o, oInf);
			fConstructor.call(o, ...args);
			return (o);
		};
}

function makeConstructor(oInf, oDesc) {
	if (oInf.isAbstract) {
		if (oDesc.hasOwnProperty('constructor'))
			throw new Error('Constructor invalid for an abstract influence');
		return (_);
	}
	if (!oDesc.hasOwnProperty('constructor'))
		return (oInf.constructor = () => undefined);
	let ty = typeof oDesc.constructor;
	if (ty === 'object') {
		makeInitialiserObject(oInf, oDesc.constructor);
		return (oInf.constructor = function () {
			copyInitialisers(oInf, this);
		});
	} else if (ty === 'function')
		return (oInf.constructor = function (...args) {
			let o = oDesc.constructor.call(this, ...args);
			if (typeof o === 'object' && !Array.isArray(o))
				applyInitialisers(oInf, this, o);
		});
	throw new Error(`Invalid influence constructor form '${oDesc.constructor}'`);
}

function makeInitialiserObject(oInf, oInit) {
	function makeInitObject(o, oInit, fAllocScope) {
		if (typeof oInit !== 'object')
			throw new Error("Constructor private/protected initialiser must be an object");
		fAllocScope(oInf);
		Yaga.dispatchPropertyHandlers(oInit, {
			thisArg_: () => copyThisArgProps(o, oInit.thisArg_),
			freeze_: () => freezeInitObjectProps(o, oInit.freeze_),
			_other_: prop => copyProperty(o, prop, oInit)
		});
	}

	function freezeInitObjectProps(o, oInit) {
		Yaga.dispatchPropertyHandlers(oInit, {
			thisArg_: () => copyThisArgProps(o, oInit.thisArg_, FreezeProp),
			_other_: prop => copyProperty(o, prop, oInit, FreezeProp)
		});
	}

	oInf.publicInitialiser = {};
	Yaga.dispatchPropertyHandlers(oInit, {
		private_: () => makeInitObject(oInf.privateInitialiser = {}, oInit.private_, allocatePrivateScope),
		protected_: () => makeInitObject(oInf.protectedInitialiser = {}, oInit.protected_, allocateProtectedScope),
		thisArg_: () => copyThisArgProps(oInf.publicInitialiser, oInit.thisArg_),
		freeze_: () => freezeInitObjectProps(oInf.publicInitialiser, oInit.freeze_),
		_other_: prop => copyProperty(oInf.publicInitialiser, prop, oInit)
	});
}

function processName(oInf, oDesc) {
	if (oDesc.register && oDesc.name)
		throw new Error(`Influence descriptor contains both 'register' and 'name' properties`);
	let name = oDesc.register || oDesc.name;
	if (name) {
		let shortName = name.includes('.') ? name.substr(name.lastIndexOf('.') + 1) : name;
		defineConstant(oInf.prototype, 'isa' + shortName, true, false);
	} else
		name = Anonymous;
	defineConstant(oInf.prototype, 'typeName', name, false);
	oInf.name = name;
	if (oDesc.register)
		Registry.set(oInf.name, oInf);
}

function copyPrivatePrototypeProps(oInf, oSrc) {
	if (typeof oSrc !== 'object')
		throw new Error(`Influence 'private_' property must be an object`);
	allocatePrivateScope(oInf);
	Yaga.dispatchPropertyHandlers(oSrc, {
		thisArg_: () => copyThisArgProps(oInf.privatePrototype, oSrc[prop]),
		_other_: prop => copyProperty(oInf.privatePrototype, prop, oSrc)
	});
	Object.seal(oInf.privatePrototype);
}

function copyProtectedPrototypeProps(oInf, oSrc) {
	if (typeof oSrc !== 'object')
		throw new Error(`Influence 'protected_' property must be an object`);
	allocateProtectedScope(oInf);
	Yaga.dispatchPropertyHandlers(oSrc, {
		thisArg_: () => copyThisArgProps(oInf.protectedPrototype, oSrc[prop]),
		_other_: prop => copyProperty(oInf.protectedPrototype, prop, oSrc)
	});
	Object.seal(oInf.protectedPrototype);
}

function lateAllocatePrivateScope(oInf, oTgt) {
	let oRoot = getRootInfluence(oInf, oTgt);
	getScopeID(oRoot);
	if (!oInf.privatePrototype) {
		allocatePrivateScope(oInf);
		if (!Scopes.get(oTgt))
			newScopesObject(oTgt, oRoot); // Need a scopes object as constructor hasn't allocated one yet
		freezeProperties(oInf); // Freeze the properties that have been allocated
	}
	// May have to add a scopeID to our validated IDs list for a composable.
	if (!oRoot.validScopeIDs[oInf.scopeID])
		oRoot.validScopeIDs[oInf.scopeID] = true;
	return (oRoot);
}

function lateAllocateProtectedScope(oInf, oTgt) {
	let oRoot = getRootInfluence(oInf, oTgt); // Must apply protected initialisation to composite not defining prototype influence
	if (!oRoot.protectedPrototype) {
		allocateProtectedScope(oRoot);
		if (!Scopes.get(oTgt))
			newScopesObject(oTgt, oRoot); // Need a scopes object as constructor hasn't allocate one yet
		freezeProperties(oRoot); // Freeze the properties that have been allocated
	}
	if (oRoot !== oInf && !oInf.protectedPrototype) {
		// This is definitely a composite situation so will need to ensure that the composable also has
		// a protected space for the methods to work with our composite
		allocateProtectedScope(oInf);
		freezeProperties(oInf); // Freeze the properties that have been allocated
	}
	// May have to add a scopeID to our validated IDs list for a composable.
	if (!oRoot.validScopeIDs[oInf.scopeID])
		oRoot.validScopeIDs[oInf.scopeID] = true;
	return (oRoot);
}

function lateAllocateStaticPrivateScope(oInf, oTgt) {
	let oRoot = getStaticRootInfluence(oInf, oTgt); // Note that 'oRoot' is the influence
	getScopeID(oRoot.static);
	if (!oInf.static.privatePrototype) {
		allocatePrivateStaticScope(oInf);
		if (!Scopes.get(oTgt))
			newScopesObject(oTgt, oRoot.static); // Need a scopes object as constructor hasn't allocated one yet
		freezeProperties(oInf.static); // Freeze the properties that have been allocated
	}
	// May have to add a scopeID to our validated IDs list for a composable.
	if (!oRoot.static.validScopeIDs[oInf.static.scopeID])
		oRoot.static.validScopeIDs[oInf.static.scopeID] = true;
	return (oRoot);
}

function lateAllocateStaticProtectedScope(oInf, oTgt) {
	let oRoot = getStaticRootInfluence(oInf, oTgt); // Must apply protected initialisation to composite not defining prototype influence
	if (!oRoot.static.protectedPrototype) {
		allocateProtectedStaticScope(oRoot);
		if (!Scopes.get(oTgt))
			newScopesObject(oTgt, oRoot.static); // Need a scopes object as constructor hasn't allocate one yet
		freezeProperties(oRoot.static); // Freeze the properties that have been allocated
	}
	if (oRoot !== oInf && !oInf.static.protectedPrototype) {
		// This is definitely a composite situation so will need to ensure that the composable also has
		// a protected space for the methods to work with our composite
		allocateProtectedStaticScope(oInf);
		freezeProperties(oInf); // Freeze the properties that have been allocated
	}
	// May have to add a scopeID to our validated IDs list for a composable.
	if (!oRoot.static.validScopeIDs[oInf.static.scopeID])
		oRoot.static.validScopeIDs[oInf.static.scopeID] = true;
	return (oRoot);
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
	if (oTgt.privatePrototype) return;
	if (!oTgt.isScoped) oTgt.isScoped = true; // Must test as could be frozen
	let scopeID = getScopeID(oTgt);
	let id = (sTgt || 'inf') + '.private:' + scopeID;
	defineConstant(oTgt, 'private',
		_allocateScope(scopeID, id, 'private', () => oTgt.privatePrototype));
	oTgt.privatePrototype = oInit;
}

function _allocateProtectedScope(oInf, sTgt, oInit) {
	let oTgt = (sTgt && oInf[sTgt]) || oInf;
	if (oTgt.protectedPrototype) return;
	if (!oTgt.isScoped) oTgt.isScoped = true; // Must test as could be frozen
	let scopeID = getScopeID(oTgt);
	let id = (sTgt || 'inf') + '.protected';
	defineConstant(oTgt, 'protected',
		_allocateScope(scopeID, id, 'protected',
			(oScopes, oPublic) => _getProtectedPrototype(oScopes, oInf, oPublic, sTgt)));
	oTgt.protectedPrototype = oInit;
}

function _getProtectedPrototype(oScopes, oInf, oPublic, sTgt) {
	let oProt = oScopes[SymRoot].protectedPrototype;
	if (oProt) return (oProt);
	if (sTgt)
		lateAllocateStaticProtectedScope(oInf, oPublic);
	else
		lateAllocateProtectedScope(oInf, oPublic);
	return (oScopes[SymRoot].protectedPrototype);
}

function _allocateScope(scopeID, id, ty, fProt) {
	return oPublic => {
		let oScopes = Scopes.get(oPublic = oPublic[SymPublic] || oPublic);
		if (!oScopes[SymValidIDs][scopeID])
			throw new Error(`Invalid access to a '${ty}' scope`);
		let oScope = oScopes[id];
		if (oScope)
			return (oScope);
		oScope = oScopes[id] = Object.create(fProt(oScopes, oPublic));
		oScope[SymPublic] = oPublic;
		return (oScope);
	};
}

function getScopeID(oTgt) {
	if (!oTgt.scopeID) {
		oTgt.scopeID = 'sid:' + Exps.Utilities.uuidv4();
		oTgt.validScopeIDs = {
			[oTgt.scopeID]: true,
		};
	}
	return (oTgt.scopeID);
}

function copyThisArgProps(oTgt, oSrc, flFreeze = false) {
	if (typeof oSrc !== 'object')
		throw new Error(`Influence 'thisarg_' property must be an object`);
	Object.keys(oSrc).forEach(prop => {
		let sDesc = Object.getOwnPropertyDescriptor(oSrc, prop);
		if (typeof sDesc.value === 'function')
			sDesc.value = Yaga.thisArg(sDesc.value);
		defineProperty(oTgt, prop, sDesc, flFreeze);
	});
	return (oTgt);
}

function copyProperty(oTgt, tProp, oSrc, flFreeze = false, sProp = tProp) {
	defineProperty(oTgt, tProp, Object.getOwnPropertyDescriptor(oSrc, sProp), flFreeze);
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

function defineProperty(oTgt, prop, desc, flFreeze = false, flEnum = true) {
	if (flFreeze) {
		if (!desc.get && !desc.set)
			desc.writable = false;
		desc.configurable = false;
	}
	desc.enumerable = flEnum;
	Object.defineProperty(oTgt, prop, desc);
	return (oTgt);
}

function getRootInfluence(oInf, oTgt) {
	// Applying initialisers to composite influences needs to handle the case
	// where the composable scope space is yet to be defined. Late binding of the
	// scope space must apply to the prototype influence for the private scope and
	// to the composite for the protected scope. In either case the root associated
	// with the target instance must match the owning influence.
	let tProt = Object.getPrototypeOf(oTgt);
	if (Object.is(tProt, oInf.prototype))
		return (oInf); // Is local to a prototye influence so nothing to do

	// Must be a composite so need to locate the composite influence
	for (let i = 0; i < oInf.compositeMembership.length; i++) {
		let inf = InfCreators.get(oInf.compositeMembership[i]);
		if (tProt === inf.prototype)
			return (inf);
	}
	throw new Error('INTERNAL: Cannot find a root influence');
}

function getStaticRootInfluence(oInf, object) {
	// Static version where the target is the static.object.
	if (oInf.static && oInf.static.object === object)
		return (oInf); // Is local to a prototye influence so nothing to do

	// Must be a composite so need to locate the composite influence
	for (let i = 0; i < oInf.compositeMembership.length; i++) {
		let inf = InfCreators.get(oInf.compositeMembership[i]);
		if (inf.static && inf.static.object === object)
			return (inf);
	}
	throw new Error('INTERNAL: Cannot find a root influence');
}

function applyInitialisers(oInf, oTgt, oInit) {
	_applyInitialisers(oInf, oTgt, oInit);
	if (oTgt.private_)
		_applyPrivateInitialisers(oInf, oTgt);
	if (oTgt.protected_)
		_applyProtectedInitialisers(oInf, oTgt);
}

function _applyPrivateInitialisers(oInf, oTgt) {
	lateAllocatePrivateScope(oInf, oTgt);
	_applyInitialisers(oInf, oInf.private(oTgt), oTgt.private_);
	delete oTgt.private_;
}

function _applyProtectedInitialisers(oInf, oTgt) {
	let oRoot = lateAllocateProtectedScope(oInf, oTgt);
	_applyInitialisers(oRoot, oRoot.protected(oTgt), oTgt.protected_);
	delete oTgt.protected_;
}

function _applyInitialisers(oInf, oTgt, oInit) {
	function applyFreeze(oInit) {
		Yaga.dispatchPropertyHandlers(oInit, {
			thisArg_: () => copyThisArgProps(oTgt, oInit.thisArg_, FreezeProp),
			do_: () => applyDo(oInit.do_, FreezeProp),
			_other_: prop => copyProperty(oTgt, prop, oInit, FreezeProp)
		});
	}

	function applyDo(oInit, FreezeProp = false) {
		Object.keys(oInit).forEach(prop => {
			let f = oInit[prop];
			let v = typeof f === 'function' ? f(oTgt) : f;
			if (v === undefined)
				return;
			if (FreezeProp) {
				let desc = Object.getOwnPropertyDescriptor(oInit, prop);
				desc.value = v;
				defineProperty(oTgt, prop, desc, FreezeProp);
			} else
				oTgt[prop] = v;
		});
	}

	if (typeof oInit !== 'object')
		throw new Error(`Invalid constructor initialiser '${oInit}'`);
	Object.assign(oTgt, oInit);
	if (oTgt.freeze_) applyFreeze(oTgt.freeze_), delete oTgt.freeze_;
	if (oTgt.thisArg_) copyThisArgProps(oTgt, oTgt.thisArg_), delete oTgt.thisArg_;
	if (oTgt.do_) applyDo(oTgt.do_), delete oTgt.do_;
}

function copyInitialisers(oInf, oTgt) {
	let cloneMap = new Map();
	if (oInf.privateInitialiser) {
		let o = oInf.private(oTgt);
		Mods.Replicate.cloneObject(oInf.privateInitialiser, cloneMap, o);
	}
	if (oInf.protectedInitialiser) {
		// Don't have a problem here with composite protected space. This scopes environment 
		// has already been setup correctly by the composite influence code.
		let o = oInf.protected(oTgt);
		Mods.Replicate.cloneObject(oInf.protectedInitialiser, cloneMap, o);
	}
	Mods.Replicate.cloneObject(oInf.publicInitialiser, cloneMap, oTgt);
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
	let bf, f = oInst[sProp];
	let map = f[SymBindMap];
	if (!map) {
		f[SymBindMap] = map = new WeakMap();
		map.set(oInst, (bf = f.bind(oInst)));
		return (bf);
	}
	bf = map.get(oInst);
	if (!bf) map.set(oInst, (bf = f.bind(oInst)));
	return (bf);
}

function copy(oInst) {
	return (_copyClone(oInst, o => Mods.Replicate.copyObject(o)))
}

function clone(oInst, cloneMap) {
	return (_copyClone(oInst, o => Mods.Replicate.cloneObject(o, cloneMap || (cloneMap = new Map()))))
}

function assign(oInst, o) {
	Object.defineProperties(oInst, Object.getOwnPropertyDescriptors(o));
	return (oInst);
}

function extend(oInst, oTemplate) {
	let o = Object.create(oInst);
	if (oTemplate)
		Object.defineProperties(o, Object.getOwnPropertyDescriptors(oTemplate));
	return (o);
}

function _copyClone(oInst, fCopy) {
	// Produce a copy of the public object and scope objects
	let oPublic = fCopy(oInst);
	let scopes = Scopes.get(oInst);
	if (scopes) {
		let newScopes = {};
		Object.keys(scopes).forEach(sScope => (newScopes[sScope] = fCopy(scopes[sScope]))[SymPublic] = oPublic);
		Object.getOwnPropertySymbols(scopes).forEach(sym => newScopes[sym] = scopes[sym]);
		Scopes.set(oPublic, newScopes)
	}
	return (oPublic);
}

function freezeProperties(o) {
	Object.getOwnPropertySymbols(o).forEach(prop => {
		let desc = Object.getOwnPropertyDescriptor(o, prop);
		if (!o.desc.configurable || FreezeExclusions[prop])
			return;
		desc.configurable = false;
		if (!o.get && !o.set)
			desc.writable = false;
		Object.defineProperty(o, prop, desc);
	})
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
				case 'function':
					let inf = InfCreators.get(idInf);
					if (!inf)
						throw new Error(`'${idInf}' is not an influence create function`);
					desc = fPropDesc(inf, sProp);
					break;
				case 'object':
					if (idInf.isanInfluence) {
						desc = fPropDesc(idInf, sProp);
						break;
					}
				default:
					throw new Error(`Invalid composable identifier '${idInf}'`);
			}
			// Only enumerable properties can be returned.
			return (desc && desc.enumerable ? desc : undefined);
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
				return ({
					value: fns[0],
					enumerable: true
				});
			return {
				value(...args) {
					let result;
					fns.forEach(f => result = f.call(this, ...args));
					return (result);
				},
				enumerable: true
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

	function influenceProperty(sProp, idInf) {
		return (this.getProperty(idInf, sProp));
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
		if (typeof desc !== 'object' || (!desc.value && !desc.get && !desc.set))
			desc = {
				value: desc,
				enumerable: true
			};
		return (desc);
	}

	return {
		indexedProperty: indexedProperty.bind(helpers),
		leastProperty: leastProperty.bind(helpers),
		mostProperty: mostProperty.bind(helpers),
		noneProperty: noneProperty.bind(helpers),
		influenceProperty: influenceProperty.bind(helpers),
		leastAllFunctions: leastAllFunctions.bind(helpers),
		mostAllFunctions: mostAllFunctions.bind(helpers),
		selectedFunctions: selectedFunctions.bind(helpers),
		func: func.bind(helpers)
	};
}
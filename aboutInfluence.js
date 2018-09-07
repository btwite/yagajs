/**
 * Outline and examples of the Influence object.
 * 
 * Influence provides a standardised approach for defining a single prototype/instance object
 * model in JavaScript that also incorporates integrated features for addresing some of the more
 * challenging and confusing aspects of the lanugauge. For example the 'this' property of functions
 * and private properties.
 * 
 * Influence uses the power of the javaScript object literal to allow an influence to be described
 * rather than coded. Descriptors come in two forms. The simple prototype form that describes an object
 * in terms of a prototype and a constructor for each instance of the prototype. The second
 * is a composition form that allows two more influences to be composed into a single Influence.
 */

"use strict"

// Our Influence factory function is a member of a collection tools that are contained in the
// Yaga library. A'require' of yaga will preload tools such as Influence but larger tool packages
// will only be loaded on first reference.
let Yaga = require('./Yaga');

// In the first example we implement a simple Stack object that is completely configured in the
// constructor function that hides the underlying stack data array.
let Stack = Yaga.Influence({
    name: 'Stack',
    constructor() {
        let stackArray = [];
        return {
            push: element => stackArray.push(element),
            pop: () => stackArray.pop(),
            print: () => log(stackArray)
        }
    }
});

// The 'Stack' variable contains a reference to the Stack influence object. To create a new 'Stack'
// we need to call the creator function for the influence.
let myStack = Stack.create();
myStack.push('The first stack Influence');
myStack.print();

// 'create' is the factory function for creating instances and is also uniquely linked to the Influence.
// This allows 'create' to be the exported interface of the influence whilst the influence object remains
// private to the defining module.
//
// The object returned by the 'constructor' is not the instance but is a descriptor for initialising the
// instance. For completeness we could have also defined our influence via traditional constructor style
// coding.
Stack = Yaga.Influence({
    name: 'Stack',
    constructor() {
        let stackArray = [];
        this.push = element => stackArray.push(element);
        this.pop = () => stackArray.pop();
        this.print = () => log(stackArray);
    }
});
myStack = Stack.create();
myStack.push('The second stack Influence');
myStack.print();

// Although we have hidden the underlying array in the 'constructor' closure, the properties are not only
// public they are also modifiable. To get around this, we can annotate the descriptor with an action
// property to freeze enclosed property definitions.
Stack = Yaga.Influence({
    name: 'Stack',
    constructor() {
        let stackArray = [];
        return {
            freeze_: {
                push: element => stackArray.push(element),
                pop: () => stackArray.pop(),
                print: () => log(stackArray)
            }
        }
    }
});
myStack = Stack.create();
myStack.push('The third stack Influence');
myStack.print();
trycode(() => myStack.push = null);

// The stack example demonstrates a common pattern within JavaScript but one that does not take advantage
// of prototype reuse. The Influence alternative is to define a prototype and a private object space for 
// our underlying stack array.
Stack = Yaga.Influence({
    name: 'Stack',
    prototype: {
        push(element) {
            Stack.private(this).stackArray.push(element);
        },
        pop() {
            return (Stack.private(this).stackArray.pop());
        },
        print() {
            log(Stack.private(this).stackArray);
        }
    },
    constructor() {
        return {
            private_: {
                stackArray: []
            }
        }
    }
});
myStack = Stack.create();
myStack.push('The fourth stack Influence');
myStack.print();

// The three methods have been moved up to the prototye of the influence, and the constructor initialiser
// has been annotated with a 'private_' property that defines 'stackArray' as a private property of our
// Stack influence. The influence 'Stack' has a private space access function that allows the current
// 'this' to be mapped to the corresponding private space. Note that the 'private' function need only
// be visible to the module that owns the influence implementation as long as the module exports the
// creator function 'Stack.create'. One thing to note is that we did not need to 'freeze_' the properties
// in the prototype. 'freeze_' is not supported at this level as an influence is prototype is frozen
// as a whole once the influence has been constructed.

// The confusion around 'this' largely stems from the mistaken assumption that a function is a method,
// and that any call to another function is also assumed to be a method call. Confusion is further compounded
// with the introduction of the arrow function which does appear to act as a method with the inheritance
// of the 'this' binding of the parent closure. As it is a module can consist of a confusing mix of functions
// with and without a 'this' binding especially where object 'methods' are mapped to functions outside 
// the object body.
//
// The best way around 'this' is to not use this at all or ar least sparingly. The policy I have adopted is that
// 'this' is only used where the body of the function is within the body of an object literal. Every other form
// of function is just that a function and all bindings must be arguments. Adopting this policy provides a
// number of benefits:
//      1. A function can behave as an object property or a normal function. No mucking around with .call & .apply
//      2. An argument is more descriptive than 'this' outside the body of an object.
//      3. Most importantly all function types (static, inline & arrow) behave the same way. Ignoring 'function'
//         only properties such as 'arguments' which is replaced with ...args.
//
// Great, but how does this work with the JavaScript 'x.y()' syntax which binds 'x' to the 'y' function of 'x'.
// Simply wrap the function with another function that maps 'this' to the first argument. The Yaga library
// includes a 'thisArg' function that will wrap a single function, but Influence includes a 'thisArg_' annotation
// to wrap a group of functions.
function push(stack, element) {
    Stack.private(stack).stackArray.push(element);
}

function pop(stack) {
    return (Stack.private(stack).stackArray.pop());
}

function print(stack) {
    log(Stack.private(stack).stackArray);
}

Stack = Yaga.Influence({
    name: 'Stack',
    prototype: {
        thisArg_: {
            push,
            pop,
            print
        }
    },
    constructor() {
        return {
            private_: {
                stackArray: []
            }
        }
    }
});
myStack = Stack.create();
myStack.push('The fifth stack Influence');
myStack.print();

// Influence also supports a 'protected' property space. For a prototype influence there 
// is no observable difference.
Stack = Yaga.Influence({
    name: 'Stack',
    prototype: {
        push(element) {
            Stack.protected(this).stackArray.push(element);
        },
        pop() {
            return (Stack.protected(this).stackArray.pop());
        },
        print() {
            log(Stack.protected(this).stackArray);
        }
    },
    constructor() {
        return {
            protected_: {
                stackArray: []
            }
        }
    }
});
myStack = Stack.create();
myStack.push('The sixth stack Influence');
myStack.print();

// Influences can also have static properties. The public static properties are replicated as 
// reference properties of the 'create' function enabling them to be exported along with 'create'
Stack = Yaga.Influence({
    name: 'Stack',
    prototype: {
        thisArg_: {
            push,
            pop,
            print
        }
    },
    constructor() {
        return {
            private_: {
                stackArray: []
            }
        }
    },
    static: {
        initialise(...args) {
            let stack = Stack.create();
            args.forEach(a => stack.push(a));
            return (stack);
        }
    }
});
myStack = Stack.create();
myStack.push('The seventh stack Influence');
myStack.print();
myStack = Stack.create.initialise(1, 2, 3, 4);
myStack.print();

// The influence constructor can also be a simple initialiser object literal.
// In this case the initialiser properties are cloned into the instance object.
Stack = Yaga.Influence({
    name: 'Stack',
    prototype: {
        thisArg_: {
            push,
            pop,
            print
        }
    },
    constructor: {
        private_: {
            stackArray: []
        }
    }
});
myStack = Stack.create();
myStack.push('The eight stack Influence');
myStack.print();

// The influence constructor function descriptor can include property level constructors within
// the 'do_' annotation.
Stack = Yaga.Influence({
    name: 'Stack',
    prototype: {
        thisArg_: {
            push,
            pop,
            print
        }
    },
    constructor(...args) {
        return {
            private_: {
                do_: {
                    stackArray() {
                        let s = [];
                        args.forEach(a => s.push(a));
                        return (s);
                    }
                }
            }
        }
    }
});
myStack = Stack.create('The nineth stack Influence', 1, 2, 3, 4);
myStack.print();

// An influence prototype includes standard services:
//      clone: Clone the object instance. (Deep copy)
//      copy: Copy the object instance. (Shallow copy)
//      assign: Value only copy of the object instance. (Shallow copy)
//      bindThis: Answer a bound function of the object instance.
myStack = Stack.create('The tenth stack Influence', 1, 2, 3, 4);
let clone = myStack.clone();
clone.push('clone');
myStack.print();
clone.print();

myStack = Stack.create('The eleventh stack Influence', 1, 2, 3, 4);
let copy = myStack.copy();
copy.push('copy');
myStack.print();
copy.print();

myStack = Stack.create('The twelveth stack Influence', 1, 2, 3, 4);
let fPush = myStack.bindThis('push');
fPush('bindThis');
myStack.print();
log("One and only one bound 'push' =", Object.is(fPush, myStack.bindThis('push')));

// 'bindThis' assists in addressing the issue of ensuring that one and only one function
// handler for a given instance and property is created for callback registration and removal.

// A composable descriptor defines a list of influences that are harmonized into a single
// influence that contains one prototype. Harmonizers define how all or individual properties are
// to be merged or not into the resultant composite.
// The following implements a simple typed extension of our Stack influence.
let StringStack = Yaga.Influence({
    name: 'StringStack',
    composition: [Stack, {
        prototype: {
            push(element) {
                if (typeof element !== 'string')
                    throw new Error("Expecting a 'string'");
            }
        }
    }],
    harmonizers: {
        defaults: {
            prototype: ['.least.'],
            constructor: 'Stack'
        }
    }
});
myStack = StringStack.create();
myStack.push('StringStack:1');
myStack.print();
trycode(() => myStack.push(1));

// The StringStack composition includes our Stack influence and an anonymous prototype
// influence with a single 'push' method that checks the type. The 'harmonizers' section
// defines how the two influences are to be merged. The 'defaults' section defines how to
// harmonize properties that do not have a specific harmonizer. For 'prototype' properties
// the "['.least.']" default can only apply to function properties and means that the same 
// named function property for each composable influence will be called in least significant
// order (composition is ordered '.most.' to '.least.' significance). The result of the last
// function called is retured. The 'constructor' default is somewhat simpler specfying that
// the composite constructor should be taken from the constructor for the Influence named 'Stack'
//
// The coded harmonizations such as "['.least.']" are implemented using Influence harmonization
// services. These same services can also be used to define your own harmonization function.
StringStack = Yaga.Influence({
    name: 'StringStack',
    composition: [Stack],
    harmonizers: {
        defaults: {
            prototype: 'Stack',
            constructor: 'Stack'
        },
        prototype: {
            push() {
                let fPush = this.getProperty('Stack', 'push').value;
                return function (element) {
                    if (typeof element !== 'string')
                        throw new Error("Expecting a 'string'");
                    return (fPush.call(this, element));
                }
            }
        }
    }
});
myStack = StringStack.create();
myStack.push('StringStack:2');
myStack.print();
trycode(() => myStack.push(1));

// In the example above we are extending a single influnce (Stack) by harmonizing the
// 'push' property function. The default harmonizers are saying that the constructor and any
// property other than 'push' are to be taken from the Stack implementation. Note that private
// properties are never harmonized. They are linked to the composite instance via a private
// space that is derived from the owning influence and referenced by functions that are taken
// from the owning influence. This means that a composite instance may have many private spaces. 
// Protected properties on the other hand can be harmonized and will be associated with the 
// single protected space of the composite instance object.
//
// Finally we look at an example that shows the harmonization of two distinct prototype influences.

let Dog = Yaga.Influence({
    name: 'Dog',
    prototype: {
        walk() {
            log('Walks like a dog');
        },
        run() {
            log('Runs like a dog');
        },
        speak() {
            log('woof woof woof');
        }
    }
});
let dog = Dog.create();
log('\nDog can:');
dog.walk();
dog.run();
dog.speak();

let Cat = Yaga.Influence({
    name: 'Cat',
    prototype: {
        walk() {
            log('Walks like a cat');
        },
        run() {
            log('Runs like a cat');
        },
        speak() {
            log('miow miow miow');
        }
    }
});
let cat = Cat.create();
log('\nCat can:');
cat.walk();
cat.run();
cat.speak();

let DogCat = Yaga.Influence({
    name: 'DogCat',
    composition: [Dog, Cat],
    harmonizers: {
        prototype: {
            walk: 'Dog',
            run: 'Cat',
            speak: ['.most.']
        }
    }
});
let dogcat = DogCat.create();
log('\nDogCat can:');
dogcat.walk();
dogcat.run();
dogcat.speak();

function log(...args) {
    console.log(...args);
}

function trycode(fn) {
    try {
        fn()
    } catch (err) {
        log('ERROR:', err.message);
    }
}
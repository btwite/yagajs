// A test module to put through the Yaga extensions transpiler.

function main() {
    let obj = {
        foo() {
            console.log('hello world');
        }
    };
    let f1 = obj.foo.bind(obj);
    let f2 = obj.foo.bind(obj);
    let f3 = obj - > foo;
    let f4 = obj - > foo;

    console.log(f1 === f2, f3 === f4);

    f1 = foobar.bind(obj);
    f2 = foobar.bind(obj);
    f3 = obj - > [foobar];
    f4 = obj - > [foobar];

    console.log(f1 === f2, f3 === f4);
}

function foobar() {
    console.log('hello world');
}

main();
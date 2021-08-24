var Promise = require("bluebird");

//! 패턴1 //
function add(a, b) {
    return new Promise((resolve, reject) => {
        resolve(a + b);
    });
}

function helloWorld(callback) {
    add(1, 2).asCallback(callback);
}

helloWorld((err, result) => {
    console.log(result);
});

//! 패턴2 //
function helloWorld2(callback) {
    add2(1, 5, callback);
}

function adpater_hello2() {
    helloWorld2((err) => {
        if (err) {
            return console.log(err);
        }
    });
}

function add2(a, b, callback) {
    let sum = a + b;
    if (sum > 5) return callback("error");
    console.log(sum);
}

adpater_hello2();

//! 패턴3 //
function hello3(a, b) {
    return (done) => {
        add3(a, b, done);
    };
}

function add3(a, b, done) {
    const res = a + b;
    if (res > 10) {
        return done("error");
    }
    return done(null, res);
}

const result = hello3(1, 5);
result((err, res) => {
    if (err) {
        return console.log(err);
    }
    console.log(res);
});

//* 패턴 3 연습
function returncallback(a, b) {
    return (callback) => {
        return add4(a, b, callback);
    };
}

function add4(a, b, callback) {
    const hell = a + b;
    if (hell > 5) {
        return callback("error");
    }
    return callback(null, hell);
}

const b = returncallback(3, 10);
b((err, result) => {
    console.log(err, result);
});

//* hello world test
function helloworld4() {
    var hello = { a: "b" };
    return hello;
}

const abc = helloworld4();
console.log(abc);

var state = require("./state.js");

module.exports = function (context) {
    return new Proxy(context, handler);
};

var handler = {
    get: function (target, property) {
        if (property === "audioFork") {
            return async function () {
                var [type, timeout, cb] = arguments;
                var originFunc = target.audioFork;
                var result = await originFunc.call(target, type, timeout);
                // 결과 값이 나오게 되면 오디오 포트를 실행합니다.

                //! 오디오포크 시작
                if (type === "read") {
                    target.state = state.reading;
                    target.pending = cb;
                    return new Promise(function (resolve, reject) {
                        target.successCallback = function (err, success) {
                            target.state = state.waiting;
                            target.pending = null;
                            target.successCallback = null;
                            if (err) return reject(err);
                            resolve(success);
                        };
                    });
                }
            };
        }
        return target[property];
    },
};

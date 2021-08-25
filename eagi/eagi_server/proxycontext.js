import { state } from "./state.js";

const success = "200 result=0 endpos=11234 \n";

export const proxyContext = (context) => {
    return new Proxy(context, handler);
};

const handler = {
    get: (target, property) => {
        if (property === "audioFork") {
            return async function () {
                const [type, timeout, cb] = arguments;
                const originFunc = target.audioFork;
                const result = await originFunc.call(this, type, timeout);
                // 결과 값이 나오게 되면 오디오 포트를 실행합니다.

                //! 오디오포크 시작
                if (type === "read") {
                    this.state = state.reading;
                    this.pending = cb;
                    return new Promise((resolve, reject) => {
                        this.successCallback = (err, success) => {
                            this.state = state.waiting;
                            this.pending = null;
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

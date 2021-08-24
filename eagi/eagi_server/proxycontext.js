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
                console.log(result);

                //! 오디오포크 시작
                if (type === "read") {
                    this.state = state.reading;
                    this.pending = cb;
                    return new Promise((resolve, reject) => {
                        this.successCallback = (err, success) => {
                            this.state = state.waiting;
                            this.pending = null;
                            if (err) return reject(err);
                            resolve(result);
                        };
                    });
                }
            };
        }
        return target[property];
    },
};

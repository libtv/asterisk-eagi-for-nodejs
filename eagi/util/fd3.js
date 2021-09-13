//! Variables
const fs = require("fs");
// const file = fs.createWriteStream("/var/lib/asterisk/agi-bin/hello.log"); // TODO 필요할떄 알아서 쓰세요
var contextList = new Map();
var contextCount = 0;

//! Function
function FileDescription3(ip, port) {
    var self = this;
    self.callback = null;
    self.ip = ip;
    self.port = port;
    self.timeout = null;
    self.reader = null;
    self.writable = null;
    self.saveBuffer = Buffer.alloc(1000);
    self.saveBufferLength = 3000; /* 3000 : 0.15sec 8000 : 1.0sec */
    self.maxCount = 10;
    self.count = 0;
    self.lowSpeak = 0.0;
    self.say = false;
    self.close = false;
    self.end = false;
}

FileDescription3.prototype.stop = function () {
    var self = this;
    self.reader = null;
    self.writable = null;
};

FileDescription3.prototype.clearTime = function () {
    var self = this;
    if (self.timeout !== null) clearTimeout(self.timeout);
    self.timeout = null;
};

FileDescription3.prototype.setTime = function (ms) {
    var self = this;
    self.clearTime();
    self.timeout = setTimeout(() => {
        self.close = true;
    }, ms);
};

FileDescription3.prototype.destory = function () {
    var self = this;
    self.clearTime();
    self.reader.destroy();
};

FileDescription3.prototype.streamContext = function (writable, timeout) {
    let self = this;
    self.reader = fs.createReadStream(null, { fd: 3 });
    self.writable = writable;

    return new Promise((resolve) => {
        self.timeout = setTimeout(() => {
            self.close = true;
        }, timeout);

        self.reader.once("close", () => {
            resolve();
        });

        self.reader.once("error", () => {
            clearTimeout(self.timeout);
            resolve();
        });

        self.reader.on("readable", () => {
            if (self.close === true && self.end === false) {
                self.end = true;
                self.destory();
            } else if (self.end === true) {
                return;
            } else {
                var data = self.reader.read();
                var length = data.byteLength;
                var isBuffer = "byteLength" in data;
                if (data == null || isBuffer == false) {
                    return;
                } else if (Number(length) < 1000 && Number(length) >= 1 /* && length % 2 === 0 */) {
                    hello(data);
                } else {
                    return;
                }
            }
        });

        function hello(chunk) {
            var max = foundMax(chunk);

            countIncrease(max);
            // file.write(`Say Status : ${self.say} | Max Value : ${max} | LowSpeak Value : ${self.lowSpeak} \n`); // TODO 필요할떄 알아서 쓰세요

            let speakMinimum = +self.lowSpeak + 0.05;

            //* 말을 지금 하는 상태 */
            if (donotSayState() && max > speakMinimum) {
                self.setTime(1500);
                self.say = true;
                self.writable.write(self.saveBuffer);
                self.writable.write(chunk);
                return;
            }

            //* 말을 안하는 상태 */
            else if (donotSayState()) {
                self.saveBuffer = Buffer.concat([self.saveBuffer, chunk]);

                if (self.saveBuffer.length > self.saveBufferLength) {
                    var length = self.saveBuffer.length;
                    self.saveBuffer = self.saveBuffer.slice(length - self.saveBufferLength, length);
                }
                return;
            }

            //* 말을 한 상태 */
            else if (doSayState()) {
                /* 말을 한 상태에서 */
                self.writable.write(chunk);
                if (max <= speakMinimum) {
                    // 말을 계속 안한다고 생각하면..
                    if (self.timeout === null) {
                        self.setTime(1500);
                    }
                } else if (max > speakMinimum) {
                    /* 잡음 상태이면 */
                    if (self.timeout !== null) {
                        self.clearTime();
                    }
                }
                return;
            }
        }

        function foundMax(chunk) {
            var max = 0.0;
            for (let i = 0; i + 1 < chunk.length; i += 2) {
                var msbFirst = (chunk[i] & 0xff) + ((chunk[i + 1] & 0xff) << 8);
                var msbSigned = ((msbFirst + 32768) % 65536) - 32768;
                var value = msbSigned / 65536.0;
                max = value > max ? value.toFixed(3) : max;
            }
            return max;
        }

        function countIncrease(max) {
            if (self.count <= self.maxCount) {
                self.count++;
                self.lowSpeak = self.lowSpeak < max ? max : self.lowSpeak;
            }
        }

        function donotSayState() {
            return self.say === false && self.count > self.maxCount;
        }

        function doSayState() {
            return self.say === true && self.count > self.maxCount;
        }
    });
};

module.exports = (ip, port) => {
    var key = ip + port + contextCount++;
    if (contextList.has(key)) {
        return contextList.get(key);
    } else {
        var context = new FileDescription3(ip, port);
        contextList.set(key, context);
        return context;
    }
};
